import type { BookingStatus, RentalFormula } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from '../lib/errors.js';
import { prisma, type Tx } from '../lib/prisma.js';
import { nextBookingReference, nextRideReference } from '../lib/references.js';
import { toUtcDay } from '../lib/dates.js';
import { assertDriverAvailable, assertVehicleAvailable } from './availability.service.js';
import { getPricingConfig, quote } from './pricing.service.js';
import { getGeneralConfig } from './settings.service.js';
import { issueInvoiceForBooking } from './invoice.service.js';
import {
  sendBookingCancelled,
  sendBookingReceived,
  sendBookingValidated,
  sendDriverAssigned,
  sendTripCompleted
} from './notification.service.js';
import { recordAudit } from './audit.service.js';
import type { AuthenticatedUser } from '../plugins/auth.js';

/** Combine une date (minuit UTC) et un horaire « HH:MM » en instant precis. */
export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

const BOOKING_INCLUDE = {
  vehicle: true,
  company: true,
  driver: true,
  ride: true,
  payments: true,
  invoice: true
} as const;

/**
 * Transitions autorisees. Toute autre combinaison est refusee en 409, ce qui
 * evite qu'une reservation annulee redevienne active ou qu'une mission soit
 * cloturee sans avoir demarre.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  EN_ATTENTE: ['CONFIRMEE', 'ANNULEE'],
  CONFIRMEE: ['EN_COURS', 'ANNULEE'],
  EN_COURS: ['TERMINEE', 'ANNULEE'],
  TERMINEE: [],
  ANNULEE: []
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export async function getBookingOrThrow(idOrReference: string) {
  const booking = await prisma.booking.findFirst({
    where: { OR: [{ id: idOrReference }, { reference: idOrReference }] },
    include: BOOKING_INCLUDE
  });
  if (!booking) throw new NotFoundError('Réservation');
  return booking;
}

/** Un client ne voit que ses reservations ; un compte entreprise voit celles de sa societe. */
export function assertCanAccessBooking(
  user: AuthenticatedUser | null,
  booking: { clientId: string | null; companyId: string | null; assignedDriverId: string | null }
): void {
  if (!user) throw new ForbiddenError();
  if (user.role === 'ADMIN') return;
  if (user.role === 'DRIVER' && user.driverId && booking.assignedDriverId === user.driverId) return;
  if (booking.clientId && booking.clientId === user.id) return;
  if (booking.companyId && user.companyId && booking.companyId === user.companyId) return;
  throw new ForbiddenError("Vous n'avez pas accès à cette réservation.");
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export interface CreateBookingInput {
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  formula: RentalFormula;
  fuelIncluded: boolean;
  withDriver: boolean;
  promoCode?: string | null;
  flightNumber?: string | null;
  specialRequests?: string | null;
  packId?: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientId?: string | null;
  companyId?: string | null;
}

export async function createBooking(input: CreateBookingInput, request?: FastifyRequest) {
  const startDate = toUtcDay(input.startDate);
  const endDate = toUtcDay(input.endDate);

  if (endDate < startDate) {
    throw new UnprocessableError('La date de fin doit être postérieure ou égale à la date de début.');
  }

  // Delai de prevenance : l'exploitation doit pouvoir preparer le vehicule et
  // briefer le chauffeur. Le seuil est parametrable depuis le back-office.
  const { bookingLeadTimeHours } = await getGeneralConfig();
  if (bookingLeadTimeHours > 0) {
    const earliestStart = new Date(Date.now() + bookingLeadTimeHours * 60 * 60 * 1000);
    const requestedStart = combineDateAndTime(startDate, input.startTime);

    if (requestedStart < earliestStart) {
      throw new UnprocessableError(
        `Les réservations doivent être passées au moins ${bookingLeadTimeHours} h avant la prise en charge. Contactez la conciergerie pour une demande urgente.`
      );
    }
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null }
  });
  if (!vehicle) throw new NotFoundError('Véhicule');

  const company = input.companyId
    ? await prisma.company.findFirst({ where: { id: input.companyId, deletedAt: null } })
    : null;

  if (input.companyId && !company) throw new NotFoundError('Entreprise');

  const priced = await quote({
    vehicle,
    startDate,
    endDate,
    formula: input.formula,
    fuelIncluded: input.fuelIncluded,
    promoCode: input.promoCode,
    companyDiscountRate: company?.negotiatedDiscountRate ?? 0,
    companyName: company?.name ?? null,
    companyId: company?.id ?? null
  });

  // La transaction verrouille la coherence : disponibilite, reference unique et
  // compteur du code promo sont valides ensemble ou pas du tout.
  const booking = await prisma.$transaction(async (tx) => {
    await assertVehicleAvailable(vehicle.id, startDate, endDate, { client: tx as Tx });

    const created = await tx.booking.create({
      data: {
        reference: await nextBookingReference(tx as Tx),
        clientId: input.clientId ?? null,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        companyId: company?.id ?? null,
        vehicleId: vehicle.id,
        packId: input.packId ?? null,
        startDate,
        endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        pickupLocation: input.pickupLocation,
        dropoffLocation: input.dropoffLocation,
        formula: input.formula,
        durationDays: priced.durationDays,
        withDriver: input.withDriver,
        fuelIncluded: input.fuelIncluded,
        baseRate: priced.baseRate,
        basePrice: priced.basePrice,
        optionsPrice: priced.optionsPrice,
        discountCode: priced.appliedPromoRuleId ? priced.discountCode : null,
        discountPercentage: priced.discountPercentage,
        discountAmount: priced.discountAmount,
        discountReason: priced.discountReason,
        subtotal: priced.subtotal,
        taxRate: priced.taxRate,
        taxAmount: priced.taxAmount,
        totalAmount: priced.totalAmount,
        currency: priced.currency,
        status: 'EN_ATTENTE',
        flightNumber: input.flightNumber ?? null,
        specialRequests: input.specialRequests ?? null,
        statusHistory: { create: { toStatus: 'EN_ATTENTE', reason: 'Création de la demande' } }
      },
      include: BOOKING_INCLUDE
    });

    if (priced.appliedPromoRuleId) {
      await tx.promoRule.update({
        where: { id: priced.appliedPromoRuleId },
        data: { usedCount: { increment: 1 } }
      });
      await tx.promoRedemption.create({
        data: { promoRuleId: priced.appliedPromoRuleId, bookingId: created.id }
      });
    }

    return created;
  });

  await sendBookingReceived(booking);
  await recordAudit({
    request,
    action: 'booking.create',
    entity: 'Booking',
    entityId: booking.id,
    after: { reference: booking.reference, totalAmount: booking.totalAmount }
  });

  return booking;
}

