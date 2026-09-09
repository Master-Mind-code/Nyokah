import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { hashPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { serializeUser } from '../../lib/serializers.js';
import { LoyaltyTierEnum, UserRoleEnum } from '../../lib/enums.js';
import { recordAudit } from '../../services/audit.service.js';
import { getGeneralConfig } from '../../services/settings.service.js';

const TAG = 'Utilisateurs';

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(8).max(24).optional(),
  avatarUrl: z.string().url().nullish(),
  city: z.string().max(80).nullish(),
  district: z.string().max(80).nullish(),
  companyRole: z.string().max(120).nullish()
});

const addressSchema = z.object({
  label: z.string().min(1).max(80).default('Adresse'),
  address: z.string().min(3).max(255),
  isDefault: z.boolean().default(false)
});

const listUsersSchema = paginationSchema.extend({
  role: UserRoleEnum.schema.optional(),
  companyId: z.string().optional(),
  search: z.string().max(120).optional(),
  isActive: z.coerce.boolean().optional()
});

const adminCreateUserSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(24),
  password: z.string().min(8).max(128),
  role: UserRoleEnum.schema,
  companyId: z.string().optional(),
  companyRole: z.string().max(120).optional()
});

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // Profil du compte connecte
  // -------------------------------------------------------------------------

  app.patch(
    '/me',
    {
      preHandler: app.authenticate,
      schema: doc({ summary: 'Mettre à jour son profil', tags: [TAG], body: updateProfileSchema })
    },
    async (request) => {
      const body = parse(updateProfileSchema, request.body);

      const user = await prisma.user.update({
        where: { id: request.user!.id },
        data: body,
        include: { company: true, driverProfile: true }
      });

      await recordAudit({ request, action: 'user.profile.update', entity: 'User', entityId: user.id });

      return { user: serializeUser(user) };
    }
  );

  app.get(
    '/me/addresses',
    {
      preHandler: app.authenticate,
      schema: doc({ summary: 'Lister ses adresses favorites', tags: [TAG] })
    },
    async (request) => {
      const addresses = await prisma.savedAddress.findMany({
        where: { userId: request.user!.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
      });
      return { data: addresses };
    }
  );

  app.post(
    '/me/addresses',
    {
      preHandler: app.authenticate,
      schema: doc({ summary: 'Ajouter une adresse favorite', tags: [TAG], body: addressSchema })
    },
    async (request, reply) => {
      const body = parse(addressSchema, request.body);
      const userId = request.user!.id;

      const existing = await prisma.savedAddress.findUnique({
        where: { userId_address: { userId, address: body.address } }
      });
      if (existing) throw new ConflictError('Cette adresse est déjà dans vos favoris.');

      const address = await prisma.$transaction(async (tx) => {
        if (body.isDefault) {
          await tx.savedAddress.updateMany({ where: { userId }, data: { isDefault: false } });
        }
        return tx.savedAddress.create({ data: { ...body, userId } });
      });

      return reply.status(201).send(address);
    }
  );

  app.delete(
    '/me/addresses/:id',
    {
      preHandler: app.authenticate,
      schema: doc({ summary: 'Retirer une adresse favorite', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const deleted = await prisma.savedAddress.deleteMany({
        where: { id, userId: request.user!.id }
      });

      if (deleted.count === 0) throw new NotFoundError('Adresse');
      return { success: true };
    }
  );

  app.get(
    '/me/loyalty',
    {
      preHandler: app.authenticate,
      schema: doc({
        summary: 'Consulter son solde de fidélité',
        description: 'Paliers Nyokah : Standard (< 500 pts), Silver (≥ 500), Gold VIP (≥ 1000).',
        tags: [TAG]
      })
    },
    async (request) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: request.user!.id },
        select: { loyaltyPoints: true, tier: true }
      });

      const { loyaltyTiers } = await getGeneralConfig();
      const nextTier =
        user.loyaltyPoints < loyaltyTiers.silver
          ? { tier: 'Silver', pointsNeeded: loyaltyTiers.silver - user.loyaltyPoints }
          : user.loyaltyPoints < loyaltyTiers.gold
            ? { tier: 'Gold VIP', pointsNeeded: loyaltyTiers.gold - user.loyaltyPoints }
            : null;

      // Le libelle francais est renvoye, comme partout ailleurs dans l'API.
      return { loyaltyPoints: user.loyaltyPoints, tier: LoyaltyTierEnum.toLabel(user.tier), nextTier };
    }
  );

  // -------------------------------------------------------------------------
  // Administration des comptes
  // -------------------------------------------------------------------------

  app.get(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Lister les comptes', tags: [TAG], querystring: listUsersSchema })
    },
    async (request) => {
      const query = parse(listUsersSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const where = {
        deletedAt: null,
        ...(query.role ? { role: query.role } : {}),
        ...(query.companyId ? { companyId: query.companyId } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' as const } },
                { email: { contains: query.search, mode: 'insensitive' as const } },
                { phone: { contains: query.search } }
              ]
            }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: { company: true, driverProfile: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.user.count({ where })
      ]);

      return paginated(rows.map(serializeUser), total, query);
    }
  );

  app.post(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Créer un compte (back-office)',
        tags: [TAG],
        body: adminCreateUserSchema
      })
    },
    async (request, reply) => {
      const body = parse(adminCreateUserSchema, request.body);

      const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (existing) throw new ConflictError('Un compte existe déjà avec cette adresse e-mail.');

      const user = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          phone: body.phone,
          passwordHash: await hashPassword(body.password),
          fullName: body.fullName,
          role: body.role,
          companyId: body.companyId ?? null,
          companyRole: body.companyRole ?? null
        },
        include: { company: true, driverProfile: true }
      });

      await recordAudit({
        request,
        action: 'user.create',
        entity: 'User',
        entityId: user.id,
        after: { email: user.email, role: user.role }
      });

      return reply.status(201).send({ user: serializeUser(user) });
    }
  );

  app.get(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Détail d’un compte', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
        include: { company: true, driverProfile: true, savedAddresses: true }
      });

      if (!user) throw new NotFoundError('Compte');

      const [bookingCount, spent] = await Promise.all([
        prisma.booking.count({ where: { clientId: id, status: { not: 'ANNULEE' } } }),
        prisma.booking.aggregate({
          where: { clientId: id, status: { not: 'ANNULEE' } },
          _sum: { totalAmount: true }
        })
      ]);

      return {
        user: serializeUser(user),
        savedAddresses: user.savedAddresses,
        stats: { totalBookings: bookingCount, totalSpent: spent._sum.totalAmount ?? 0 }
      };
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modifier un compte',
        tags: [TAG],
        params: idParamSchema,
        body: updateProfileSchema.extend({
          role: UserRoleEnum.schema.optional(),
          isActive: z.boolean().optional(),
          companyId: z.string().nullish(),
          loyaltyPoints: z.number().int().min(0).optional()
        })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(
        updateProfileSchema.extend({
          role: UserRoleEnum.schema.optional(),
          isActive: z.boolean().optional(),
          companyId: z.string().nullish(),
          loyaltyPoints: z.number().int().min(0).optional()
        }),
        request.body
      );

      const before = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      if (!before) throw new NotFoundError('Compte');

      const user = await prisma.user.update({
        where: { id },
        data: body,
        include: { company: true, driverProfile: true }
      });

      await recordAudit({
        request,
        action: 'user.update',
        entity: 'User',
        entityId: id,
        before: { role: before.role, isActive: before.isActive },
        after: { role: user.role, isActive: user.isActive }
      });

      return { user: serializeUser(user) };
    }
  );

  app.delete(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Désactiver un compte',
        description:
          'Suppression logique : le compte est anonymisé côté connexion mais l’historique des réservations est conservé pour la comptabilité.',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      if (!user) throw new NotFoundError('Compte');

      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { isActive: false, deletedAt: new Date() }
        }),
        prisma.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() }
        })
      ]);

      await recordAudit({ request, action: 'user.delete', entity: 'User', entityId: id });

      return { success: true, message: 'Compte désactivé.' };
    }
  );
}
