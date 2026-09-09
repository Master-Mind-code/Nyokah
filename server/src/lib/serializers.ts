/**
 * Conversion des modeles Prisma vers les objets JSON exposes par l'API.
 * Les enums sont traduits en libelles francais et les dates en "YYYY-MM-DD"
 * afin de rester compatibles avec les types du frontend (src/types.ts).
 */
import type {
  AutoPack,
  Booking,
  Company,
  Driver,
  Invoice,
  MaintenanceRecord,
  Notification,
  Payment,
  PromoRule,
  Review,
  Ride,
  Subcontractor,
  User,
  Vehicle
} from '@prisma/client';
import { toDateString } from './dates.js';
import {
  BookingStatusEnum,
  CompanyStatusEnum,
  DriverStatusEnum,
  FuelTypeEnum,
  InvoiceStatusEnum,
  LoyaltyTierEnum,
  MaintenanceStatusEnum,
  MaintenanceTypeEnum,
  NotificationChannelEnum,
  NotificationStatusEnum,
  NotificationTypeEnum,
  OwnershipTypeEnum,
  PaymentProviderEnum,
  PaymentStatusEnum,
  RentalFormulaEnum,
  RideStatusEnum,
  SubcontractorStatusEnum,
  TransmissionEnum,
  UserRoleEnum,
  VehicleCategoryEnum,
  VehicleStatusEnum
} from './enums.js';

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const day = (d: Date | null | undefined) => (d ? toDateString(d) : null);

// ---------------------------------------------------------------------------

export type VehicleWithRelations = Vehicle & {
  subcontractor?: Subcontractor | null;
  maintenances?: MaintenanceRecord[];
};

export function serializeVehicle(vehicle: VehicleWithRelations) {
  const maintenances = vehicle.maintenances ?? [];
  const upcoming = maintenances
    .filter((m) => m.status === 'PLANIFIEE' || m.status === 'EN_COURS')
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0];
  const last = maintenances
    .filter((m) => m.status === 'TERMINEE' && m.completedDate)
    .sort((a, b) => (b.completedDate as Date).getTime() - (a.completedDate as Date).getTime())[0];

  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    category: VehicleCategoryEnum.toLabel(vehicle.category),
    seats: vehicle.seats,
    luggage: vehicle.luggage,
    transmission: TransmissionEnum.toLabel(vehicle.transmission),
    fuel: FuelTypeEnum.toLabel(vehicle.fuel),
    plateNumber: vehicle.plateNumber,
    dailyRate: vehicle.dailyRate,
    halfDayRate: vehicle.halfDayRate,
    airportTransferRate: vehicle.airportTransferRate,
    monthlyRate: vehicle.monthlyRate,
    status: VehicleStatusEnum.toLabel(vehicle.status),
    ownership: OwnershipTypeEnum.toLabel(vehicle.ownership),
    subcontractorId: vehicle.subcontractorId,
    partnerName: vehicle.subcontractor?.name ?? null,
    isVip: vehicle.isVip,
    isRecommended: vehicle.isRecommended,
    imageUrl: vehicle.imageUrl,
    galleryUrls: vehicle.galleryUrls,
    features: vehicle.features,
    description: vehicle.description,
    mileageLimit: vehicle.mileageLimit,
    currentMileage: vehicle.currentMileage,
    insuranceExpiry: day(vehicle.insuranceExpiry),
    technicalControlExpiry: day(vehicle.technicalControlExpiry),
    nextMaintenanceDate: day(upcoming?.scheduledDate),
    lastMaintenanceDate: day(last?.completedDate),
    maintenanceNotes: upcoming?.notes ?? last?.notes ?? null,
    createdAt: iso(vehicle.createdAt),
    updatedAt: iso(vehicle.updatedAt)
  };
}

// ---------------------------------------------------------------------------

export function serializeDriver(driver: Driver & { assignedVehicle?: Vehicle | null }) {
  return {
    id: driver.id,
    userId: driver.userId,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    photoUrl: driver.photoUrl,
    experienceYears: driver.experienceYears,
    rating: driver.rating,
    languages: driver.languages,
    status: DriverStatusEnum.toLabel(driver.status),
    assignedVehicleId: driver.assignedVehicleId,
    assignedVehicleName: driver.assignedVehicle
      ? `${driver.assignedVehicle.brand} ${driver.assignedVehicle.model}`
      : null,
    completedRides: driver.completedRides,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: day(driver.licenseExpiry),
    hireDate: day(driver.hireDate),
    notes: driver.notes,
    createdAt: iso(driver.createdAt)
  };
}

