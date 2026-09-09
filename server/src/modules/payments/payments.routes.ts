import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { PaymentProviderEnum, PaymentStatusEnum } from '../../lib/enums.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { paymentReference } from '../../lib/references.js';
import { serializePayment } from '../../lib/serializers.js';
import { getPaymentAdapter } from '../../providers/payments/index.js';
import { recordAudit } from '../../services/audit.service.js';
import { assertCanAccessBooking, getBookingOrThrow } from '../../services/booking.service.js';
import { refreshInvoicePayment } from '../../services/invoice.service.js';
import { sendPaymentReceived } from '../../services/notification.service.js';

const TAG = 'Paiements';

const initiateSchema = z.object({
  bookingId: z.string().min(1),
  /** Montant partiel autorisé (acompte). Par défaut le solde restant dû. */
  amount: z.number().int().min(1).optional(),
  provider: PaymentProviderEnum.schema.optional(),
  payerPhone: z.string().max(24).optional()
});

const listSchema = paginationSchema.extend({
  bookingId: z.string().optional(),
  status: PaymentStatusEnum.schema.optional(),
  provider: PaymentProviderEnum.schema.optional()
});

/**
 * Applique le resultat d'un encaissement de facon idempotente : rejouer le meme
 * webhook ne credite jamais deux fois la reservation.
 */
async function applyPaymentResult(
  reference: string,
  status: 'REUSSI' | 'ECHOUE' | 'ANNULE' | 'REMBOURSE',
  options: { externalId?: string | null; failureReason?: string | null; metadata?: unknown } = {}
) {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { booking: { include: { vehicle: true, company: true, driver: true } } }
  });

  if (!payment) throw new NotFoundError('Paiement');
  if (payment.status === status) return payment;

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      externalId: options.externalId ?? payment.externalId,
      failureReason: options.failureReason ?? null,
      paidAt: status === 'REUSSI' ? new Date() : null,
      ...(options.metadata ? { metadata: options.metadata as Prisma.InputJsonValue } : {})
    },
    include: { booking: { include: { vehicle: true, company: true, driver: true } } }
  });

  if (status === 'REUSSI') {
    await refreshInvoicePayment(payment.bookingId);
    await sendPaymentReceived(updated.booking, updated.amount);
  }

  return updated;
}

