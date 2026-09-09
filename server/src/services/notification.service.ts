import type {
  Booking,
  Company,
  Driver,
  Invoice,
  NotificationChannel,
  NotificationType,
  Vehicle
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { toDateString } from '../lib/dates.js';
import { RentalFormulaEnum } from '../lib/enums.js';
import { getNotificationProvider } from '../providers/notifications/index.js';
import { getGeneralConfig } from './settings.service.js';

/** Formatage monetaire aligne sur celui du frontend : "1 250 000 FCFA". */
export function formatFCFA(amount: number): string {
  if (!Number.isFinite(amount)) return '0 FCFA';
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

/** Coordonnees de la conciergerie, parametrables depuis le back-office. */
async function branding(): Promise<{ supportPhone: string; companyName: string }> {
  const config = await getGeneralConfig();
  return { supportPhone: config.supportPhone, companyName: config.companyName };
}

export interface NotifyInput {
  channel?: NotificationChannel;
  type: NotificationType;
  bookingId?: string | null;
  recipientUserId?: string | null;
  recipientName: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enregistre puis expedie une notification. L'echec d'envoi n'interrompt jamais
 * le flux metier : la trace reste en base au statut ECHOUE et peut etre rejouee.
 */
export async function notify(input: NotifyInput) {
  const channel = input.channel ?? 'WHATSAPP';

  const notification = await prisma.notification.create({
    data: {
      channel,
      type: input.type,
      bookingId: input.bookingId ?? null,
      recipientUserId: input.recipientUserId ?? null,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone ?? null,
      recipientEmail: input.recipientEmail ?? null,
      title: input.title,
      body: input.body,
      metadata: (input.metadata ?? {}) as object,
      status: 'EN_FILE'
    }
  });

  const destination =
    channel === 'EMAIL' ? input.recipientEmail : (input.recipientPhone ?? input.recipientEmail);

  if (!destination) {
    return prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'ECHOUE', failureReason: 'Aucune coordonnée de contact disponible.' }
    });
  }

  const result = await getNotificationProvider().send({
    channel,
    to: destination,
    title: input.title,
    body: input.body,
    metadata: input.metadata
  });

  return prisma.notification.update({
    where: { id: notification.id },
    data: result.accepted
      ? { status: 'ENVOYE', sentAt: new Date(), providerMessageId: result.providerMessageId }
      : { status: 'ECHOUE', failureReason: result.failureReason ?? 'Envoi refusé par le fournisseur.' }
  });
}

/** Rejoue une notification en echec. */
export async function retryNotification(id: string) {
  const existing = await prisma.notification.findUniqueOrThrow({ where: { id } });

  const destination =
    existing.channel === 'EMAIL' ? existing.recipientEmail : existing.recipientPhone;

  if (!destination) {
    return prisma.notification.update({
      where: { id },
      data: { status: 'ECHOUE', failureReason: 'Aucune coordonnée de contact disponible.' }
    });
  }

  const result = await getNotificationProvider().send({
    channel: existing.channel,
    to: destination,
    title: existing.title,
    body: existing.body,
    metadata: (existing.metadata as Record<string, unknown>) ?? undefined
  });

  return prisma.notification.update({
    where: { id },
    data: result.accepted
      ? {
          status: 'ENVOYE',
          sentAt: new Date(),
          providerMessageId: result.providerMessageId,
          failureReason: null
        }
      : { status: 'ECHOUE', failureReason: result.failureReason ?? 'Envoi refusé.' }
  });
}

// ---------------------------------------------------------------------------
// Gabarits WhatsApp
// ---------------------------------------------------------------------------

type BookingContext = Booking & {
  vehicle: Vehicle;
  company: Company | null;
  driver: Driver | null;
};

function vehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.brand} ${vehicle.model} (${vehicle.year})`;
}

export async function sendBookingReceived(booking: BookingContext) {
  const { supportPhone, companyName } = await branding();
  const body = `📋 *DEMANDE DE RÉSERVATION ENREGISTRÉE*

Bonjour *${booking.clientName}*,

Nous accusons bonne réception de votre demande de réservation *#${booking.reference}*.

🚘 *Véhicule :* ${vehicleLabel(booking.vehicle)}
📅 *Prise en charge :* ${toDateString(booking.startDate)} à ${booking.startTime}
📍 *Lieu :* ${booking.pickupLocation}
💰 *Total prévisionnel :* ${formatFCFA(booking.totalAmount)}

Notre équipe contrôle les disponibilités et vous notifiera sur ce canal dès validation finale et attribution de votre chauffeur.

_${companyName} — Service Conciergerie 24/7_`;

  return notify({
    type: 'BOOKING_RECEIVED',
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    recipientName: booking.clientName,
    recipientPhone: booking.clientPhone,
    recipientEmail: booking.clientEmail,
    title: `Demande ${booking.reference} reçue`,
    body,
    metadata: {
      vehicleName: vehicleLabel(booking.vehicle),
      pickupLocation: booking.pickupLocation,
      pickupDate: toDateString(booking.startDate),
      pickupTime: booking.startTime,
      liveEta: 'En cours de validation dispatch'
    }
  });
}

export async function sendBookingValidated(booking: BookingContext) {
  const { supportPhone, companyName } = await branding();
  const body = `✅ *RÉSERVATION CONFIRMÉE & VALIDÉE*