// ---------------------------------------------------------------------------

export function serializeSubcontractor(
  partner: Subcontractor & { vehicles?: Vehicle[]; _count?: { vehicles: number } }
) {
  return {
    id: partner.id,
    name: partner.name,
    contactPerson: partner.contactPerson,
    phone: partner.phone,
    email: partner.email,
    commissionRate: partner.commissionRate,
    status: SubcontractorStatusEnum.toLabel(partner.status),
    vehicleCount: partner._count?.vehicles ?? partner.vehicles?.length ?? 0,
    fleetProvided: (partner.vehicles ?? []).map((v) => `${v.brand} ${v.model}`),
    notes: partner.notes,
    createdAt: iso(partner.createdAt)
  };
}

// ---------------------------------------------------------------------------

export interface CompanyStats {
  totalBookings: number;
  totalSpent: number;
}

export function serializeCompany(company: Company, stats?: CompanyStats) {
  return {
    id: company.id,
    name: company.name,
    tradeRegister: company.tradeRegister,
    contactName: company.contactName,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    billingAddress: company.billingAddress,
    negotiatedDiscountRate: company.negotiatedDiscountRate,
    promoCode: company.promoCode,
    monthlyVolumeTarget: company.monthlyVolumeTarget,
    status: CompanyStatusEnum.toLabel(company.status),
    accountManager: company.accountManager,
    creditLineApproved: company.creditLineApproved,
    creditLimit: company.creditLimit,
    paymentTermsDays: company.paymentTermsDays,
    authorizedBookers: company.authorizedBookers,
    notes: company.notes,
    totalBookings: stats?.totalBookings ?? 0,
    totalSpent: stats?.totalSpent ?? 0,
    createdAt: iso(company.createdAt)
  };
}

// ---------------------------------------------------------------------------

export function serializeUser(user: User & { company?: Company | null; driverProfile?: Driver | null }) {
  return {
    id: user.id,
    type: UserRoleEnum.toLabel(user.role),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    city: user.city,
    district: user.district,
    loyaltyPoints: user.loyaltyPoints,
    tier: LoyaltyTierEnum.toLabel(user.tier),
    companyId: user.companyId,
    companyName: user.company?.name ?? null,
    companyRole: user.companyRole,
    tradeRegister: user.company?.tradeRegister ?? null,
    billingAddress: user.company?.billingAddress ?? null,
    creditLineApproved: user.company?.creditLineApproved ?? null,
    creditLimit: user.company?.creditLimit ?? null,
    negotiatedDiscountRate: user.company?.negotiatedDiscountRate ?? null,
    authorizedBookers: user.company?.authorizedBookers ?? null,
    driverId: user.driverProfile?.id ?? null,
    lastLoginAt: iso(user.lastLoginAt),
    createdAt: day(user.createdAt)
  };
}

// ---------------------------------------------------------------------------

export type BookingWithRelations = Booking & {
  vehicle?: Vehicle | null;
  company?: Company | null;
  driver?: Driver | null;
  ride?: Ride | null;
  payments?: Payment[];
  invoice?: Invoice | null;
};