// ---------------------------------------------------------------------------
// Transitions de statut
// ---------------------------------------------------------------------------

export async function transitionBookingStatus(
  idOrReference: string,
  toStatus: BookingStatus,
  options: { reason?: string | null; actorId?: string | null; request?: FastifyRequest } = {}
) {
  const current = await getBookingOrThrow(idOrReference);

  if (current.status === toStatus) return current;

  if (!canTransition(current.status, toStatus)) {
    throw new ConflictError(
      `Transition impossible : une réservation "${current.status}" ne peut pas passer à "${toStatus}".`
    );
  }

  if (toStatus === 'EN_COURS' && !current.assignedDriverId && current.withDriver) {
    throw new ConflictError(
      'Affectez un chauffeur avant de démarrer la mission (POST /bookings/:id/assign).'
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id: current.id },
      data: {
        status: toStatus,
        ...(toStatus === 'CONFIRMEE' ? { confirmedAt: new Date() } : {}),
        ...(toStatus === 'ANNULEE'
          ? { cancelledAt: new Date(), cancellationReason: options.reason ?? null }
          : {}),
        statusHistory: {
          create: {
            fromStatus: current.status,
            toStatus,
            changedById: options.actorId ?? null,
            reason: options.reason ?? null
          }
        }
      },
      include: BOOKING_INCLUDE
    });

    await applyStatusSideEffects(tx as Tx, booking, toStatus);
    return booking;
  });

  await dispatchStatusNotification(updated, toStatus, options.reason);

  await recordAudit({
    request: options.request,
    action: `booking.status.${toStatus.toLowerCase()}`,
    entity: 'Booking',
    entityId: updated.id,
    before: { status: current.status },
    after: { status: toStatus, reason: options.reason ?? null }
  });

  return updated;
}

type BookingWithIncludes = Awaited<ReturnType<typeof getBookingOrThrow>>;

