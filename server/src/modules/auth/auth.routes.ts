import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../lib/errors.js';
import { doc, parse } from '../../lib/http.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { promoCode } from '../../lib/references.js';
import { serializeUser } from '../../lib/serializers.js';
import { generateRefreshToken, hashToken, signAccessToken } from '../../lib/tokens.js';
import { recordAudit } from '../../services/audit.service.js';
import { sendWelcome } from '../../services/notification.service.js';

const TAG = 'Authentification';

const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(128);

const registerIndividualSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(24),
  password: passwordSchema,
  city: z.string().max(80).optional(),
  district: z.string().max(80).optional()
});

const registerCompanySchema = z.object({
  companyName: z.string().min(2).max(160),
  tradeRegister: z.string().min(3).max(60),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(8).max(24),
  password: passwordSchema,
  companyRole: z.string().max(120).optional(),
  billingAddress: z.string().max(255).optional(),
  creditLineRequested: z.boolean().default(false)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({ refreshToken: z.string().min(10) });

/** Points de fidelite offerts a l'inscription d'un particulier. */
const WELCOME_LOYALTY_POINTS = 500;
/** Remise contractuelle accordee d'office a un nouveau compte entreprise. */
const WELCOME_B2B_DISCOUNT_RATE = 15;

async function issueSession(
  user: { id: string; email: string; role: 'INDIVIDUAL' | 'COMPANY' | 'DRIVER' | 'ADMIN'; companyId: string | null },
  context: { userAgent?: string; ip?: string }
) {
  const driver = await prisma.driver.findUnique({
    where: { userId: user.id },
    select: { id: true }
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    companyId: user.companyId,
    driverId: driver?.id ?? null
  });

  const refresh = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: refresh.tokenHash,
      userId: user.id,
      expiresAt: refresh.expiresAt,
      userAgent: context.userAgent ?? null,
      ip: context.ip ?? null
    }
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    expiresIn: env.ACCESS_TOKEN_TTL,
    tokenType: 'Bearer' as const
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Limite stricte sur les routes sensibles au bourrage d'identifiants.
  const strictLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

  app.post(
    '/register/individual',
    {
      ...strictLimit,
      schema: doc({
        summary: 'Créer un compte particulier',
        description: `Crée un compte client particulier et ouvre une session. ${WELCOME_LOYALTY_POINTS} points de fidélité de bienvenue sont crédités.`,
        tags: [TAG],
        body: registerIndividualSchema,
        security: false
      })
    },
    async (request, reply) => {
      const body = parse(registerIndividualSchema, request.body);

      const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (existing) throw new ConflictError('Un compte existe déjà avec cette adresse e-mail.');

      const user = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          phone: body.phone,
          passwordHash: await hashPassword(body.password),
          fullName: body.fullName,
          role: 'INDIVIDUAL',
          city: body.city ?? 'Abidjan',
          district: body.district ?? null,
          loyaltyPoints: WELCOME_LOYALTY_POINTS,
          tier: 'STANDARD',
          savedAddresses: body.district
            ? { create: { label: 'Domicile', address: `${body.district}, ${body.city ?? 'Abidjan'}` } }
            : undefined
        },
        include: { company: true, driverProfile: true }
      });

      const session = await issueSession(user, {
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      await sendWelcome(user);
      await recordAudit({ request, action: 'auth.register.individual', entity: 'User', entityId: user.id });

      return reply.status(201).send({ user: serializeUser(user), ...session });
    }
  );

  app.post(
    '/register/company',
    {
      ...strictLimit,
      schema: doc({
        summary: 'Créer un compte entreprise (B2B)',
        description: `Crée la fiche société, son code promo dédié, la remise contractuelle de bienvenue (${WELCOME_B2B_DISCOUNT_RATE}%) et le compte du contact principal.`,
        tags: [TAG],
        body: registerCompanySchema,
        security: false
      })
    },
    async (request, reply) => {
      const body = parse(registerCompanySchema, request.body);
      const email = body.contactEmail.toLowerCase();

      const [existingUser, existingCompany] = await Promise.all([
        prisma.user.findUnique({ where: { email } }),
        prisma.company.findUnique({ where: { tradeRegister: body.tradeRegister } })
      ]);

      if (existingUser) throw new ConflictError('Un compte existe déjà avec cette adresse e-mail.');
      if (existingCompany) throw new ConflictError('Ce numéro RCCM est déjà enregistré.');

      const code = promoCode();
      const passwordHash = await hashPassword(body.password);

      const user = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: body.companyName,
            tradeRegister: body.tradeRegister,
            contactName: body.contactName,
            contactEmail: email,
            contactPhone: body.contactPhone,
            billingAddress: body.billingAddress ?? `${body.companyName}, Abidjan, Côte d'Ivoire`,
            negotiatedDiscountRate: WELCOME_B2B_DISCOUNT_RATE,
            promoCode: code,
            monthlyVolumeTarget: 5,
            status: 'STANDARD_B2B',
            creditLineApproved: false,
            creditLimit: body.creditLineRequested ? 5_000_000 : 0,
            authorizedBookers: [body.contactName]
          }
        });

        await tx.promoRule.create({
          data: {
            code,
            description: `Tarif entreprise ${body.companyName} (-${WELCOME_B2B_DISCOUNT_RATE}%)`,
            discountPercentage: WELCOME_B2B_DISCOUNT_RATE,
            applicableToCompanyId: company.id,
            expiresAt: new Date(Date.UTC(new Date().getUTCFullYear() + 1, 11, 31)),
            active: true
          }
        });

        return tx.user.create({
          data: {
            email,
            phone: body.contactPhone,
            passwordHash,
            fullName: body.contactName,
            role: 'COMPANY',
            companyId: company.id,
            companyRole: body.companyRole ?? 'Responsable Mobilité / Logistique'
          },
          include: { company: true, driverProfile: true }
        });
      });

      const session = await issueSession(user, {
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      await sendWelcome(user);
      await recordAudit({ request, action: 'auth.register.company', entity: 'User', entityId: user.id });

      return reply.status(201).send({ user: serializeUser(user), ...session });
    }
  );

  app.post(
    '/login',
    {
      ...strictLimit,
      schema: doc({
        summary: 'Se connecter',
        tags: [TAG],
        body: loginSchema,
        security: false
      })
    },
    async (request) => {
      const body = parse(loginSchema, request.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
        include: { company: true, driverProfile: true }
      });

      // Message identique compte inconnu / mot de passe faux : pas d'enumeration.
      const invalid = new UnauthorizedError('Adresse e-mail ou mot de passe incorrect.');

      if (!user || user.deletedAt) throw invalid;
      if (!(await verifyPassword(body.password, user.passwordHash))) throw invalid;
      if (!user.isActive) {
        throw new UnauthorizedError('Ce compte est désactivé. Contactez la conciergerie Nyokah.');
      }

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      const session = await issueSession(user, {
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      return { user: serializeUser(user), ...session };
    }
  );

  app.post(
    '/refresh',
    {
      schema: doc({
        summary: 'Renouveler le jeton d’accès',
        description:
          'Le refresh token présenté est révoqué et remplacé (rotation), ce qui permet de détecter un rejeu.',
        tags: [TAG],
        body: refreshSchema,
        security: false
      })
    },
    async (request) => {
      const body = parse(refreshSchema, request.body);

      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(body.refreshToken) },
        include: { user: { include: { company: true, driverProfile: true } } }
      });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw new UnauthorizedError('Session expirée. Veuillez vous reconnecter.');
      }

      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() }
      });

      const session = await issueSession(stored.user, {
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      return { user: serializeUser(stored.user), ...session };
    }
  );

  app.post(
    '/logout',
    {
      schema: doc({
        summary: 'Se déconnecter',
        description: 'Révoque le refresh token fourni. Le jeton d’accès expire naturellement.',
        tags: [TAG],
        body: refreshSchema,
        security: false
      })
    },
    async (request) => {
      const body = parse(refreshSchema, request.body);

      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(body.refreshToken), revokedAt: null },
        data: { revokedAt: new Date() }
      });

      return { success: true, message: 'Déconnexion effectuée.' };
    }
  );

  app.post(
    '/logout-all',
    {
      preHandler: app.authenticate,
      schema: doc({
        summary: 'Révoquer toutes les sessions du compte',
        tags: [TAG]
      })
    },
    async (request) => {
      const count = await prisma.refreshToken.updateMany({
        where: { userId: request.user!.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      return { success: true, revokedSessions: count.count };
    }
  );

  app.get(
    '/me',
    {
      preHandler: app.authenticate,
      schema: doc({ summary: 'Profil du compte connecté', tags: [TAG] })
    },
    async (request) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: request.user!.id },
        include: { company: true, driverProfile: true, savedAddresses: true }
      });

      return {
        user: serializeUser(user),
        savedAddresses: user.savedAddresses.map((a) => ({
          id: a.id,
          label: a.label,
          address: a.address,
          isDefault: a.isDefault
        }))
      };
    }
  );

  app.post(
    '/password/change',
    {
      preHandler: app.authenticate,
      schema: doc({
        summary: 'Changer son mot de passe',
        tags: [TAG],
        body: z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
      })
    },
    async (request) => {
      const body = parse(
        z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }),
        request.body
      );

      const user = await prisma.user.findUniqueOrThrow({ where: { id: request.user!.id } });

      if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
        throw new UnauthorizedError('Mot de passe actuel incorrect.');
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: await hashPassword(body.newPassword) }
        }),
        // Toutes les autres sessions tombent : un mot de passe change doit deconnecter.
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() }
        })
      ]);

      await recordAudit({ request, action: 'auth.password.change', entity: 'User', entityId: user.id });

      return { success: true, message: 'Mot de passe mis à jour. Reconnectez-vous.' };
    }
  );

  app.post(
    '/password/forgot',
    {
      ...strictLimit,
      schema: doc({
        summary: 'Demander une réinitialisation de mot de passe',
        description:
          'Répond toujours 200 pour ne pas révéler l’existence d’un compte. En mode développement, le jeton est renvoyé dans la réponse.',
        tags: [TAG],
        body: z.object({ email: z.string().email() }),
        security: false
      })
    },
    async (request) => {
      const body = parse(z.object({ email: z.string().email() }), request.body);
      const email = body.email.toLowerCase();

      const user = await prisma.user.findUnique({ where: { email } });
      const generic = {
        success: true,
        message: 'Si un compte existe pour cette adresse, un lien de réinitialisation a été envoyé.'
      };

      if (!user) return generic;

      const token = randomBytes(32).toString('base64url');

      await prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          email,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        }
      });

      request.log.info({ email }, 'Jeton de réinitialisation de mot de passe généré');

      return env.NODE_ENV === 'production' ? generic : { ...generic, devToken: token };
    }
  );

  app.post(
    '/password/reset',
    {
      ...strictLimit,
      schema: doc({
        summary: 'Réinitialiser son mot de passe avec un jeton',
        tags: [TAG],
        body: z.object({ token: z.string().min(10), newPassword: passwordSchema }),
        security: false
      })
    },
    async (request) => {
      const body = parse(
        z.object({ token: z.string().min(10), newPassword: passwordSchema }),
        request.body
      );

      const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(body.token) }
      });

      if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw new UnauthorizedError('Lien de réinitialisation invalide ou expiré.');
      }

      const user = await prisma.user.findUnique({ where: { email: record.email } });
      if (!user) throw new UnauthorizedError('Lien de réinitialisation invalide ou expiré.');

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: await hashPassword(body.newPassword) }
        }),
        prisma.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() }
        }),
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() }
        })
      ]);

      await recordAudit({ request, action: 'auth.password.reset', entity: 'User', entityId: user.id });

      return { success: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' };
    }
  );
}
