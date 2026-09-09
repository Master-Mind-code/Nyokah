/**
 * Traduction entre les enums PostgreSQL/Prisma (identifiants ASCII) et les
 * libelles francais exposes par l'API. Le contrat REST reprend exactement les
 * chaines utilisees par le frontend (src/types.ts) afin que la migration du
 * client se limite a remplacer les donnees mockees par des appels HTTP.
 */
import { z } from 'zod';
import type {
  BookingStatus,
  CompanyStatus,
  DriverStatus,
  FuelType,
  InvoiceStatus,
  LoyaltyTier,
  MaintenanceStatus,
  MaintenanceType,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  OwnershipType,
  PaymentProvider,
  PaymentStatus,
  RentalFormula,
  RideStatus,
  SubcontractorStatus,
  Transmission,
  UserRole,
  VehicleCategory,
  VehicleStatus
} from '@prisma/client';

type LabelMap<T extends string> = Readonly<Record<T, string>>;

function invert<T extends string>(map: LabelMap<T>): Record<string, T> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v as string, k as T])) as Record<
    string,
    T
  >;
}

/** Construit le couple (encodeur, decodeur, schema zod) pour un enum. */
function makeEnum<T extends string>(map: LabelMap<T>, name: string) {
  const reverse = invert(map);
  const labels = Object.values(map) as [string, ...string[]];

  return {
    /** Enum Prisma -> libelle francais. */
    toLabel: (value: T): string => map[value],
    /** Libelle francais -> enum Prisma (leve si inconnu). */
    fromLabel: (label: string): T => {
      const found = reverse[label];
      if (!found) throw new Error(`Valeur ${name} inconnue : "${label}"`);
      return found;
    },
    labels,
    /** Schema zod acceptant le libelle francais et produisant l'enum Prisma. */
    schema: z
      .enum(labels)
      .transform((label) => reverse[label] as T)
  };
}

export const VehicleCategoryEnum = makeEnum<VehicleCategory>(
  {
    BERLINE: 'Berline',
    SUV: 'SUV',
    VIP_PRESTIGE: 'VIP Prestige',
    MINIBUS_VAN: 'Minibus / Van',
    UTILITAIRE: 'Utilitaire'
  },
  'VehicleCategory'
);

export const VehicleStatusEnum = makeEnum<VehicleStatus>(
  {
    DISPONIBLE: 'Disponible',
    LOUE: 'Loué',
    ENTRETIEN: 'Entretien',
    INDISPONIBLE: 'Indisponible'
  },
  'VehicleStatus'
);

export const OwnershipTypeEnum = makeEnum<OwnershipType>(
  {
    FLOTTE_PROPRE: 'Flotte Propre',
    SOUS_TRAITANT: 'Sous-traitant'
  },
  'OwnershipType'
);

export const TransmissionEnum = makeEnum<Transmission>(
  {
    AUTOMATIQUE: 'Automatique',
    MANUELLE: 'Manuelle'
  },
  'Transmission'
);

export const FuelTypeEnum = makeEnum<FuelType>(
  {
    ESSENCE: 'Essence',
    DIESEL: 'Diesel',
    HYBRIDE: 'Hybride',
    ELECTRIQUE: 'Électrique'
  },
  'FuelType'
);

export const DriverStatusEnum = makeEnum<DriverStatus>(
  {
    DISPONIBLE: 'Disponible',
    EN_COURSE: 'En course',
    EN_REPOS: 'En repos',
    CONGE: 'Congé'
  },
  'DriverStatus'
);

export const CompanyStatusEnum = makeEnum<CompanyStatus>(
  {
    VIP_CONTRACTUEL: 'VIP Contractuel',
    STANDARD_B2B: 'Standard B2B',
    EN_NEGOCIATION: 'En négociation'
  },
  'CompanyStatus'
);

export const SubcontractorStatusEnum = makeEnum<SubcontractorStatus>(
  {
    ACTIF: 'Actif',
    EN_ATTENTE: 'En attente',
    SUSPENDU: 'Suspendu'
  },
  'SubcontractorStatus'
);

export const RentalFormulaEnum = makeEnum<RentalFormula>(
  {
    JOURNEE: 'Journée (8h-18h)',
    DEMI_JOURNEE: 'Demi-journée (4h)',
    CONTINUE_24H: 'Mise à disposition continue (24h)',
    TRANSFERT_AEROPORT: 'Transfert Aéroport FHB',
    FORFAIT_WEEKEND: 'Forfait Week-end',
    MENSUELLE: 'Mise à disposition mensuelle'
  },
  'RentalFormula'
);

