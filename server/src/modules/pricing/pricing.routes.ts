import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { toUtcDay } from '../../lib/dates.js';
import { RentalFormulaEnum } from '../../lib/enums.js';
import { NotFoundError } from '../../lib/errors.js';
import { doc, parse } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { recordAudit } from '../../services/audit.service.js';
import {
  DEFAULT_PRICING_CONFIG,
  getPricingConfig,
  pricingConfigSchema,
  quote,
  savePricingConfig
} from '../../services/pricing.service.js';
import { checkVehicleAvailability } from '../../services/availability.service.js';

const TAG = 'Tarification';

const quoteSchema = z.object({
  vehicleId: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  formula: RentalFormulaEnum.schema,
  fuelIncluded: z.boolean().default(false),
  promoCode: z.string().max(30).nullish(),
  companyId: z.string().nullish(),
  /** Ajoute le contrôle de disponibilité au devis. */
  checkAvailability: z.boolean().default(true)
});

export async function pricingRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/quote',
    {
      preHandler: app.optionalAuth,
      schema: doc({
        summary: 'Calculer un devis',
        description: `Devis officiel calculé côté serveur : tarif de la formule, option carburant, meilleure remise applicable (société, code promo ou volume — non cumulables) et TVA. Aucun montant n'est accepté depuis le client.`,
        tags: [TAG],
        body: quoteSchema,
        security: false
      })
    },
    async (request) => {
      const body = parse(quoteSchema, request.body);

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: body.vehicleId, deletedAt: null }
      });
      if (!vehicle) throw new NotFoundError('Véhicule');

      // Le compte connecté impose son entreprise : impossible de réclamer la remise d'un tiers.
      const companyId =
        request.user?.role === 'ADMIN'
          ? (body.companyId ?? null)
          : (request.user?.companyId ?? body.companyId ?? null);

      const company = companyId
        ? await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } })
        : null;

      const startDate = toUtcDay(body.startDate);
      const endDate = toUtcDay(body.endDate);

      const result = await quote({
        vehicle,
        startDate,
        endDate,
        formula: body.formula,
        fuelIncluded: body.fuelIncluded,
        promoCode: body.promoCode,
        companyDiscountRate: company?.negotiatedDiscountRate ?? 0,
        companyName: company?.name ?? null,
        companyId: company?.id ?? null
      });

      const availability = body.checkAvailability
        ? await checkVehicleAvailability(vehicle.id, startDate, endDate)
        : null;

      return {
        quote: result,
        vehicle: {
          id: vehicle.id,
          name: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
          plateNumber: vehicle.plateNumber
        },
        availability
      };
    }
  );

  app.get(
    '/config',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Consulter la grille tarifaire',
        tags: [TAG]
      })
    },
    async () => ({ config: await getPricingConfig(true), defaults: DEFAULT_PRICING_CONFIG })
  );

  app.put(
    '/config',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Mettre à jour la grille tarifaire',
        description:
          'Modifie la TVA, les paliers de remise volume, les coefficients de formule et le coût de l’option carburant sans redéploiement.',
        tags: [TAG],
        body: pricingConfigSchema
      })
    },
    async (request) => {
      const body = parse(pricingConfigSchema, request.body);
      const before = await getPricingConfig(true);
      const config = await savePricingConfig(body);

      await recordAudit({
        request,
        action: 'pricing.config.update',
        entity: 'Setting',
        entityId: 'pricing',
        before,
        after: config
      });

      return { config };
    }
  );

  app.post(
    '/config/reset',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Rétablir la grille tarifaire par défaut', tags: [TAG] })
    },
    async (request) => {
      const config = await savePricingConfig(DEFAULT_PRICING_CONFIG);
      await recordAudit({
        request,
        action: 'pricing.config.reset',
        entity: 'Setting',
        entityId: 'pricing'
      });
      return { config };
    }
  );
}
