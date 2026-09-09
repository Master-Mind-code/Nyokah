import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { toUtcDay } from '../../lib/dates.js';
import { BookingStatusEnum, RentalFormulaEnum } from '../../lib/enums.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeBooking, serializeRide } from '../../lib/serializers.js';
import {
  assertCanAccessBooking,
  assignBooking,
  combineDateAndTime,
  createBooking,
  getBookingOrThrow,
  repriceBooking,
  transitionBookingStatus
} from '../../services/booking.service.js';
import { getGeneralConfig } from '../../services/settings.service.js';
import { availableDrivers } from '../../services/availability.service.js';
import { issueInvoiceForBooking } from '../../services/invoice.service.js';
import { sendDriverApproaching } from '../../services/notification.service.js';

const TAG = 'Réservations';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format attendu : HH:MM');

const createSchema = z.object({
  vehicleId: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  startTime: timeSchema.default('08:00'),
  endTime: timeSchema.default('18:00'),
  pickupLocation: z.string().min(3).max(255),
  dropoffLocation: z.string().min(3).max(255),
  formula: RentalFormulaEnum.schema,
  fuelIncluded: z.boolean().default(false),
  withDriver: z.boolean().default(true),
  promoCode: z.string().max(30).nullish(),
  flightNumber: z.string().max(20).nullish(),
  specialRequests: z.string().max(2000).nullish(),
  packId: z.string().nullish(),
  // Coordonnees : facultatives si le compte est connecte, obligatoires sinon.
  clientName: z.string().min(2).max(120).optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().min(8).max(24).optional(),
  companyId: z.string().nullish()
});

const listSchema = paginationSchema.extend({
  status: BookingStatusEnum.schema.optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  companyId: z.string().optional(),
  clientId: z.string().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  search: z.string().max(120).optional(),
  sort: z.enum(['recent', 'start_asc', 'amount_desc']).default('recent')
});

const BOOKING_INCLUDE = {
  vehicle: true,
  company: true,
  driver: true,
  ride: true,
  payments: true,
  invoice: true
} satisfies Prisma.BookingInclude;