export function serializeBooking(booking: BookingWithRelations) {
  const vehicle = booking.vehicle;
  const amountPaid = (booking.payments ?? [])
    .filter((p) => p.status === 'REUSSI')
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    id: booking.id,
    reference: booking.reference,
    vehicleId: booking.vehicleId,
    vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : null,
    vehicleCategory: vehicle ? VehicleCategoryEnum.toLabel(vehicle.category) : null,
    vehicleImageUrl: vehicle?.imageUrl ?? null,
    clientId: booking.clientId,
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    companyId: booking.companyId,
    companyName: booking.company?.name ?? null,
    packId: booking.packId,
    startDate: day(booking.startDate),
    endDate: day(booking.endDate),
    startTime: booking.startTime,
    endTime: booking.endTime,
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    formula: RentalFormulaEnum.toLabel(booking.formula),
    durationDays: booking.durationDays,
    withDriver: booking.withDriver,
    fuelIncluded: booking.fuelIncluded,
    baseRate: booking.baseRate,
    basePrice: booking.basePrice,
    optionsPrice: booking.optionsPrice,
    discountCode: booking.discountCode,
    discountPercentage: booking.discountPercentage,
    discountAmount: booking.discountAmount,
    discountReason: booking.discountReason,
    subtotal: booking.subtotal,
    taxRate: booking.taxRate,
    taxAmount: booking.taxAmount,
    totalAmount: booking.totalAmount,
    amountPaid,
    balanceDue: booking.totalAmount - amountPaid,
    currency: booking.currency,
    status: BookingStatusEnum.toLabel(booking.status),
    assignedDriverId: booking.assignedDriverId,
    assignedDriverName: booking.driver?.name ?? null,
    assignedDriverPhone: booking.driver?.phone ?? null,
    assignedVehicleId: booking.assignedVehicleId,
    rideId: booking.ride?.id ?? null,
    invoiceId: booking.invoice?.id ?? null,
    flightNumber: booking.flightNumber,
    specialRequests: booking.specialRequests,
    confirmedAt: iso(booking.confirmedAt),
    cancelledAt: iso(booking.cancelledAt),
    cancellationReason: booking.cancellationReason,
    createdAt: iso(booking.createdAt),
    updatedAt: iso(booking.updatedAt)
  };
}

// ---------------------------------------------------------------------------

export type RideWithRelations = Ride & {
  booking?: (Booking & { company?: Company | null }) | null;
  driver?: Driver | null;
  vehicle?: Vehicle | null;
};

export function serializeRide(ride: RideWithRelations) {
  return {
    id: ride.id,
    reference: ride.reference,
    bookingId: ride.bookingId,
    bookingReference: ride.booking?.reference ?? null,
    clientName: ride.booking?.clientName ?? null,
    clientPhone: ride.booking?.clientPhone ?? null,
    companyName: ride.booking?.company?.name ?? null,
    driverId: ride.driverId,
    driverName: ride.driver?.name ?? null,
    driverPhone: ride.driver?.phone ?? null,
    vehicleId: ride.vehicleId,
    vehicleName: ride.vehicle ? `${ride.vehicle.brand} ${ride.vehicle.model}` : null,
    plateNumber: ride.vehicle?.plateNumber ?? null,
    date: day(ride.scheduledDate),
    time: `${ride.startTime} - ${ride.endTime}`,
    startTime: ride.startTime,
    endTime: ride.endTime,
    pickupLocation: ride.pickupLocation,
    destinationLocation: ride.destinationLocation,
    status: RideStatusEnum.toLabel(ride.status),
    startedAt: iso(ride.startedAt),
    completedAt: iso(ride.completedAt),
    startMileage: ride.startMileage,
    endMileage: ride.endMileage,
    distanceKm:
      ride.startMileage !== null && ride.endMileage !== null
        ? ride.endMileage - ride.startMileage
        : null,
    notes: ride.notes,
    createdAt: iso(ride.createdAt)
  };
}

// ---------------------------------------------------------------------------

export function serializePack(pack: AutoPack & { companies?: Array<{ companyId: string }> }) {
  return {
    id: pack.id,
    name: pack.name,
    slug: pack.slug,
    targetAudience: pack.targetAudience,
    description: pack.description,
    includedVehicles: pack.includedVehicles,
    duration: pack.duration,
    formula: pack.formula,
    fixedPrice: pack.fixedPrice,
    highlightDiscount: pack.highlightDiscount,
    popular: pack.popular,
    active: pack.active,
    features: pack.features,
    associatedCompanyIds: (pack.companies ?? []).map((c) => c.companyId),
    createdAt: iso(pack.createdAt)
  };
}

// ---------------------------------------------------------------------------

export function serializePromoRule(rule: PromoRule) {
  return {
    id: rule.id,
    code: rule.code,
    description: rule.description,
    discountPercentage: rule.discountPercentage,
    applicableToCompanyId: rule.applicableToCompanyId,
    minDays: rule.minDays,
    minAmount: rule.minAmount,
    maxUses: rule.maxUses,
    usedCount: rule.usedCount,
    startsAt: day(rule.startsAt),
    expiresAt: day(rule.expiresAt),
    active: rule.active,
    createdAt: iso(rule.createdAt)
  };
}

