import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { toUtcDay } from '../../lib/dates.js';
import { InvoiceStatusEnum } from '../../lib/enums.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeInvoice } from '../../lib/serializers.js';
import { recordAudit } from '../../services/audit.service.js';
import { markOverdueInvoices } from '../../services/invoice.service.js';
import { sendInvoiceIssued } from '../../services/notification.service.js';

const TAG = 'Facturation';

const listSchema = paginationSchema.extend({
  status: InvoiceStatusEnum.schema.optional(),
  companyId: z.string().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  search: z.string().max(120).optional(),
  overdueOnly: z.coerce.boolean().optional()
});

export async function invoicesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: doc({
        summary: 'Lister les factures',
        description: 'Les comptes non-administrateurs ne voient que leurs propres factures.',
        tags: [TAG],
        querystring: listSchema
      })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);
      const user = request.user!;

      const scope: Prisma.InvoiceWhereInput =
        user.role === 'ADMIN'
          ? { ...(query.companyId ? { companyId: query.companyId } : {}) }
          : user.companyId
            ? { companyId: user.companyId }
            : { booking: { clientId: user.id } };

      const where: Prisma.InvoiceWhereInput = {
        ...scope,
        ...(query.status ? { status: query.status } : {}),
        ...(query.overdueOnly
          ? { dueDate: { lt: new Date() }, status: { in: ['EMISE', 'PARTIELLEMENT_PAYEE', 'EN_RETARD'] } }
          : {}),
        ...(query.from || query.to
          ? {
              issueDate: {
                ...(query.from ? { gte: toUtcDay(query.from) } : {}),
                ...(query.to ? { lte: toUtcDay(query.to) } : {})
              }
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { number: { contains: query.search, mode: 'insensitive' } },
                { clientName: { contains: query.search, mode: 'insensitive' } },
                { clientEmail: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [rows, total, aggregate] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: { booking: true, company: true },
          orderBy: { issueDate: 'desc' },
          skip,
          take
        }),
        prisma.invoice.count({ where }),
        prisma.invoice.aggregate({ where, _sum: { totalAmount: true, amountPaid: true } })
      ]);

      return {
        ...paginated(rows.map(serializeInvoice), total, query),
        totals: {
          invoiced: aggregate._sum.totalAmount ?? 0,
          collected: aggregate._sum.amountPaid ?? 0,
          outstanding: (aggregate._sum.totalAmount ?? 0) - (aggregate._sum.amountPaid ?? 0)
        }
      };
    }
  );

  app.get(
    '/:id',
    {
      schema: doc({
        summary: 'Détail d’une facture (id ou numéro FAC-AAAA-XXXX)',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const invoice = await prisma.invoice.findFirst({
        where: { OR: [{ id }, { number: id }] },
        include: { booking: { include: { vehicle: true } }, company: true }
      });
      if (!invoice) throw new NotFoundError('Facture');

      const user = request.user!;
      const isOwner =
        user.role === 'ADMIN' ||
        (invoice.companyId && invoice.companyId === user.companyId) ||
        invoice.booking?.clientId === user.id;

      if (!isOwner) throw new ForbiddenError('Cette facture ne vous concerne pas.');

      const payments = invoice.bookingId
        ? await prisma.payment.findMany({
            where: { bookingId: invoice.bookingId },
            orderBy: { createdAt: 'desc' }
          })
        : [];

      return {
        invoice: serializeInvoice(invoice),
        payments: payments.map((p) => ({
          reference: p.reference,
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt?.toISOString() ?? null
        }))
      };
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modifier une facture',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({
          status: InvoiceStatusEnum.schema.optional(),
          dueDate: z.string().date().optional(),
          notes: z.string().max(2000).nullish(),
          billingAddress: z.string().max(255).nullish()
        })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const schema = z.object({
        status: InvoiceStatusEnum.schema.optional(),
        dueDate: z.string().date().optional(),
        notes: z.string().max(2000).nullish(),
        billingAddress: z.string().max(255).nullish()
      });
      const body = parse(schema, request.body);

      const invoice = await prisma.invoice.update({
        where: { id },
        data: { ...body, ...(body.dueDate ? { dueDate: toUtcDay(body.dueDate) } : {}) },
        include: { booking: true, company: true }
      });

      await recordAudit({ request, action: 'invoice.update', entity: 'Invoice', entityId: id });

      return { invoice: serializeInvoice(invoice) };
    }
  );

  app.post(
    '/:id/send',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Envoyer la facture au client',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) throw new NotFoundError('Facture');

      const updated =
        invoice.status === 'BROUILLON'
          ? await prisma.invoice.update({ where: { id }, data: { status: 'EMISE' } })
          : invoice;

      const notification = await sendInvoiceIssued(updated);

      return { success: true, notificationId: notification.id, status: updated.status };
    }
  );

  app.post(
    '/refresh-overdue',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Basculer les factures échues en retard',
        description: 'À déclencher quotidiennement par une tâche planifiée.',
        tags: [TAG]
      })
    },
    async () => ({ updated: await markOverdueInvoices() })
  );
}
