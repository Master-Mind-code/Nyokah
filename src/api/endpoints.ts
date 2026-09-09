/**
 * Points d'entrée de l'API Nyokah, regroupés par domaine métier.
 * Chaque fonction retourne directement la donnée utile, débarrassée de
 * l'enveloppe de réponse du serveur.
 */
import type {
  AutoPack,
  AvailabilityResult,
  Booking,
  BookingStatus,
  Company,
  Driver,
  PriceQuote,
  PromoRule,
  RentalFormula,
  Ride,
  RideStatus,
  SavedAddress,
  Subcontractor,
  UserAccount,
  Vehicle,
  VehicleStatus,
  WhatsAppNotification
} from '../types';
import { api, fetchAll, tokenStore, type Paginated } from './client';

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

interface SessionResponse {
  user: UserAccount;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: string;
}

/** Conserve les jetons puis renvoie le compte connecté. */
function persistSession(session: SessionResponse): UserAccount {
  tokenStore.set(session.accessToken, session.refreshToken);
  return session.user;
}

export const authApi = {
  async login(email: string, password: string): Promise<UserAccount> {
    const session = await api.post<SessionResponse>('/auth/login', { email, password }, {
      anonymous: true
    });
    return persistSession(session);
  },

  async registerIndividual(input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    city?: string;
    district?: string;
  }): Promise<UserAccount> {
    const session = await api.post<SessionResponse>('/auth/register/individual', input, {
      anonymous: true
    });
    return persistSession(session);
  },

  async registerCompany(input: {
    companyName: string;
    tradeRegister: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    password: string;
    companyRole?: string;
    billingAddress?: string;
    creditLineRequested?: boolean;
  }): Promise<UserAccount> {
    const session = await api.post<SessionResponse>('/auth/register/company', input, {
      anonymous: true
    });
    return persistSession(session);
  },

  /** Profil du compte connecté, adresses favorites aplaties. */
  async me(): Promise<UserAccount> {
    const response = await api.get<{ user: UserAccount; savedAddresses: SavedAddress[] }>(
      '/auth/me'
    );
    return { ...response.user, savedAddresses: response.savedAddresses.map((a) => a.address) };
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStore.refresh;
    if (refreshToken) {
      // Une session déjà expirée côté serveur ne doit pas empêcher la déconnexion locale.
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    tokenStore.clear();
  },

  changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return api.post('/auth/password/change', { currentPassword, newPassword });
  }
};

// ---------------------------------------------------------------------------
// Compte courant
// ---------------------------------------------------------------------------

export const usersApi = {
  async updateProfile(input: Partial<UserAccount>): Promise<UserAccount> {
    const response = await api.patch<{ user: UserAccount }>('/users/me', {
      fullName: input.fullName,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      city: input.city,
      district: input.district,
      companyRole: input.companyRole
    });
    return response.user;
  },

  async listAddresses(): Promise<SavedAddress[]> {
    const response = await api.get<{ data: SavedAddress[] }>('/users/me/addresses');
    return response.data;
  },

  addAddress(address: string, label = 'Adresse'): Promise<SavedAddress> {
    return api.post<SavedAddress>('/users/me/addresses', { address, label });
  },

  removeAddress(id: string): Promise<{ success: boolean }> {
    return api.delete('/users/me/addresses/' + id);
  },

  loyalty(): Promise<{
    loyaltyPoints: number;
    tier: string;
    nextTier: { tier: string; pointsNeeded: number } | null;
  }> {
    return api.get('/users/me/loyalty');
  }
};

// ---------------------------------------------------------------------------
// Flotte
// ---------------------------------------------------------------------------

export interface VehicleFilters {
  category?: string;
  status?: string;
  search?: string;
  minSeats?: number;
  minPrice?: number;
  maxPrice?: number;
  isVip?: boolean;
  availableFrom?: string;
  availableTo?: string;
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'recent' | 'seats_desc';
}

export const vehiclesApi = {
  list(filters: VehicleFilters = {}): Promise<Vehicle[]> {
    return fetchAll<Vehicle>('/vehicles', filters as Record<string, string | number | boolean>);
  },

  async get(id: string): Promise<Vehicle> {
    const response = await api.get<{ vehicle: Vehicle }>(`/vehicles/${id}`);
    return response.vehicle;
  },

  availability(id: string, startDate: string, endDate: string): Promise<AvailabilityResult> {
    return api.get(`/vehicles/${id}/availability`, { query: { startDate, endDate } });
  },

  async create(input: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const response = await api.post<{ vehicle: Vehicle }>('/vehicles', toVehiclePayload(input));
    return response.vehicle;
  },

  async update(id: string, input: Partial<Vehicle>): Promise<Vehicle> {
    const response = await api.patch<{ vehicle: Vehicle }>(
      `/vehicles/${id}`,
      toVehiclePayload(input)
    );
    return response.vehicle;
  },

  async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    const response = await api.patch<{ vehicle: Vehicle }>(`/vehicles/${id}/status`, { status });
    return response.vehicle;
  },

  remove(id: string): Promise<{ success: boolean; message?: string }> {
    return api.delete(`/vehicles/${id}`);
  }
};

