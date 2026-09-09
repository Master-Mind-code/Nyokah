import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AutoPack,
  Booking,
  BookingStatus,
  Company,
  Driver,
  PriceQuote,
  PromoRule,
  RentalFormula,
  Ride,
  RideStatus,
  Subcontractor,
  UserAccount,
  AuthTab,
  Vehicle,
  VehicleStatus,
  WhatsAppNotification
} from '../types';
import { ApiError, setSessionExpiredHandler, tokenStore } from '../api/client';
import type { ErrorKind } from '../components/common/ErrorPage';
import {
  analyticsApi,
  authApi,
  bookingsApi,
  companiesApi,
  driversApi,
  maintenanceApi,
  notificationsApi,
  packsApi,
  paymentsApi,
  pricingApi,
  promosApi,
  ridesApi,
  subcontractorsApi,
  usersApi,
  vehiclesApi,
  type CreateBookingInput,
  type DashboardStats,
  type RevenueReport
} from '../api/endpoints';

export type Role = 'client' | 'admin';
export type ClientTab =
  | 'home'
  | 'catalog'
  | 'vehicle-detail'
  | 'booking'
  | 'booking-flow'
  | 'company-space'
  | 'user-profile';
export type AdminTab =
  | 'dashboard'
  | 'reservations'
  | 'fleet'
  | 'packs'
  | 'pricing-discounts'
  | 'companies'
  | 'drivers-partners'
  | 'rides'
  | 'settings';

export interface AppError {
  kind: ErrorKind;
  detail?: string | null;
  requestId?: string | null;
}

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

