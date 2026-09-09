import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SubcontractorStatusEnum } from '../../lib/enums.js';
import { NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeSubcontractor, serializeVehicle } from '../../lib/serializers.js';
import { recordAudit } from '../../services/audit.service.js';

const TAG = 'Partenaires sous-traitants';

const bodySchema = z.object({
  name: z.string().min(2).max(160),
  contactPerson: z.string().min(2).max(120),
  phone: z.string().min(8).max(24),
  email: z.string().email(),
  commissionRate: z.number().int().min(0).max(100).default(0),
  status: SubcontractorStatusEnum.schema.optional(),
  notes: z.string().max(2000).nullish()
});

const listSchema = paginationSchema.extend({
  status: SubcontractorStatusEnum.schema.optional(),
  search: z.string().max(120).optional()
});

export async function subcontractorsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireRole('ADMIN'));

  app.get(
    '/',
    { schema: doc({ summary: 'Lister les partenaires', tags: [TAG], querystring: listSchema }) },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const where: Prisma.SubcontractorWhereInput = {
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { contactPerson: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.subcontractor.findMany({
          where,
          include: { vehicles: { where: { deletedAt: null } } },
          orderBy: { name: 'asc' },
          skip,
          take
        }),
        prisma.subcontractor.count({ where })
      ]);

      return paginated(rows.map(serializeSubcontractor), total, query);
    }
  );

  app.get(
    '/:id',
    { schema: doc({ summary: 'Fiche partenaire', tags: [TAG], params: idParamSchema }) },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const partner = await prisma.subcontractor.findFirst({
        where: { id, deletedAt: null },
        include: { vehicles: { where: { deletedAt: null }, include: { subcontractor: true } } }
      });
      if (!partner) throw new NotFoundError('Partenaire');

      // Chiffre d'affaires genere par la flotte du partenaire et commission due.
      const revenue = await prisma.booking.aggregate({
        where: {
          vehicleId: { in: partner.vehicles.map((v) => v.id) },
          status: 'TERMINEE'
        },
        _sum: { subtotal: true },
        _count: { _all: true }
      });

      const generatedRevenue = revenue._sum.subtotal ?? 0;

      return {
        subcontractor: serializeSubcontractor(partner),
        vehicles: partner.vehicles.map(serializeVehicle),
        performance: {
          completedBookings: revenue._count._all,
          generatedRevenue,
          commissionDue: Math.round((generatedRevenue * partner.commissionRate) / 100)
        }
      };
    }
  );

  app.post(
    '/',
    { schema: doc({ summary: 'Enregistrer un partenaire', tags: [TAG], body: bodySchema }) },
    async (request, reply) => {
      const body = parse(bodySchema, request.body);
      const partner = await prisma.subcontractor.create({ data: body, include: { vehicles: true } });

      await recordAudit({
        request,
        action: 'subcontractor.create',
        entity: 'Subcontractor',
        entityId: partner.id,
        after: { name: partner.name }
      });

      return reply.status(201).send({ subcontractor: serializeSubcontractor(partner) });
    }
  );

  app.patch(
    '/:id',
    {
      schema: doc({
        summary: 'Modifier un partenaire',
        tags: [TAG],
        params: idParamSchema,
        body: bodySchema.partial()
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(bodySchema.partial(), request.body);

      const partner = await prisma.subcontractor.update({
        where: { id },
        data: body,
        include: { vehicles: { where: { deletedAt: null } } }
      });

      await recordAudit({ request, action: 'subcontractor.update', entity: 'Subcontractor', entityId: id });

      return { subcontractor: serializeSubcontractor(partner) };
    }
  );

  app.delete(
    '/:id',
    { schema: doc({ summary: 'Archiver un partenaire', tags: [TAG], params: idParamSchema }) },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const vehicles = await prisma.vehicle.count({ where: { subcontractorId: id, deletedAt: null } });
      if (vehicles > 0) {
        return {
          success: false,
          message: `${vehicles} véhicule(s) sont encore rattachés à ce partenaire. Réaffectez-les d’abord.`
        };
      }

      await prisma.subcontractor.update({ where: { id }, data: { deletedAt: new Date() } });
      await recordAudit({ request, action: 'subcontractor.delete', entity: 'Subcontractor', entityId: id });

      return { success: true, message: 'Partenaire archivé.' };
    }
  );
}
