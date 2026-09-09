-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INDIVIDUAL', 'COMPANY', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('STANDARD', 'SILVER', 'GOLD_VIP');

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('BERLINE', 'SUV', 'VIP_PRESTIGE', 'MINIBUS_VAN', 'UTILITAIRE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DISPONIBLE', 'LOUE', 'ENTRETIEN', 'INDISPONIBLE');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('FLOTTE_PROPRE', 'SOUS_TRAITANT');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('AUTOMATIQUE', 'MANUELLE');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('ESSENCE', 'DIESEL', 'HYBRIDE', 'ELECTRIQUE');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('DISPONIBLE', 'EN_COURSE', 'EN_REPOS', 'CONGE');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('VIP_CONTRACTUEL', 'STANDARD_B2B', 'EN_NEGOCIATION');

-- CreateEnum
CREATE TYPE "SubcontractorStatus" AS ENUM ('ACTIF', 'EN_ATTENTE', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "RentalFormula" AS ENUM ('JOURNEE', 'DEMI_JOURNEE', 'CONTINUE_24H', 'TRANSFERT_AEROPORT', 'FORFAIT_WEEKEND', 'MENSUELLE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('PLANIFIEE', 'EN_ROUTE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('REVISION', 'VIDANGE', 'REPARATION', 'PNEUMATIQUES', 'CONTROLE_TECHNIQUE', 'CARROSSERIE', 'LAVAGE', 'AUTRE');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MOCK', 'CINETPAY', 'WAVE', 'ORANGE_MONEY', 'MTN_MONEY', 'MOOV_MONEY', 'CARTE_BANCAIRE', 'VIREMENT', 'ESPECES');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'REUSSI', 'ECHOUE', 'REMBOURSE', 'ANNULE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('BROUILLON', 'EMISE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'EN_RETARD', 'ANNULEE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_RECEIVED', 'BOOKING_VALIDATED', 'BOOKING_CANCELLED', 'DRIVER_ASSIGNED', 'DRIVER_APPROACHING', 'TRIP_STARTED', 'TRIP_COMPLETED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_ISSUED', 'MAINTENANCE_DUE', 'ACCOUNT_WELCOME', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('EN_FILE', 'ENVOYE', 'DELIVRE', 'LU', 'ECHOUE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'INDIVIDUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "city" TEXT,
    "district" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "tier" "LoyaltyTier" NOT NULL DEFAULT 'STANDARD',
    "companyId" TEXT,
    "companyRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeRegister" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "billingAddress" TEXT,
    "negotiatedDiscountRate" INTEGER NOT NULL DEFAULT 0,
    "promoCode" TEXT,
    "monthlyVolumeTarget" INTEGER NOT NULL DEFAULT 0,
    "status" "CompanyStatus" NOT NULL DEFAULT 'EN_NEGOCIATION',
    "accountManager" TEXT,
    "creditLineApproved" BOOLEAN NOT NULL DEFAULT false,
    "creditLimit" INTEGER NOT NULL DEFAULT 0,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "authorizedBookers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "commissionRate" INTEGER NOT NULL DEFAULT 0,
    "status" "SubcontractorStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" "VehicleCategory" NOT NULL,
    "seats" INTEGER NOT NULL,
    "luggage" INTEGER NOT NULL,
    "transmission" "Transmission" NOT NULL,
    "fuel" "FuelType" NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "dailyRate" INTEGER NOT NULL,
    "halfDayRate" INTEGER NOT NULL,
    "airportTransferRate" INTEGER NOT NULL,
    "monthlyRate" INTEGER,
    "status" "VehicleStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "ownership" "OwnershipType" NOT NULL DEFAULT 'FLOTTE_PROPRE',
    "subcontractorId" TEXT,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT NOT NULL,
    "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "mileageLimit" TEXT NOT NULL DEFAULT '',
    "currentMileage" INTEGER,
    "insuranceExpiry" TIMESTAMP(3),
    "technicalControlExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PLANIFIEE',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "mileage" INTEGER,
    "cost" INTEGER,
    "garage" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "photoUrl" TEXT,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DriverStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3),
    "assignedVehicleId" TEXT,
    "hireDate" TIMESTAMP(3),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "completedRides" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_packs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "includedVehicles" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "fixedPrice" INTEGER NOT NULL,
    "highlightDiscount" TEXT NOT NULL,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_companies" (
    "packId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "pack_companies_pkey" PRIMARY KEY ("packId","companyId")
);

-- CreateTable
CREATE TABLE "promo_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountPercentage" INTEGER NOT NULL DEFAULT 0,
    "applicableToCompanyId" TEXT,
    "minDays" INTEGER,
    "minAmount" INTEGER,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_redemptions" (
    "id" TEXT NOT NULL,
    "promoRuleId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "companyId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "packId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL,
    "formula" "RentalFormula" NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "withDriver" BOOLEAN NOT NULL DEFAULT true,
    "fuelIncluded" BOOLEAN NOT NULL DEFAULT false,
    "baseRate" INTEGER NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "optionsPrice" INTEGER NOT NULL DEFAULT 0,
    "discountCode" TEXT,
    "discountPercentage" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT NOT NULL DEFAULT '',
    "subtotal" INTEGER NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "taxAmount" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" "BookingStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "assignedDriverId" TEXT,
    "assignedVehicleId" TEXT,
    "flightNumber" TEXT,
    "specialRequests" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "changedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "destinationLocation" TEXT NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'PLANIFIEE',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "startMileage" INTEGER,
    "endMileage" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" "PaymentStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "externalId" TEXT,
    "checkoutUrl" TEXT,
    "payerPhone" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "bookingId" TEXT,
    "companyId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "billingAddress" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "taxAmount" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'BROUILLON',
    "lines" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "type" "NotificationType" NOT NULL,
    "bookingId" TEXT,
    "recipientUserId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'EN_FILE',
    "providerMessageId" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_addresses_userId_address_key" ON "saved_addresses"("userId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tradeRegister_key" ON "companies"("tradeRegister");

-- CreateIndex
CREATE UNIQUE INDEX "companies_promoCode_key" ON "companies"("promoCode");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "subcontractors_status_idx" ON "subcontractors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plateNumber_key" ON "vehicles"("plateNumber");

-- CreateIndex
CREATE INDEX "vehicles_category_idx" ON "vehicles"("category");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_ownership_idx" ON "vehicles"("ownership");

-- CreateIndex
CREATE INDEX "maintenance_records_vehicleId_idx" ON "maintenance_records"("vehicleId");

-- CreateIndex
CREATE INDEX "maintenance_records_status_idx" ON "maintenance_records"("status");

-- CreateIndex
CREATE INDEX "maintenance_records_scheduledDate_idx" ON "maintenance_records"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_licenseNumber_key" ON "drivers"("licenseNumber");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auto_packs_slug_key" ON "auto_packs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "promo_rules_code_key" ON "promo_rules"("code");

-- CreateIndex
CREATE INDEX "promo_rules_active_idx" ON "promo_rules"("active");

-- CreateIndex
CREATE UNIQUE INDEX "promo_redemptions_bookingId_key" ON "promo_redemptions"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_clientId_idx" ON "bookings"("clientId");

-- CreateIndex
CREATE INDEX "bookings_companyId_idx" ON "bookings"("companyId");

-- CreateIndex
CREATE INDEX "bookings_vehicleId_idx" ON "bookings"("vehicleId");

-- CreateIndex
CREATE INDEX "bookings_startDate_endDate_idx" ON "bookings"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "booking_status_history_bookingId_idx" ON "booking_status_history"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "rides_reference_key" ON "rides"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "rides_bookingId_key" ON "rides"("bookingId");

-- CreateIndex
CREATE INDEX "rides_status_idx" ON "rides"("status");

-- CreateIndex
CREATE INDEX "rides_driverId_idx" ON "rides"("driverId");

-- CreateIndex
CREATE INDEX "rides_scheduledDate_idx" ON "rides"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_bookingId_key" ON "invoices"("bookingId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_companyId_idx" ON "invoices"("companyId");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_idx" ON "notifications"("recipientUserId");

-- CreateIndex
CREATE INDEX "notifications_bookingId_idx" ON "notifications"("bookingId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_driverId_idx" ON "reviews"("driverId");

-- CreateIndex
CREATE INDEX "reviews_vehicleId_idx" ON "reviews"("vehicleId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_addresses" ADD CONSTRAINT "saved_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_companies" ADD CONSTRAINT "pack_companies_packId_fkey" FOREIGN KEY ("packId") REFERENCES "auto_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_companies" ADD CONSTRAINT "pack_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_applicableToCompanyId_fkey" FOREIGN KEY ("applicableToCompanyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promoRuleId_fkey" FOREIGN KEY ("promoRuleId") REFERENCES "promo_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_packId_fkey" FOREIGN KEY ("packId") REFERENCES "auto_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
