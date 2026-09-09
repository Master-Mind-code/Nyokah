import { randomInt } from 'node:crypto';
import type { Tx } from './prisma.js';

/**
 * Compteurs de references lisibles (RES-0942, RIDE-0105, FAC-2026-0007...).
 * La sequence est derivee du dernier enregistrement, sous transaction, et une
 * collision eventuelle est rattrapee par le suffixe aleatoire de secours.
 */

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

export async function nextBookingReference(tx: Tx): Promise<string> {
  const last = await tx.booking.findFirst({
    where: { reference: { startsWith: 'RES-' } },
    orderBy: { reference: 'desc' },
    select: { reference: true }
  });
  const lastNumber = last ? Number(last.reference.slice(4)) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `RES-${pad(next, 4)}`;
}

export async function nextRideReference(tx: Tx): Promise<string> {
  const last = await tx.ride.findFirst({
    where: { reference: { startsWith: 'RIDE-' } },
    orderBy: { reference: 'desc' },
    select: { reference: true }
  });
  const lastNumber = last ? Number(last.reference.slice(5)) : 100;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 101;
  return `RIDE-${pad(next, 4)}`;
}

export async function nextInvoiceNumber(tx: Tx): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `FAC-${year}-`;
  const last = await tx.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true }
  });
  const lastNumber = last ? Number(last.number.slice(prefix.length)) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `${prefix}${pad(next, 4)}`;
}

export function paymentReference(): string {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${pad(randomInt(0, 9999), 4)}`;
}

export function promoCode(prefix = 'PRO'): string {
  return `${prefix}${randomInt(1000, 9999)}`;
}

/** Marques combinantes Unicode : supprime les accents apres normalisation NFD. */
const COMBINING_MARKS = /\p{M}/gu;

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