export async function paymentsRoutes(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // Notification serveur a serveur (non authentifiee : signature verifiee par l'adaptateur)
  // -------------------------------------------------------------------------

  app.post(
    '/webhook',
    {
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
      schema: doc({
        summary: 'Webhook du prestataire de paiement',
        description:
          'Endpoint public appelé par le PSP. La signature est vérifiée par l’adaptateur ; une signature invalide renvoie 401. Le traitement est idempotent.',
        tags: [TAG],
        security: false
      })
    },
    async (request) => {
      const adapter = getPaymentAdapter();
      const event = await adapter.parseWebhook(request.body, request.headers);

      if (!event) {
        request.log.warn({ headers: request.headers }, 'Webhook de paiement rejeté (signature invalide)');
        throw new UnauthorizedError('Signature de notification invalide.');
      }

      // La confirmation du PSP est reverifiee serveur a serveur avant encaissement.
      const verified = await adapter.verify(event.reference, event.externalId);
      const finalStatus = verified.status === 'REUSSI' ? 'REUSSI' : event.status;

      if (finalStatus !== 'REUSSI' && finalStatus !== 'ECHOUE') {
        return { received: true, applied: false, status: finalStatus };
      }

      const payment = await applyPaymentResult(event.reference, finalStatus, {
        externalId: event.externalId,
        failureReason: finalStatus === 'ECHOUE' ? (verified.failureReason ?? 'Paiement refusé') : null,
        metadata: event.raw
      });

      return { received: true, applied: true, status: payment.status };
    }
  );

  app.post(
    '/:reference/simulate',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: doc({
        summary: 'Simuler l’issue d’un paiement (hors production)',
        description:
          'Disponible uniquement avec PAYMENT_PROVIDER=mock. Permet de valider le parcours de bout en bout sans compte marchand.',
        tags: [TAG],
        params: z.object({ reference: z.string().min(1) }),
        body: z.object({ outcome: z.enum(['success', 'failure']).default('success') }),
        security: false
      })
    },
    async (request) => {
      if (env.PAYMENT_PROVIDER !== 'mock') {
        throw new ConflictError('La simulation est désactivée : un vrai prestataire est configuré.');
      }

      const { reference } = parse(z.object({ reference: z.string().min(1) }), request.params);
      const body = parse(
        z.object({ outcome: z.enum(['success', 'failure']).default('success') }),
        request.body ?? {}
      );

      const payment = await applyPaymentResult(
        reference,
        body.outcome === 'success' ? 'REUSSI' : 'ECHOUE',
        { failureReason: body.outcome === 'failure' ? 'Paiement refusé (simulation)' : null }
      );

      return { payment: serializePayment(payment) };
    }
  );

  // -------------------------------------------------------------------------
  // Routes authentifiees
  // -------------------------------------------------------------------------

  app.post(
    '/',
    {
      preHandler: app.authenticate,
      schema: doc({
        summary: 'Initier un paiement',
        description:
          'Crée une intention de paiement pour le solde restant dû et renvoie l’URL de règlement (mobile money, carte...).',
        tags: [TAG],
        body: initiateSchema
      })
    },
    async (request, reply) => {
      const body = parse(initiateSchema, request.body);

      const booking = await getBookingOrThrow(body.bookingId);
      assertCanAccessBooking(request.user, booking);

      if (booking.status === 'ANNULEE') {
        throw new ConflictError('Impossible de payer une réservation annulée.');
      }

      const alreadyPaid = booking.payments
        .filter((p) => p.status === 'REUSSI')
        .reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = booking.totalAmount - alreadyPaid;

      if (balanceDue <= 0) throw new ConflictError('Cette réservation est déjà intégralement réglée.');

      const amount = body.amount ?? balanceDue;
      if (amount > balanceDue) {
        throw new ConflictError(
          `Le montant dépasse le solde restant dû (${balanceDue} ${booking.currency}).`
        );
      }

      const adapter = getPaymentAdapter();
      const reference = paymentReference();

      const checkout = await adapter.createCheckout({
        reference,
        amount,
        currency: booking.currency,
        description: `Réservation ${booking.reference} — Nyokah Mobility`,
        customer: {
          name: booking.clientName,
          email: booking.clientEmail,
          phone: body.payerPhone ?? booking.clientPhone
        },
        returnUrl: `${env.PAYMENT_RETURN_URL}?reference=${reference}`,
        notifyUrl: `${env.API_URL}/api/v1/payments/webhook`,
        metadata: { bookingId: booking.id, bookingReference: booking.reference }
      });

      const payment = await prisma.payment.create({
        data: {
          reference,
          bookingId: booking.id,
          provider: body.provider ?? adapter.name,
          amount,
          currency: booking.currency,
          status: checkout.status,
          externalId: checkout.externalId,
          checkoutUrl: checkout.checkoutUrl,
          payerPhone: body.payerPhone ?? booking.clientPhone,
          metadata: (checkout.raw ?? {}) as Prisma.InputJsonValue
        },
        include: { booking: true }
      });

      await recordAudit({
        request,
        action: 'payment.initiate',
        entity: 'Payment',
        entityId: payment.id,
        after: { reference, amount, bookingId: booking.id }
      });

      return reply.status(201).send({
        payment: serializePayment(payment),
        checkoutUrl: checkout.checkoutUrl
      });
    }
  );

  app.get(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Lister les paiements', tags: [TAG], querystring: listSchema })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const where: Prisma.PaymentWhereInput = {
        ...(query.bookingId ? { bookingId: query.bookingId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.provider ? { provider: query.provider } : {})
      };

      const [rows, total, collected] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: { booking: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.payment.count({ where }),
        prisma.payment.aggregate({ where: { ...where, status: 'REUSSI' }, _sum: { amount: true } })
      ]);

      return {
        ...paginated(rows.map(serializePayment), total, query),
        totals: { collected: collected._sum.amount ?? 0 }
      };
    }
  );

  app.get(
    '/:id',
    {
      preHandler: app.authenticate,
      schema: doc({
        summary: 'Détail d’un paiement (id ou référence)',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const payment = await prisma.payment.findFirst({
        where: { OR: [{ id }, { reference: id }] },
        include: { booking: true }
      });
      if (!payment) throw new NotFoundError('Paiement');

      const booking = await getBookingOrThrow(payment.bookingId);
      assertCanAccessBooking(request.user, booking);

      return { payment: serializePayment(payment) };
    }
  );

  app.post(
    '/:id/verify',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Re-vérifier un paiement auprès du prestataire',
        description: 'Utile si le webhook n’est jamais arrivé (réconciliation manuelle).',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const payment = await prisma.payment.findFirst({ where: { OR: [{ id }, { reference: id }] } });
      if (!payment) throw new NotFoundError('Paiement');

      const result = await getPaymentAdapter().verify(payment.reference, payment.externalId);

      if (result.status === 'REUSSI' || result.status === 'ECHOUE') {
        const updated = await applyPaymentResult(payment.reference, result.status, {
          failureReason: result.failureReason ?? null,
          metadata: result.raw
        });
        return { payment: serializePayment(updated) };
      }

      return {
        payment: serializePayment(payment),
        providerStatus: PaymentStatusEnum.toLabel(result.status)
      };
    }
  );

  app.post(
    '/:id/refund',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Marquer un paiement comme remboursé',
        description:
          'Enregistre le remboursement côté Nyokah. Le virement effectif reste effectué depuis le back-office du prestataire.',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({ reason: z.string().max(500).optional() })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(z.object({ reason: z.string().max(500).optional() }), request.body ?? {});

      const payment = await prisma.payment.findFirst({ where: { OR: [{ id }, { reference: id }] } });
      if (!payment) throw new NotFoundError('Paiement');
      if (payment.status !== 'REUSSI') {
        throw new ConflictError('Seul un paiement réussi peut être remboursé.');
      }

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REMBOURSE', failureReason: body.reason ?? 'Remboursement Nyokah' },
        include: { booking: true }
      });

      await refreshInvoicePayment(payment.bookingId);
      await recordAudit({
        request,
        action: 'payment.refund',
        entity: 'Payment',
        entityId: payment.id,
        after: { reason: body.reason ?? null }
      });

      return { payment: serializePayment(updated) };
    }
  );
}
