import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import { env, isProduction, swaggerEnabled } from './config/env.js';
import { authPlugin } from './plugins/auth.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { bookingsRoutes } from './modules/bookings/bookings.routes.js';
import { companiesRoutes } from './modules/companies/companies.routes.js';
import { driversRoutes } from './modules/drivers/drivers.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { invoicesRoutes } from './modules/invoices/invoices.routes.js';
import { maintenanceRoutes } from './modules/maintenance/maintenance.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { packsRoutes } from './modules/packs/packs.routes.js';
import { paymentsRoutes } from './modules/payments/payments.routes.js';
import { pricingRoutes } from './modules/pricing/pricing.routes.js';
import { promosRoutes } from './modules/promos/promos.routes.js';
import { reviewsRoutes } from './modules/reviews/reviews.routes.js';
import { ridesRoutes } from './modules/rides/rides.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { subcontractorsRoutes } from './modules/subcontractors/subcontractors.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { vehiclesRoutes } from './modules/vehicles/vehicles.routes.js';

export const API_PREFIX = '/api/v1';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isProduction
      ? { level: 'info' }
      : {
          level: 'debug',
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
          }
        },
    trustProxy: true,
    // Les photos de véhicule sont transmises en base64 dans le corps JSON
    // (~1,37× la taille du fichier). 8 Mo laissent de la marge même si le
    // frontend compresse déjà les images avant l'envoi.
    bodyLimit: 8 * 1024 * 1024,
    ajv: { customOptions: { coerceTypes: false, removeAdditional: false } }
  });

  // Les schemas de route servent uniquement a la documentation OpenAPI :
  // la validation reelle est faite par zod dans chaque handler (parse()).
  // Le compilateur laisse donc la donnee intacte au lieu de la valider via AJV.
  app.setValidatorCompiler(() => (data) => ({ value: data }));

  // Plusieurs actions (reset, toggle, read-all...) n'ont pas de corps. Beaucoup
  // de clients envoient malgre tout `Content-Type: application/json` : sans ce
  // parseur, Fastify repondrait 400 sur une requete parfaitement valide.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_request, body: string, done) => {
      if (!body || body.trim() === '') return done(null, {});
      try {
        done(null, JSON.parse(body));
      } catch (error) {
        const err = error as Error & { statusCode?: number };
        err.statusCode = 400;
        done(err, undefined);
      }
    }
  );

  await app.register(errorHandlerPlugin);

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      // Les appels serveur a serveur et les outils (curl, Postman) n'ont pas d'Origin.
      if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`Origine non autorisée : ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
  });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Trop de requêtes. Réessayez dans ${context.after}.`,
        requestId: 'rate-limit'
      }
    })
  });

  await app.register(authPlugin);

  if (swaggerEnabled) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'API Nyokah Mobility',
          description:
            "API de la plateforme de location de véhicules avec chauffeur Nyokah Mobility (Abidjan, Côte d'Ivoire). " +
            'Montants en francs CFA (XOF), TVA ivoirienne de 18 %.',
          version: '1.0.0',
          contact: { name: 'Nyokah Mobility' }
        },
        servers: [{ url: env.API_URL, description: env.NODE_ENV }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
          }
        },
        tags: [
          { name: 'Authentification', description: 'Inscription, connexion, jetons' },
          { name: 'Utilisateurs', description: 'Profils, adresses favorites, fidélité' },
          { name: 'Flotte', description: 'Catalogue et gestion des véhicules' },
          { name: 'Entretien', description: 'Maintenance et alertes de flotte' },
          { name: 'Chauffeurs', description: 'Effectif et disponibilité' },
          { name: 'Partenaires sous-traitants', description: 'Flottes partenaires et commissions' },
          { name: 'Entreprises B2B', description: 'Comptes entreprise, remises, encours' },
          { name: 'Packs & offres', description: 'Offres forfaitaires' },
          { name: 'Codes promo & remises', description: 'Règles tarifaires' },
          { name: 'Tarification', description: 'Moteur de devis' },
          { name: 'Réservations', description: 'Cycle de vie des réservations' },
          { name: 'Courses & dispatch', description: 'Exploitation terrain' },
          { name: 'Paiements', description: 'Encaissement mobile money et carte' },
          { name: 'Facturation', description: 'Factures et encours' },
          { name: 'Notifications', description: 'WhatsApp, e-mail, SMS' },
          { name: 'Avis clients', description: 'Notes et modération' },
          { name: 'Pilotage & statistiques', description: 'Tableaux de bord' },
          { name: 'Paramètres', description: 'Configuration générale et tarifaire' },
          { name: 'Système', description: 'Sondes et métadonnées' }
        ]
      }
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true, persistAuthorization: true }
    });
  }

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(usersRoutes, { prefix: '/users' });
      await api.register(vehiclesRoutes, { prefix: '/vehicles' });
      await api.register(maintenanceRoutes, { prefix: '/maintenance' });
      await api.register(driversRoutes, { prefix: '/drivers' });
      await api.register(subcontractorsRoutes, { prefix: '/subcontractors' });
      await api.register(companiesRoutes, { prefix: '/companies' });
      await api.register(packsRoutes, { prefix: '/packs' });
      await api.register(promosRoutes, { prefix: '/promos' });
      await api.register(pricingRoutes, { prefix: '/pricing' });
      await api.register(bookingsRoutes, { prefix: '/bookings' });
      await api.register(ridesRoutes, { prefix: '/rides' });
      await api.register(paymentsRoutes, { prefix: '/payments' });
      await api.register(invoicesRoutes, { prefix: '/invoices' });
      await api.register(notificationsRoutes, { prefix: '/notifications' });
      await api.register(reviewsRoutes, { prefix: '/reviews' });
      await api.register(analyticsRoutes, { prefix: '/analytics' });
      await api.register(settingsRoutes, { prefix: '/settings' });
    },
    { prefix: API_PREFIX }
  );

  app.get('/', { schema: { hide: true } }, async () => ({
    name: 'Nyokah Mobility API',
    version: '1.0.0',
    documentation: swaggerEnabled ? `${env.API_URL}/docs` : null,
    health: `${env.API_URL}${API_PREFIX}/health`
  }));

  return app;
}
