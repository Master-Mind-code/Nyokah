import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CompanyStatusEnum } from '../../lib/enums.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeBooking, serializeCompany, serializeInvoice } from '../../lib/serializers.js';
import { startOfMonth } from '../../lib/dates.js';
import { recordAudit } from '../../services/audit.service.js';

const TAG = 'Entreprises B2B';

const companyBodySchema = z.object({
  name: z.string().min(2).max(160),
  tradeRegister: z.string().min(3).max(60),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(8).max(24),
  billingAddress: z.string().max(255).nullish(),
  negotiatedDiscountRate: z.number().int().min(0).max(100).default(0),
  promoCode: z.string().min(3).max(30).nullish(),
  monthlyVolumeTarget: z.number().int().min(0).default(0),
  status: CompanyStatusEnum.schema.optional(),
  accountManager: z.string().max(120).nullish(),
  creditLineApproved: z.boolean().default(false),
  creditLimit: z.number().int().min(0).default(0),
  paymentTermsDays: z.number().int().min(0).max(180).default(30),
  authorizedBookers: z.array(z.string().max(120)).max(50).default([]),
  notes: z.string().max(2000).nullish()
});

const listSchema = paginationSchema.extend({
  status: CompanyStatusEnum.schema.optional(),
  search: z.string().max(120).optional()
});

/** Un compte entreprise ne peut consulter que sa propre société. */
function assertCompanyScope(
  user: { role: string; companyId: string | null },
  companyId: string
): void {
  if (user.role === 'ADMIN') return;
  if (user.companyId !== companyId) {
    throw new ForbiddenError('Vous ne pouvez accéder qu’aux données de votre entreprise.');
  }
}

async function companyStats(companyId: string) {
  const [aggregate, count] = await Promise.all([
    prisma.booking.aggregate({
      where: { companyId, status: { not: 'ANNULEE' } },
      _sum: { totalAmount: true }
    }),
    prisma.booking.count({ where: { companyId, status: { not: 'ANNULEE' } } })
  ]);

  return { totalBookings: count, totalSpent: aggregate._sum.totalAmount ?? 0 };
}

