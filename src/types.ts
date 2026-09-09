/**
 * Types du domaine Nyokah, alignés sur les réponses de l'API (`/api/v1`).
 *
 * Les libellés français sont ceux que le serveur expose directement : la
 * traduction depuis les énumérations PostgreSQL est faite côté backend
 * (`server/src/lib/enums.ts`), le frontend n'a donc aucune conversion à faire.
 */

export type VehicleCategory = 'Berline' | 'SUV' | 'VIP Prestige' | 'Minibus / Van' | 'Utilitaire';

export type VehicleStatus = 'Disponible' | 'Loué' | 'Entretien' | 'Indisponible';

export type OwnershipType = 'Flotte Propre' | 'Sous-traitant';

export type BookingStatus = 'En attente' | 'Confirmée' | 'En cours' | 'Terminée' | 'Annulée';

export type RideStatus = 'Planifiée' | 'En route' | 'En cours' | 'Terminée' | 'Annulée';

export type RentalFormula =
  | 'Journée (8h-18h)'
  | 'Demi-journée (4h)'
  | 'Mise à disposition continue (24h)'
  | 'Transfert Aéroport FHB'
  | 'Forfait Week-end'
  | 'Mise à disposition mensuelle';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory;
  seats: number;
  luggage: number;
  transmission: 'Automatique' | 'Manuelle';
  fuel: 'Essence' | 'Diesel' | 'Hybride' | 'Électrique';
  plateNumber: string;
  dailyRate: number; // en FCFA
  halfDayRate: number;
  airportTransferRate: number;
  monthlyRate?: number | null;
  status: VehicleStatus;
  ownership: OwnershipType;
  subcontractorId?: string | null;
  partnerName?: string | null;
  isVip: boolean;
  isRecommended?: boolean;
  imageUrl: string;
  galleryUrls: string[];
  features: string[];
  description: string;
  mileageLimit: string;
  currentMileage?: number | null;
  insuranceExpiry?: string | null;
  technicalControlExpiry?: string | null;
  /** Prochain entretien planifié, dérivé des interventions du véhicule. */
  nextMaintenanceDate?: string | null;
  lastMaintenanceDate?: string | null;
  maintenanceNotes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Driver {
  id: string;
  userId?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  photoUrl?: string | null;
  experienceYears: number;
  rating: number;
  languages: string[];
  status: 'Disponible' | 'En course' | 'En repos' | 'Congé';
  assignedVehicleId?: string | null;
  assignedVehicleName?: string | null;
  completedRides: number;
  licenseNumber: string;
  licenseExpiry?: string | null;
  hireDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface Subcontractor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  commissionRate: number; // pourcentage
  vehicleCount: number;
  fleetProvided: string[];
  status: 'Actif' | 'En attente' | 'Suspendu';
  notes?: string | null;
  createdAt?: string | null;
}

export interface Company {
  id: string;
  name: string;
  tradeRegister: string; // RCCM
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingAddress?: string | null;
  negotiatedDiscountRate: number; // ex. 15 pour 15 %
  promoCode: string | null;
  monthlyVolumeTarget: number;
  /** Calculés par l'API à la lecture, jamais stockés. */
  totalBookings: number;
  totalSpent: number; // en FCFA
  status: 'VIP Contractuel' | 'Standard B2B' | 'En négociation';
  accountManager: string | null;
  creditLineApproved?: boolean;
  creditLimit?: number;
  paymentTermsDays?: number;
  authorizedBookers?: string[];
  notes?: string | null;
  createdAt?: string | null;
}

