import type { Prisma, RideStatus } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { toUtcDay } from '../../lib/dates.js';
import { RideStatusEnum } from '../../lib/enums.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeRide } from '../../lib/serializers.js';
import { recordAudit } from '../../services/audit.service.js';
import { transitionBookingStatus } from '../../services/booking.service.js';

const TAG = 'Courses & dispatch';

const RIDE_INCLUDE = {
  booking: { include: { company: true } },
  driver: true,
  vehicle: true
} satisfies Prisma.RideInclude;

/** Une course suit le meme cycle que la mission terrain. */
const ALLOWED_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  PLANIFIEE: ['EN_ROUTE', 'EN_COURS', 'ANNULEE'],
  EN_ROUTE: ['EN_COURS', 'ANNULEE'],
  EN_COURS: ['TERMINEE', 'ANNULEE'],
  TERMINEE: [],
  ANNULEE: []
};

const listSchema = paginationSchema.extend({
  status: RideStatusEnum.schema.optional(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  date: z.string().date().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  search: z.string().max(120).optional()
});

const statusSchema = z.object({
  status: RideStatusEnum.schema,
  startMileage: z.number().int().min(0).nullish(),
  endMileage: z.number().int().min(0).nullish(),
  notes: z.string().max(1000).nullish()
});

export async function ridesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: doc({
        summary: 'Lister les courses',
        description: 'Un chauffeur ne voit que ses propres missions.',
        tags: [TAG],
        querystring: listSchema
      })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);
      const user = request.user!;

      if (user.role !== 'ADMIN' && user.role !== 'DRIVER') {
        throw new ForbiddenError('Le dispatch est réservé à l’exploitation Nyokah.');
      }

      const scope: Prisma.RideWhereInput =
        user.role === 'DRIVER' ? { driverId: user.driverId ?? '__none__' } : {};

      const where: Prisma.RideWhereInput = {
        ...scope,
        ...(query.status ? { status: query.status } : {}),
        ...(query.driverId && user.role === 'ADMIN' ? { driverId: query.driverId } : {}),
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
        ...(query.date
          ? { scheduledDate: toUtcDay(query.date) }
          : query.from || query.to
            ? {
                scheduledDate: {
                  ...(query.from ? { gte: toUtcDay(query.from) } : {}),
                  ...(query.to ? { lte: toUtcDay(query.to) } : {})
                }
              }
            : {}),
        ...(query.search
          ? {
              OR: [
                { reference: { contains: query.search, mode: 'insensitive' } },
                { pickupLocation: { contains: query.search, mode: 'insensitive' } },
                { destinationLocation: { contains: query.search, mode: 'insensitive' } },
                { booking: { clientName: { contains: query.search, mode: 'insensitive' } } }
              ]
            }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.ride.findMany({
          where,
          include: RIDE_INCLUDE,
          orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
          skip,
          take
        }),
        prisma.ride.count({ where })
      ]);

      return paginated(rows.map(serializeRide), total, query);
    }
  );

  app.get(
    '/today',
    {
      preHandler: app.requireRole('ADMIN', 'DRIVER'),
      schema: doc({ summary: 'Planning du jour', tags: [TAG] })
    },
    async (request) => {
      const user = request.user!;
      const today = toUtcDay(new Date());

      const rides = await prisma.ride.findMany({
        where: {
          scheduledDate: today,
          ...(user.role === 'DRIVER' ? { driverId: user.driverId ?? '__none__' } : {})
        },
        include: RIDE_INCLUDE,
        orderBy: { startTime: 'asc' }
      });

      const byStatus = rides.reduce<Record<string, number>>((acc, r) => {
        const label = RideStatusEnum.toLabel(r.status);
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      }, {});

      return { date: today.toISOString().slice(0, 10), total: rides.length, byStatus, data: rides.map(serializeRide) };
    }
  );

  app.get(
    '/:id',
    { schema: doc({ summary: 'Détail d’une course', tags: [TAG], params: idParamSchema }) },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const ride = await prisma.ride.findFirst({
        where: { OR: [{ id }, { reference: id }] },
        include: RIDE_INCLUDE
      });
      if (!ride) throw new NotFoundError('Course');

      const user = request.user!;
      if (user.role === 'DRIVER' && ride.driverId !== user.driverId) {
        throw new ForbiddenError('Cette mission ne vous est pas affectée.');
      }
      if (user.role === 'INDIVIDUAL' && ride.booking.clientId !== user.id) {
        throw new ForbiddenError('Cette course ne vous concerne pas.');
      }
      if (user.role === 'COMPANY' && ride.booking.companyId !== user.companyId) {
        throw new ForbiddenError('Cette course ne concerne pas votre entreprise.');
      }

      return { ride: serializeRide(ride) };
    }
  );

  app.patch(
    '/:id/status',
    {
      preHandler: app.requireRole('ADMIN', 'DRIVER'),
      schema: doc({
        summary: 'Faire avancer une course',
        description:
          'Le passage à "En cours" démarre la réservation associée, le passage à "Terminée" la clôture (facture, fidélité, libération du véhicule).',
        tags: [TAG],
        params: idParamSchema,
        body: statusSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(statusSchema, request.body);

      const ride = await prisma.ride.findFirst({
        where: { OR: [{ id }, { reference: id }] },
        include: RIDE_INCLUDE
      });
      if (!ride) throw new NotFoundError('Course');

      if (request.user!.role === 'DRIVER' && ride.driverId !== request.user!.driverId) {
        throw new ForbiddenError('Cette mission ne vous est pas affectée.');
      }

      if (ride.status !== body.status && !ALLOWED_TRANSITIONS[ride.status].includes(body.status)) {
        throw new ConflictError(
          `Transition impossible : une course "${ride.status}" ne peut pas passer à "${body.status}".`
        );
      }

      if (body.status === 'TERMINEE' && body.endMileage != null && ride.startMileage != null) {
        if (body.endMileage < ride.startMileage) {
          throw new ConflictError(
            'Le kilométrage de fin ne peut pas être inférieur au kilométrage de départ.'
          );
        }
      }

      const updated = await prisma.ride.update({
        where: { id: ride.id },
        data: {
          status: body.status,
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
          ...(body.startMileage != null ? { startMileage: body.startMileage } : {}),
          ...(body.endMileage != null ? { endMileage: body.endMileage } : {}),
          ...(body.status === 'EN_COURS' && !ride.startedAt ? { startedAt: new Date() } : {}),
          ...(body.status === 'TERMINEE' ? { completedAt: new Date() } : {})
        },
        include: RIDE_INCLUDE
      });

      // Le compteur du véhicule suit le relevé de fin de mission.
      if (body.status === 'TERMINEE' && body.endMileage != null) {
        await prisma.vehicle.update({
          where: { id: ride.vehicleId },
          data: { currentMileage: body.endMileage }
        });
      }

      // La réservation suit la course, sans jamais la contredire.
      if (body.status === 'EN_COURS' && ride.booking.status === 'CONFIRMEE') {
        await transitionBookingStatus(ride.bookingId, 'EN_COURS', {
          reason: 'Départ de la course',
          actorId: request.user!.id,
          request
        });
      } else if (body.status === 'TERMINEE' && ride.booking.status === 'EN_COURS') {
        await transitionBookingStatus(ride.bookingId, 'TERMINEE', {
          reason: 'Course terminée',
          actorId: request.user!.id,
          request
        });
      }

      await recordAudit({
        request,
        action: `ride.status.${body.status.toLowerCase()}`,
        entity: 'Ride',
        entityId: ride.id,
        before: { status: ride.status },
        after: { status: body.status }
      });

      return { ride: serializeRide(updated) };
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Réassigner ou annoter une course',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({
          driverId: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          pickupLocation: z.string().max(255).optional(),
          destinationLocation: z.string().max(255).optional(),
          notes: z.string().max(1000).nullish()
        })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const schema = z.object({
        driverId: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        pickupLocation: z.string().max(255).optional(),
        destinationLocation: z.string().max(255).optional(),
        notes: z.string().max(1000).nullish()
      });
      const body = parse(schema, request.body);

      const ride = await prisma.ride.findFirst({ where: { OR: [{ id }, { reference: id }] } });
      if (!ride) throw new NotFoundError('Course');

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.ride.update({
          where: { id: ride.id },
          data: body,
          include: RIDE_INCLUDE
        });

        if (body.driverId && body.driverId !== ride.driverId) {
          await tx.booking.update({
            where: { id: ride.bookingId },
            data: { assignedDriverId: body.driverId }
          });
        }

        return result;
      });

      await recordAudit({ request, action: 'ride.update', entity: 'Ride', entityId: ride.id });

      return { ride: serializeRide(updated) };
    }
  );
}