/** Repercussions sur la flotte, les chauffeurs, la facturation et la fidelite. */
async function applyStatusSideEffects(
  tx: Tx,
  booking: BookingWithIncludes,
  toStatus: BookingStatus
): Promise<void> {
  const vehicleId = booking.assignedVehicleId ?? booking.vehicleId;

  if (toStatus === 'EN_COURS') {
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: 'LOUE' } });
    if (booking.assignedDriverId) {
      await tx.driver.update({
        where: { id: booking.assignedDriverId },
        data: { status: 'EN_COURSE' }
      });
    }
    if (booking.ride) {
      await tx.ride.update({
        where: { id: booking.ride.id },
        data: { status: 'EN_COURS', startedAt: new Date() }
      });
    }
    return;
  }

  if (toStatus === 'TERMINEE') {
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: 'DISPONIBLE' } });

    if (booking.assignedDriverId) {
      await tx.driver.update({
        where: { id: booking.assignedDriverId },
        data: { status: 'DISPONIBLE', completedRides: { increment: 1 } }
      });
    }

    if (booking.ride && booking.ride.status !== 'TERMINEE') {
      await tx.ride.update({
        where: { id: booking.ride.id },
        data: { status: 'TERMINEE', completedAt: new Date() }
      });
    }

    await issueInvoiceForBooking(booking.id, { client: tx });

    if (booking.clientId) {
      const config = await getPricingConfig();
      const points = Math.floor((booking.totalAmount / 1000) * config.loyaltyPointsPer1000);
      if (points > 0) {
        await tx.user.update({
          where: { id: booking.clientId },
          data: { loyaltyPoints: { increment: points } }
        });
        await refreshLoyaltyTier(tx, booking.clientId);
      }
    }
    return;
  }

  if (toStatus === 'ANNULEE') {
    // Le vehicule ne redevient disponible que s'il n'est pas pris par une autre mission.
    const stillBusy = await tx.booking.count({
      where: {
        vehicleId,
        id: { not: booking.id },
        status: { in: ['CONFIRMEE', 'EN_COURS'] },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (stillBusy === 0) {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (vehicle?.status === 'LOUE') {
        await tx.vehicle.update({ where: { id: vehicleId }, data: { status: 'DISPONIBLE' } });
      }
    }

    if (booking.assignedDriverId) {
      const driverBusy = await tx.booking.count({
        where: {
          assignedDriverId: booking.assignedDriverId,
          id: { not: booking.id },
          status: 'EN_COURS'
        }
      });
      if (driverBusy === 0) {
        await tx.driver.update({
          where: { id: booking.assignedDriverId },
          data: { status: 'DISPONIBLE' }
        });
      }
    }

    if (booking.ride && booking.ride.status !== 'ANNULEE') {
      await tx.ride.update({ where: { id: booking.ride.id }, data: { status: 'ANNULEE' } });
    }

    // Le code promo redevient disponible pour le client.
    const redemption = await tx.promoRedemption.findUnique({ where: { bookingId: booking.id } });
    if (redemption) {
      await tx.promoRule.update({
        where: { id: redemption.promoRuleId },
        data: { usedCount: { decrement: 1 } }
      });
      await tx.promoRedemption.delete({ where: { bookingId: booking.id } });
    }
  }
}

/** Paliers de fidelite, reevalues a chaque mission terminee selon les seuils parametres. */
export async function refreshLoyaltyTier(tx: Tx, userId: string): Promise<void> {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } });
  if (!user) return;

  const { loyaltyTiers } = await getGeneralConfig();
  const tier =
    user.loyaltyPoints >= loyaltyTiers.gold
      ? 'GOLD_VIP'
      : user.loyaltyPoints >= loyaltyTiers.silver
        ? 'SILVER'
        : 'STANDARD';

  await tx.user.update({ where: { id: userId }, data: { tier } });
}

async function dispatchStatusNotification(
  booking: BookingWithIncludes,
  toStatus: BookingStatus,
  reason?: string | null
): Promise<void> {
  if (toStatus === 'CONFIRMEE') await sendBookingValidated(booking);
  else if (toStatus === 'TERMINEE') await sendTripCompleted(booking);
  else if (toStatus === 'ANNULEE') await sendBookingCancelled(booking, reason);
}

// ---------------------------------------------------------------------------
// Affectation chauffeur + vehicule
// ---------------------------------------------------------------------------

export interface AssignInput {
  driverId: string;
  /** Permet de substituer un autre vehicule que celui reserve initialement. */
  vehicleId?: string | null;
  notes?: string | null;
  confirm?: boolean;
}

/**
 * Affecte un chauffeur (et eventuellement un vehicule de substitution) puis
 * cree la course correspondante. Confirme la reservation par defaut.
 */