export async function companiesRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Lister les comptes entreprise', tags: [TAG], querystring: listSchema })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const where: Prisma.CompanyWhereInput = {
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { tradeRegister: { contains: query.search, mode: 'insensitive' } },
                { contactName: { contains: query.search, mode: 'insensitive' } },
                { contactEmail: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.company.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
        prisma.company.count({ where })
      ]);

      // Agregats de dépense calculés en une requête groupée plutôt qu'en N+1.
      const grouped = await prisma.booking.groupBy({
        by: ['companyId'],
        where: { companyId: { in: rows.map((r) => r.id) }, status: { not: 'ANNULEE' } },
        _sum: { totalAmount: true },
        _count: { _all: true }
      });

      const statsByCompany = new Map(
        grouped.map((g) => [
          g.companyId,
          { totalBookings: g._count._all, totalSpent: g._sum.totalAmount ?? 0 }
        ])
      );

      return paginated(
        rows.map((c) => serializeCompany(c, statsByCompany.get(c.id))),
        total,
        query
      );
    }
  );

  app.get(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN', 'COMPANY'),
      schema: doc({ summary: 'Fiche entreprise', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      assertCompanyScope(request.user!, id);

      const company = await prisma.company.findFirst({ where: { id, deletedAt: null } });
      if (!company) throw new NotFoundError('Entreprise');

      const [stats, users, monthly] = await Promise.all([
        companyStats(id),
        prisma.user.findMany({
          where: { companyId: id, deletedAt: null },
          select: { id: true, fullName: true, email: true, companyRole: true, lastLoginAt: true }
        }),
        prisma.booking.count({
          where: {
            companyId: id,
            status: { not: 'ANNULEE' },
            createdAt: { gte: startOfMonth(new Date()) }
          }
        })
      ]);

      return {
        company: serializeCompany(company, stats),
        users,
        currentMonth: {
          bookings: monthly,
          target: company.monthlyVolumeTarget,
          targetReached: monthly >= company.monthlyVolumeTarget
        }
      };
    }
  );

  app.get(
    '/:id/bookings',
    {
      preHandler: app.requireRole('ADMIN', 'COMPANY'),
      schema: doc({
        summary: 'Réservations d’une entreprise',
        tags: [TAG],
        params: idParamSchema,
        querystring: paginationSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      assertCompanyScope(request.user!, id);

      const query = parse(paginationSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const [rows, total] = await Promise.all([
        prisma.booking.findMany({
          where: { companyId: id },
          include: { vehicle: true, company: true, driver: true, ride: true, payments: true, invoice: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.booking.count({ where: { companyId: id } })
      ]);

      return paginated(rows.map(serializeBooking), total, query);
    }
  );

  app.get(
    '/:id/invoices',
    {
      preHandler: app.requireRole('ADMIN', 'COMPANY'),
      schema: doc({
        summary: 'Factures d’une entreprise',
        tags: [TAG],
        params: idParamSchema,
        querystring: paginationSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      assertCompanyScope(request.user!, id);

      const query = parse(paginationSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const [rows, total, outstanding] = await Promise.all([
        prisma.invoice.findMany({
          where: { companyId: id },
          include: { booking: true, company: true },
          orderBy: { issueDate: 'desc' },
          skip,
          take
        }),
        prisma.invoice.count({ where: { companyId: id } }),
        prisma.invoice.aggregate({
          where: { companyId: id, status: { in: ['EMISE', 'PARTIELLEMENT_PAYEE', 'EN_RETARD'] } },
          _sum: { totalAmount: true, amountPaid: true }
        })
      ]);

      const result = paginated(rows.map(serializeInvoice), total, query);

      return {
        ...result,
        outstandingBalance:
          (outstanding._sum.totalAmount ?? 0) - (outstanding._sum.amountPaid ?? 0)
      };
    }
  );

  app.post(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Créer un compte entreprise', tags: [TAG], body: companyBodySchema })
    },
    async (request, reply) => {
      const body = parse(companyBodySchema, request.body);

      const company = await prisma.company.create({
        data: { ...body, promoCode: body.promoCode?.toUpperCase() ?? null }
      });

      await recordAudit({
        request,
        action: 'company.create',
        entity: 'Company',
        entityId: company.id,
        after: { name: company.name }
      });

      return reply.status(201).send({ company: serializeCompany(company, { totalBookings: 0, totalSpent: 0 }) });
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modifier une entreprise',
        tags: [TAG],
        params: idParamSchema,
        body: companyBodySchema.partial()
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(companyBodySchema.partial(), request.body);

      const before = await prisma.company.findFirst({ where: { id, deletedAt: null } });
      if (!before) throw new NotFoundError('Entreprise');

      const company = await prisma.company.update({
        where: { id },
        data: { ...body, ...(body.promoCode ? { promoCode: body.promoCode.toUpperCase() } : {}) }
      });

      // La règle promo dédiée suit la remise contractuelle négociée.
      if (
        body.negotiatedDiscountRate !== undefined &&
        body.negotiatedDiscountRate !== before.negotiatedDiscountRate &&
        company.promoCode
      ) {
        await prisma.promoRule.updateMany({
          where: { applicableToCompanyId: id },
          data: {
            discountPercentage: body.negotiatedDiscountRate,
            description: `Tarif entreprise ${company.name} (-${body.negotiatedDiscountRate}%)`
          }
        });
      }

      await recordAudit({
        request,
        action: 'company.update',
        entity: 'Company',
        entityId: id,
        before: { negotiatedDiscountRate: before.negotiatedDiscountRate, status: before.status },
        after: { negotiatedDiscountRate: company.negotiatedDiscountRate, status: company.status }
      });

      return { company: serializeCompany(company, await companyStats(id)) };
    }
  );

  app.delete(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Archiver une entreprise', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const active = await prisma.booking.count({
        where: { companyId: id, status: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] } }
      });

      if (active > 0) {
        return {
          success: false,
          message: `Cette entreprise a ${active} réservation(s) en cours. Clôturez-les avant d’archiver le compte.`
        };
      }

      await prisma.company.update({ where: { id }, data: { deletedAt: new Date() } });
      await recordAudit({ request, action: 'company.delete', entity: 'Company', entityId: id });

      return { success: true, message: 'Compte entreprise archivé.' };
    }
  );
}
