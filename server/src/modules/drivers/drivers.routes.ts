import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { toUtcDay } from '../../lib/dates.js';
import { DriverStatusEnum } from '../../lib/enums.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeDriver, serializeRide } from '../../lib/serializers.js';
import { availableDrivers, checkDriverAvailability } from '../../services/availability.service.js';
import { recordAudit } from '../../services/audit.service.js';

const TAG = 'Chauffeurs';

const driverBodySchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(24),
  email: z.string().email().nullish(),
  photoUrl: z.string().url().nullish(),
  experienceYears: z.number().int().min(0).max(60).default(0),
  languages: z.array(z.string().max(40)).max(10).default([]),
  status: DriverStatusEnum.schema.optional(),
  licenseNumber: z.string().min(3).max(60),
  licenseExpiry: z.string().date().nullish(),
  assignedVehicleId: z.string().nullish(),
  hireDate: z.string().date().nullish(),
  notes: z.string().max(1000).nullish(),
  /** Rattache le chauffeur à un compte utilisateur pour l’application chauffeur. */
  userId: z.string().nullish()
});

const listSchema = paginationSchema.extend({
  status: DriverStatusEnum.schema.optional(),
  search: z.string().max(120).optional(),
  language: z.string().max(40).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  /** Ne renvoie que les chauffeurs libres sur la période. */
  availableFrom: z.string().date().optional(),
  availableTo: z.string().date().optional()
});

function toDateOrNull(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : toUtcDay(value);
}