export interface Booking {
  /** Identifiant technique. La référence lisible est `reference` (RES-0942). */
  id: string;
  reference: string;
  vehicleId: string;
  vehicleName: string | null;
  vehicleCategory: VehicleCategory | null;
  vehicleImageUrl?: string | null;
  clientId?: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  companyId?: string | null;
  companyName?: string | null;
  packId?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  formula: RentalFormula;
  durationDays: number;
  withDriver?: boolean;
  fuelIncluded: boolean;
  baseRate?: number;
  basePrice: number; // en FCFA
  optionsPrice: number;
  discountCode?: string | null;
  discountPercentage: number;
  discountAmount: number;
  discountReason?: string;
  subtotal: number;
  taxRate?: number;
  taxAmount: number; // TVA 18 %
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  currency?: string;
  status: BookingStatus;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  assignedDriverPhone?: string | null;
  assignedVehicleId?: string | null;
  rideId?: string | null;
  invoiceId?: string | null;
  flightNumber?: string | null;
  specialRequests?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AutoPack {
  id: string;
  name: string;
  slug?: string;
  targetAudience: string;
  description: string;
  includedVehicles: string;
  duration: string;
  formula: string;
  fixedPrice: number; // en FCFA
  highlightDiscount: string;
  associatedCompanyIds?: string[];
  popular?: boolean;
  active?: boolean;
  features: string[];
  createdAt?: string | null;
}

export interface Ride {
  id: string;
  reference: string;
  bookingId: string;
  bookingReference?: string | null;
  clientName: string | null;
  clientPhone?: string | null;
  companyName?: string | null;
  driverId: string;
  driverName: string | null;
  driverPhone?: string | null;
  vehicleId: string;
  vehicleName: string | null;
  plateNumber: string | null;
  date: string | null;
  /** Plage horaire formatée « 08:00 - 18:00 ». */
  time: string;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  destinationLocation: string;
  status: RideStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  startMileage?: number | null;
  endMileage?: number | null;
  distanceKm?: number | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface PromoRule {
  id: string;
  code: string;
  description: string;
  discountPercentage: number;
  applicableToCompanyId?: string | null;
  minDays?: number | null;
  minAmount?: number | null;
  maxUses?: number | null;
  usedCount?: number;
  startsAt?: string | null;
  expiresAt: string;
  active: boolean;
  createdAt?: string | null;
}

export type UserType = 'individual' | 'company' | 'driver' | 'admin';

export type AuthTab = 'login' | 'register-individual' | 'register-company';

export interface UserAccount {
  id: string;
  type: UserType;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
  isActive?: boolean;
  createdAt: string | null;

  // Clients particuliers
  city?: string | null;
  district?: string | null;
  /** Adresses favorites, aplaties depuis `/users/me/addresses`. */
  savedAddresses?: string[];
  loyaltyPoints?: number;
  tier?: 'Standard' | 'Silver' | 'Gold VIP';

  // Comptes entreprise (B2B)
  companyId?: string | null;
  companyName?: string | null;
  companyRole?: string | null;
  tradeRegister?: string | null;
  billingAddress?: string | null;
  creditLineApproved?: boolean | null;
  creditLimit?: number | null;
  negotiatedDiscountRate?: number | null;
  authorizedBookers?: string[] | null;

  // Chauffeurs
  driverId?: string | null;
  lastLoginAt?: string | null;
}

/** Adresse favorite telle que renvoyée par l'API. */
export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type WhatsAppNotificationType =
  | 'booking_received'
  | 'booking_validated'
  | 'booking_cancelled'
  | 'driver_assigned'
  | 'driver_approaching'
  | 'trip_started'
  | 'trip_completed'
  | 'payment_received'
  | 'payment_failed'
  | 'invoice_issued'
  | 'maintenance_due'
  | 'account_welcome'
  | 'password_reset';

export type NotificationChannel = 'whatsapp' | 'email' | 'sms' | 'in_app';

export interface WhatsAppNotification {
  id: string;
  channel?: NotificationChannel;
  bookingId: string | null;
  bookingReference?: string | null;
  type: WhatsAppNotificationType;
  title: string;
  recipientName: string;
  recipientPhone: string | null;
  recipientEmail?: string | null;
  timestamp: string;
  timeFormatted: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  failureReason?: string | null;
  messageBody: string;
  /** Champs enrichis, présents selon le type de notification. */
  vehicleName?: string;
  plateNumber?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhoto?: string;
  driverRating?: number;
  pickupLocation?: string;
  pickupDate?: string;
  pickupTime?: string;
  isRead: boolean;
  liveEta?: string;
}

// ---------------------------------------------------------------------------
// Tarification
// ---------------------------------------------------------------------------

/** Remise éligible retournée par le moteur de devis. */
export interface DiscountCandidate {
  source: 'company' | 'promo' | 'volume';
  percentage: number;
  reason: string;
  code?: string;
}

/**
 * Devis calculé par l'API. C'est la seule source de vérité des prix :
 * le frontend n'effectue aucun calcul monétaire.
 */
export interface PriceQuote {
  durationDays: number;
  baseRate: number;
  basePrice: number;
  fuelOptionCost: number;
  optionsPrice: number;
  grossTotal: number;
  discountPercentage: number;
  discountReason: string;
  discountAmount: number;
  discountCode: string | null;
  appliedPromoRuleId: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  discountCandidates: DiscountCandidate[];
  loyaltyPointsEarned: number;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
  conflicts: Array<{
    reference: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}