Bonjour *${booking.clientName}*,

Excellente nouvelle ! Votre réservation *#${booking.reference}* a été formellement validée par la conciergerie ${companyName}.

🚘 *Véhicule :* ${vehicleLabel(booking.vehicle)}
📍 *Prise en charge :* ${booking.pickupLocation}
🏁 *Destination :* ${booking.dropoffLocation}
📅 *Période :* du ${toDateString(booking.startDate)} (${booking.startTime}) au ${toDateString(booking.endDate)} (${booking.endTime})
📋 *Formule :* ${RentalFormulaEnum.toLabel(booking.formula)}
💰 *Montant Total TTC :* ${formatFCFA(booking.totalAmount)}${
    booking.company ? `\n🏢 *Compte Entreprise :* ${booking.company.name}` : ''
  }

Notre pôle dispatching procède à l'affectation de votre chauffeur attitré. Vous recevrez sa fiche complète sur ce fil WhatsApp sous peu.

_Service Conciergerie VIP : ${supportPhone}_`;

  return notify({
    type: 'BOOKING_VALIDATED',
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    recipientName: booking.clientName,
    recipientPhone: booking.clientPhone,
    recipientEmail: booking.clientEmail,
    title: `Réservation ${booking.reference} validée`,
    body,
    metadata: {
      vehicleName: vehicleLabel(booking.vehicle),
      pickupLocation: booking.pickupLocation,
      pickupDate: toDateString(booking.startDate),
      pickupTime: booking.startTime,
      liveEta: 'Validée au planning Nyokah'
    }
  });
}

export async function sendDriverAssigned(booking: BookingContext, driver: Driver, vehicle: Vehicle) {
  const { supportPhone, companyName } = await branding();
  const ratingLine = `⭐ ${driver.rating.toFixed(2)}/5 (${driver.completedRides} courses)`;

  const body = `👔 *VOTRE CHAUFFEUR PRIVÉ A ÉTÉ AFFECTÉ*

Bonjour *${booking.clientName}*,

Votre chauffeur VIP Nyokah a été affecté à votre mission *#${booking.reference}*.

👤 *Chauffeur :* ${driver.name} (${ratingLine})
📞 *WhatsApp Direct :* ${driver.phone}
🗣️ *Langues parlées :* ${driver.languages.join(', ') || 'Français'}

🚗 *Véhicule :* ${vehicle.brand} ${vehicle.model} (${vehicle.year})
🔢 *Immatriculation :* ${vehicle.plateNumber}
📍 *Lieu de RDV :* ${booking.pickupLocation}
⏰ *Prise en charge :* ${toDateString(booking.startDate)} à ${booking.startTime}

Votre chauffeur se présentera en tenue de protocole 15 minutes avant l'heure convenue avec pancarte personnalisée. Vous pouvez le contacter directement via ce fil.

_${companyName} — L'excellence de la mobilité à Abidjan._`;

  return notify({
    type: 'DRIVER_ASSIGNED',
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    recipientName: booking.clientName,
    recipientPhone: booking.clientPhone,
    recipientEmail: booking.clientEmail,
    title: `Chauffeur ${driver.name} affecté`,
    body,
    metadata: {
      vehicleName: `${vehicle.brand} ${vehicle.model}`,
      plateNumber: vehicle.plateNumber,
      driverName: driver.name,
      driverPhone: driver.phone,
      driverPhoto: driver.photoUrl,
      driverRating: driver.rating,
      pickupLocation: booking.pickupLocation,
      pickupDate: toDateString(booking.startDate),
      pickupTime: booking.startTime,
      liveEta: 'Briefé & Confirmé'
    }
  });
}

export async function sendDriverApproaching(
  booking: BookingContext,
  driver: Driver,
  etaMinutes: number
) {
  const { supportPhone, companyName } = await branding();
  const body = `🚗 *VOTRE CHAUFFEUR ARRIVE*

Bonjour *${booking.clientName}*,

*${driver.name}* est en approche du point de prise en charge.

📍 *Lieu :* ${booking.pickupLocation}
⏱️ *Arrivée estimée :* ${etaMinutes} minutes
📞 *Contact direct :* ${driver.phone}

_${companyName}_`;

  return notify({
    type: 'DRIVER_APPROACHING',
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    recipientName: booking.clientName,
    recipientPhone: booking.clientPhone,
    title: `${driver.name} arrive dans ${etaMinutes} min`,
    body,
    metadata: { liveEta: `${etaMinutes} min`, driverName: driver.name, driverPhone: driver.phone }
  });
}

