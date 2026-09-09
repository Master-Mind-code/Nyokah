import type { FastifyInstance } from 'fastify';
import { doc, parse } from '../../lib/http.js';
import { recordAudit } from '../../services/audit.service.js';
import {
  DEFAULT_PRICING_CONFIG,
  getPricingConfig,
  pricingConfigSchema,
  savePricingConfig
} from '../../services/pricing.service.js';
import {
  DEFAULT_GENERAL_CONFIG,
  generalConfigSchema,
  getGeneralConfig,
  saveGeneralConfig,
  systemInfo
} from '../../services/settings.service.js';

const TAG = 'Paramètres';

/**
 * Point d'entrée unique du back-office pour tout ce qui est paramétrable.
 * Regroupe la configuration générale, la grille tarifaire et les informations
 * d'exploitation en lecture seule (pilotées par l'environnement).
 */
export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireRole('ADMIN'));

  app.get(
    '/',
    {
      schema: doc({
        summary: 'Consulter tous les paramètres',
        description:
          'Renvoie la configuration générale, la grille tarifaire, leurs valeurs par défaut et les informations système en lecture seule.',
        tags: [TAG]
      })
    },
    async () => {
      const [general, pricing] = await Promise.all([getGeneralConfig(true), getPricingConfig(true)]);

      return {
        general,
        pricing,
        system: systemInfo(),
        defaults: { general: DEFAULT_GENERAL_CONFIG, pricing: DEFAULT_PRICING_CONFIG }
      };
    }
  );

  app.put(
    '/general',
    {
      schema: doc({
        summary: 'Mettre à jour les paramètres généraux',
        description:
          'Coordonnées de la conciergerie, délai de prévenance, préavis d’annulation, échéance de facturation par défaut et seuils de fidélité. Chaque valeur est appliquée immédiatement par le domaine.',
        tags: [TAG],
        body: generalConfigSchema
      })
    },
    async (request) => {
      const body = parse(generalConfigSchema, request.body);
      const before = await getGeneralConfig(true);
      const general = await saveGeneralConfig(body);

      await recordAudit({
        request,
        action: 'settings.general.update',
        entity: 'Setting',
        entityId: 'general',
        before,
        after: general
      });

      return { general };
    }
  );

  app.post(
    '/general/reset',
    {
      schema: doc({ summary: 'Rétablir les paramètres généraux par défaut', tags: [TAG] })
    },
    async (request) => {
      const general = await saveGeneralConfig(DEFAULT_GENERAL_CONFIG);
      await recordAudit({
        request,
        action: 'settings.general.reset',
        entity: 'Setting',
        entityId: 'general'
      });
      return { general };
    }
  );

  app.put(
    '/pricing',
    {
      schema: doc({
        summary: 'Mettre à jour la grille tarifaire',
        description: 'Alias de PUT /pricing/config, exposé ici pour regrouper le back-office.',
        tags: [TAG],
        body: pricingConfigSchema
      })
    },
    async (request) => {
      const body = parse(pricingConfigSchema, request.body);
      const before = await getPricingConfig(true);
      const pricing = await savePricingConfig(body);

      await recordAudit({
        request,
        action: 'pricing.config.update',
        entity: 'Setting',
        entityId: 'pricing',
        before,
        after: pricing
      });

      return { pricing };
    }
  );

  app.post(
    '/pricing/reset',
    {
      schema: doc({ summary: 'Rétablir la grille tarifaire par défaut', tags: [TAG] })
    },
    async (request) => {
      const pricing = await savePricingConfig(DEFAULT_PRICING_CONFIG);
      await recordAudit({
        request,
        action: 'pricing.config.reset',
        entity: 'Setting',
        entityId: 'pricing'
      });
      return { pricing };
    }
  );
}