/**
 * L'API refuse les champs qu'elle calcule elle-même (dates d'entretien dérivées,
 * nom du partenaire, horodatages) : ils sont retirés avant l'envoi.
 */
function toVehiclePayload(input: Partial<Vehicle>): Record<string, unknown> {
  const {
    id: _id,
    partnerName: _partnerName,
    nextMaintenanceDate: _next,
    lastMaintenanceDate: _last,
    maintenanceNotes: _notes,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...payload
  } = input as Vehicle;

  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

// ---------------------------------------------------------------------------
// Entretien
// ---------------------------------------------------------------------------

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string | null;
  plateNumber: string | null;
  type: string;
  status: string;
  scheduledDate: string | null;
  completedDate: string | null;
  mileage: number | null;
  cost: number | null;
  garage: string | null;
  notes: string | null;
}

export const maintenanceApi = {
  list(filters: { vehicleId?: string; status?: string } = {}): Promise<MaintenanceRecord[]> {
    return fetchAll<MaintenanceRecord>('/maintenance', filters);
  },

  async create(input: {
    vehicleId: string;
    type: string;
    scheduledDate: string;
    notes?: string | null;
    garage?: string | null;
    /** Immobilise le véhicule immédiatement (statut « Entretien »). */
    blockVehicle?: boolean;
  }): Promise<MaintenanceRecord> {
    const response = await api.post<{ maintenance: MaintenanceRecord }>('/maintenance', input);
    return response.maintenance;
  },

  async update(
    id: string,
    input: { status?: string; completedDate?: string | null; notes?: string | null; mileage?: number | null }
  ): Promise<MaintenanceRecord> {
    const response = await api.patch<{ maintenance: MaintenanceRecord }>(`/maintenance/${id}`, input);
    return response.maintenance;
  }
};

// ---------------------------------------------------------------------------
// Chauffeurs et partenaires
// ---------------------------------------------------------------------------

export const driversApi = {
  list(filters: { status?: string; search?: string } = {}): Promise<Driver[]> {
    return fetchAll<Driver>('/drivers', filters);
  },

  async create(input: Omit<Driver, 'id' | 'rating' | 'completedRides'>): Promise<Driver> {
    const response = await api.post<{ driver: Driver }>('/drivers', stripReadOnly(input));
    return response.driver;
  },

  async update(id: string, input: Partial<Driver>): Promise<Driver> {
    const response = await api.patch<{ driver: Driver }>(`/drivers/${id}`, stripReadOnly(input));
    return response.driver;
  },

  async updateStatus(id: string, status: Driver['status']): Promise<Driver> {
    const response = await api.patch<{ driver: Driver }>(`/drivers/${id}/status`, { status });
    return response.driver;
  },

  remove(id: string): Promise<{ success: boolean; message?: string }> {
    return api.delete(`/drivers/${id}`);
  },

  myRides(upcomingOnly = false): Promise<Ride[]> {
    return fetchAll<Ride>('/drivers/me/rides', { upcomingOnly });
  }
};

