import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import {
  BookingStatusEnum,
  CompanyStatusEnum,
  DriverStatusEnum,
  FuelTypeEnum,
  MaintenanceTypeEnum,
  OwnershipTypeEnum,
  PaymentProviderEnum,
  RentalFormulaEnum,
  RideStatusEnum,
  SubcontractorStatusEnum,
  TransmissionEnum,
  VehicleCategoryEnum,
  VehicleStatusEnum
} from '../../lib/enums.js';
import { doc } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';

const TAG = 'Système';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    { schema: doc({ summary: 'Sonde de vivacité', tags: [TAG], security: false }) },
    async () => ({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() })
  );

  app.get(
    '/ready',
    {
      schema: doc({
        summary: 'Sonde de disponibilité',
        description: 'Vérifie que la base de données répond. À utiliser comme readiness probe.',
        tags: [TAG],
        security: false
      })
    },
    async (_request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'ready', database: 'up' };
      } catch (error) {
        return reply.status(503).send({
          status: 'unavailable',
          database: 'down',
          message: error instanceof Error ? error.message : 'Base de données injoignable'
        });
      }
    }
  );

  app.get(
    '/meta/enums',
    {
      schema: doc({
        summary: 'Valeurs autorisées des énumérations',
        description:
          'Toutes les listes déroulantes du frontend peuvent être alimentées depuis cet endpoint, ce qui évite de dupliquer les libellés côté client.',
        tags: [TAG],
        security: false
      })
    },
    async () => ({
      vehicleCategory: VehicleCategoryEnum.labels,
      vehicleStatus: VehicleStatusEnum.labels,
      ownership: OwnershipTypeEnum.labels,
      transmission: TransmissionEnum.labels,
      fuel: FuelTypeEnum.labels,
      driverStatus: DriverStatusEnum.labels,
      companyStatus: CompanyStatusEnum.labels,
      subcontractorStatus: SubcontractorStatusEnum.labels,
      rentalFormula: RentalFormulaEnum.labels,
      bookingStatus: BookingStatusEnum.labels,
      rideStatus: RideStatusEnum.labels,
      maintenanceType: MaintenanceTypeEnum.labels,
      paymentProvider: PaymentProviderEnum.labels
    })
  );

  app.get(
    '/meta/config',
    {
      schema: doc({
        summary: 'Configuration publique',
        tags: [TAG],
        security: false
      })
    },
    async () => ({
      currency: env.CURRENCY,
      vatRate: env.VAT_RATE,
      paymentProvider: env.PAYMENT_PROVIDER,
      notificationProvider: env.NOTIFICATION_PROVIDER,
      environment: env.NODE_ENV
    })
  );
}