// ---------------------------------------------------------------------------

export function serializeMaintenance(record: MaintenanceRecord & { vehicle?: Vehicle | null }) {
  return {
    id: record.id,
    vehicleId: record.vehicleId,
    vehicleName: record.vehicle ? `${record.vehicle.brand} ${record.vehicle.model}` : null,
    plateNumber: record.vehicle?.plateNumber ?? null,
    type: MaintenanceTypeEnum.toLabel(record.type),
    status: MaintenanceStatusEnum.toLabel(record.status),
    scheduledDate: day(record.scheduledDate),
    completedDate: day(record.completedDate),
    mileage: record.mileage,
    cost: record.cost,
    garage: record.garage,
    notes: record.notes,
    createdAt: iso(record.createdAt)
  };
}

// ---------------------------------------------------------------------------

export function serializePayment(payment: Payment & { booking?: Booking | null }) {
  return {
    id: payment.id,
    reference: payment.reference,
    bookingId: payment.bookingId,
    bookingReference: payment.booking?.reference ?? null,
    provider: PaymentProviderEnum.toLabel(payment.provider),
    amount: payment.amount,
    currency: payment.currency,
    status: PaymentStatusEnum.toLabel(payment.status),
    externalId: payment.externalId,
    checkoutUrl: payment.checkoutUrl,
    payerPhone: payment.payerPhone,
    failureReason: payment.failureReason,
    paidAt: iso(payment.paidAt),
    createdAt: iso(payment.createdAt)
  };
}

// ---------------------------------------------------------------------------

export function serializeInvoice(invoice: Invoice & { booking?: Booking | null; company?: Company | null }) {
  return {
    id: invoice.id,
    number: invoice.number,
    bookingId: invoice.bookingId,
    bookingReference: invoice.booking?.reference ?? null,
    companyId: invoice.companyId,
    companyName: invoice.company?.name ?? null,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    billingAddress: invoice.billingAddress,
    issueDate: day(invoice.issueDate),
    dueDate: day(invoice.dueDate),
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    amountPaid: invoice.amountPaid,
    balanceDue: invoice.totalAmount - invoice.amountPaid,
    currency: invoice.currency,
    status: InvoiceStatusEnum.toLabel(invoice.status),
    lines: invoice.lines,
    notes: invoice.notes,
    createdAt: iso(invoice.createdAt)
  };
}

// ---------------------------------------------------------------------------

export function serializeNotification(notification: Notification & { booking?: Booking | null }) {
  const metadata = (notification.metadata as Record<string, unknown> | null) ?? {};
  const createdAt = notification.createdAt;

  return {
    id: notification.id,
    channel: NotificationChannelEnum.toLabel(notification.channel),
    type: NotificationTypeEnum.toLabel(notification.type),
    bookingId: notification.bookingId,
    bookingReference: notification.booking?.reference ?? null,
    title: notification.title,
    messageBody: notification.body,
    recipientName: notification.recipientName,
    recipientPhone: notification.recipientPhone,
    recipientEmail: notification.recipientEmail,
    status: NotificationStatusEnum.toLabel(notification.status),
    failureReason: notification.failureReason,
    isRead: notification.isRead,
    timestamp: iso(createdAt),
    timeFormatted: `${String(createdAt.getUTCHours()).padStart(2, '0')}:${String(
      createdAt.getUTCMinutes()
    ).padStart(2, '0')}`,
    sentAt: iso(notification.sentAt),
    readAt: iso(notification.readAt),
    ...metadata
  };
}

// ---------------------------------------------------------------------------

export function serializeReview(
  review: Review & { user?: User | null; driver?: Driver | null; vehicle?: Vehicle | null; booking?: Booking | null }
) {
  return {
    id: review.id,
    bookingId: review.bookingId,
    bookingReference: review.booking?.reference ?? null,
    userId: review.userId,
    authorName: review.user?.fullName ?? review.booking?.clientName ?? 'Client Nyokah',
    vehicleId: review.vehicleId,
    vehicleName: review.vehicle ? `${review.vehicle.brand} ${review.vehicle.model}` : null,
    driverId: review.driverId,
    driverName: review.driver?.name ?? null,
    rating: review.rating,
    comment: review.comment,
    published: review.published,
    createdAt: iso(review.createdAt)
  };
}