function stripReadOnly(input: Partial<Driver>): Record<string, unknown> {
  const {
    id: _id,
    rating: _rating,
    completedRides: _completedRides,
    assignedVehicleName: _assignedVehicleName,
    createdAt: _createdAt,
    ...payload
  } = input as Driver;

  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

export const subcontractorsApi = {
  list(): Promise<Subcontractor[]> {
    return fetchAll<Subcontractor>('/subcontractors');
  },

  async create(
    input: Omit<Subcontractor, 'id' | 'vehicleCount' | 'fleetProvided'>
  ): Promise<Subcontractor> {
    const response = await api.post<{ subcontractor: Subcontractor }>('/subcontractors', input);
    return response.subcontractor;
  },

  async update(id: string, input: Partial<Subcontractor>): Promise<Subcontractor> {
    const { id: _id, vehicleCount: _c, fleetProvided: _f, createdAt: _a, ...payload } =
      input as Subcontractor;
    const response = await api.patch<{ subcontractor: Subcontractor }>(
      `/subcontractors/${id}`,
      payload
    );
    return response.subcontractor;
  },

  remove(id: string): Promise<{ success: boolean; message?: string }> {
    return api.delete(`/subcontractors/${id}`);
  }
};

// ---------------------------------------------------------------------------
// Entreprises B2B
// ---------------------------------------------------------------------------

export const companiesApi = {
  list(): Promise<Company[]> {
    return fetchAll<Company>('/companies');
  },

  async get(id: string): Promise<Company> {
    const response = await api.get<{ company: Company }>(`/companies/${id}`);
    return response.company;
  },

  bookings(id: string): Promise<Booking[]> {
    return fetchAll<Booking>(`/companies/${id}/bookings`);
  },

  async create(
    input: Omit<Company, 'id' | 'totalBookings' | 'totalSpent'>
  ): Promise<Company> {
    const response = await api.post<{ company: Company }>('/companies', stripCompanyReadOnly(input));
    return response.company;
  },

  async update(id: string, input: Partial<Company>): Promise<Company> {
    const response = await api.patch<{ company: Company }>(
      `/companies/${id}`,
      stripCompanyReadOnly(input)
    );
    return response.company;
  },

  remove(id: string): Promise<{ success: boolean; message?: string }> {
    return api.delete(`/companies/${id}`);
  }
};

function stripCompanyReadOnly(input: Partial<Company>): Record<string, unknown> {
  const {
    id: _id,
    totalBookings: _totalBookings,
    totalSpent: _totalSpent,
    createdAt: _createdAt,
    ...payload
  } = input as Company;

  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

// ---------------------------------------------------------------------------
// Packs et codes promo
// ---------------------------------------------------------------------------

export const packsApi = {
  list(): Promise<AutoPack[]> {
    return fetchAll<AutoPack>('/packs');
  },

  async create(input: Omit<AutoPack, 'id'>): Promise<AutoPack> {
    const response = await api.post<{ pack: AutoPack }>('/packs', stripPackReadOnly(input));
    return response.pack;
  },

  async update(id: string, input: Partial<AutoPack>): Promise<AutoPack> {
    const response = await api.patch<{ pack: AutoPack }>(`/packs/${id}`, stripPackReadOnly(input));
    return response.pack;
  },

  deactivate(id: string): Promise<{ success: boolean; message?: string }> {
    return api.delete(`/packs/${id}`);
  }
};

function stripPackReadOnly(input: Partial<AutoPack>): Record<string, unknown> {
  const { id: _id, slug: _slug, createdAt: _createdAt, ...payload } = input as AutoPack;
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

export const promosApi = {
  list(): Promise<PromoRule[]> {
    return fetchAll<PromoRule>('/promos');
  },

  async create(input: Omit<PromoRule, 'id' | 'usedCount'>): Promise<PromoRule> {
    const { id: _id, usedCount: _used, createdAt: _c, ...payload } = input as PromoRule;
    const response = await api.post<{ promoRule: PromoRule }>('/promos', payload);
    return response.promoRule;
  },

  async toggle(id: string): Promise<PromoRule> {
    const response = await api.post<{ promoRule: PromoRule }>(`/promos/${id}/toggle`);
    return response.promoRule;
  },

  remove(id: string): Promise<{ success: boolean }> {
    return api.delete(`/promos/${id}`);
  },

  /** Vérifie un code sans créer de réservation. */
  validate(input: {
    code: string;
    vehicleId: string;
    startDate: string;
    endDate: string;
    formula: RentalFormula;
    fuelIncluded: boolean;
    companyId?: string | null;
  }): Promise<{
    valid: boolean;
    reason?: string;
    code?: string;
    description?: string;
    discountPercentage: number;
    discountAmount: number;
  }> {
    return api.post('/promos/validate', input);
  }
};

// ---------------------------------------------------------------------------
// Tarification
// ---------------------------------------------------------------------------

export interface QuoteInput {
  vehicleId: string;
  startDate: string;
  endDate: string;
  formula: RentalFormula;
  fuelIncluded: boolean;
  promoCode?: string | null;
  companyId?: string | null;
}

export const pricingApi = {
  quote(
    input: QuoteInput,
    signal?: AbortSignal
  ): Promise<{
    quote: PriceQuote;
    vehicle: { id: string; name: string; plateNumber: string };
    availability: AvailabilityResult | null;
  }> {
    return api.post('/pricing/quote', input, { signal });
  }
};

// ---------------------------------------------------------------------------
// Réservations
// ---------------------------------------------------------------------------

export interface CreateBookingInput {
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  formula: RentalFormula;
  fuelIncluded: boolean;
  withDriver?: boolean;
  promoCode?: string | null;
  flightNumber?: string | null;
  specialRequests?: string | null;
}

export const bookingsApi = {
  list(filters: { status?: string; search?: string } = {}): Promise<Booking[]> {
    return fetchAll<Booking>('/bookings', filters);
  },

  async get(id: string): Promise<Booking> {
    const response = await api.get<{ booking: Booking }>(`/bookings/${id}`);
    return response.booking;
  },

  async create(input: CreateBookingInput): Promise<Booking> {
    const response = await api.post<{ booking: Booking }>('/bookings', input);
    return response.booking;
  },

  async updateStatus(id: string, status: BookingStatus, reason?: string): Promise<Booking> {
    const response = await api.patch<{ booking: Booking }>(`/bookings/${id}/status`, {
      status,
      reason
    });
    return response.booking;
  },

  async cancel(id: string, reason?: string): Promise<Booking> {
    const response = await api.post<{ booking: Booking }>(`/bookings/${id}/cancel`, { reason });
    return response.booking;
  },

  async assign(
    id: string,
    driverId: string,
    vehicleId?: string | null
  ): Promise<{ booking: Booking; ride: Ride }> {
    return api.post(`/bookings/${id}/assign`, { driverId, vehicleId: vehicleId ?? null });
  },

  async availableDrivers(id: string): Promise<Array<Pick<Driver, 'id' | 'name' | 'phone' | 'rating' | 'languages' | 'completedRides' | 'experienceYears'>>> {
    const response = await api.get<{ data: Driver[] }>(`/bookings/${id}/available-drivers`);
    return response.data;
  }
};

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const ridesApi = {
  list(filters: { status?: string; date?: string } = {}): Promise<Ride[]> {
    return fetchAll<Ride>('/rides', filters);
  },

  async updateStatus(
    id: string,
    status: RideStatus,
    extra: { startMileage?: number; endMileage?: number; notes?: string } = {}
  ): Promise<Ride> {
    const response = await api.patch<{ ride: Ride }>(`/rides/${id}/status`, { status, ...extra });
    return response.ride;
  }
};

// ---------------------------------------------------------------------------
// Paiements et factures
// ---------------------------------------------------------------------------

export const paymentsApi = {
  async initiate(
    bookingId: string,
    amount?: number
  ): Promise<{ checkoutUrl: string | null; reference: string }> {
    const response = await api.post<{
      payment: { reference: string };
      checkoutUrl: string | null;
    }>('/payments', { bookingId, amount });
    return { checkoutUrl: response.checkoutUrl, reference: response.payment.reference };
  },

  /** Disponible uniquement quand l'API tourne avec le prestataire simulé. */
  simulate(reference: string, outcome: 'success' | 'failure' = 'success'): Promise<unknown> {
    return api.post(`/payments/${reference}/simulate`, { outcome }, { anonymous: true });
  }
};

export const invoicesApi = {
  list(): Promise<Paginated<Record<string, unknown>>> {
    return api.get('/invoices', { query: { pageSize: 100 } });
  },

  /** Bascule les factures échues non soldées en « En retard ». */
  refreshOverdue(): Promise<{ updated: number }> {
    return api.post('/invoices/refresh-overdue');
  }
};

export interface AuditEntry {
  id: string;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
}

export const auditApi = {
  async list(limit = 50): Promise<AuditEntry[]> {
    const response = await api.get<{ data: AuditEntry[] }>('/analytics/audit-log', {
      query: { limit }
    });
    return response.data;
  }
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationsApi = {
  async list(): Promise<{ data: WhatsAppNotification[]; unreadCount: number }> {
    const response = await api.get<Paginated<WhatsAppNotification> & { unreadCount: number }>(
      '/notifications',
      { query: { pageSize: 100 } }
    );
    return { data: response.data, unreadCount: response.unreadCount };
  },

  markAsRead(id: string): Promise<unknown> {
    return api.post(`/notifications/${id}/read`);
  },

  markAllAsRead(): Promise<{ updated: number }> {
    return api.post('/notifications/read-all');
  }
};

// ---------------------------------------------------------------------------
// Paramètres
// ---------------------------------------------------------------------------

export interface GeneralConfig {
  companyName: string;
  supportPhone: string;
  supportEmail: string;
  bookingLeadTimeHours: number;
  cancellationNoticeHours: number;
  invoiceDueDays: number;
  loyaltyTiers: { silver: number; gold: number };
}

export interface PricingConfig {
  vatRate: number;
  volumeDiscountTiers: Array<{ minDays: number; percentage: number }>;
  continuous24hMultiplier: number;
  monthlyRateMultiplier: number;
  weekendRateMultiplier: number;
  fuelOptionDailyCost: { default: number; VIP_PRESTIGE: number };
  loyaltyPointsPer1000: number;
}

export interface SystemInfo {
  environment: string;
  currency: string;
  apiUrl: string;
  paymentProvider: string;
  notificationProvider: string;
  emailProvider: string;
  accessTokenTtl: string;
  refreshTokenTtlDays: number;
  corsOrigins: string[];
}

export interface SettingsBundle {
  general: GeneralConfig;
  pricing: PricingConfig;
  system: SystemInfo;
  defaults: { general: GeneralConfig; pricing: PricingConfig };
}

export const settingsApi = {
  getAll(): Promise<SettingsBundle> {
    return api.get('/settings');
  },

  async updateGeneral(config: GeneralConfig): Promise<GeneralConfig> {
    const response = await api.put<{ general: GeneralConfig }>('/settings/general', config);
    return response.general;
  },

  async resetGeneral(): Promise<GeneralConfig> {
    const response = await api.post<{ general: GeneralConfig }>('/settings/general/reset');
    return response.general;
  },

  async updatePricing(config: PricingConfig): Promise<PricingConfig> {
    const response = await api.put<{ pricing: PricingConfig }>('/settings/pricing', config);
    return response.pricing;
  },

  async resetPricing(): Promise<PricingConfig> {
    const response = await api.post<{ pricing: PricingConfig }>('/settings/pricing/reset');
    return response.pricing;
  }
};

// ---------------------------------------------------------------------------
// Comptes (administration)
// ---------------------------------------------------------------------------

export const adminUsersApi = {
  list(filters: { role?: string; search?: string } = {}): Promise<UserAccount[]> {
    return fetchAll<UserAccount>('/users', filters);
  },

  async create(input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    companyId?: string;
    companyRole?: string;
  }): Promise<UserAccount> {
    const response = await api.post<{ user: UserAccount }>('/users', input);
    return response.user;
  },

  async update(
    id: string,
    input: { role?: string; isActive?: boolean; companyId?: string | null }
  ): Promise<UserAccount> {
    const response = await api.patch<{ user: UserAccount }>(`/users/${id}`, input);
    return response.user;
  },

  deactivate(id: string): Promise<{ success: boolean; message?: string }> {
    return api.delete(`/users/${id}`);
  }
};

// ---------------------------------------------------------------------------
// Pilotage
// ---------------------------------------------------------------------------

export interface DashboardStats {
  period: { from: string; to: string };
  revenue: {
    period: number;
    periodExcludingTax: number;
    realized: number;
    upcoming: number;
    upcomingBookings: number;
    thisMonth: number;
    previousMonth: number;
    growthRate: number | null;
  };
  bookings: {
    total: number;
    thisMonth: number;
    pending: number;
    byStatus: Array<{ status: string; count: number; revenue: number }>;
  };
  fleet: {
    total: number;
    rented: number;
    utilizationRate: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  operations: { activeDrivers: number; ridesToday: number };
  clients: { newThisMonth: number };
  finance: { outstandingReceivables: number };
}

export interface RevenuePoint {
  period: string;
  revenue: number;
  net: number;
  tax: number;
  discounts: number;
  bookings: number;
  revenueB2B: number;
  revenueB2C: number;
  corporateBookings: number;
  privateBookings: number;
  completedBookings: number;
  avgBasket: number;
}

export interface RevenueReport {
  groupBy: 'month' | 'day';
  from: string;
  to: string;
  series: RevenuePoint[];
  totals: {
    revenue: number;
    net: number;
    tax: number;
    discounts: number;
    bookings: number;
    revenueB2B: number;
    revenueB2C: number;
    completedBookings: number;
  };
  byFormula: Array<{ formula: string; bookings: number; revenue: number; share: number }>;
}

export const analyticsApi = {
  dashboard(): Promise<DashboardStats> {
    return api.get('/analytics/dashboard');
  },

  revenue(groupBy: 'month' | 'day' = 'month'): Promise<RevenueReport> {
    return api.get('/analytics/revenue', { query: { groupBy } });
  },

  fleet(): Promise<{
    vehicles: Array<{
      vehicleId: string;
      name: string;
      category: string;
      revenue: number;
      rentals: number;
      utilizationRate: number;
    }>;
    byCategory: Array<{ category: string; revenue: number; rentals: number; vehicles: number }>;
  }> {
    return api.get('/analytics/fleet');
  },

  topVehicles(): Promise<{
    data: Array<{ vehicleId: string; name: string; bookings: number; revenue: number }>;
  }> {
    return api.get('/analytics/top-vehicles');
  }
};
