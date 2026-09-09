import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { countRentalDays, toUtcDay } from '../../lib/dates.js';
import { NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializePromoRule } from '../../lib/serializers.js';
import { recordAudit } from '../../services/audit.service.js';
import { resolveBaseRate, getPricingConfig, validatePromoRule } from '../../services/pricing.service.js';
import { RentalFormulaEnum } from '../../lib/enums.js';

const TAG = 'Codes promo & remises';

const bodySchema = z.object({
  code: z.string().min(3).max(30),
  description: z.string().min(2).max(300),
  discountPercentage: z.number().int().min(0).max(100),
  applicableToCompanyId: z.string().nullish(),
  minDays: z.number().int().min(1).nullish(),
  minAmount: z.number().int().min(0).nullish(),
  maxUses: z.number().int().min(1).nullish(),
  startsAt: z.string().date().nullish(),
  expiresAt: z.string().date(),
  active: z.boolean().default(true)
});

const listSchema = paginationSchema.extend({
  active: z.coerce.boolean().optional(),
  companyId: z.string().optional(),
  search: z.string().max(60).optional(),
  /** Masque les codes déjà expirés. */
  validOnly: z.coerce.boolean().optional()
});

const validateSchema = z.object({
  code: z.string().min(1).max(30),
  vehicleId: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  formula: RentalFormulaEnum.schema,
  fuelIncluded: z.boolean().default(false),
  companyId: z.string().nullish()
});

export async function promosRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/validate',
    {
      preHandler: app.optionalAuth,
      schema: doc({
        summary: 'Vérifier l’applicabilité d’un code promo',
        description:
          'Contrôle les conditions (durée, montant, entreprise, quota, validité) et renvoie la remise obtenue sans créer de réservation.',
        tags: [TAG],
        body: validateSchema,
        security: false
      })
    },
    async (request) => {
      const body = parse(validateSchema, request.body);

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: body.vehicleId, deletedAt: null }
      });
      if (!vehicle) throw new NotFoundError('Véhicule');

      const config = await getPricingConfig();
      const startDate = toUtcDay(body.startDate);
      const endDate = toUtcDay(body.endDate);
      const durationDays = countRentalDays(startDate, endDate);

      const baseRate = resolveBaseRate(vehicle, body.formula, config);
      const fuelCost = body.fuelIncluded
        ? (vehicle.category === 'VIP_PRESTIGE'
            ? config.fuelOptionDailyCost.VIP_PRESTIGE
            : config.fuelOptionDailyCost.default) * durationDays
        : 0;
      const grossTotal = baseRate * durationDays + fuelCost;

      const companyId = body.companyId ?? request.user?.companyId ?? null;
      const rule = await prisma.promoRule.findUnique({
        where: { code: body.code.trim().toUpperCase() }
      });

      const result = validatePromoRule(rule, { durationDays, grossTotal, companyId });

      if (!result.valid || !result.rule) {
        return { valid: false, reason: result.reason, discountAmount: 0, discountPercentage: 0 };
      }

      const discountAmount = Math.round((grossTotal * result.rule.discountPercentage) / 100);

      return {
        valid: true,
        code: result.rule.code,
        description: result.rule.description,
        discountPercentage: result.rule.discountPercentage,
        discountAmount,
        grossTotal,
        totalAfterDiscount: grossTotal - discountAmount
      };
    }
  );

  app.get(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Lister les règles tarifaires', tags: [TAG], querystring: listSchema })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const where: Prisma.PromoRuleWhereInput = {
        ...(query.active !== undefined ? { active: query.active } : {}),
        ...(query.companyId ? { applicableToCompanyId: query.companyId } : {}),
        ...(query.validOnly ? { expiresAt: { gte: new Date() }, active: true } : {}),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.promoRule.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.promoRule.count({ where })
      ]);

      return paginated(rows.map(serializePromoRule), total, query);
    }
  );

  app.post(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Créer une règle tarifaire', tags: [TAG], body: bodySchema })
    },
    async (request, reply) => {
      const body = parse(bodySchema, request.body);

      const rule = await prisma.promoRule.create({
        data: {
          ...body,
          code: body.code.trim().toUpperCase(),
          startsAt: body.startsAt ? toUtcDay(body.startsAt) : null,
          expiresAt: toUtcDay(body.expiresAt)
        }
      });

      await recordAudit({
        request,
        action: 'promo.create',
        entity: 'PromoRule',
        entityId: rule.id,
        after: { code: rule.code, discountPercentage: rule.discountPercentage }
      });

      return reply.status(201).send({ promoRule: serializePromoRule(rule) });
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modifier une règle tarifaire',
        tags: [TAG],
        params: idParamSchema,
        body: bodySchema.partial()
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(bodySchema.partial(), request.body);

      const rule = await prisma.promoRule.update({
        where: { id },
        data: {
          ...body,
          ...(body.code ? { code: body.code.trim().toUpperCase() } : {}),
          ...(body.startsAt !== undefined
            ? { startsAt: body.startsAt ? toUtcDay(body.startsAt) : null }
            : {}),
          ...(body.expiresAt ? { expiresAt: toUtcDay(body.expiresAt) } : {})
        }
      });

      await recordAudit({ request, action: 'promo.update', entity: 'PromoRule', entityId: id });

      return { promoRule: serializePromoRule(rule) };
    }
  );

  app.post(
    '/:id/toggle',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Activer / désactiver une règle', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const existing = await prisma.promoRule.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Règle tarifaire');

      const rule = await prisma.promoRule.update({
        where: { id },
        data: { active: !existing.active }
      });

      await recordAudit({
        request,
        action: 'promo.toggle',
        entity: 'PromoRule',
        entityId: id,
        after: { active: rule.active }
      });

      return { promoRule: serializePromoRule(rule) };
    }
  );

  app.delete(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Supprimer une règle tarifaire', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      await prisma.promoRule.delete({ where: { id } });
      await recordAudit({ request, action: 'promo.delete', entity: 'PromoRule', entityId: id });
      return { success: true };
    }
  );
}