export function formatFCFA(amount: number): string {
  if (!Number.isFinite(amount)) return '0 FCFA';
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

const DEFAULT_DRAFT: BookingDraft = {
  vehicleId: '',
  startDate: isoDay(2),
  endDate: isoDay(5),
  startTime: '08:00',
  endTime: '18:00',
  pickupLocation: 'Aéroport Félix-Houphouët-Boigny (FHB), Abidjan',
  dropoffLocation: 'Sofitel Abidjan Hôtel Ivoire, Cocody',
  formula: 'Journée (8h-18h)',
  fuelIncluded: true,
  flightNumber: '',
  specialRequests: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  promoCode: ''
};

interface AppContextType {
  // Navigation
  role: Role;
  setRole: (role: Role) => void;
  clientTab: ClientTab;
  setClientTab: (tab: ClientTab) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;

  // Contexte sélectionné
  currentCompanyId: string | null;
  setCurrentCompanyId: (companyId: string | null) => void;
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  selectedBooking: Booking | null;
  setSelectedBooking: (booking: Booking | null) => void;

  // Données chargées depuis l'API
  vehicles: Vehicle[];
  drivers: Driver[];
  subcontractors: Subcontractor[];
  companies: Company[];
  packs: AutoPack[];
  bookings: Booking[];
  rides: Ride[];
  promoRules: PromoRule[];

  /** Vrai pendant le chargement initial de l'application. */
  isBootstrapping: boolean;
  /** Vrai pendant une écriture ou un rechargement en arrière-plan. */
  isSyncing: boolean;
  /**
   * Incident bloquant à présenter en pleine page (perte de réseau, panne
   * serveur, session expirée). Les erreurs corrigeables par l'utilisateur
   * — saisie invalide, doublon — restent volontairement dans le formulaire.
   */
  appError: AppError | null;
  clearAppError: () => void;
  /** Panne de l'API au démarrage, le cas échéant. */
  connectionError: string | null;
  /** Message de la dernière écriture refusée, pour un affichage persistant dans les formulaires. */
  lastError: string | null;
  clearLastError: () => void;
  refreshAll: () => Promise<void>;

  // Tunnel de réservation
  bookingDraft: BookingDraft;
  setBookingDraft: React.Dispatch<React.SetStateAction<BookingDraft>>;
  requestQuote: (draft: BookingDraft, signal?: AbortSignal) => Promise<PriceQuote>;
  submitBooking: () => Promise<Booking>;
  startBookingForVehicle: (vehicle: Vehicle) => void;

  // Authentification
  currentUser: UserAccount | null;
  isAuthModalOpen: boolean;
  authModalTab: AuthTab;
  setIsAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: AuthTab) => void;
  openAuthModal: (tab?: AuthTab) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  registerIndividual: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    district?: string;
    city?: string;
  }) => Promise<UserAccount | null>;
  registerCompany: (data: {
    companyName: string;
    tradeRegister: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    password: string;
    companyRole?: string;
    billingAddress?: string;
    creditLineRequested?: boolean;
  }) => Promise<UserAccount | null>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserAccount>) => Promise<void>;
  addFavoriteAddress: (address: string) => Promise<void>;
  removeFavoriteAddress: (address: string) => Promise<void>;

  // Flotte
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<boolean>;
  updateVehicle: (vehicleId: string, data: Partial<Vehicle>) => Promise<boolean>;
  deleteVehicle: (vehicleId: string) => Promise<boolean>;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => Promise<boolean>;
  /** Immobilise le véhicule et ouvre une intervention d'entretien. */
  sendVehicleToMaintenance: (vehicleId: string, notes?: string) => Promise<boolean>;
  /** Clôture les interventions en cours et planifie la révision suivante. */
  completeVehicleMaintenance: (vehicleId: string, notes?: string) => Promise<boolean>;

  // Chauffeurs et partenaires
  addDriver: (driver: Omit<Driver, 'id' | 'rating' | 'completedRides'>) => Promise<boolean>;
  updateDriverStatus: (driverId: string, status: Driver['status']) => Promise<boolean>;
  addSubcontractor: (
    partner: Omit<Subcontractor, 'id' | 'vehicleCount' | 'fleetProvided'>
  ) => Promise<boolean>;
  updateSubcontractor: (id: string, data: Partial<Subcontractor>) => Promise<boolean>;

  // Entreprises
  addCompany: (company: Omit<Company, 'id' | 'totalBookings' | 'totalSpent'>) => Promise<boolean>;
  updateCompany: (companyId: string, data: Partial<Company>) => Promise<boolean>;
  deleteCompany: (companyId: string) => Promise<boolean>;
  updateCompanyDiscount: (companyId: string, discountRate: number) => Promise<boolean>;

  // Packs et remises
  addPack: (pack: Omit<AutoPack, 'id'>) => Promise<boolean>;
  updatePack: (packId: string, data: Partial<AutoPack>) => Promise<boolean>;
  deactivatePack: (packId: string) => Promise<boolean>;
  addPromoRule: (rule: Omit<PromoRule, 'id' | 'usedCount'>) => Promise<boolean>;
  togglePromoRule: (promoId: string) => Promise<boolean>;
  deletePromoRule: (promoId: string) => Promise<boolean>;
  /** Recharge les règles tarifaires depuis l API. */
  refreshPromoRules: () => Promise<void>;

  // Réservations et courses
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<boolean>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<boolean>;
  assignDriverAndVehicle: (
    bookingId: string,
    driverId: string,
    vehicleId?: string | null
  ) => Promise<boolean>;
  updateRideStatus: (rideId: string, status: RideStatus) => Promise<boolean>;
  payBooking: (bookingId: string) => Promise<boolean>;

  // Notifications
  whatsAppNotifications: WhatsAppNotification[];
  unreadWhatsAppCount: number;
  isWhatsAppSimulatorOpen: boolean;
  activeWhatsAppNotification: WhatsAppNotification | null;
  openWhatsAppSimulator: (notif?: WhatsAppNotification) => void;
  closeWhatsAppSimulator: () => void;
  markWhatsAppNotificationAsRead: (id: string) => Promise<void>;
  markAllWhatsAppNotificationsAsRead: () => Promise<void>;

  // Pilotage
  dashboardStats: DashboardStats | null;
  revenueReport: RevenueReport | null;

  // Divers
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  formatFCFA: (amount: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('client');
  const [clientTab, setClientTab] = useState<ClientTab>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>('login');
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [packs, setPacks] = useState<AutoPack[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [promoRules, setPromoRules] = useState<PromoRule[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [appError, setAppError] = useState<AppError | null>(null);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(DEFAULT_DRAFT);

  const [whatsAppNotifications, setWhatsAppNotifications] = useState<WhatsAppNotification[]>([]);
  const [isWhatsAppSimulatorOpen, setIsWhatsAppSimulatorOpen] = useState(false);
  const [activeWhatsAppNotification, setActiveWhatsAppNotification] =
    useState<WhatsAppNotification | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const unreadWhatsAppCount = whatsAppNotifications.filter((n) => !n.isRead).length;

  // -------------------------------------------------------------------------
  // Notifications d'interface
  // -------------------------------------------------------------------------

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  /**
   * Traduit une erreur d'API en message lisible.
   *
   * Les incidents que l'utilisateur ne peut pas corriger depuis son écran
   * (réseau coupé, panne serveur) basculent en pleine page : un message fugace
   * laisserait croire que l'action a simplement échoué. Les erreurs de saisie
   * restent dans le formulaire, au plus près du champ à corriger.
   */
  const reportError = useCallback(
    (error: unknown, fallback: string): null => {
      const message =
        error instanceof ApiError
          ? [error.message, ...error.fieldErrors].join(' ')
          : error instanceof Error
            ? error.message
            : fallback;

      setLastError(message || fallback);

      if (error instanceof ApiError) {
        // `status === 0` : la requête n'a jamais atteint le serveur.
        if (error.status === 0 && error.code === 'NETWORK_ERROR') {
          setAppError({ kind: 'offline', detail: null });
          return null;
        }

        if (error.status >= 500) {
          setAppError({ kind: 'server-error', detail: error.message, requestId: error.requestId });
          return null;
        }
      }

      showToast(message || fallback, 'error');
      return null;
    },
    [showToast]
  );

  // -------------------------------------------------------------------------
  // Chargement des données
  // -------------------------------------------------------------------------

  /** Données publiques : visibles sans compte (catalogue et offres). */
  const loadPublicData = useCallback(async () => {
    const [vehicleList, packList] = await Promise.all([vehiclesApi.list(), packsApi.list()]);
    setVehicles(vehicleList);
    setPacks(packList);
  }, []);

  /**
   * Données protégées, chargées selon le rôle : l'API cloisonne déjà, mais
   * inutile de demander à un client des ressources qu'il ne peut pas voir.
   */
  const loadPrivateData = useCallback(async (user: UserAccount | null) => {
    if (!user) {
      setBookings([]);
      setRides([]);
      setDrivers([]);
      setSubcontractors([]);
      setCompanies([]);
      setPromoRules([]);
      setWhatsAppNotifications([]);
      setDashboardStats(null);
      setRevenueReport(null);
      return;
    }

    const bookingList = await bookingsApi.list().catch(() => []);
    setBookings(bookingList);

    const notifications = await notificationsApi.list().catch(() => ({ data: [], unreadCount: 0 }));
    setWhatsAppNotifications(notifications.data);

    if (user.type === 'admin') {
      const [driverList, partnerList, companyList, rideList, promoList, stats] = await Promise.all([
        driversApi.list().catch(() => []),
        subcontractorsApi.list().catch(() => []),
        companiesApi.list().catch(() => []),
        ridesApi.list().catch(() => []),
        promosApi.list().catch(() => []),
        analyticsApi.dashboard().catch(() => null)
      ]);

      setRevenueReport(await analyticsApi.revenue('month').catch(() => null));

      setDrivers(driverList);
      setSubcontractors(partnerList);
      setCompanies(companyList);
      setRides(rideList);
      setPromoRules(promoList);
      setDashboardStats(stats);
    } else if (user.type === 'company' && user.companyId) {
      // Un compte entreprise n'a besoin que de sa propre fiche société.
      const company = await companiesApi.get(user.companyId).catch(() => null);
      setCompanies(company ? [company] : []);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      await loadPublicData();
      await loadPrivateData(currentUser);
      setConnectionError(null);
    } catch (error) {
      reportError(error, 'Impossible de rafraîchir les données.');
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, loadPublicData, loadPrivateData, reportError]);

  /** Recharge uniquement ce qu'une écriture a pu modifier, sans bloquer l'interface. */
  const refreshOperationalData = useCallback(async () => {
    const user = currentUser;
    if (!user) return;

    const [bookingList, notifications] = await Promise.all([
      bookingsApi.list().catch(() => []),
      notificationsApi.list().catch(() => ({ data: [], unreadCount: 0 }))
    ]);

    setBookings(bookingList);
    setWhatsAppNotifications(notifications.data);

    if (user.type === 'admin') {
      const [rideList, vehicleList, driverList, stats] = await Promise.all([
        ridesApi.list().catch(() => []),
        vehiclesApi.list().catch(() => []),
        driversApi.list().catch(() => []),
        analyticsApi.dashboard().catch(() => null)
      ]);
      setRides(rideList);
      setVehicles(vehicleList);
      setDrivers(driverList);
      setDashboardStats(stats);
    } else {
      setVehicles(await vehiclesApi.list().catch(() => []));
    }
  }, [currentUser]);

  // -------------------------------------------------------------------------
  // Session
  // -------------------------------------------------------------------------

  const applySession = useCallback(
    async (user: UserAccount | null) => {
      setCurrentUser(user);
      setCurrentCompanyId(user?.companyId ?? null);
      setRole(user?.type === 'admin' ? 'admin' : 'client');
      // Une reconnexion réussie lève l'écran d'incident affiché à l'expiration.
      setAppError(null);

      if (user) {
        setBookingDraft((prev) => ({
          ...prev,
          clientName: user.fullName,
          clientEmail: user.email,
          clientPhone: user.phone
        }));

        // La réponse de connexion ne porte pas les adresses favorites :
        // elles sont servies par leur propre ressource.
        if (user.savedAddresses === undefined) {
          const addresses = await usersApi.listAddresses().catch(() => []);
          setCurrentUser({ ...user, savedAddresses: addresses.map((a) => a.address) });
        }
      }

      await loadPrivateData(user);
    },
    [loadPrivateData]
  );

  // Démarrage : catalogue public, puis restauration de session si un jeton existe.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    void (async () => {
      try {
        await loadPublicData();
        setConnectionError(null);
      } catch (error) {
        // Un serveur en panne et un serveur injoignable n'appellent pas la même
        // conduite : on distingue les deux pour orienter l'utilisateur.
        if (error instanceof ApiError && error.status >= 500) {
          setAppError({ kind: 'server-error', detail: error.message, requestId: error.requestId });
        } else {
          setConnectionError(
            error instanceof ApiError && error.status !== 0
              ? error.message
              : "Impossible de joindre le serveur Nyokah. Vérifiez que l'API est démarrée."
          );
        }
      }

      if (tokenStore.access) {
        try {
          const user = await authApi.me();
          await applySession(user);
        } catch (error) {
          // Les jetons ne sont effacés que si le serveur rejette explicitement la
          // session. Une panne passagère ne doit pas déconnecter l'utilisateur :
          // il retrouvera sa session au prochain démarrage réussi.
          const rejected = error instanceof ApiError && (error.status === 401 || error.status === 403);
          if (rejected) tokenStore.clear();
        }
      }

      setIsBootstrapping(false);
    })();
  }, [applySession, loadPublicData]);

  // Expiration de session détectée par le client HTTP.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setCurrentUser(null);
      setCurrentCompanyId(null);
      setRole('client');
      // Page dédiée plutôt qu'un simple message : l'utilisateur doit comprendre
      // pourquoi ses données ont disparu de l'écran et comment revenir.
      setAppError({ kind: 'session-expired' });
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const user = await authApi.login(email, password);
        await applySession(user);
        setIsAuthModalOpen(false);
        showToast(
          user.type === 'admin'
            ? 'Connecté en tant qu’administrateur Nyokah.'
            : user.type === 'company'
              ? `Connecté en tant que ${user.fullName} (${user.companyName ?? 'compte entreprise'}).`
              : `Bienvenue, ${user.fullName} !`,
          'success'
        );
        return true;
      } catch (error) {
        reportError(error, 'Connexion impossible.');
        return false;
      }
    },
    [applySession, reportError, showToast]
  );

  const registerIndividual = useCallback(
    async (data: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      district?: string;
      city?: string;
    }): Promise<UserAccount | null> => {
      try {
        const user = await authApi.registerIndividual(data);
        await applySession(user);
        setIsAuthModalOpen(false);
        showToast(
          `Compte créé ! ${user.loyaltyPoints ?? 0} points de fidélité de bienvenue crédités.`,
          'success'
        );
        return user;
      } catch (error) {
        return reportError(error, 'Création du compte impossible.');
      }
    },
    [applySession, reportError, showToast]
  );

  const registerCompany = useCallback(
    async (data: {
      companyName: string;
      tradeRegister: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      password: string;
      companyRole?: string;
      billingAddress?: string;
      creditLineRequested?: boolean;
    }): Promise<UserAccount | null> => {
      try {
        const user = await authApi.registerCompany(data);
        await applySession(user);
        setIsAuthModalOpen(false);
        showToast(
          `Compte entreprise ${data.companyName} créé. Remise contractuelle de bienvenue activée.`,
          'success'
        );
        return user;
      } catch (error) {
        return reportError(error, 'Création du compte entreprise impossible.');
      }
    },
    [applySession, reportError, showToast]
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setCurrentUser(null);
    setCurrentCompanyId(null);
    setRole('client');
    setClientTab('home');
    setBookingDraft(DEFAULT_DRAFT);
    await loadPrivateData(null);
    showToast('Vous avez été déconnecté.', 'info');
  }, [loadPrivateData, showToast]);

  /** L'espace d'administration reste inaccessible sans compte administrateur. */
  const setRoleSecure = useCallback(
    (newRole: Role) => {
      if (newRole === 'admin' && currentUser?.type !== 'admin') {
        setAuthModalTab('login');
        setIsAuthModalOpen(true);
        showToast('Accès restreint. Connectez-vous avec le compte administrateur.', 'info');
        return;
      }
      setRole(newRole);
    },
    [currentUser, showToast]
  );

  // -------------------------------------------------------------------------
  // Profil
  // -------------------------------------------------------------------------

  const updateUserProfile = useCallback(
    async (data: Partial<UserAccount>) => {
      if (!currentUser) return;
      try {
        const updated = await usersApi.updateProfile(data);
        setCurrentUser((prev) => ({ ...updated, savedAddresses: prev?.savedAddresses ?? [] }));
        showToast('Vos informations ont été mises à jour.', 'success');
      } catch (error) {
        reportError(error, 'Mise à jour du profil impossible.');
      }
    },
    [currentUser, reportError, showToast]
  );

  const addFavoriteAddress = useCallback(
    async (address: string) => {
      if (!currentUser || !address.trim()) return;
      try {
        await usersApi.addAddress(address.trim());
        const addresses = await usersApi.listAddresses();
        setCurrentUser((prev) =>
          prev ? { ...prev, savedAddresses: addresses.map((a) => a.address) } : prev
        );
        showToast('Adresse favorite enregistrée.', 'success');
      } catch (error) {
        reportError(error, "Impossible d'enregistrer cette adresse.");
      }
    },
    [currentUser, reportError, showToast]
  );

  const removeFavoriteAddress = useCallback(
    async (address: string) => {
      if (!currentUser) return;
      try {
        const addresses = await usersApi.listAddresses();
        const target = addresses.find((a) => a.address === address);
        if (!target) return;

        await usersApi.removeAddress(target.id);
        setCurrentUser((prev) =>
          prev
            ? { ...prev, savedAddresses: (prev.savedAddresses ?? []).filter((a) => a !== address) }
            : prev
        );
        showToast('Adresse retirée de vos favoris.', 'info');
      } catch (error) {
        reportError(error, 'Impossible de retirer cette adresse.');
      }
    },
    [currentUser, reportError, showToast]
  );

  // -------------------------------------------------------------------------
  // Tarification et réservation
  // -------------------------------------------------------------------------

  /** Devis officiel calculé par l'API. Le frontend n'effectue aucun calcul monétaire. */
  const requestQuote = useCallback(
    async (draft: BookingDraft, signal?: AbortSignal): Promise<PriceQuote> => {
      const response = await pricingApi.quote(
        {
          vehicleId: draft.vehicleId,
          startDate: draft.startDate,
          endDate: draft.endDate,
          formula: draft.formula,
          fuelIncluded: draft.fuelIncluded,
          promoCode: draft.promoCode?.trim() || null,
          companyId: currentCompanyId
        },
        signal
      );
      return response.quote;
    },
    [currentCompanyId]
  );

  const submitBooking = useCallback(async (): Promise<Booking> => {
    const payload: CreateBookingInput = {
      vehicleId: bookingDraft.vehicleId,
      startDate: bookingDraft.startDate,
      endDate: bookingDraft.endDate,
      startTime: bookingDraft.startTime,
      endTime: bookingDraft.endTime,
      pickupLocation: bookingDraft.pickupLocation,
      dropoffLocation: bookingDraft.dropoffLocation,
      formula: bookingDraft.formula,
      fuelIncluded: bookingDraft.fuelIncluded,
      promoCode: bookingDraft.promoCode?.trim() || null,
      flightNumber: bookingDraft.flightNumber?.trim() || null,
      specialRequests: bookingDraft.specialRequests?.trim() || null
    };

    setIsSyncing(true);
    try {
      const booking = await bookingsApi.create(payload);
      await refreshOperationalData();
      showToast(`Réservation ${booking.reference} enregistrée avec succès !`, 'success');
      return booking;
    } finally {
      setIsSyncing(false);
    }
  }, [bookingDraft, refreshOperationalData, showToast]);

  const startBookingForVehicle = useCallback(
    (vehicle: Vehicle) => {
      setSelectedVehicle(vehicle);
      setBookingDraft((prev) => ({ ...prev, vehicleId: vehicle.id }));
      setRole('client');
      setClientTab('booking');
      showToast(`Véhicule ${vehicle.brand} ${vehicle.model} sélectionné.`, 'info');
    },
    [showToast]
  );

  // -------------------------------------------------------------------------
  // Écritures : chaque action appelle l'API puis resynchronise l'état local
  // -------------------------------------------------------------------------

  /**
   * Enveloppe commune : indicateur de synchronisation, toast de succès, gestion
   * d'erreur. Renvoie `true` si l'écriture a abouti, pour que l'appelant puisse
   * garder son formulaire ouvert et la saisie intacte en cas d'échec.
   */
  const mutate = useCallback(
    async (
      action: () => Promise<void>,
      successMessage: string | null,
      errorMessage: string
    ): Promise<boolean> => {
      setIsSyncing(true);
      setLastError(null);
      try {
        await action();
        if (successMessage) showToast(successMessage, 'success');
        return true;
      } catch (error) {
        reportError(error, errorMessage);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [reportError, showToast]
  );

  const addVehicle = useCallback(
    (vehicle: Omit<Vehicle, 'id'>) =>
      mutate(
        async () => {
          const created = await vehiclesApi.create(vehicle);
          setVehicles((prev) => [created, ...prev]);
        },
        `Véhicule ${vehicle.brand} ${vehicle.model} ajouté à la flotte.`,
        "Impossible d'ajouter ce véhicule."
      ),
    [mutate]
  );

  const updateVehicle = useCallback(
    (vehicleId: string, data: Partial<Vehicle>) =>
      mutate(
        async () => {
          const updated = await vehiclesApi.update(vehicleId, data);
          setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));
        },
        'Véhicule mis à jour.',
        'Impossible de mettre à jour ce véhicule.'
      ),
    [mutate]
  );

  const deleteVehicle = useCallback(
    (vehicleId: string) =>
      mutate(
        async () => {
          const result = await vehiclesApi.remove(vehicleId);
          // L'API refuse le retrait tant que des réservations actives subsistent.
          if (!result.success) throw new Error(result.message ?? 'Retrait refusé.');
          setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
        },
        'Véhicule retiré du parc.',
        'Impossible de retirer ce véhicule.'
      ),
    [mutate]
  );

  const updateVehicleStatus = useCallback(
    (vehicleId: string, status: VehicleStatus) =>
      mutate(
        async () => {
          const updated = await vehiclesApi.updateStatus(vehicleId, status);
          setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));
        },
        `Statut du véhicule : ${status}.`,
        'Impossible de changer le statut.'
      ),
    [mutate]
  );

  /** Recharge la fiche véhicule après une écriture d'entretien (dates dérivées, statut). */
  const refreshVehicle = useCallback(async (vehicleId: string) => {
    const updated = await vehiclesApi.get(vehicleId);
    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));
  }, []);

  const sendVehicleToMaintenance = useCallback(
    (vehicleId: string, notes?: string) =>
      mutate(
        async () => {
          await maintenanceApi.create({
            vehicleId,
            type: 'Révision',
            scheduledDate: new Date().toISOString().slice(0, 10),
            notes: notes ?? null,
            blockVehicle: true
          });
          await refreshVehicle(vehicleId);
        },
        'Véhicule envoyé en révision technique.',
        "Impossible d'ouvrir cette intervention d'entretien."
      ),
    [mutate, refreshVehicle]
  );

  const completeVehicleMaintenance = useCallback(
    (vehicleId: string, notes?: string) =>
      mutate(
        async () => {
          // Clôture les interventions ouvertes : l'API remet alors le véhicule
          // en service dès qu'aucune ne le bloque plus.
          const open = await maintenanceApi.list({ vehicleId });
          const pending = open.filter((m) => m.status === 'Planifiée' || m.status === 'En cours');

          for (const record of pending) {
            await maintenanceApi.update(record.id, {
              status: 'Terminée',
              completedDate: new Date().toISOString().slice(0, 10),
              notes: notes ?? record.notes
            });
          }

          // Planifie la révision semestrielle suivante.
          const next = new Date();
          next.setMonth(next.getMonth() + 6);
          await maintenanceApi.create({
            vehicleId,
            type: 'Révision',
            scheduledDate: next.toISOString().slice(0, 10),
            notes: 'Révision semestrielle programmée'
          });

          await refreshVehicle(vehicleId);
        },
        'Entretien validé, prochaine révision planifiée dans 6 mois.',
        "Impossible de clôturer cet entretien."
      ),
    [mutate, refreshVehicle]
  );

  const addDriver = useCallback(
    (driver: Omit<Driver, 'id' | 'rating' | 'completedRides'>) =>
      mutate(
        async () => {
          const created = await driversApi.create(driver);
          setDrivers((prev) => [...prev, created]);
        },
        `Chauffeur ${driver.name} ajouté à l’effectif.`,
        "Impossible d'ajouter ce chauffeur."
      ),
    [mutate]
  );

  const updateDriverStatus = useCallback(
    (driverId: string, status: Driver['status']) =>
      mutate(
        async () => {
          const updated = await driversApi.updateStatus(driverId, status);
          setDrivers((prev) => prev.map((d) => (d.id === driverId ? updated : d)));
        },
        `Statut du chauffeur : ${status}.`,
        'Impossible de changer le statut du chauffeur.'
      ),
    [mutate]
  );

  const addSubcontractor = useCallback(
    (partner: Omit<Subcontractor, 'id' | 'vehicleCount' | 'fleetProvided'>) =>
      mutate(
        async () => {
          const created = await subcontractorsApi.create(partner);
          setSubcontractors((prev) => [...prev, created]);
        },
        `Partenaire ${partner.name} enregistré.`,
        "Impossible d'enregistrer ce partenaire."
      ),
    [mutate]
  );

  const updateSubcontractor = useCallback(
    (id: string, data: Partial<Subcontractor>) =>
      mutate(
        async () => {
          const updated = await subcontractorsApi.update(id, data);
          setSubcontractors((prev) => prev.map((s) => (s.id === id ? updated : s)));
        },
        'Partenaire mis à jour.',
        'Impossible de mettre à jour ce partenaire.'
      ),
    [mutate]
  );

  const addCompany = useCallback(
    (company: Omit<Company, 'id' | 'totalBookings' | 'totalSpent'>) =>
      mutate(
        async () => {
          const created = await companiesApi.create(company);
          setCompanies((prev) => [...prev, created]);
        },
        `Société ${company.name} enregistrée.`,
        "Impossible d'enregistrer cette société."
      ),
    [mutate]
  );

  const updateCompany = useCallback(
    (companyId: string, data: Partial<Company>) =>
      mutate(
        async () => {
          const updated = await companiesApi.update(companyId, data);
          setCompanies((prev) => prev.map((c) => (c.id === companyId ? updated : c)));
        },
        'Société mise à jour.',
        'Impossible de mettre à jour cette société.'
      ),
    [mutate]
  );

  const deleteCompany = useCallback(
    (companyId: string) =>
      mutate(
        async () => {
          const result = await companiesApi.remove(companyId);
          if (!result.success) throw new Error(result.message ?? 'Archivage refusé.');
          setCompanies((prev) => prev.filter((c) => c.id !== companyId));
        },
        'Compte entreprise archivé.',
        "Impossible d'archiver cette société."
      ),
    [mutate]
  );

  const updateCompanyDiscount = useCallback(
    (companyId: string, discountRate: number) =>
      mutate(
        async () => {
          const updated = await companiesApi.update(companyId, {
            negotiatedDiscountRate: discountRate
          });
          setCompanies((prev) => prev.map((c) => (c.id === companyId ? updated : c)));
          // Le code promo dédié suit la remise : la liste des règles change aussi.
          setPromoRules(await promosApi.list().catch(() => []));
        },
        `Remise négociée mise à jour : ${discountRate} %.`,
        'Impossible de mettre à jour la remise.'
      ),
    [mutate]
  );

  const addPack = useCallback(
    (pack: Omit<AutoPack, 'id'>) =>
      mutate(
        async () => {
          const created = await packsApi.create(pack);
          setPacks((prev) => [...prev, created]);
        },
        `Pack « ${pack.name} » créé.`,
        'Impossible de créer ce pack.'
      ),
    [mutate]
  );

  const updatePack = useCallback(
    (packId: string, data: Partial<AutoPack>) =>
      mutate(
        async () => {
          const updated = await packsApi.update(packId, data);
          setPacks((prev) => prev.map((p) => (p.id === packId ? updated : p)));
        },
        'Pack mis à jour.',
        'Impossible de mettre à jour ce pack.'
      ),
    [mutate]
  );

  const deactivatePack = useCallback(
    (packId: string) =>
      mutate(
        async () => {
          await packsApi.deactivate(packId);
          setPacks((prev) => prev.filter((p) => p.id !== packId));
        },
        'Pack désactivé.',
        'Impossible de désactiver ce pack.'
      ),
    [mutate]
  );

  const addPromoRule = useCallback(
    (rule: Omit<PromoRule, 'id' | 'usedCount'>) =>
      mutate(
        async () => {
          const created = await promosApi.create(rule);
          setPromoRules((prev) => [created, ...prev]);
        },
        `Règle tarifaire « ${rule.code} » créée.`,
        'Impossible de créer cette règle tarifaire.'
      ),
    [mutate]
  );

  const deletePromoRule = useCallback(
    (promoId: string) =>
      mutate(
        async () => {
          await promosApi.remove(promoId);
          setPromoRules((prev) => prev.filter((r) => r.id !== promoId));
        },
        'Règle tarifaire supprimée.',
        'Impossible de supprimer cette règle tarifaire.'
      ),
    [mutate]
  );

  const refreshPromoRules = useCallback(async () => {
    setPromoRules(await promosApi.list().catch(() => []));
  }, []);

  const togglePromoRule = useCallback(
    (promoId: string) =>
      mutate(
        async () => {
          const updated = await promosApi.toggle(promoId);
          setPromoRules((prev) => prev.map((r) => (r.id === promoId ? updated : r)));
        },
        null,
        'Impossible de modifier cette règle tarifaire.'
      ),
    [mutate]
  );

  const updateBookingStatus = useCallback(
    (bookingId: string, status: BookingStatus) =>
      mutate(
        async () => {
          await bookingsApi.updateStatus(bookingId, status);
          await refreshOperationalData();
        },
        `Réservation mise à jour : ${status}.`,
        'Changement de statut impossible.'
      ),
    [mutate, refreshOperationalData]
  );

  const cancelBooking = useCallback(
    (bookingId: string, reason?: string) =>
      mutate(
        async () => {
          await bookingsApi.cancel(bookingId, reason);
          await refreshOperationalData();
        },
        'Réservation annulée.',
        "Impossible d'annuler cette réservation."
      ),
    [mutate, refreshOperationalData]
  );

  const assignDriverAndVehicle = useCallback(
    (bookingId: string, driverId: string, vehicleId?: string | null) =>
      mutate(
        async () => {
          const result = await bookingsApi.assign(bookingId, driverId, vehicleId);
          await refreshOperationalData();
          showToast(
            `${result.ride.driverName ?? 'Chauffeur'} affecté à la réservation ${result.booking.reference}. Course ${result.ride.reference} créée.`,
            'success'
          );
        },
        null,
        "L'affectation a échoué."
      ),
    [mutate, refreshOperationalData, showToast]
  );

  const updateRideStatus = useCallback(
    (rideId: string, status: RideStatus) =>
      mutate(
        async () => {
          await ridesApi.updateStatus(rideId, status);
          await refreshOperationalData();
        },
        `Course mise à jour : ${status}.`,
        'Changement de statut impossible.'
      ),
    [mutate, refreshOperationalData]
  );

  const payBooking = useCallback(
    (bookingId: string) =>
      mutate(
        async () => {
          const { checkoutUrl, reference } = await paymentsApi.initiate(bookingId);

          // Avec un vrai prestataire, on redirige vers sa page de règlement.
          // Avec le simulateur, l'URL pointe vers l'API : on confirme sur place.
          if (checkoutUrl && !checkoutUrl.includes('/simulate')) {
            window.location.href = checkoutUrl;
            return;
          }

          await paymentsApi.simulate(reference, 'success');
          await refreshOperationalData();
          showToast('Paiement confirmé.', 'success');
        },
        null,
        'Le paiement a échoué.'
      ),
    [mutate, refreshOperationalData, showToast]
  );

  // -------------------------------------------------------------------------
  // Notifications WhatsApp
  // -------------------------------------------------------------------------

  const markWhatsAppNotificationAsRead = useCallback(async (id: string) => {
    setWhatsAppNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, status: 'read' } : n))
    );
    await notificationsApi.markAsRead(id).catch(() => undefined);
  }, []);

  const markAllWhatsAppNotificationsAsRead = useCallback(async () => {
    setWhatsAppNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, status: 'read' })));
    await notificationsApi.markAllAsRead().catch(() => undefined);
    showToast('Toutes les notifications ont été marquées comme lues.', 'info');
  }, [showToast]);

  const openWhatsAppSimulator = useCallback(
    (notif?: WhatsAppNotification) => {
      const target = notif ?? whatsAppNotifications[0] ?? null;
      setActiveWhatsAppNotification(target);
      setIsWhatsAppSimulatorOpen(true);
      if (target && !target.isRead) void markWhatsAppNotificationAsRead(target.id);
    },
    [markWhatsAppNotificationAsRead, whatsAppNotifications]
  );

  const closeWhatsAppSimulator = useCallback(() => setIsWhatsAppSimulatorOpen(false), []);

  const clearLastError = useCallback(() => setLastError(null), []);
  const clearAppError = useCallback(() => setAppError(null), []);

  const openAuthModal = useCallback((tab: AuthTab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  // -------------------------------------------------------------------------

  const value = useMemo<AppContextType>(
    () => ({
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
      drivers,
      subcontractors,
      companies,
      packs,
      bookings,
      rides,
      promoRules,
      isBootstrapping,
      isSyncing,
      connectionError,
      lastError,
      clearLastError,
      appError,
      clearAppError,
      refreshAll,
      bookingDraft,
      setBookingDraft,
      requestQuote,
      submitBooking,
      startBookingForVehicle,
      currentUser,
      isAuthModalOpen,
      authModalTab,
      setIsAuthModalOpen,
      setAuthModalTab,
      openAuthModal,
      closeAuthModal,
      login,
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
      sendVehicleToMaintenance,
      completeVehicleMaintenance,
      addDriver,
      updateDriverStatus,
      addSubcontractor,
      updateSubcontractor,
      addCompany,
      updateCompany,
      deleteCompany,
      updateCompanyDiscount,
      addPack,
      updatePack,
      deactivatePack,
      addPromoRule,
      togglePromoRule,
      deletePromoRule,
      refreshPromoRules,
      updateBookingStatus,
      cancelBooking,
      assignDriverAndVehicle,
      updateRideStatus,
      payBooking,
      whatsAppNotifications,
      unreadWhatsAppCount,
      isWhatsAppSimulatorOpen,
      activeWhatsAppNotification,
      openWhatsAppSimulator,
      closeWhatsAppSimulator,
      markWhatsAppNotificationAsRead,
      markAllWhatsAppNotificationsAsRead,
      dashboardStats,
      revenueReport,
      toasts,
      showToast,
      removeToast,
      formatFCFA
    }),
    [
      role,
      setRoleSecure,
      clientTab,
      adminTab,
      currentCompanyId,
      selectedVehicle,
      selectedBooking,
      vehicles,
      drivers,
      subcontractors,
      companies,
      packs,
      bookings,
      rides,
      promoRules,
      isBootstrapping,
      isSyncing,
      connectionError,
      lastError,
      clearLastError,
      appError,
      clearAppError,
      refreshAll,
      bookingDraft,
      requestQuote,
      submitBooking,
      startBookingForVehicle,
      currentUser,
      isAuthModalOpen,
      authModalTab,
      openAuthModal,
      closeAuthModal,
      login,
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
      sendVehicleToMaintenance,
      completeVehicleMaintenance,
      addDriver,
      updateDriverStatus,
      addSubcontractor,
      updateSubcontractor,
      addCompany,
      updateCompany,
      deleteCompany,
      updateCompanyDiscount,
      addPack,
      updatePack,
      deactivatePack,
      addPromoRule,
      togglePromoRule,
      deletePromoRule,
      refreshPromoRules,
      updateBookingStatus,
      cancelBooking,
      assignDriverAndVehicle,
      updateRideStatus,
      payBooking,
      whatsAppNotifications,
      unreadWhatsAppCount,
      isWhatsAppSimulatorOpen,
      activeWhatsAppNotification,
      openWhatsAppSimulator,
      closeWhatsAppSimulator,
      markWhatsAppNotificationAsRead,
      markAllWhatsAppNotificationsAsRead,
      dashboardStats,
      revenueReport,
      toasts,
      showToast,
      removeToast
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
