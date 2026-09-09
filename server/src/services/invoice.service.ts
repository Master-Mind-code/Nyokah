import type { Booking, Company, Prisma, Vehicle } from '@prisma/client';
import { addDays } from '../lib/dates.js';
import { NotFoundError } from '../lib/errors.js';
import { prisma, type Tx } from '../lib/prisma.js';
import { nextInvoiceNumber } from '../lib/references.js';
import { RentalFormulaEnum } from '../lib/enums.js';
import { getGeneralConfig } from './settings.service.js';

export interface InvoiceLine {
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/** Detail de facturation reconstruit depuis la reservation (jamais saisi a la main). */
export function buildInvoiceLines(booking: Booking, vehicle: Vehicle): InvoiceLine[] {
  const lines: InvoiceLine[] = [
    {
      label: `Location ${vehicle.brand} ${vehicle.model} (${vehicle.year}) — ${RentalFormulaEnum.toLabel(
        booking.formula
      )}`,
      quantity: booking.durationDays,
      unitPrice: booking.baseRate,
      amount: booking.basePrice
    }
  ];

  if (booking.optionsPrice > 0) {
    lines.push({
      label: 'Option carburant incluse',
      quantity: booking.durationDays,
      unitPrice: Math.round(booking.optionsPrice / Math.max(1, booking.durationDays)),
      amount: booking.optionsPrice
    });
  }

  if (booking.discountAmount > 0) {
    lines.push({
      label: booking.discountReason || `Remise commerciale (-${booking.discountPercentage}%)`,
      quantity: 1,
      unitPrice: -booking.discountAmount,
      amount: -booking.discountAmount
    });
  }

  return lines;
}

/**
 * Emet la facture d'une reservation. Idempotent : si une facture existe deja
 * pour cette reservation, elle est renvoyee telle quelle.
 */
export async function issueInvoiceForBooking(
  bookingId: string,
  options: { client?: Tx; status?: 'BROUILLON' | 'EMISE' } = {}
) {
  const db = options.client ?? prisma;

  const existing = await db.invoice.findUnique({ where: { bookingId } });
  if (existing) return existing;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { vehicle: true, company: true, payments: true }
  });

  if (!booking) throw new NotFoundError('Réservation');

  const company: Company | null = booking.company;
  // Échéance de la société si elle en a une, sinon le délai par défaut paramétré.
  const { invoiceDueDays } = await getGeneralConfig();
  const paymentTerms = company?.paymentTermsDays ?? invoiceDueDays;
  const amountPaid = booking.payments
    .filter((p) => p.status === 'REUSSI')
    .reduce((sum, p) => sum + p.amount, 0);

  const status =
    amountPaid >= booking.totalAmount
      ? 'PAYEE'
      : amountPaid > 0
        ? 'PARTIELLEMENT_PAYEE'
        : (options.status ?? 'EMISE');

  return db.invoice.create({
    data: {
      number: await nextInvoiceNumber(db),
      bookingId: booking.id,
      companyId: booking.companyId,
      clientName: company?.name ?? booking.clientName,
      clientEmail: company?.contactEmail ?? booking.clientEmail,
      billingAddress: company?.billingAddress ?? null,
      issueDate: new Date(),
      dueDate: addDays(new Date(), paymentTerms),
      subtotal: booking.subtotal,
      taxRate: booking.taxRate,
      taxAmount: booking.taxAmount,
      totalAmount: booking.totalAmount,
      amountPaid,
      currency: booking.currency,
      status,
      lines: buildInvoiceLines(booking, booking.vehicle) as unknown as Prisma.InputJsonValue
    }
  });
}

/** Recalcule le statut d'une facture apres encaissement. */
export async function refreshInvoicePayment(bookingId: string, client?: Tx) {
  const db = client ?? prisma;

  const invoice = await db.invoice.findUnique({ where: { bookingId } });
  if (!invoice) return null;

  const paid = await db.payment.aggregate({
    where: { bookingId, status: 'REUSSI' },
    _sum: { amount: true }
  });

  const amountPaid = paid._sum.amount ?? 0;
  const status =
    amountPaid >= invoice.totalAmount
      ? 'PAYEE'
      : amountPaid > 0
        ? 'PARTIELLEMENT_PAYEE'
        : invoice.dueDate < new Date()
          ? 'EN_RETARD'
          : invoice.status;

  return db.invoice.update({ where: { id: invoice.id }, data: { amountPaid, status } });
}

/** Passe en retard toutes les factures echues non soldees. Appelable par un cron. */
export async function markOverdueInvoices(): Promise<number> {
  const result = await prisma.invoice.updateMany({
    where: {
      dueDate: { lt: new Date() },
      status: { in: ['EMISE', 'PARTIELLEMENT_PAYEE'] }
    },
    data: { status: 'EN_RETARD' }
  });
  return result.count;
}
