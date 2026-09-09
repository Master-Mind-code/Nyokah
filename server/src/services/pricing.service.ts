import type { PromoRule, RentalFormula, Vehicle, VehicleCategory } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env.js';
import { countRentalDays } from '../lib/dates.js';
import { prisma } from '../lib/prisma.js';
import { UnprocessableError } from '../lib/errors.js';
import { RentalFormulaEnum } from '../lib/enums.js';

/**
 * Moteur tarifaire. C'est la seule source de verite des prix : le client ne
 * transmet jamais de montant, il transmet des parametres de location et l'API
 * recalcule tout. Les regles sont parametrables via la table `settings`
 * (cle `pricing`) pour eviter un deploiement a chaque changement de grille.
 */

export const PRICING_SETTINGS_KEY = 'pricing';

export const pricingConfigSchema = z.object({
  /** TVA ivoirienne, 18 % par defaut. */
  vatRate: z.number().min(0).max(1),
  /** Grille de remise volume, evaluee de la plus avantageuse a la moins avantageuse. */
  volumeDiscountTiers: z
    .array(z.object({ minDays: z.number().int().positive(), percentage: z.number().min(0).max(100) }))
    .default([]),
  /** Coefficient applique au tarif journalier pour une mise a disposition 24h. */
  continuous24hMultiplier: z.number().positive(),
  /** Coefficient applique au tarif journalier en formule mensuelle (0.75 = -25 %). */
  monthlyRateMultiplier: z.number().positive(),
  /** Coefficient applique au tarif journalier en forfait week-end. */
  weekendRateMultiplier: z.number().positive(),
  /** Cout journalier de l'option carburant, par categorie de vehicule. */
  fuelOptionDailyCost: z.object({
    default: z.number().int().min(0),
    VIP_PRESTIGE: z.number().int().min(0)
  }),
  /** Points de fidelite credites par tranche de 1 000 FCFA depensee. */
  loyaltyPointsPer1000: z.number().min(0)
});

export type PricingConfig = z.infer<typeof pricingConfigSchema>;

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  vatRate: env.VAT_RATE,
  volumeDiscountTiers: [
    { minDays: 7, percentage: 12 },
    { minDays: 3, percentage: 5 }
  ],
  continuous24hMultiplier: 1.5,
  monthlyRateMultiplier: 0.75,
  weekendRateMultiplier: 0.9,
  fuelOptionDailyCost: { default: 25_000, VIP_PRESTIGE: 50_000 },
  loyaltyPointsPer1000: 1
};