export async function assignBooking(
  idOrReference: string,
  input: AssignInput,
  request?: FastifyRequest
) {
  const booking = await getBookingOrThrow(idOrReference);

  if (booking.status === 'ANNULEE' || booking.status === 'TERMINEE') {
    throw new ConflictError(
      `Impossible d'affecter un chauffeur à une réservation "${booking.status}".`
    );
  }

  const vehicleId = input.vehicleId ?? booking.vehicleId;

  const result = await prisma.$transaction(async (tx) => {
    const client = tx as Tx;

    if (vehicleId !== booking.vehicleId) {
      await assertVehicleAvailable(vehicleId, booking.startDate, booking.endDate, {
        excludeBookingId: booking.id,
        client
      });
    }

    await assertDriverAvailable(input.driverId, booking.startDate, booking.endDate, {
      excludeBookingId: booking.id,
      client
    });

    const driver = await tx.driver.findFirstOrThrow({
      where: { id: input.driverId, deletedAt: null }
    });
    const vehicle = await tx.vehicle.findFirstOrThrow({ where: { id: vehicleId, deletedAt: null } });

    const shouldConfirm = input.confirm !== false && booking.status === 'EN_ATTENTE';

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        assignedDriverId: driver.id,
        assignedVehicleId: vehicle.id,
        vehicleId: vehicle.id,
        ...(shouldConfirm
          ? {
              status: 'CONFIRMEE',
              confirmedAt: new Date(),
              statusHistory: {
                create: {
                  fromStatus: booking.status,
                  toStatus: 'CONFIRMEE',
                  reason: `Affectation de ${driver.name}`
                }
              }
            }
          : {})
      },
      include: BOOKING_INCLUDE
    });

    const ride = booking.ride
      ? await tx.ride.update({
          where: { id: booking.ride.id },
          data: {
            driverId: driver.id,
            vehicleId: vehicle.id,
            notes: input.notes ?? booking.ride.notes
          }
        })
      : await tx.ride.create({
          data: {
            reference: await nextRideReference(client),
            bookingId: booking.id,
            driverId: driver.id,
            vehicleId: vehicle.id,
            scheduledDate: booking.startDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            pickupLocation: booking.pickupLocation,
            destinationLocation: booking.dropoffLocation,
            status: 'PLANIFIEE',
            notes: input.notes ?? booking.specialRequests
          }
        });

    await tx.driver.update({
      where: { id: driver.id },
      data: { assignedVehicleId: vehicle.id }
    });

    return { booking: updated, ride, driver, vehicle };
  });

  if (result.booking.status === 'CONFIRMEE' && booking.status === 'EN_ATTENTE') {
    await sendBookingValidated(result.booking);
  }
  await sendDriverAssigned(result.booking, result.driver, result.vehicle);

  await recordAudit({
    request,
    action: 'booking.assign',
    entity: 'Booking',
    entityId: booking.id,
    before: { driverId: booking.assignedDriverId, vehicleId: booking.vehicleId },
    after: { driverId: result.driver.id, vehicleId: result.vehicle.id, rideId: result.ride.id }
  });

  return result;
}

/** Recalcule le devis d'une reservation existante (changement de dates ou d'options). */
export async function repriceBooking(
  idOrReference: string,
  patch: Partial<Pick<CreateBookingInput, 'startDate' | 'endDate' | 'formula' | 'fuelIncluded' | 'promoCode'>>,
  request?: FastifyRequest
) {
  const booking = await getBookingOrThrow(idOrReference);

  if (booking.status === 'TERMINEE' || booking.status === 'ANNULEE') {
    throw new ConflictError('Une réservation clôturée ne peut plus être modifiée.');
  }

  const startDate = patch.startDate ? toUtcDay(patch.startDate) : booking.startDate;
  const endDate = patch.endDate ? toUtcDay(patch.endDate) : booking.endDate;

  if (patch.startDate || patch.endDate) {
    await assertVehicleAvailable(booking.vehicleId, startDate, endDate, {
      excludeBookingId: booking.id
    });
    if (booking.assignedDriverId) {
      await assertDriverAvailable(booking.assignedDriverId, startDate, endDate, {
        excludeBookingId: booking.id
      });
    }
  }

  const priced = await quote({
    vehicle: booking.vehicle,
    startDate,
    endDate,
    formula: patch.formula ?? booking.formula,
    fuelIncluded: patch.fuelIncluded ?? booking.fuelIncluded,
    promoCode: patch.promoCode ?? booking.discountCode,
    companyDiscountRate: booking.company?.negotiatedDiscountRate ?? 0,
    companyName: booking.company?.name ?? null,
    companyId: booking.companyId
  });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      startDate,
      endDate,
      formula: patch.formula ?? booking.formula,
      fuelIncluded: patch.fuelIncluded ?? booking.fuelIncluded,
      durationDays: priced.durationDays,
      baseRate: priced.baseRate,
      basePrice: priced.basePrice,
      optionsPrice: priced.optionsPrice,
      discountCode: priced.appliedPromoRuleId ? priced.discountCode : null,
      discountPercentage: priced.discountPercentage,
      discountAmount: priced.discountAmount,
      discountReason: priced.discountReason,
      subtotal: priced.subtotal,
      taxRate: priced.taxRate,
      taxAmount: priced.taxAmount,
      totalAmount: priced.totalAmount
    },
    include: BOOKING_INCLUDE
  });

  await recordAudit({
    request,
    action: 'booking.reprice',
    entity: 'Booking',
    entityId: booking.id,
    before: { totalAmount: booking.totalAmount, durationDays: booking.durationDays },
    after: { totalAmount: updated.totalAmount, durationDays: updated.durationDays }
  });

  return updated;
}
