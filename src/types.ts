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
  fuel: 'Essence' | 'Diesel' | 'Hybride';
  plateNumber: string;
  dailyRate: number; // in FCFA
  halfDayRate: number;
  airportTransferRate: number;
  status: VehicleStatus;
  ownership: OwnershipType;
  partnerName?: string;
  isVip: boolean;
  isRecommended?: boolean;
  imageUrl: string;
  galleryUrls: string[];
  features: string[];
  description: string;
  mileageLimit: string;
  nextMaintenanceDate?: string;
  lastMaintenanceDate?: string;
  maintenanceNotes?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  photoUrl: string;
  experienceYears: number;
  rating: number;
  languages: string[];
  status: 'Disponible' | 'En course' | 'En repos' | 'Congé';
  assignedVehicleId?: string;
  completedRides: number;
  licenseNumber: string;
}

export interface Subcontractor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  commissionRate: number; // e.g. 15%
  vehicleCount: number;
  fleetProvided: string[];
  status: 'Actif' | 'En attente' | 'Suspendu';
}

export interface Company {
  id: string;
  name: string;
  tradeRegister: string; // RCCM
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  negotiatedDiscountRate: number; // e.g. 15 for 15%
  promoCode: string;
  monthlyVolumeTarget: number;
  totalBookings: number;
  totalSpent: number; // in FCFA
  status: 'VIP Contractuel' | 'Standard B2B' | 'En négociation';
  accountManager: string;
}

export interface Booking {
  id: string; // e.g. RES-0942
  vehicleId: string;
  vehicleName: string;
  vehicleCategory: VehicleCategory;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  companyId?: string;
  companyName?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  formula: RentalFormula;
  durationDays: number;
  basePrice: number; // in FCFA
  optionsPrice: number;
  fuelIncluded: boolean;
  discountCode?: string;
  discountPercentage: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number; // 18% TVA
  totalAmount: number;
  status: BookingStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedVehicleId?: string;
  flightNumber?: string;
  specialRequests?: string;
  createdAt: string;
}

export interface AutoPack {
  id: string;
  name: string;
  targetAudience: string;
  description: string;
  includedVehicles: string;
  duration: string;
  formula: string;
  fixedPrice: number; // in FCFA
  highlightDiscount: string;
  associatedCompanyIds?: string[];
  popular?: boolean;
  features: string[];
}

export interface Ride {
  id: string;
  bookingId: string;
  clientName: string;
  companyName?: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  date: string;
  time: string;
  pickupLocation: string;
  destinationLocation: string;
  status: RideStatus;
  notes?: string;
}

export interface PromoRule {
  code: string;
  description: string;
  discountPercentage: number;
  applicableToCompanyId?: string;
  minDays?: number;
  expiresAt: string;
  active: boolean;
}
