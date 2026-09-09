import type { BookingStatus, Prisma } from '@prisma/client';
import { prisma, type Tx } from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';
import { toDateString } from '../lib/dates.js';

/** Statuts qui immobilisent reellement un vehicule ou un chauffeur. */
export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'];

/**
 * Deux locations se chevauchent si `start <= otherEnd && otherStart <= end`.
 * Les bornes sont inclusives : un vehicule rendu le 5 n'est pas relouable le 5,
 * le temps de la remise en etat et du nettoyage.
 */
function overlapFilter(startDate: Date, endDate: Date): Prisma.BookingWhereInput {
  return { startDate: { lte: endDate }, endDate: { gte: startDate } };
}

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
  conflicts: Array<{
    reference: string;
    startDate: string;
    endDate: string;
    status: BookingStatus;
  }>;
}

export async function checkVehicleAvailability(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  options: { excludeBookingId?: string; client?: Tx } = {}
): Promise<AvailabilityResult> {
  const db = options.client ?? prisma;

  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, deletedAt: null },
    select: { id: true, status: true, brand: true, model: true }
  });

  if (!vehicle) throw new NotFoundError('Véhicule');

  if (vehicle.status === 'ENTRETIEN' || vehicle.status === 'INDISPONIBLE') {
    return {
      available: false,
      reason:
        vehicle.status === 'ENTRETIEN'
          ? 'Ce véhicule est actuellement immobilisé pour entretien.'
          : "Ce véhicule est temporairement retiré de la location.",
      conflicts: []
    };
  }

  const conflicts = await db.booking.findMany({
    where: {
      vehicleId,
      status: { in: BLOCKING_BOOKING_STATUSES },
      ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      ...overlapFilter(startDate, endDate)
    },
    select: { reference: true, startDate: true, endDate: true, status: true },
    orderBy: { startDate: 'asc' },
    take: 10
  });

  if (conflicts.length > 0) {
    return {
      available: false,
      reason: `Ce véhicule est déjà réservé sur la période demandée (${conflicts.length} réservation(s) en conflit).`,
      conflicts: conflicts.map((c) => ({
        reference: c.reference,
        startDate: toDateString(c.startDate),
        endDate: toDateString(c.endDate),
        status: c.status
      }))
    };
  }

  return { available: true, conflicts: [] };
}

/** Variante levant une 409, a utiliser dans les transactions d'ecriture. */
export async function assertVehicleAvailable(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  options: { excludeBookingId?: string; client?: Tx } = {}
): Promise<void> {
  const result = await checkVehicleAvailability(vehicleId, startDate, endDate, options);
  if (!result.available) {
    throw new ConflictError(result.reason ?? 'Véhicule indisponible.', {
      conflicts: result.conflicts
    });
  }
}

export async function checkDriverAvailability(
  driverId: string,
  startDate: Date,
  endDate: Date,
  options: { excludeBookingId?: string; client?: Tx } = {}
): Promise<AvailabilityResult> {
  const db = options.client ?? prisma;

  const driver = await db.driver.findFirst({
    where: { id: driverId, deletedAt: null },
    select: { id: true, status: true, name: true }
  });

  if (!driver) throw new NotFoundError('Chauffeur');

  if (driver.status === 'CONGE') {
    return { available: false, reason: `${driver.name} est en congé.`, conflicts: [] };
  }

  const conflicts = await db.booking.findMany({
    where: {
      assignedDriverId: driverId,
      status: { in: BLOCKING_BOOKING_STATUSES },
      ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      ...overlapFilter(startDate, endDate)
    },
    select: { reference: true, startDate: true, endDate: true, status: true },
    orderBy: { startDate: 'asc' },
    take: 10
  });

  if (conflicts.length > 0) {
    return {
      available: false,
      reason: `${driver.name} est déjà affecté à une mission sur cette période.`,
      conflicts: conflicts.map((c) => ({
        reference: c.reference,
        startDate: toDateString(c.startDate),
        endDate: toDateString(c.endDate),
        status: c.status
      }))
    };
  }

  return { available: true, conflicts: [] };
}

export async function assertDriverAvailable(
  driverId: string,
  startDate: Date,
  endDate: Date,
  options: { excludeBookingId?: string; client?: Tx } = {}
): Promise<void> {
  const result = await checkDriverAvailability(driverId, startDate, endDate, options);
  if (!result.available) {
    throw new ConflictError(result.reason ?? 'Chauffeur indisponible.', {
      conflicts: result.conflicts
    });
  }
}

/** Identifiants des vehicules immobilises sur la periode (reservation ou statut). */
export async function unavailableVehicleIds(startDate: Date, endDate: Date): Promise<Set<string>> {
  const [booked, offFleet] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { in: BLOCKING_BOOKING_STATUSES }, ...overlapFilter(startDate, endDate) },
      select: { vehicleId: true },
      distinct: ['vehicleId']
    }),
    prisma.vehicle.findMany({
      where: { deletedAt: null, status: { in: ['ENTRETIEN', 'INDISPONIBLE'] } },
      select: { id: true }
    })
  ]);

  return new Set([...booked.map((b) => b.vehicleId), ...offFleet.map((v) => v.id)]);
}

/** Chauffeurs libres sur la periode, tries par note decroissante. */
export async function availableDrivers(startDate: Date, endDate: Date) {
  const busy = await prisma.booking.findMany({
    where: {
      assignedDriverId: { not: null },
      status: { in: BLOCKING_BOOKING_STATUSES },
      ...overlapFilter(startDate, endDate)
    },
    select: { assignedDriverId: true },
    distinct: ['assignedDriverId']
  });

  const busyIds = busy.map((b) => b.assignedDriverId).filter((id): id is string => Boolean(id));

  return prisma.driver.findMany({
    where: { deletedAt: null, status: { not: 'CONGE' }, id: { notIn: busyIds } },
    orderBy: [{ rating: 'desc' }, { completedRides: 'desc' }]
  });
}