export async function bookingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // -------------------------------------------------------------------------
  // Lecture
  // -------------------------------------------------------------------------

  app.get(
    '/',
    {
      schema: doc({
        summary: 'Lister les réservations',
        description:
          'Un client ne voit que ses réservations, un compte entreprise celles de sa société, un chauffeur ses missions. L’administrateur voit tout.',
        tags: [TAG],
        querystring: listSchema
      })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);
      const user = request.user!;

      // Cloisonnement des donnees : impose par le role, jamais par le client.
      const scope: Prisma.BookingWhereInput =
        user.role === 'ADMIN'
          ? {
              ...(query.companyId ? { companyId: query.companyId } : {}),
              ...(query.clientId ? { clientId: query.clientId } : {}),
              ...(query.driverId ? { assignedDriverId: query.driverId } : {})
            }
          : user.role === 'COMPANY' && user.companyId
            ? { companyId: user.companyId }
            : user.role === 'DRIVER' && user.driverId
              ? { assignedDriverId: user.driverId }
              : { clientId: user.id };

      const where: Prisma.BookingWhereInput = {
        ...scope,
        ...(query.status ? { status: query.status } : {}),
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
        ...(query.from || query.to
          ? {
              startDate: {
                ...(query.from ? { gte: toUtcDay(query.from) } : {}),
                ...(query.to ? { lte: toUtcDay(query.to) } : {})
              }
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { reference: { contains: query.search, mode: 'insensitive' } },
                { clientName: { contains: query.search, mode: 'insensitive' } },
                { clientEmail: { contains: query.search, mode: 'insensitive' } },
                { pickupLocation: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const orderBy: Prisma.BookingOrderByWithRelationInput =
        query.sort === 'start_asc'
          ? { startDate: 'asc' }
          : query.sort === 'amount_desc'
            ? { totalAmount: 'desc' }
            : { createdAt: 'desc' };

      const [rows, total, revenue] = await Promise.all([
        prisma.booking.findMany({ where, include: BOOKING_INCLUDE, orderBy, skip, take }),
        prisma.booking.count({ where }),
        prisma.booking.aggregate({
          where: { ...where, status: { not: 'ANNULEE' } },
          _sum: { totalAmount: true }
        })
      ]);

      return {
        ...paginated(rows.map(serializeBooking), total, query),
        totals: { revenue: revenue._sum.totalAmount ?? 0 }
      };
    }
  );

  app.get(
    '/:id',
    {
      schema: doc({
        summary: 'Détail d’une réservation (id ou référence RES-XXXX)',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const booking = await getBookingOrThrow(id);
      assertCanAccessBooking(request.user, booking);

      const history = await prisma.bookingStatusHistory.findMany({
        where: { bookingId: booking.id },
        orderBy: { createdAt: 'asc' }
      });

      return {
        booking: serializeBooking(booking),
        ride: booking.ride ? serializeRide({ ...booking.ride, booking, vehicle: booking.vehicle, driver: booking.driver }) : null,
        statusHistory: history.map((h) => ({
          from: h.fromStatus ? BookingStatusEnum.toLabel(h.fromStatus) : null,
          to: BookingStatusEnum.toLabel(h.toStatus),
          reason: h.reason,
          at: h.createdAt.toISOString()
        }))
      };
    }
  );

  // -------------------------------------------------------------------------
  // Creation
  // -------------------------------------------------------------------------

  app.post(
    '/',
    {
      schema: doc({
        summary: 'Créer une réservation',
        description:
          'Le prix est recalculé côté serveur et la disponibilité du véhicule est verrouillée dans la même transaction. Une notification WhatsApp d’accusé de réception est envoyée au client.',
        tags: [TAG],
        body: createSchema
      })
    },
    async (request, reply) => {
      const body = parse(createSchema, request.body);
      const user = request.user!;

      const account = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { company: true }
      });

      // Un client ne peut pas facturer une autre entreprise que la sienne.
      const companyId =
        user.role === 'ADMIN' ? (body.companyId ?? null) : (account.companyId ?? null);

      const booking = await createBooking(
        {
          vehicleId: body.vehicleId,
          startDate: toUtcDay(body.startDate),
          endDate: toUtcDay(body.endDate),
          startTime: body.startTime,
          endTime: body.endTime,
          pickupLocation: body.pickupLocation,
          dropoffLocation: body.dropoffLocation,
          formula: body.formula,
          fuelIncluded: body.fuelIncluded,
          withDriver: body.withDriver,
          promoCode: body.promoCode,
          flightNumber: body.flightNumber,
          specialRequests: body.specialRequests,
          packId: body.packId,
          clientId: user.role === 'ADMIN' && body.clientEmail ? null : user.id,
          clientName: body.clientName ?? account.fullName,
          clientEmail: body.clientEmail ?? account.email,
          clientPhone: body.clientPhone ?? account.phone,
          companyId
        },
        request
      );

      return reply.status(201).send({ booking: serializeBooking(booking) });
    }
  );

  // -------------------------------------------------------------------------
  // Cycle de vie
  // -------------------------------------------------------------------------

  app.patch(
    '/:id/status',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Changer le statut d’une réservation',
        description:
          'Transitions autorisées : En attente → Confirmée/Annulée, Confirmée → En cours/Annulée, En cours → Terminée/Annulée. La clôture libère le véhicule, crédite la fidélité et émet la facture.',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({ status: BookingStatusEnum.schema, reason: z.string().max(500).nullish() })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(
        z.object({ status: BookingStatusEnum.schema, reason: z.string().max(500).nullish() }),
        request.body
      );

      const booking = await transitionBookingStatus(id, body.status, {
        reason: body.reason,
        actorId: request.user!.id,
        request
      });

      return { booking: serializeBooking(booking) };
    }
  );

  app.post(
    '/:id/cancel',
    {
      schema: doc({
        summary: 'Annuler sa réservation',
        description:
          'Accessible au client propriétaire et à l’administrateur. Libère le véhicule, le chauffeur et le quota du code promo.',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({ reason: z.string().max(500).optional() })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(z.object({ reason: z.string().max(500).optional() }), request.body ?? {});

      const existing = await getBookingOrThrow(id);
      assertCanAccessBooking(request.user, existing);

      if (request.user!.role === 'DRIVER') {
        throw new ForbiddenError('Un chauffeur ne peut pas annuler une réservation.');
      }

      // Préavis d'annulation : passé ce délai, seule la conciergerie peut annuler,
      // le véhicule et le chauffeur étant déjà engagés sur la mission.
      if (request.user!.role !== 'ADMIN') {
        const { cancellationNoticeHours } = await getGeneralConfig();
        if (cancellationNoticeHours > 0) {
          const start = combineDateAndTime(existing.startDate, existing.startTime);
          const deadline = new Date(Date.now() + cancellationNoticeHours * 60 * 60 * 1000);

          if (start < deadline) {
            throw new ConflictError(
              `L'annulation en ligne n'est plus possible à moins de ${cancellationNoticeHours} h de la prise en charge. Contactez la conciergerie.`
            );
          }
        }
      }

      const booking = await transitionBookingStatus(existing.id, 'ANNULEE', {
        reason: body.reason ?? 'Annulation à la demande du client',
        actorId: request.user!.id,
        request
      });

      return { booking: serializeBooking(booking) };
    }
  );

  app.post(
    '/:id/assign',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Affecter un chauffeur et un véhicule',
        description:
          'Vérifie la double disponibilité, crée la course, confirme la réservation et notifie le client sur WhatsApp.',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({
          driverId: z.string().min(1),
          vehicleId: z.string().nullish(),
          notes: z.string().max(1000).nullish(),
          confirm: z.boolean().default(true)
        })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(
        z.object({
          driverId: z.string().min(1),
          vehicleId: z.string().nullish(),
          notes: z.string().max(1000).nullish(),
          confirm: z.boolean().default(true)
        }),
        request.body
      );

      const result = await assignBooking(id, body, request);

      return {
        booking: serializeBooking(result.booking),
        ride: serializeRide({
          ...result.ride,
          booking: result.booking,
          driver: result.driver,
          vehicle: result.vehicle
        })
      };
    }
  );

  app.get(
    '/:id/available-drivers',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Chauffeurs disponibles pour cette réservation',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const booking = await getBookingOrThrow(id);
      const drivers = await availableDrivers(booking.startDate, booking.endDate);

      return {
        data: drivers.map((d) => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          rating: d.rating,
          languages: d.languages,
          completedRides: d.completedRides,
          experienceYears: d.experienceYears
        }))
      };
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modifier une réservation et recalculer son prix',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({
          startDate: z.string().date().optional(),
          endDate: z.string().date().optional(),
          formula: RentalFormulaEnum.schema.optional(),
          fuelIncluded: z.boolean().optional(),
          promoCode: z.string().max(30).nullish()
        })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(
        z.object({
          startDate: z.string().date().optional(),
          endDate: z.string().date().optional(),
          formula: RentalFormulaEnum.schema.optional(),
          fuelIncluded: z.boolean().optional(),
          promoCode: z.string().max(30).nullish()
        }),
        request.body
      );

      const booking = await repriceBooking(
        id,
        {
          startDate: body.startDate ? toUtcDay(body.startDate) : undefined,
          endDate: body.endDate ? toUtcDay(body.endDate) : undefined,
          formula: body.formula,
          fuelIncluded: body.fuelIncluded,
          promoCode: body.promoCode
        },
        request
      );

      return { booking: serializeBooking(booking) };
    }
  );

  app.post(
    '/:id/notify-approaching',
    {
      preHandler: app.requireRole('ADMIN', 'DRIVER'),
      schema: doc({
        summary: 'Prévenir le client que le chauffeur approche',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({ etaMinutes: z.number().int().min(1).max(240).default(10) })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(
        z.object({ etaMinutes: z.number().int().min(1).max(240).default(10) }),
        request.body ?? {}
      );

      const booking = await getBookingOrThrow(id);
      if (!booking.driver) throw new NotFoundError('Chauffeur affecté');

      if (request.user!.role === 'DRIVER' && request.user!.driverId !== booking.assignedDriverId) {
        throw new ForbiddenError('Cette mission ne vous est pas affectée.');
      }

      const notification = await sendDriverApproaching(booking, booking.driver, body.etaMinutes);

      return { success: true, notificationId: notification.id };
    }
  );

  app.post(
    '/:id/invoice',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Émettre la facture d’une réservation',
        description: 'Idempotent : renvoie la facture existante le cas échéant.',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const booking = await getBookingOrThrow(id);
      const invoice = await issueInvoiceForBooking(booking.id);
      return { invoice };
    }
  );
}
