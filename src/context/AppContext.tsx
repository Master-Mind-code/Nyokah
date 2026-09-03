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
  VehicleStatus,
  UserAccount,
  AuthTab,
  WhatsAppNotification,
  WhatsAppNotificationType
} from '../types';
import {
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_COMPANIES,
  INITIAL_SUBCONTRACTORS,
  INITIAL_PACKS,
  INITIAL_BOOKINGS,
  INITIAL_RIDES,
  INITIAL_PROMO_RULES,
  INITIAL_USERS,
  INITIAL_WHATSAPP_NOTIFICATIONS
} from '../data/mockData';

export type Role = 'client' | 'admin';
export type ClientTab = 'home' | 'catalog' | 'vehicle-detail' | 'booking' | 'booking-flow' | 'company-space' | 'user-profile';
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
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  subcontractors: Subcontractor[];
  setSubcontractors: React.Dispatch<React.SetStateAction<Subcontractor[]>>;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  packs: AutoPack[];
  setPacks: React.Dispatch<React.SetStateAction<AutoPack[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  rides: Ride[];
  setRides: React.Dispatch<React.SetStateAction<Ride[]>>;
  promoRules: PromoRule[];
  setPromoRules: React.Dispatch<React.SetStateAction<PromoRule[]>>;
  
  // Booking Wizard State
  bookingDraft: BookingDraft;
  setBookingDraft: React.Dispatch<React.SetStateAction<BookingDraft>>;
  calculatePrice: (draft: BookingDraft, vehicle: Vehicle, companyId?: string | null) => PriceCalculation;
  submitBooking: () => Booking;
  
  // User Authentication & Profile
  currentUser: UserAccount | null;
  users: UserAccount[];
  isAuthModalOpen: boolean;
  authModalTab: AuthTab;
  setIsAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: AuthTab) => void;
  openAuthModal: (tab?: AuthTab) => void;
  closeAuthModal: () => void;
  login: (email: string, password?: string) => boolean;
  loginAsUser: (user: UserAccount) => void;
  registerIndividual: (data: {
    fullName: string;
    email: string;
    phone: string;
    district?: string;
    city?: string;
    password?: string;
  }) => UserAccount;
  registerCompany: (data: {
    companyName: string;
    tradeRegister: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    companyRole?: string;
    billingAddress?: string;
    creditLineRequested?: boolean;
    password?: string;
  }) => UserAccount;
  logout: () => void;
  updateUserProfile: (data: Partial<UserAccount>) => void;
  addFavoriteAddress: (address: string) => void;
  removeFavoriteAddress: (address: string) => void;

  // Actions
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (vehicleId: string, updatedData: Partial<Vehicle>) => void;
  deleteVehicle: (vehicleId: string) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  assignBooking: (bookingId: string, driverId: string, vehicleId: string) => void;
  assignDriverAndVehicle: (bookingId: string, driverId: string, vehicleId: string) => void;
  updateRideStatus: (rideId: string, status: RideStatus) => void;
  updateCompanyDiscount: (companyId: string, discountRate: number) => void;
  addCompany: (company: Omit<Company, 'id' | 'totalBookings' | 'totalSpent'>) => void;
  addPack: (pack: Omit<AutoPack, 'id'>) => void;
  addPromoRule: (rule: PromoRule) => void;
  togglePromoRule: (code: string) => void;
  startBookingForVehicle: (vehicle: Vehicle) => void;

  // WhatsApp Notification Simulator System
  whatsAppNotifications: WhatsAppNotification[];
  unreadWhatsAppCount: number;
  isWhatsAppSimulatorOpen: boolean;
  activeWhatsAppNotification: WhatsAppNotification | null;
  openWhatsAppSimulator: (notif?: WhatsAppNotification) => void;
  closeWhatsAppSimulator: () => void;
  sendWhatsAppNotification: (notif: {
    bookingId: string;
    type: WhatsAppNotificationType;
    title: string;
    recipientName: string;
    recipientPhone: string;
    messageBody: string;
    vehicleName: string;
    plateNumber?: string;
    driverName?: string;
    driverPhone?: string;
    driverPhoto?: string;
    driverRating?: number;
    pickupLocation: string;
    pickupDate: string;
    pickupTime: string;
    liveEta?: string;
  }) => WhatsAppNotification;
  markWhatsAppNotificationAsRead: (id: string) => void;
  markAllWhatsAppNotificationsAsRead: () => void;
  simulateBookingValidationNotification: (bookingId: string) => void;
  simulateDriverAssignmentNotification: (bookingId: string, driverId?: string) => void;
  
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
  
  // Users and Auth State
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(INITIAL_USERS[0]); // Initial default: Jean-Marc Kouassi (Particulier VIP)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>('login');

  // Company selection (syncs with logged-in user if company)
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(
    INITIAL_USERS[0]?.companyId || null
  );
  
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
  
  // WhatsApp Notification System State
  const [whatsAppNotifications, setWhatsAppNotifications] = useState<WhatsAppNotification[]>(INITIAL_WHATSAPP_NOTIFICATIONS);
  const [isWhatsAppSimulatorOpen, setIsWhatsAppSimulatorOpen] = useState<boolean>(false);
  const [activeWhatsAppNotification, setActiveWhatsAppNotification] = useState<WhatsAppNotification | null>(null);

  const unreadWhatsAppCount = whatsAppNotifications.filter((n) => !n.isRead).length;

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

  const openAuthModal = (tab: AuthTab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const loginAsUser = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.type === 'company' && user.companyId) {
      setCurrentCompanyId(user.companyId);
      setRole('client');
      showToast(`Connecté en tant que ${user.fullName} (${user.companyName} - B2B).`, 'success');
    } else if (user.type === 'admin') {
      setRole('admin');
      showToast(`Connecté en tant qu'Administrateur Nyokah.`, 'success');
    } else {
      setCurrentCompanyId(null);
      setRole('client');
      showToast(`Bienvenue, ${user.fullName} !`, 'success');
    }
    
    // Autofill booking draft
    setBookingDraft((prev) => ({
      ...prev,
      clientName: user.fullName,
      clientEmail: user.email,
      clientPhone: user.phone,
      promoCode: user.companyId ? (companies.find(c => c.id === user.companyId)?.promoCode || '') : prev.promoCode
    }));

    closeAuthModal();
  };

  const login = (email: string, _password?: string): boolean => {
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      loginAsUser(found);
      return true;
    }
    showToast('Identifiants incorrects ou compte introuvable.', 'error');
    return false;
  };

  const registerIndividual = (data: {
    fullName: string;
    email: string;
    phone: string;
    district?: string;
    city?: string;
    password?: string;
  }): UserAccount => {
    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      type: 'individual',
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      city: data.city || 'Abidjan',
      district: data.district || 'Cocody',
      savedAddresses: data.district ? [`${data.district}, Abidjan`] : ['Cocody, Abidjan'],
      loyaltyPoints: 500, // 500 Welcome Points
      tier: 'Standard',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setUsers((prev) => [newUser, ...prev]);
    loginAsUser(newUser);
    showToast(`Compte Particulier créé ! +500 points fidélité crédités sur votre compte.`, 'success');
    return newUser;
  };

  const registerCompany = (data: {
    companyName: string;
    tradeRegister: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    companyRole?: string;
    billingAddress?: string;
    creditLineRequested?: boolean;
    password?: string;
  }): UserAccount => {
    const newCompanyId = `comp-${String(companies.length + 1).padStart(2, '0')}`;
    const generatedPromo = `PRO${Math.floor(1000 + Math.random() * 9000)}`;

    const newCompany: Company = {
      id: newCompanyId,
      name: data.companyName,
      tradeRegister: data.tradeRegister,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      negotiatedDiscountRate: 15, // 15% Welcome B2B Discount
      promoCode: generatedPromo,
      monthlyVolumeTarget: 5,
      totalBookings: 0,
      totalSpent: 0,
      status: 'VIP Contractuel',
      accountManager: 'Kouamé N’Guessan'
    };

    const newCorporateUser: UserAccount = {
      id: `user-${Date.now()}`,
      type: 'company',
      fullName: data.contactName,
      email: data.contactEmail,
      phone: data.contactPhone,
      companyId: newCompanyId,
      companyName: data.companyName,
      companyRole: data.companyRole || 'Responsable Mobilité / Logistique',
      tradeRegister: data.tradeRegister,
      billingAddress: data.billingAddress || `${data.companyName}, Abidjan, Côte d'Ivoire`,
      creditLineApproved: data.creditLineRequested ?? true,
      creditLimit: 5000000,
      negotiatedDiscountRate: 15,
      authorizedBookers: [data.contactName],
      createdAt: new Date().toISOString().split('T')[0]
    };

    // Add company promo rule
    const newPromoRule: PromoRule = {
      code: generatedPromo,
      description: `Tarif entreprise ${data.companyName} (-15%)`,
      discountPercentage: 15,
      applicableToCompanyId: newCompanyId,
      expiresAt: '2026-12-31',
      active: true
    };

    setCompanies((prev) => [newCompany, ...prev]);
    setPromoRules((prev) => [newPromoRule, ...prev]);
    setUsers((prev) => [newCorporateUser, ...prev]);
    
    loginAsUser(newCorporateUser);
    showToast(`Compte Entreprise ${data.companyName} créé avec succès ! Remise contractuelle de 15% activée.`, 'success');
    return newCorporateUser;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentCompanyId(null);
    setRole('client');
    showToast('Vous avez été déconnecté avec succès.', 'info');
  };

  const setRoleSecure = (newRole: Role) => {
    if (newRole === 'admin') {
      if (!currentUser || currentUser.type !== 'admin') {
        openAuthModal('login');
        showToast('Accès restreint. Veuillez vous connecter avec le compte Super-Admin.', 'info');
        return;
      }
    }
    setRole(newRole);
  };

  const updateUserProfile = (data: Partial<UserAccount>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    showToast('Vos informations ont été mises à jour.', 'success');
  };

  const addFavoriteAddress = (address: string) => {
    if (!currentUser || !address.trim()) return;
    const currentAddresses = currentUser.savedAddresses || [];
    if (currentAddresses.includes(address.trim())) {
      showToast('Cette adresse est déjà dans vos favoris.', 'info');
      return;
    }
    const updatedAddresses = [...currentAddresses, address.trim()];
    updateUserProfile({ savedAddresses: updatedAddresses });
    showToast('Adresse favorite enregistrée.', 'success');
  };

  const removeFavoriteAddress = (address: string) => {
    if (!currentUser) return;
    const currentAddresses = currentUser.savedAddresses || [];
    const updatedAddresses = currentAddresses.filter((a) => a !== address);
    updateUserProfile({ savedAddresses: updatedAddresses });
    showToast('Adresse retirée de vos favoris.', 'info');
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
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setCurrentCompanyId(null);
    setBookingDraft(DEFAULT_DRAFT);
    setWhatsAppNotifications(INITIAL_WHATSAPP_NOTIFICATIONS);
    setActiveWhatsAppNotification(null);
    showToast('Données de démonstration réinitialisées avec succès.', 'info');
  };

  // WhatsApp Notification System Handlers
  const openWhatsAppSimulator = (notif?: WhatsAppNotification) => {
    if (notif) {
      setActiveWhatsAppNotification(notif);
      markWhatsAppNotificationAsRead(notif.id);
    } else if (whatsAppNotifications.length > 0) {
      setActiveWhatsAppNotification(whatsAppNotifications[0]);
    }
    setIsWhatsAppSimulatorOpen(true);
  };

  const closeWhatsAppSimulator = () => {
    setIsWhatsAppSimulatorOpen(false);
  };

  const markWhatsAppNotificationAsRead = (id: string) => {
    setWhatsAppNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, status: 'read' } : n))
    );
  };

  const markAllWhatsAppNotificationsAsRead = () => {
    setWhatsAppNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, status: 'read' }))
    );
    showToast('Toutes les notifications WhatsApp ont été marquées comme lues.', 'info');
  };

  const sendWhatsAppNotification = (notifData: {
    bookingId: string;
    type: WhatsAppNotificationType;
    title: string;
    recipientName: string;
    recipientPhone: string;
    messageBody: string;
    vehicleName: string;
    plateNumber?: string;
    driverName?: string;
    driverPhone?: string;
    driverPhoto?: string;
    driverRating?: number;
    pickupLocation: string;
    pickupDate: string;
    pickupTime: string;
    liveEta?: string;
  }): WhatsAppNotification => {
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newNotif: WhatsAppNotification = {
      ...notifData,
      id: `wa-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: now.toISOString(),
      timeFormatted,
      status: 'delivered',
      isRead: false
    };

    setWhatsAppNotifications((prev) => [newNotif, ...prev]);
    showToast(`📱 Alerte WhatsApp envoyée : ${notifData.title} (${notifData.recipientPhone})`, 'success');
    return newNotif;
  };

  const simulateBookingValidationNotification = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const formattedMessage = `✅ *RÉSERVATION CONFIRMÉE & VALIDÉE*

Bonjour *${booking.clientName}*,

Excellente nouvelle ! Votre réservation *#${booking.id}* a été formellement validée par la conciergerie Nyokah Mobility.

🚘 *Véhicule :* ${booking.vehicleName}
📍 *Prise en charge :* ${booking.pickupLocation}
🏁 *Destination :* ${booking.dropoffLocation}
📅 *Période :* du ${booking.startDate} (${booking.startTime}) au ${booking.endDate} (${booking.endTime})
📋 *Formule :* ${booking.formula}
💰 *Montant Total TTC :* ${formatFCFA(booking.totalAmount)}
${booking.companyName ? `🏢 *Compte Entreprise :* ${booking.companyName}` : ''}

Notre pôle dispatching procède à l'affectation de votre chauffeur attitré. Vous recevrez sa fiche complète sur ce fil WhatsApp sous peu.

_Service Conciergerie VIP Nyokah : +225 27 20 21 00 00_`;

    sendWhatsAppNotification({
      bookingId: booking.id,
      type: 'booking_validated',
      title: `Réservation ${booking.id} validée`,
      recipientName: booking.clientName,
      recipientPhone: booking.clientPhone,
      messageBody: formattedMessage,
      vehicleName: booking.vehicleName,
      pickupLocation: booking.pickupLocation,
      pickupDate: booking.startDate,
      pickupTime: booking.startTime,
      liveEta: 'Validée au planning Nyokah'
    });
  };

  const simulateDriverAssignmentNotification = (bookingId: string, driverId?: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const driver = driverId ? drivers.find((d) => d.id === driverId) : (drivers.find((d) => d.id === booking.assignedDriverId) || drivers[0]);
    const vehicle = vehicles.find((v) => v.id === booking.vehicleId) || vehicles[0];

    const driverRatingStr = driver ? `⭐ ${driver.rating.toFixed(2)}/5 (${driver.completedRides} courses)` : '⭐ 4.95/5';

    const formattedMessage = `👔 *VOTRE CHAUFFEUR PRIVÉ A ÉTÉ AFFECTÉ*

Bonjour *${booking.clientName}*,

Votre chauffeur VIP Nyokah a été affecté à votre mission *#${booking.id}*.

👤 *Chauffeur :* ${driver?.name || 'Ibrahim Koné'} (${driverRatingStr})
📞 *WhatsApp Direct :* ${driver?.phone || '+225 07 48 12 34 56'}
🗣️ *Langues parlées :* ${driver?.languages.join(', ') || 'Français, Anglais'}

🚗 *Véhicule :* ${vehicle.brand} ${vehicle.model} (${vehicle.year})
🔢 *Immatriculation :* ${vehicle.plateNumber}
📍 *Lieu de RDV :* ${booking.pickupLocation}
⏰ *Prise en charge :* ${booking.startDate} à ${booking.startTime}

Votre chauffeur se présentera en tenue de protocole 15 minutes avant l'heure convenue avec pancarte personnalisée. Vous pouvez le contacter directement via ce fil.

_Nyokah Mobility — L'excellence de la mobilité à Abidjan._`;

    sendWhatsAppNotification({
      bookingId: booking.id,
      type: 'driver_assigned',
      title: `Chauffeur ${driver?.name || 'VIP'} affecté`,
      recipientName: booking.clientName,
      recipientPhone: booking.clientPhone,
      messageBody: formattedMessage,
      vehicleName: `${vehicle.brand} ${vehicle.model}`,
      plateNumber: vehicle.plateNumber,
      driverName: driver?.name,
      driverPhone: driver?.phone,
      driverPhoto: driver?.photoUrl,
      driverRating: driver?.rating,
      pickupLocation: booking.pickupLocation,
      pickupDate: booking.startDate,
      pickupTime: booking.startTime,
      liveEta: 'Briefé & Confirmé'
    });
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
    setRole('client');
    setClientTab('booking');
    showToast(`Véhicule ${vehicle.brand} ${vehicle.model} sélectionné pour la réservation.`, 'info');
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

    // Send immediate WhatsApp receipt confirmation
    const waReceiptText = `📋 *DEMANDE DE RÉSERVATION ENREGISTRÉE*

Bonjour *${newBooking.clientName}*,

Nous accusons bonne réception de votre demande de réservation *#${newBooking.id}*.

🚘 *Véhicule :* ${newBooking.vehicleName}
📅 *Prise en charge :* ${newBooking.startDate} à ${newBooking.startTime}
📍 *Lieu :* ${newBooking.pickupLocation}
💰 *Total prévisionnel :* ${formatFCFA(newBooking.totalAmount)}

Notre équipe contrôle les disponibilités et vous notifiera sur ce canal dès validation finale et attribution de votre chauffeur.

_Nyokah Mobility — Service Conciergerie 24/7_`;

    sendWhatsAppNotification({
      bookingId: newBooking.id,
      type: 'booking_received',
      title: `Demande ${newBooking.id} reçue`,
      recipientName: newBooking.clientName,
      recipientPhone: newBooking.clientPhone,
      messageBody: waReceiptText,
      vehicleName: newBooking.vehicleName,
      pickupLocation: newBooking.pickupLocation,
      pickupDate: newBooking.startDate,
      pickupTime: newBooking.startTime,
      liveEta: 'En cours de validation dispatch'
    });

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

    if (status === 'Confirmée') {
      simulateBookingValidationNotification(bookingId);
    }

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

    // Send WhatsApp notification for driver assignment
    simulateDriverAssignmentNotification(bookingId, driver.id);

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
        setRole: setRoleSecure,
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
        setVehicles,
        drivers,
        setDrivers,
        subcontractors,
        setSubcontractors,
        companies,
        setCompanies,
        packs,
        setPacks,
        bookings,
        setBookings,
        rides,
        setRides,
        promoRules,
        setPromoRules,
        bookingDraft,
        setBookingDraft,
        calculatePrice,
        submitBooking,
        currentUser,
        users,
        isAuthModalOpen,
        authModalTab,
        setIsAuthModalOpen,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        loginAsUser,
        registerIndividual,
        registerCompany,
        logout,
        updateUserProfile,
        addFavoriteAddress,
        removeFavoriteAddress,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        updateVehicleStatus,
        updateBookingStatus,
        assignBooking,
        assignDriverAndVehicle: assignBooking,
        updateRideStatus,
        updateCompanyDiscount,
        addCompany,
        addPack,
        addPromoRule,
        togglePromoRule,
        startBookingForVehicle,
        whatsAppNotifications,
        unreadWhatsAppCount,
        isWhatsAppSimulatorOpen,
        activeWhatsAppNotification,
        openWhatsAppSimulator,
        closeWhatsAppSimulator,
        sendWhatsAppNotification,
        markWhatsAppNotificationAsRead,
        markAllWhatsAppNotificationsAsRead,
        simulateBookingValidationNotification,
        simulateDriverAssignmentNotification,
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
