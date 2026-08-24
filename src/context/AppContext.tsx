import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Vehicle, 
  Driver, 
  Subcontractor, 
  Company, 
  Booking, 
  AutoPack, 
  Ride, 
  PromoRule, 
  RentalFormula, 
  BookingStatus, 
  RideStatus, 
  VehicleStatus 
} from '../types';
import {
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_COMPANIES,
  INITIAL_SUBCONTRACTORS,
  INITIAL_PACKS,
  INITIAL_BOOKINGS,
  INITIAL_RIDES,
  INITIAL_PROMO_RULES
} from '../data/mockData';

export type Role = 'client' | 'admin';
export type ClientTab = 'home' | 'catalog' | 'vehicle-detail' | 'booking-flow' | 'company-space';
export type AdminTab = 
  | 'dashboard' 
  | 'reservations' 
  | 'fleet' 
  | 'packs' 
  | 'pricing-discounts' 
  | 'companies' 
  | 'drivers-partners' 
  | 'rides';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface BookingDraft {
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  formula: RentalFormula;
  fuelIncluded: boolean;
  flightNumber?: string;
  specialRequests?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  promoCode: string;
}

export interface PriceCalculation {
  durationDays: number;
  dailyRate: number;
  basePrice: number;
  formulaMultiplier: number;
  fuelOptionCost: number;
  grossTotal: number;
  discountPercentage: number;
  discountReason: string;
  discountAmount: number;
  subtotal: number;
  taxAmount: number; // 18%
  totalTTC: number;
}

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  clientTab: ClientTab;
  setClientTab: (tab: ClientTab) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  
  // Selected Contexts
  currentCompanyId: string | null;
  setCurrentCompanyId: (companyId: string | null) => void;
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  selectedBooking: Booking | null;
  setSelectedBooking: (booking: Booking | null) => void;
  
  // Data lists
  vehicles: Vehicle[];
  drivers: Driver[];
  subcontractors: Subcontractor[];
  companies: Company[];
  packs: AutoPack[];
  bookings: Booking[];
  rides: Ride[];
  promoRules: PromoRule[];
  
  // Booking Wizard State
  bookingDraft: BookingDraft;
  setBookingDraft: React.Dispatch<React.SetStateAction<BookingDraft>>;
  calculatePrice: (draft: BookingDraft, vehicle: Vehicle, companyId?: string | null) => PriceCalculation;
  submitBooking: () => Booking;
  
  // Actions
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (vehicleId: string, updatedData: Partial<Vehicle>) => void;
  deleteVehicle: (vehicleId: string) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  assignBooking: (bookingId: string, driverId: string, vehicleId: string) => void;
  updateRideStatus: (rideId: string, status: RideStatus) => void;
  updateCompanyDiscount: (companyId: string, discountRate: number) => void;
  addCompany: (company: Omit<Company, 'id' | 'totalBookings' | 'totalSpent'>) => void;
  addPack: (pack: Omit<AutoPack, 'id'>) => void;
  addPromoRule: (rule: PromoRule) => void;
  togglePromoRule: (code: string) => void;
  startBookingForVehicle: (vehicle: Vehicle) => void;
  
  // Helpers
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  resetDemoData: () => void;
  formatFCFA: (amount: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function formatFCFA(amount: number): string {
  if (isNaN(amount)) return '0 FCFA';
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

const DEFAULT_DRAFT: BookingDraft = {
  vehicleId: 'veh-04',
  startDate: '2026-09-02',
  endDate: '2026-09-05',
  startTime: '08:00',
  endTime: '18:00',
  pickupLocation: 'Aéroport Félix-Houphouët-Boigny (FHB), Abidjan',
  dropoffLocation: 'Sofitel Abidjan Hôtel Ivoire, Cocody',
  formula: 'Journée (8h-18h)',
  fuelIncluded: true,
  flightNumber: 'AF 702',
  specialRequests: 'Chauffeur bilingue avec pancarte d’accueil VIP personnalisée.',
  clientName: 'Jean Dupont',
  clientEmail: 'jean.dupont@sifca-ci.com',
  clientPhone: '+225 01 23 45 67 89',
  promoCode: 'CORP15'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('client');
  const [clientTab, setClientTab] = useState<ClientTab>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  
  // Mock company login simulation. By default, logged in as Jean Dupont @ Groupe SIFCA
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>('comp-01');
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>(INITIAL_SUBCONTRACTORS);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [packs, setPacks] = useState<AutoPack[]>(INITIAL_PACKS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [rides, setRides] = useState<Ride[]>(INITIAL_RIDES);
  const [promoRules, setPromoRules] = useState<PromoRule[]>(INITIAL_PROMO_RULES);
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(DEFAULT_DRAFT);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const resetDemoData = () => {
    setVehicles(INITIAL_VEHICLES);
    setDrivers(INITIAL_DRIVERS);
    setCompanies(INITIAL_COMPANIES);
    setSubcontractors(INITIAL_SUBCONTRACTORS);
    setPacks(INITIAL_PACKS);
    setBookings(INITIAL_BOOKINGS);
    setRides(INITIAL_RIDES);
    setPromoRules(INITIAL_PROMO_RULES);
    setBookingDraft(DEFAULT_DRAFT);
    showToast('Données de démonstration réinitialisées avec succès.', 'info');
  };

  // Sync booking draft with selected company if needed
  useEffect(() => {
    if (currentCompanyId) {
      const company = companies.find((c) => c.id === currentCompanyId);
      if (company) {
        setBookingDraft((prev) => ({
          ...prev,
          clientName: company.contactName,
          clientEmail: company.contactEmail,
          clientPhone: company.contactPhone,
          promoCode: company.promoCode || prev.promoCode
        }));
      }
    }
  }, [currentCompanyId, companies]);

  // Pricing calculation engine with corporate discounts, multi-day tiers & promo codes
  const calculatePrice = (
    draft: BookingDraft,
    vehicle: Vehicle,
    companyId?: string | null
  ): PriceCalculation => {
    // 1. Calculate duration in days
    const start = new Date(draft.startDate);
    const end = new Date(draft.endDate);
    let diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0 || isNaN(diffDays)) diffDays = 1;

    let baseRate = vehicle.dailyRate;
    let formulaMultiplier = 1;

    if (draft.formula === 'Demi-journée (4h)') {
      baseRate = vehicle.halfDayRate;
    } else if (draft.formula === 'Transfert Aéroport FHB') {
      baseRate = vehicle.airportTransferRate;
    } else if (draft.formula === 'Mise à disposition continue (24h)') {
      baseRate = Math.round(vehicle.dailyRate * 1.5);
    } else if (draft.formula === 'Mise à disposition mensuelle') {
      baseRate = Math.round((vehicle.dailyRate * 22) * 0.75 / 22); // ~25% discount for monthly
    }

    // Degressive multi-day volume discount (built-in grid)
    let volumeDiscountPct = 0;
    if (diffDays >= 7) {
      volumeDiscountPct = 12; // 12% for >= 7 days
    } else if (diffDays >= 3) {
      volumeDiscountPct = 5; // 5% for >= 3 days
    }

    const basePrice = baseRate * diffDays;
    const fuelOptionCost = draft.fuelIncluded ? (vehicle.category === 'VIP Prestige' ? 50000 : 25000) * diffDays : 0;
    const grossTotal = basePrice + fuelOptionCost;

    // Determine corporate or promo discount
    let discountPercentage = 0;
    let discountReason = '';

    const effectiveCompanyId = companyId !== undefined ? companyId : currentCompanyId;
    const company = companies.find((c) => c.id === effectiveCompanyId);

    if (company && company.negotiatedDiscountRate > 0) {
      discountPercentage = company.negotiatedDiscountRate;
      discountReason = `Remise Société (${company.name} -${company.negotiatedDiscountRate}%)`;
    }

    // Check custom promo code if entered
    if (draft.promoCode.trim()) {
      const codeUpper = draft.promoCode.trim().toUpperCase();
      const matchedRule = promoRules.find(
        (r) => r.code.toUpperCase() === codeUpper && r.active
      );

      if (matchedRule) {
        if (matchedRule.discountPercentage > discountPercentage) {
          discountPercentage = matchedRule.discountPercentage;
          discountReason = `Code Promo ${matchedRule.code} (-${matchedRule.discountPercentage}%)`;
        }
      }
    }

    // Combine volume discount if no corporate discount or if higher
    if (volumeDiscountPct > discountPercentage) {
      discountPercentage = volumeDiscountPct;
      discountReason = `Remise Volume Durée (${diffDays} jours : -${volumeDiscountPct}%)`;
    }

    const discountAmount = Math.round((grossTotal * discountPercentage) / 100);
    const subtotal = grossTotal - discountAmount;
    const taxAmount = Math.round(subtotal * 0.18); // TVA 18% in Ivory Coast
    const totalTTC = subtotal + taxAmount;

    return {
      durationDays: diffDays,
      dailyRate: baseRate,
      basePrice,
      formulaMultiplier,
      fuelOptionCost,
      grossTotal,
      discountPercentage,
      discountReason,
      discountAmount,
      subtotal,
      taxAmount,
      totalTTC
    };
  };

  const startBookingForVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setBookingDraft((prev) => ({
      ...prev,
      vehicleId: vehicle.id
    }));
    setClientTab('booking-flow');
  };

  const submitBooking = (): Booking => {
    const vehicle = vehicles.find((v) => v.id === bookingDraft.vehicleId) || vehicles[0];
    const company = companies.find((c) => c.id === currentCompanyId);
    const price = calculatePrice(bookingDraft, vehicle, currentCompanyId);

    const bookingNumber = `RES-09${bookings.length + 43}`;
    const newBooking: Booking = {
      id: bookingNumber,
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
      vehicleCategory: vehicle.category,
      clientName: bookingDraft.clientName || 'Client Nyokah',
      clientEmail: bookingDraft.clientEmail || 'client@entreprise.ci',
      clientPhone: bookingDraft.clientPhone || '+225 01 23 45 67 89',
      companyId: company?.id,
      companyName: company?.name,
      startDate: bookingDraft.startDate,
      endDate: bookingDraft.endDate,
      startTime: bookingDraft.startTime,
      endTime: bookingDraft.endTime,
      pickupLocation: bookingDraft.pickupLocation,
      dropoffLocation: bookingDraft.dropoffLocation,
      formula: bookingDraft.formula,
      durationDays: price.durationDays,
      basePrice: price.basePrice,
      optionsPrice: price.fuelOptionCost,
      fuelIncluded: bookingDraft.fuelIncluded,
      discountCode: bookingDraft.promoCode || company?.promoCode,
      discountPercentage: price.discountPercentage,
      discountAmount: price.discountAmount,
      subtotal: price.subtotal,
      taxAmount: price.taxAmount,
      totalAmount: price.totalTTC,
      status: 'En attente',
      flightNumber: bookingDraft.flightNumber,
      specialRequests: bookingDraft.specialRequests,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setBookings((prev) => [newBooking, ...prev]);

    // If company booked, update company stats
    if (company) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === company.id
            ? {
                ...c,
                totalBookings: c.totalBookings + 1,
                totalSpent: c.totalSpent + newBooking.totalAmount
              }
            : c
        )
      );
    }

    showToast(`Réservation ${newBooking.id} enregistrée avec succès !`, 'success');
    return newBooking;
  };

  const addVehicle = (newVeh: Omit<Vehicle, 'id'>) => {
    const id = `veh-${String(vehicles.length + 1).padStart(2, '0')}`;
    const created: Vehicle = { ...newVeh, id };
    setVehicles((prev) => [created, ...prev]);
    showToast(`Véhicule ${created.brand} ${created.model} ajouté à la flotte.`, 'success');
  };

  const updateVehicle = (vehicleId: string, updatedData: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, ...updatedData } : v))
    );
    showToast(`Paramètres du véhicule mis à jour avec succès.`, 'success');
  };

  const deleteVehicle = (vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    showToast(`Véhicule ${target ? `${target.brand} ${target.model}` : vehicleId} retiré du parc.`, 'info');
  };

  const updateVehicleStatus = (vehicleId: string, status: VehicleStatus) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, status } : v))
    );
    showToast(`Statut du véhicule mis à jour : ${status}`, 'info');
  };

  const updateBookingStatus = (bookingId: string, status: BookingStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
    );
    showToast(`Réservation ${bookingId} : statut changé en "${status}".`, 'info');
  };

  const assignBooking = (bookingId: string, driverId: string, vehicleId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const booking = bookings.find((b) => b.id === bookingId);

    if (!driver || !vehicle || !booking) return;

    // 1. Update Booking
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'Confirmée',
              assignedDriverId: driver.id,
              assignedDriverName: driver.name,
              assignedVehicleId: vehicle.id,
              vehicleName: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`
            }
          : b
      )
    );

    // 2. Update Driver & Vehicle status
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? { ...d, status: 'En course', assignedVehicleId: vehicle.id }
          : d
      )
    );

    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, status: 'Loué' } : v))
    );

    // 3. Create or Update Ride in Course List
    const newRide: Ride = {
      id: `RIDE-${rides.length + 105}`,
      bookingId: booking.id,
      clientName: booking.clientName,
      companyName: booking.companyName,
      driverId: driver.id,
      driverName: driver.name,
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model}`,
      plateNumber: vehicle.plateNumber,
      date: booking.startDate,
      time: `${booking.startTime} - ${booking.endTime}`,
      pickupLocation: booking.pickupLocation,
      destinationLocation: booking.dropoffLocation,
      status: 'Planifiée',
      notes: booking.specialRequests
    };

    setRides((prev) => [newRide, ...prev]);

    showToast(
      `Véhicule ${vehicle.model} et Chauffeur ${driver.name} affectés à la réservation ${bookingId} ! Course créée.`,
      'success'
    );
  };

  const updateRideStatus = (rideId: string, status: RideStatus) => {
    setRides((prev) =>
      prev.map((r) => (r.id === rideId ? { ...r, status } : r))
    );
    showToast(`Course ${rideId} passée au statut "${status}".`, 'info');
  };

  const updateCompanyDiscount = (companyId: string, discountRate: number) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === companyId ? { ...c, negotiatedDiscountRate: discountRate } : c
      )
    );
    showToast(`Taux de rabais négocié mis à jour : ${discountRate}%`, 'success');
  };

  const addCompany = (newComp: Omit<Company, 'id' | 'totalBookings' | 'totalSpent'>) => {
    const id = `comp-${String(companies.length + 1).padStart(2, '0')}`;
    const comp: Company = {
      ...newComp,
      id,
      totalBookings: 0,
      totalSpent: 0
    };
    setCompanies((prev) => [...prev, comp]);
    showToast(`Société ${comp.name} enregistrée avec remise de ${comp.negotiatedDiscountRate}%.`, 'success');
  };

  const addPack = (newPack: Omit<AutoPack, 'id'>) => {
    const id = `pack-${String(packs.length + 1).padStart(2, '0')}`;
    setPacks((prev) => [...prev, { ...newPack, id }]);
    showToast(`Pack "${newPack.name}" créé avec succès.`, 'success');
  };

  const addPromoRule = (rule: PromoRule) => {
    setPromoRules((prev) => [rule, ...prev]);
    showToast(`Règle tarifaire "${rule.code}" créée.`, 'success');
  };

  const togglePromoRule = (code: string) => {
    setPromoRules((prev) =>
      prev.map((r) => (r.code === code ? { ...r, active: !r.active } : r))
    );
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        clientTab,
        setClientTab,
        adminTab,
        setAdminTab,
        currentCompanyId,
        setCurrentCompanyId,
        selectedVehicle,
        setSelectedVehicle,
        selectedBooking,
        setSelectedBooking,
        vehicles,
        drivers,
        subcontractors,
        companies,
        packs,
        bookings,
        rides,
        promoRules,
        bookingDraft,
        setBookingDraft,
        calculatePrice,
        submitBooking,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        updateVehicleStatus,
        updateBookingStatus,
        assignBooking,
        updateRideStatus,
        updateCompanyDiscount,
        addCompany,
        addPack,
        addPromoRule,
        togglePromoRule,
        startBookingForVehicle,
        toasts,
        showToast,
        removeToast,
        resetDemoData,
        formatFCFA
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
