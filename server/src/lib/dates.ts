const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Accepte "2026-09-02" ou une date ISO complete, toujours ancree a minuit UTC. */
export function toUtcDay(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date invalide : ${String(value)}`);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Format "YYYY-MM-DD" attendu par le frontend. */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Nombre de jours factures entre deux dates. Une location qui commence et
 * finit le meme jour compte pour une journee pleine.
 */
export function countRentalDays(start: Date, end: Date): number {
  const diff = Math.ceil((toUtcDay(end).getTime() - toUtcDay(start).getTime()) / MS_PER_DAY);
  return diff <= 0 ? 1 : diff;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/** Deux intervalles [aStart, aEnd] et [bStart, bEnd] se chevauchent-ils ? */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
