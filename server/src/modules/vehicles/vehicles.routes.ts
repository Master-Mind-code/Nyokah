import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { toUtcDay } from '../../lib/dates.js';
import {
  FuelTypeEnum,
  OwnershipTypeEnum,
  TransmissionEnum,
  VehicleCategoryEnum,
  VehicleStatusEnum
} from '../../lib/enums.js';
import { NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeVehicle } from '../../lib/serializers.js';
import {
  checkVehicleAvailability,
  unavailableVehicleIds
} from '../../services/availability.service.js';
import { recordAudit } from '../../services/audit.service.js';

const TAG = 'Flotte';

const vehicleBodySchema = z.object({
  brand: z.string().min(1).max(60),
  model: z.string().min(1).max(80),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 2),
  category: VehicleCategoryEnum.schema,
  seats: z.number().int().min(1).max(60),
  luggage: z.number().int().min(0).max(60),
  transmission: TransmissionEnum.schema,
  fuel: FuelTypeEnum.schema,
  plateNumber: z.string().min(3).max(20),
  dailyRate: z.number().int().min(0),
  halfDayRate: z.number().int().min(0),
  airportTransferRate: z.number().int().min(0),
  monthlyRate: z.number().int().min(0).nullish(),
  status: VehicleStatusEnum.schema.optional(),
  ownership: OwnershipTypeEnum.schema.optional(),
  subcontractorId: z.string().nullish(),
  isVip: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  imageUrl: z.string().url(),
  galleryUrls: z.array(z.string().url()).max(20).default([]),
  features: z.array(z.string().max(120)).max(30).default([]),
  description: z.string().max(2000).default(''),
  mileageLimit: z.string().max(120).default(''),
  currentMileage: z.number().int().min(0).nullish(),
  insuranceExpiry: z.string().date().nullish(),
  technicalControlExpiry: z.string().date().nullish()
});

const listVehiclesSchema = paginationSchema.extend({
  category: VehicleCategoryEnum.schema.optional(),
  status: VehicleStatusEnum.schema.optional(),
  ownership: OwnershipTypeEnum.schema.optional(),
  transmission: TransmissionEnum.schema.optional(),
  fuel: FuelTypeEnum.schema.optional(),
  isVip: z.coerce.boolean().optional(),
  isRecommended: z.coerce.boolean().optional(),
  minSeats: z.coerce.number().int().min(1).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  search: z.string().max(120).optional(),
  /** Filtre de disponibilité réelle sur une période. */
  availableFrom: z.string().date().optional(),
  availableTo: z.string().date().optional(),
  sort: z
    .enum(['recommended', 'price_asc', 'price_desc', 'recent', 'seats_desc'])
    .default('recommended')
});

const availabilityQuerySchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date()
});

function toDateOrNull(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : toUtcDay(value);
}

function orderBy(sort: z.infer<typeof listVehiclesSchema>['sort']): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case 'price_asc':
      return [{ dailyRate: 'asc' }];
    case 'price_desc':
      return [{ dailyRate: 'desc' }];
    case 'recent':
      return [{ createdAt: 'desc' }];
    case 'seats_desc':
      return [{ seats: 'desc' }];
    case 'recommended':
    default:
      return [{ isRecommended: 'desc' }, { isVip: 'desc' }, { dailyRate: 'asc' }];
  }
}