export async function sendTripCompleted(booking: BookingContext) {
  const { supportPhone, companyName } = await branding();
  const body = `🏁 *MISSION TERMINÉE — MERCI DE VOTRE CONFIANCE*

Bonjour *${booking.clientName}*,

Votre mission *#${booking.reference}* est clôturée.

🚘 *Véhicule :* ${vehicleLabel(booking.vehicle)}
📅 *Période :* du ${toDateString(booking.startDate)} au ${toDateString(booking.endDate)}
💰 *Montant Total TTC :* ${formatFCFA(booking.totalAmount)}

Votre avis compte : notez votre chauffeur et votre véhicule depuis votre espace client. Votre facture est disponible au téléchargement.

_${companyName} — À très bientôt._`;

  return notify({
    type: 'TRIP_COMPLETED',
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    recipientName: booking.clientName,
    recipientPhone: booking.clientPhone,
    recipientEmail: booking.clientEmail,
    title: `Mission ${booking.reference} terminée`,
    body,
    metadata: { vehicleName: vehicleLabel(booking.vehicle) }
  });
}

export async function sendBookingCancelled(booking: BookingContext, reason?: string | null) {
  const { supportPhone, companyName } = await branding();
  const body = `❌ *RÉSERVATION ANNULÉE*

Bonjour *${booking.clientName}*,

Votre réservation *#${booking.reference}* a été annulée.

🚘 *Véhicule :* ${vehicleLabel(booking.vehicle)}
📅 *Période prévue :* du ${toDateString(booking.startDate)} au ${toDateString(booking.endDate)}${
    reason ? `\n📝 *Motif :* ${reason}` : ''
  }

Pour toute question ou pour reprogrammer votre mission, notre conciergerie reste joignable au ${supportPhone}.

_${companyName}_`;

  return notify({
    type: 'BOOKING_CANCELLED',
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    recipientName: booking.clientName,
    recipientPhone: booking.clientPhone,
    recipientEmail: booking.clientEmail,
    title: `Réservation ${booking.reference} annulée`,
    body
  });
}

export async function sendPaymentReceived(booking: BookingContext, amount: number) {
  const { supportPhone, companyName } = await branding();
  const body = `💳 *PAIEMENT REÇU*

Bonjour *${booking.clientName}*,

Nous confirmons la réception de votre paiement de *${formatFCFA(amount)}* pour la réservation *#${booking.reference}*.

Votre reçu et votre facture sont disponibles dans votre espace client.

_${companyName} — Merci de votre confiance._`;

  return notify({
    type: 'PAYMENT_RECEIVED',
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    recipientName: booking.clientName,
    recipientPhone: booking.clientPhone,
    recipientEmail: booking.clientEmail,
    title: `Paiement de ${formatFCFA(amount)} confirmé`,
    body
  });
}

export async function sendInvoiceIssued(invoice: Invoice) {
  const { supportPhone, companyName } = await branding();
  const body = `🧾 *FACTURE ${invoice.number}*

Bonjour *${invoice.clientName}*,

Votre facture *${invoice.number}* d'un montant de *${formatFCFA(invoice.totalAmount)}* TTC a été émise.

📅 *Échéance de règlement :* ${toDateString(invoice.dueDate)}

Elle est consultable et téléchargeable depuis votre espace client.

_${companyName} — Service Comptabilité_`;

  return notify({
    channel: 'EMAIL',
    type: 'INVOICE_ISSUED',
    bookingId: invoice.bookingId,
    recipientName: invoice.clientName,
    recipientEmail: invoice.clientEmail,
    title: `Facture ${invoice.number}`,
    body
  });
}

export async function sendWelcome(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
}) {
  const { supportPhone, companyName } = await branding();
  const body = `🎉 *BIENVENUE CHEZ ${companyName.toUpperCase()}*

Bonjour *${user.fullName}*,

Votre compte est actif. ${
    user.loyaltyPoints > 0
      ? `Nous avons crédité *${user.loyaltyPoints} points de fidélité* de bienvenue sur votre compte.`
      : ''
  }

Réservez berlines, SUV, minibus et véhicules de prestige avec chauffeur partout à Abidjan et en Côte d'Ivoire.

_Conciergerie : ${supportPhone}_`;

  return notify({
    type: 'ACCOUNT_WELCOME',
    recipientUserId: user.id,
    recipientName: user.fullName,
    recipientPhone: user.phone,
    recipientEmail: user.email,
    title: `Bienvenue chez ${companyName}`,
    body
  });
}

export async function sendMaintenanceDue(vehicle: Vehicle, dueDate: Date, recipients: string[]) {
  const { supportPhone, companyName } = await branding();
  const body = `🔧 *ENTRETIEN À PLANIFIER*

Véhicule : ${vehicleLabel(vehicle)} (${vehicle.plateNumber})
Échéance : ${toDateString(dueDate)}

Merci de bloquer le véhicule au planning et de programmer le passage en atelier.

_${companyName} — Gestion de flotte_`;

  return Promise.all(
    recipients.map((phone) =>
      notify({
        type: 'MAINTENANCE_DUE',
        recipientName: 'Gestion de flotte Nyokah',
        recipientPhone: phone,
        title: `Entretien ${vehicle.plateNumber}`,
        body
      })
    )
  );
}
