import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { addDays, toUtcDay } from '../../lib/dates.js';
import { MaintenanceStatusEnum, MaintenanceTypeEnum } from '../../lib/enums.js';
import { NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeMaintenance } from '../../lib/serializers.js';
import { recordAudit } from '../../services/audit.service.js';

const TAG = 'Entretien';

const createSchema = z.object({
  vehicleId: z.string().min(1),
  type: MaintenanceTypeEnum.schema,
  scheduledDate: z.string().date(),
  mileage: z.number().int().min(0).nullish(),
  cost: z.number().int().min(0).nullish(),
  garage: z.string().max(160).nullish(),
  notes: z.string().max(1000).nullish(),
  /** Immobilise immédiatement le véhicule (statut Entretien). */
  blockVehicle: z.boolean().default(false)
});

const listSchema = paginationSchema.extend({
  vehicleId: z.string().optional(),
  status: MaintenanceStatusEnum.schema.optional(),
  type: MaintenanceTypeEnum.schema.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  /** Entretiens planifiés dans les N prochains jours. */
  dueWithinDays: z.coerce.number().int().min(1).max(365).optional()
});

export async function maintenanceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireRole('ADMIN'));

  app.get(
    '/',
    { schema: doc({ summary: 'Lister les entretiens', tags: [TAG], querystring: listSchema }) },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.from) dateFilter.gte = toUtcDay(query.from);
      if (query.to) dateFilter.lte = toUtcDay(query.to);
      if (query.dueWithinDays) {
        dateFilter.gte = dateFilter.gte ?? new Date();
        dateFilter.lte = addDays(new Date(), query.dueWithinDays);
      }

      const where: Prisma.MaintenanceRecordWhereInput = {
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { scheduledDate: dateFilter } : {})
      };

      const [rows, total] = await Promise.all([
        prisma.maintenanceRecord.findMany({
          where,
          include: { vehicle: true },
          orderBy: { scheduledDate: 'asc' },
          skip,
          take
        }),
        prisma.maintenanceRecord.count({ where })
      ]);

      return paginated(rows.map(serializeMaintenance), total, query);
    }
  );

  app.post(
    '/',
    { schema: doc({ summary: 'Planifier un entretien', tags: [TAG], body: createSchema }) },
    async (request, reply) => {
      const body = parse(createSchema, request.body);

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: body.vehicleId, deletedAt: null }
      });
      if (!vehicle) throw new NotFoundError('Véhicule');

      const record = await prisma.$transaction(async (tx) => {
        const created = await tx.maintenanceRecord.create({
          data: {
            vehicleId: body.vehicleId,
            type: body.type,
            scheduledDate: toUtcDay(body.scheduledDate),
            mileage: body.mileage ?? null,
            cost: body.cost ?? null,
            garage: body.garage ?? null,
            notes: body.notes ?? null,
            status: 'PLANIFIEE'
          },
          include: { vehicle: true }
        });

        if (body.blockVehicle) {
          await tx.vehicle.update({ where: { id: body.vehicleId }, data: { status: 'ENTRETIEN' } });
        }

        return created;
      });

      await recordAudit({
        request,
        action: 'maintenance.create',
        entity: 'MaintenanceRecord',
        entityId: record.id,
        after: { vehicleId: record.vehicleId, type: record.type }
      });

      return reply.status(201).send({ maintenance: serializeMaintenance(record) });
    }
  );

  app.patch(
    '/:id',
    {
      schema: doc({
        summary: 'Mettre à jour un entretien',
        tags: [TAG],
        params: idParamSchema,
        body: createSchema.partial().omit({ vehicleId: true, blockVehicle: true }).extend({
          status: MaintenanceStatusEnum.schema.optional(),
          completedDate: z.string().date().nullish()
        })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const schema = createSchema
        .partial()
        .omit({ vehicleId: true, blockVehicle: true })
        .extend({
          status: MaintenanceStatusEnum.schema.optional(),
          completedDate: z.string().date().nullish()
        });
      const body = parse(schema, request.body);

      const existing = await prisma.maintenanceRecord.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Entretien');

      const record = await prisma.$transaction(async (tx) => {
        const updated = await tx.maintenanceRecord.update({
          where: { id },
          data: {
            ...body,
            scheduledDate: body.scheduledDate ? toUtcDay(body.scheduledDate) : undefined,
            completedDate:
              body.completedDate === undefined
                ? body.status === 'TERMINEE'
                  ? new Date()
                  : undefined
                : body.completedDate === null
                  ? null
                  : toUtcDay(body.completedDate)
          },
          include: { vehicle: true }
        });

        // Le véhicule est remis en service dès que plus aucun entretien ne le bloque.
        if (body.status === 'TERMINEE' || body.status === 'ANNULEE') {
          const blocking = await tx.maintenanceRecord.count({
            where: { vehicleId: updated.vehicleId, status: { in: ['PLANIFIEE', 'EN_COURS'] } }
          });
          if (blocking === 0 && updated.vehicle.status === 'ENTRETIEN') {
            await tx.vehicle.update({
              where: { id: updated.vehicleId },
              data: {
                status: 'DISPONIBLE',
                ...(updated.mileage ? { currentMileage: updated.mileage } : {})
              }
            });
          }
        }

        if (body.status === 'EN_COURS') {
          await tx.vehicle.update({
            where: { id: updated.vehicleId },
            data: { status: 'ENTRETIEN' }
          });
        }

        return updated;
      });

      await recordAudit({
        request,
        action: 'maintenance.update',
        entity: 'MaintenanceRecord',
        entityId: id,
        before: { status: existing.status },
        after: { status: record.status }
      });

      return { maintenance: serializeMaintenance(record) };
    }
  );

  app.delete(
    '/:id',
    { schema: doc({ summary: 'Supprimer un entretien', tags: [TAG], params: idParamSchema }) },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      await prisma.maintenanceRecord.delete({ where: { id } });
      await recordAudit({ request, action: 'maintenance.delete', entity: 'MaintenanceRecord', entityId: id });
      return { success: true };
    }
  );

  app.get(
    '/alerts',
    {
      schema: doc({
        summary: 'Alertes de flotte',
        description:
          'Entretiens à échéance, assurances et contrôles techniques expirant dans les 30 jours.',
        tags: [TAG]
      })
    },
    async () => {
      const horizon = addDays(new Date(), 30);

      const [dueMaintenances, expiringInsurance, expiringControl] = await Promise.all([
        prisma.maintenanceRecord.findMany({
          where: { status: 'PLANIFIEE', scheduledDate: { lte: horizon } },
          include: { vehicle: true },
          orderBy: { scheduledDate: 'asc' }
        }),
        prisma.vehicle.findMany({
          where: { deletedAt: null, insuranceExpiry: { not: null, lte: horizon } },
          orderBy: { insuranceExpiry: 'asc' }
        }),
        prisma.vehicle.findMany({
          where: { deletedAt: null, technicalControlExpiry: { not: null, lte: horizon } },
          orderBy: { technicalControlExpiry: 'asc' }
        })
      ]);

      return {
        maintenancesDue: dueMaintenances.map(serializeMaintenance),
        insuranceExpiring: expiringInsurance.map((v) => ({
          id: v.id,
          vehicle: `${v.brand} ${v.model}`,
          plateNumber: v.plateNumber,
          expiresOn: v.insuranceExpiry?.toISOString().slice(0, 10) ?? null
        })),
        technicalControlExpiring: expiringControl.map((v) => ({
          id: v.id,
          vehicle: `${v.brand} ${v.model}`,
          plateNumber: v.plateNumber,
          expiresOn: v.technicalControlExpiry?.toISOString().slice(0, 10) ?? null
        }))
      };
    }
  );
}