let cache: { value: PricingConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getPricingConfig(force = false): Promise<PricingConfig> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.value;

  const row = await prisma.setting.findUnique({ where: { key: PRICING_SETTINGS_KEY } });
  const parsed = row ? pricingConfigSchema.safeParse(row.value) : null;
  const value = parsed?.success ? parsed.data : DEFAULT_PRICING_CONFIG;

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function savePricingConfig(config: PricingConfig): Promise<PricingConfig> {
  await prisma.setting.upsert({
    where: { key: PRICING_SETTINGS_KEY },
    create: { key: PRICING_SETTINGS_KEY, value: config },
    update: { value: config }
  });
  cache = { value: config, expiresAt: Date.now() + CACHE_TTL_MS };
  return config;
}

export function invalidatePricingCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------

export interface QuoteInput {
  vehicle: Pick<Vehicle, 'id' | 'category' | 'dailyRate' | 'halfDayRate' | 'airportTransferRate' | 'monthlyRate'>;
  startDate: Date;
  endDate: Date;
  formula: RentalFormula;
  fuelIncluded: boolean;
  promoCode?: string | null;
  /** Remise contractuelle du compte entreprise, en pourcentage. */
  companyDiscountRate?: number;
  companyName?: string | null;
  companyId?: string | null;
}

export interface DiscountCandidate {
  source: 'company' | 'promo' | 'volume';
  percentage: number;
  reason: string;
  promoRuleId?: string;
  code?: string;
}

export interface Quote {
  durationDays: number;
  /** Tarif unitaire retenu apres application de la formule. */
  baseRate: number;
  basePrice: number;
  fuelOptionCost: number;
  optionsPrice: number;
  grossTotal: number;
  discountPercentage: number;
  discountReason: string;
  discountAmount: number;
  discountCode: string | null;
  appliedPromoRuleId: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  /** Toutes les remises eligibles, pour affichage transparent au client. */
  discountCandidates: DiscountCandidate[];
  loyaltyPointsEarned: number;
}

/** Tarif unitaire applicable selon la formule de location choisie. */
export function resolveBaseRate(
  vehicle: QuoteInput['vehicle'],
  formula: RentalFormula,
  config: PricingConfig
): number {
  switch (formula) {
    case 'DEMI_JOURNEE':
      return vehicle.halfDayRate;
    case 'TRANSFERT_AEROPORT':
      return vehicle.airportTransferRate;
    case 'CONTINUE_24H':
      return Math.round(vehicle.dailyRate * config.continuous24hMultiplier);
    case 'MENSUELLE':
      return vehicle.monthlyRate ?? Math.round(vehicle.dailyRate * config.monthlyRateMultiplier);
    case 'FORFAIT_WEEKEND':
      return Math.round(vehicle.dailyRate * config.weekendRateMultiplier);
    case 'JOURNEE':
    default:
      return vehicle.dailyRate;
  }
}

function fuelDailyCost(category: VehicleCategory, config: PricingConfig): number {
  return category === 'VIP_PRESTIGE'
    ? config.fuelOptionDailyCost.VIP_PRESTIGE
    : config.fuelOptionDailyCost.default;
}

export interface PromoValidation {
  valid: boolean;
  reason?: string;
  rule?: PromoRule;
}

/** Verifie qu'un code promo est utilisable pour ce panier precis. */
export function validatePromoRule(
  rule: PromoRule | null,
  context: { durationDays: number; grossTotal: number; companyId?: string | null; now?: Date }
): PromoValidation {
  const now = context.now ?? new Date();

  if (!rule) return { valid: false, reason: 'Code promo inconnu.' };
  if (!rule.active) return { valid: false, reason: 'Ce code promo a été désactivé.' };
  if (rule.startsAt && rule.startsAt > now) {
    return { valid: false, reason: "Ce code promo n'est pas encore actif." };
  }
  if (rule.expiresAt < now) return { valid: false, reason: 'Ce code promo a expiré.' };
  if (rule.maxUses !== null && rule.usedCount >= rule.maxUses) {
    return { valid: false, reason: "Ce code promo a atteint son nombre maximum d'utilisations." };
  }
  if (rule.applicableToCompanyId && rule.applicableToCompanyId !== context.companyId) {
    return { valid: false, reason: 'Ce code est réservé à une entreprise partenaire.' };
  }
  if (rule.minDays !== null && context.durationDays < rule.minDays) {
    return {
      valid: false,
      reason: `Ce code exige une location d'au moins ${rule.minDays} jours.`
    };
  }
  if (rule.minAmount !== null && context.grossTotal < rule.minAmount) {
    return {
      valid: false,
      reason: `Ce code exige un montant minimum de ${rule.minAmount} FCFA.`
    };
  }

  return { valid: true, rule };
}

/**
 * Calcule le devis complet. Les remises ne se cumulent pas : la plus
 * avantageuse pour le client est retenue, comme dans la grille commerciale.
 */
export async function quote(input: QuoteInput): Promise<Quote> {
  const config = await getPricingConfig();

  if (input.endDate < input.startDate) {
    throw new UnprocessableError('La date de fin doit être postérieure à la date de début.');
  }

  const durationDays =
    input.formula === 'TRANSFERT_AEROPORT' || input.formula === 'DEMI_JOURNEE'
      ? Math.max(1, countRentalDays(input.startDate, input.endDate))
      : countRentalDays(input.startDate, input.endDate);

  const baseRate = resolveBaseRate(input.vehicle, input.formula, config);
  const basePrice = baseRate * durationDays;
  const fuelOptionCost = input.fuelIncluded
    ? fuelDailyCost(input.vehicle.category, config) * durationDays
    : 0;
  const grossTotal = basePrice + fuelOptionCost;

  const candidates: DiscountCandidate[] = [];

  if (input.companyDiscountRate && input.companyDiscountRate > 0) {
    candidates.push({
      source: 'company',
      percentage: input.companyDiscountRate,
      reason: input.companyName
        ? `Remise Société (${input.companyName} -${input.companyDiscountRate}%)`
        : `Remise Société (-${input.companyDiscountRate}%)`
    });
  }

  for (const tier of [...config.volumeDiscountTiers].sort((a, b) => b.minDays - a.minDays)) {
    if (durationDays >= tier.minDays) {
      candidates.push({
        source: 'volume',
        percentage: tier.percentage,
        reason: `Remise Volume Durée (${durationDays} jours : -${tier.percentage}%)`
      });
      break;
    }
  }

  let promoRejection: string | null = null;
  const code = input.promoCode?.trim().toUpperCase();

  if (code) {
    const rule = await prisma.promoRule.findUnique({ where: { code } });
    const validation = validatePromoRule(rule, {
      durationDays,
      grossTotal,
      companyId: input.companyId ?? null
    });

    if (validation.valid && validation.rule) {
      candidates.push({
        source: 'promo',
        percentage: validation.rule.discountPercentage,
        reason: `Code Promo ${validation.rule.code} (-${validation.rule.discountPercentage}%)`,
        promoRuleId: validation.rule.id,
        code: validation.rule.code
      });
    } else {
      promoRejection = validation.reason ?? 'Code promo non applicable.';
    }
  }

  const best = candidates.reduce<DiscountCandidate | null>(
    (acc, c) => (!acc || c.percentage > acc.percentage ? c : acc),
    null
  );

  const discountPercentage = best?.percentage ?? 0;
  const discountAmount = Math.round((grossTotal * discountPercentage) / 100);
  const subtotal = grossTotal - discountAmount;
  const taxAmount = Math.round(subtotal * config.vatRate);
  const totalAmount = subtotal + taxAmount;

  return {
    durationDays,
    baseRate,
    basePrice,
    fuelOptionCost,
    optionsPrice: fuelOptionCost,
    grossTotal,
    discountPercentage,
    discountReason: best?.reason ?? (promoRejection ?? ''),
    discountAmount,
    discountCode: best?.code ?? (code || null),
    appliedPromoRuleId: best?.promoRuleId ?? null,
    subtotal,
    taxRate: config.vatRate,
    taxAmount,
    totalAmount,
    currency: env.CURRENCY,
    discountCandidates: candidates,
    loyaltyPointsEarned: Math.floor((totalAmount / 1000) * config.loyaltyPointsPer1000)
  };
}

/** Libelle francais de la formule, pour les messages sortants. */
export function formulaLabel(formula: RentalFormula): string {
  return RentalFormulaEnum.toLabel(formula);
}