export async function driversRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Lister les chauffeurs', tags: [TAG], querystring: listSchema })
    },
    async (request) => {
      const query = parse(listSchema, request.query);

      if (query.availableFrom && query.availableTo) {
        const free = await availableDrivers(toUtcDay(query.availableFrom), toUtcDay(query.availableTo));
        return paginated(free.map((d) => serializeDriver(d)), free.length, {
          page: 1,
          pageSize: Math.max(1, free.length)
        });
      }

      const { skip, take } = toSkipTake(query);

      const where: Prisma.DriverWhereInput = {
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.language ? { languages: { has: query.language } } : {}),
        ...(query.minRating !== undefined ? { rating: { gte: query.minRating } } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search } },
                { licenseNumber: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.driver.findMany({
          where,
          include: { assignedVehicle: true },
          orderBy: [{ status: 'asc' }, { rating: 'desc' }],
          skip,
          take
        }),
        prisma.driver.count({ where })
      ]);

      return paginated(rows.map(serializeDriver), total, query);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN', 'DRIVER'),
      schema: doc({ summary: 'Fiche chauffeur', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      if (request.user!.role === 'DRIVER' && request.user!.driverId !== id) {
        throw new ForbiddenError('Vous ne pouvez consulter que votre propre fiche.');
      }

      const driver = await prisma.driver.findFirst({
        where: { id, deletedAt: null },
        include: { assignedVehicle: true }
      });
      if (!driver) throw new NotFoundError('Chauffeur');

      const [ratings, ridesByStatus] = await Promise.all([
        prisma.review.aggregate({
          where: { driverId: id, published: true },
          _avg: { rating: true },
          _count: { _all: true }
        }),
        prisma.ride.groupBy({ by: ['status'], where: { driverId: id }, _count: { _all: true } })
      ]);

      return {
        driver: serializeDriver(driver),
        rating: { average: ratings._avg.rating ?? null, count: ratings._count._all },
        ridesByStatus: Object.fromEntries(ridesByStatus.map((r) => [r.status, r._count._all]))
      };
    }
  );

  app.get(
    '/:id/availability',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Vérifier la disponibilité d’un chauffeur',
        tags: [TAG],
        params: idParamSchema,
        querystring: z.object({ startDate: z.string().date(), endDate: z.string().date() })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const query = parse(
        z.object({ startDate: z.string().date(), endDate: z.string().date() }),
        request.query
      );
      return checkDriverAvailability(id, toUtcDay(query.startDate), toUtcDay(query.endDate));
    }
  );

  app.get(
    '/me/rides',
    {
      preHandler: app.requireRole('DRIVER'),
      schema: doc({
        summary: 'Mes courses (application chauffeur)',
        tags: [TAG],
        querystring: paginationSchema.extend({ upcomingOnly: z.coerce.boolean().default(false) })
      })
    },
    async (request) => {
      const query = parse(
        paginationSchema.extend({ upcomingOnly: z.coerce.boolean().default(false) }),
        request.query
      );
      const { skip, take } = toSkipTake(query);

      const driverId = request.user!.driverId;
      if (!driverId) throw new ForbiddenError('Aucune fiche chauffeur n’est liée à ce compte.');

      const where: Prisma.RideWhereInput = {
        driverId,
        ...(query.upcomingOnly
          ? { status: { in: ['PLANIFIEE', 'EN_ROUTE', 'EN_COURS'] } }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.ride.findMany({
          where,
          include: { booking: { include: { company: true } }, driver: true, vehicle: true },
          orderBy: { scheduledDate: 'asc' },
          skip,
          take
        }),
        prisma.ride.count({ where })
      ]);

      return paginated(rows.map(serializeRide), total, query);
    }
  );

  app.post(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Recruter un chauffeur', tags: [TAG], body: driverBodySchema })
    },
    async (request, reply) => {
      const body = parse(driverBodySchema, request.body);

      const driver = await prisma.driver.create({
        data: {
          ...body,
          licenseExpiry: toDateOrNull(body.licenseExpiry),
          hireDate: toDateOrNull(body.hireDate) ?? new Date()
        },
        include: { assignedVehicle: true }
      });

      // Le compte utilisateur lié bascule sur le rôle chauffeur.
      if (body.userId) {
        await prisma.user.update({ where: { id: body.userId }, data: { role: 'DRIVER' } });
      }

      await recordAudit({
        request,
        action: 'driver.create',
        entity: 'Driver',
        entityId: driver.id,
        after: { name: driver.name }
      });

      return reply.status(201).send({ driver: serializeDriver(driver) });
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modifier un chauffeur',
        tags: [TAG],
        params: idParamSchema,
        body: driverBodySchema.partial()
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(driverBodySchema.partial(), request.body);

      const before = await prisma.driver.findFirst({ where: { id, deletedAt: null } });
      if (!before) throw new NotFoundError('Chauffeur');

      const driver = await prisma.driver.update({
        where: { id },
        data: {
          ...body,
          licenseExpiry: toDateOrNull(body.licenseExpiry),
          hireDate: toDateOrNull(body.hireDate)
        },
        include: { assignedVehicle: true }
      });

      await recordAudit({
        request,
        action: 'driver.update',
        entity: 'Driver',
        entityId: id,
        before: { status: before.status },
        after: { status: driver.status }
      });

      return { driver: serializeDriver(driver) };
    }
  );

  app.patch(
    '/:id/status',
    {
      preHandler: app.requireRole('ADMIN', 'DRIVER'),
      schema: doc({
        summary: 'Changer le statut d’un chauffeur',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({ status: DriverStatusEnum.schema })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(z.object({ status: DriverStatusEnum.schema }), request.body);

      if (request.user!.role === 'DRIVER' && request.user!.driverId !== id) {
        throw new ForbiddenError('Vous ne pouvez modifier que votre propre statut.');
      }

      const driver = await prisma.driver.update({
        where: { id },
        data: { status: body.status },
        include: { assignedVehicle: true }
      });

      return { driver: serializeDriver(driver) };
    }
  );

  app.delete(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Retirer un chauffeur', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const active = await prisma.booking.count({
        where: { assignedDriverId: id, status: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] } }
      });

      if (active > 0) {
        return {
          success: false,
          message: `Ce chauffeur est affecté à ${active} mission(s) active(s). Réaffectez-les d’abord.`
        };
      }

      await prisma.driver.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'CONGE', assignedVehicleId: null }
      });

      await recordAudit({ request, action: 'driver.delete', entity: 'Driver', entityId: id });

      return { success: true, message: 'Chauffeur retiré de l’effectif.' };
    }
  );
}