export const BookingStatusEnum = makeEnum<BookingStatus>(
  {
    EN_ATTENTE: 'En attente',
    CONFIRMEE: 'Confirmée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée'
  },
  'BookingStatus'
);

export const RideStatusEnum = makeEnum<RideStatus>(
  {
    PLANIFIEE: 'Planifiée',
    EN_ROUTE: 'En route',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée'
  },
  'RideStatus'
);

export const MaintenanceTypeEnum = makeEnum<MaintenanceType>(
  {
    REVISION: 'Révision',
    VIDANGE: 'Vidange',
    REPARATION: 'Réparation',
    PNEUMATIQUES: 'Pneumatiques',
    CONTROLE_TECHNIQUE: 'Contrôle technique',
    CARROSSERIE: 'Carrosserie',
    LAVAGE: 'Lavage',
    AUTRE: 'Autre'
  },
  'MaintenanceType'
);

export const MaintenanceStatusEnum = makeEnum<MaintenanceStatus>(
  {
    PLANIFIEE: 'Planifiée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée'
  },
  'MaintenanceStatus'
);

export const PaymentProviderEnum = makeEnum<PaymentProvider>(
  {
    MOCK: 'Simulateur',
    CINETPAY: 'CinetPay',
    WAVE: 'Wave',
    ORANGE_MONEY: 'Orange Money',
    MTN_MONEY: 'MTN Money',
    MOOV_MONEY: 'Moov Money',
    CARTE_BANCAIRE: 'Carte bancaire',
    VIREMENT: 'Virement bancaire',
    ESPECES: 'Espèces'
  },
  'PaymentProvider'
);

export const PaymentStatusEnum = makeEnum<PaymentStatus>(
  {
    EN_ATTENTE: 'En attente',
    EN_COURS: 'En cours',
    REUSSI: 'Réussi',
    ECHOUE: 'Échoué',
    REMBOURSE: 'Remboursé',
    ANNULE: 'Annulé'
  },
  'PaymentStatus'
);

export const InvoiceStatusEnum = makeEnum<InvoiceStatus>(
  {
    BROUILLON: 'Brouillon',
    EMISE: 'Émise',
    PARTIELLEMENT_PAYEE: 'Partiellement payée',
    PAYEE: 'Payée',
    EN_RETARD: 'En retard',
    ANNULEE: 'Annulée'
  },
  'InvoiceStatus'
);

export const NotificationChannelEnum = makeEnum<NotificationChannel>(
  {
    WHATSAPP: 'whatsapp',
    EMAIL: 'email',
    SMS: 'sms',
    IN_APP: 'in_app'
  },
  'NotificationChannel'
);

export const NotificationTypeEnum = makeEnum<NotificationType>(
  {
    BOOKING_RECEIVED: 'booking_received',
    BOOKING_VALIDATED: 'booking_validated',
    BOOKING_CANCELLED: 'booking_cancelled',
    DRIVER_ASSIGNED: 'driver_assigned',
    DRIVER_APPROACHING: 'driver_approaching',
    TRIP_STARTED: 'trip_started',
    TRIP_COMPLETED: 'trip_completed',
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_FAILED: 'payment_failed',
    INVOICE_ISSUED: 'invoice_issued',
    MAINTENANCE_DUE: 'maintenance_due',
    ACCOUNT_WELCOME: 'account_welcome',
    PASSWORD_RESET: 'password_reset'
  },
  'NotificationType'
);

export const NotificationStatusEnum = makeEnum<NotificationStatus>(
  {
    EN_FILE: 'queued',
    ENVOYE: 'sent',
    DELIVRE: 'delivered',
    LU: 'read',
    ECHOUE: 'failed'
  },
  'NotificationStatus'
);

export const UserRoleEnum = makeEnum<UserRole>(
  {
    INDIVIDUAL: 'individual',
    COMPANY: 'company',
    DRIVER: 'driver',
    ADMIN: 'admin'
  },
  'UserRole'
);

export const LoyaltyTierEnum = makeEnum<LoyaltyTier>(
  {
    STANDARD: 'Standard',
    SILVER: 'Silver',
    GOLD_VIP: 'Gold VIP'
  },
  'LoyaltyTier'
);
