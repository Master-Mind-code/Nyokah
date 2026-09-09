import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

/**
 * Parametres generaux de la plateforme.
 *
 * Comme la grille tarifaire, ils vivent dans la table `settings` et non dans le
 * code : le back-office peut les ajuster sans redeploiement. Chaque champ est
 * effectivement utilise par le domaine — aucun reglage decoratif.
 */

export const GENERAL_SETTINGS_KEY = 'general';

export const generalConfigSchema = z.object({
  /** Raison sociale utilisee dans les messages sortants et les factures. */
  companyName: z.string().min(2).max(120),
  /** Ligne de la conciergerie, reprise en pied des notifications. */
  supportPhone: z.string().min(6).max(30),
  supportEmail: z.string().email(),

  /**
   * Delai minimum entre la demande et le debut de la location.
   * Empeche les reservations pour « dans 5 minutes » que l'exploitation ne peut
   * pas honorer. 0 desactive le controle.
   */
  bookingLeadTimeHours: z.number().int().min(0).max(720),

  /**
   * Preavis d'annulation laisse au client, en heures avant la prise en charge.
   * Passe ce delai, seul un administrateur peut annuler. 0 desactive le controle.
   */
  cancellationNoticeHours: z.number().int().min(0).max(720),

  /** Echeance de facturation par defaut, quand la societe n'en fixe aucune. */
  invoiceDueDays: z.number().int().min(0).max(180),

  /** Seuils des paliers de fidelite, en points cumules. */
  loyaltyTiers: z.object({
    silver: z.number().int().min(0),
    gold: z.number().int().min(0)
  })
});

export type GeneralConfig = z.infer<typeof generalConfigSchema>;

export const DEFAULT_GENERAL_CONFIG: GeneralConfig = {
  companyName: 'Nyokah Mobility',
  supportPhone: '+225 27 20 21 00 00',
  supportEmail: 'conciergerie@nyokah.ci',
  bookingLeadTimeHours: 2,
  cancellationNoticeHours: 24,
  invoiceDueDays: 30,
  loyaltyTiers: { silver: 500, gold: 1000 }
};

let cache: { value: GeneralConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getGeneralConfig(force = false): Promise<GeneralConfig> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.value;

  const row = await prisma.setting.findUnique({ where: { key: GENERAL_SETTINGS_KEY } });
  const parsed = row ? generalConfigSchema.safeParse(row.value) : null;
  const value = parsed?.success ? parsed.data : DEFAULT_GENERAL_CONFIG;

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function saveGeneralConfig(config: GeneralConfig): Promise<GeneralConfig> {
  await prisma.setting.upsert({
    where: { key: GENERAL_SETTINGS_KEY },
    create: { key: GENERAL_SETTINGS_KEY, value: config },
    update: { value: config }
  });
  cache = { value: config, expiresAt: Date.now() + CACHE_TTL_MS };
  return config;
}

export function invalidateGeneralCache(): void {
  cache = null;
}

/** Informations d'exploitation en lecture seule (pilotees par l'environnement). */
export function systemInfo() {
  return {
    environment: env.NODE_ENV,
    currency: env.CURRENCY,
    apiUrl: env.API_URL,
    paymentProvider: env.PAYMENT_PROVIDER,
    notificationProvider: env.NOTIFICATION_PROVIDER,
    emailProvider: env.EMAIL_PROVIDER,
    accessTokenTtl: env.ACCESS_TOKEN_TTL,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    corsOrigins: env.CORS_ORIGINS
  };
}