export async function vehiclesRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      schema: doc({
        summary: 'Rechercher dans le catalogue',
        description:
          'Endpoint public. Renseignez availableFrom/availableTo pour n’obtenir que les véhicules réellement libres sur la période.',
        tags: [TAG],
        querystring: listVehiclesSchema,
        security: false
      })
    },
    async (request) => {
      const query = parse(listVehiclesSchema, request.query);
      const { skip, take } = toSkipTake(query);

      let excludedIds: string[] = [];
      if (query.availableFrom && query.availableTo) {
        const busy = await unavailableVehicleIds(
          toUtcDay(query.availableFrom),
          toUtcDay(query.availableTo)
        );
        excludedIds = [...busy];
      }

      const where: Prisma.VehicleWhereInput = {
        deletedAt: null,
        ...(query.category ? { category: query.category } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.ownership ? { ownership: query.ownership } : {}),
        ...(query.transmission ? { transmission: query.transmission } : {}),
        ...(query.fuel ? { fuel: query.fuel } : {}),
        ...(query.isVip !== undefined ? { isVip: query.isVip } : {}),
        ...(query.isRecommended !== undefined ? { isRecommended: query.isRecommended } : {}),
        ...(query.minSeats ? { seats: { gte: query.minSeats } } : {}),
        ...(query.minPrice !== undefined || query.maxPrice !== undefined
          ? {
              dailyRate: {
                ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
                ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {})
              }
            }
          : {}),
        ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
        ...(query.search
          ? {
              OR: [
                { brand: { contains: query.search, mode: 'insensitive' } },
                { model: { contains: query.search, mode: 'insensitive' } },
                { plateNumber: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          include: { subcontractor: true, maintenances: true },
          orderBy: orderBy(query.sort),
          skip,
          take
        }),
        prisma.vehicle.count({ where })
      ]);

      return paginated(rows.map(serializeVehicle), total, query);
    }
  );

  app.get(
    '/categories',
    {
      schema: doc({
        summary: 'Répartition du catalogue par catégorie',
        tags: [TAG],
        security: false
      })
    },
    async () => {
      const grouped = await prisma.vehicle.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: { _all: true },
        _min: { dailyRate: true }
      });

      return {
        data: grouped.map((g) => ({
          category: VehicleCategoryEnum.toLabel(g.category),
          count: g._count._all,
          startingFrom: g._min.dailyRate ?? 0
        }))
      };
    }
  );

  app.get(
    '/:id',
    {
      schema: doc({
        summary: 'Fiche détaillée d’un véhicule',
        tags: [TAG],
        params: idParamSchema,
        security: false
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const vehicle = await prisma.vehicle.findFirst({
        where: { id, deletedAt: null },
        include: {
          subcontractor: true,
          maintenances: { orderBy: { scheduledDate: 'desc' } },
          reviews: {
            where: { published: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { user: true }
          }
        }
      });

      if (!vehicle) throw new NotFoundError('Véhicule');

      const ratings = await prisma.review.aggregate({
        where: { vehicleId: id, published: true },
        _avg: { rating: true },
        _count: { _all: true }
      });

      return {
        vehicle: serializeVehicle(vehicle),
        rating: { average: ratings._avg.rating ?? null, count: ratings._count._all },
        reviews: vehicle.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          authorName: r.user?.fullName ?? 'Client Nyokah',
          createdAt: r.createdAt.toISOString()
        }))
      };
    }
  );

  app.get(
    '/:id/availability',
    {
      schema: doc({
        summary: 'Vérifier la disponibilité sur une période',
        tags: [TAG],
        params: idParamSchema,
        querystring: availabilityQuerySchema,
        security: false
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const query = parse(availabilityQuerySchema, request.query);

      return checkVehicleAvailability(id, toUtcDay(query.startDate), toUtcDay(query.endDate));
    }
  );

  app.get(
    '/:id/calendar',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Planning d’occupation d’un véhicule',
        tags: [TAG],
        params: idParamSchema,
        querystring: z.object({
          from: z.string().date().optional(),
          to: z.string().date().optional()
        })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const query = parse(
        z.object({ from: z.string().date().optional(), to: z.string().date().optional() }),
        request.query
      );

      const from = query.from ? toUtcDay(query.from) : new Date();
      const to = query.to ? toUtcDay(query.to) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      const [bookings, maintenances] = await Promise.all([
        prisma.booking.findMany({
          where: {
            vehicleId: id,
            status: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
            startDate: { lte: to },
            endDate: { gte: from }
          },
          orderBy: { startDate: 'asc' },
          include: { driver: true }
        }),
        prisma.maintenanceRecord.findMany({
          where: {
            vehicleId: id,
            status: { in: ['PLANIFIEE', 'EN_COURS'] },
            scheduledDate: { gte: from, lte: to }
          },
          orderBy: { scheduledDate: 'asc' }
        })
      ]);

      return {
        bookings: bookings.map((b) => ({
          id: b.id,
          reference: b.reference,
          clientName: b.clientName,
          driverName: b.driver?.name ?? null,
          startDate: b.startDate.toISOString().slice(0, 10),
          endDate: b.endDate.toISOString().slice(0, 10),
          status: b.status
        })),
        maintenances: maintenances.map((m) => ({
          id: m.id,
          type: m.type,
          date: m.scheduledDate.toISOString().slice(0, 10),
          status: m.status
        }))
      };
    }
  );

  app.post(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Ajouter un véhicule à la flotte', tags: [TAG], body: vehicleBodySchema })
    },
    async (request, reply) => {
      const body = parse(vehicleBodySchema, request.body);

      const vehicle = await prisma.vehicle.create({
        data: {
          ...body,
          plateNumber: body.plateNumber.toUpperCase(),
          insuranceExpiry: toDateOrNull(body.insuranceExpiry),
          technicalControlExpiry: toDateOrNull(body.technicalControlExpiry),
          ownership: body.ownership ?? (body.subcontractorId ? 'SOUS_TRAITANT' : 'FLOTTE_PROPRE')
        },
        include: { subcontractor: true, maintenances: true }
      });

      await recordAudit({
        request,
        action: 'vehicle.create',
        entity: 'Vehicle',
        entityId: vehicle.id,
        after: { plateNumber: vehicle.plateNumber }
      });

      return reply.status(201).send({ vehicle: serializeVehicle(vehicle) });
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modifier un véhicule',
        tags: [TAG],
        params: idParamSchema,
        body: vehicleBodySchema.partial()
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(vehicleBodySchema.partial(), request.body);

      const before = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
      if (!before) throw new NotFoundError('Véhicule');

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          ...body,
          ...(body.plateNumber ? { plateNumber: body.plateNumber.toUpperCase() } : {}),
          insuranceExpiry: toDateOrNull(body.insuranceExpiry),
          technicalControlExpiry: toDateOrNull(body.technicalControlExpiry)
        },
        include: { subcontractor: true, maintenances: true }
      });

      await recordAudit({
        request,
        action: 'vehicle.update',
        entity: 'Vehicle',
        entityId: id,
        before: { status: before.status, dailyRate: before.dailyRate },
        after: { status: vehicle.status, dailyRate: vehicle.dailyRate }
      });

      return { vehicle: serializeVehicle(vehicle) };
    }
  );

  app.patch(
    '/:id/status',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Changer le statut d’un véhicule',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({ status: VehicleStatusEnum.schema })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(z.object({ status: VehicleStatusEnum.schema }), request.body);

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: { status: body.status },
        include: { subcontractor: true, maintenances: true }
      });

      await recordAudit({
        request,
        action: 'vehicle.status',
        entity: 'Vehicle',
        entityId: id,
        after: { status: body.status }
      });

      return { vehicle: serializeVehicle(vehicle) };
    }
  );

  app.delete(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Retirer un véhicule du parc',
        description:
          'Suppression logique. Refusée si le véhicule porte encore des réservations actives.',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const vehicle = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
      if (!vehicle) throw new NotFoundError('Véhicule');

      const active = await prisma.booking.count({
        where: { vehicleId: id, status: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] } }
      });

      if (active > 0) {
        return {
          success: false,
          message: `Ce véhicule porte ${active} réservation(s) active(s). Annulez-les ou réaffectez-les avant de le retirer.`
        };
      }

      await prisma.vehicle.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INDISPONIBLE' }
      });

      await recordAudit({ request, action: 'vehicle.delete', entity: 'Vehicle', entityId: id });

      return { success: true, message: 'Véhicule retiré du parc.' };
    }
  );
}
