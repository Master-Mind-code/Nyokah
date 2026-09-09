import type { UserRole } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/tokens.js';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  email: string;
  companyId: string | null;
  driverId: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Renseigne par `authenticate` / `optionalAuth`. */
    user: AuthenticatedUser | null;
  }

  interface FastifyInstance {
    /** Exige un jeton d'acces valide. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Renseigne request.user si un jeton valide est present, sans jamais echouer. */
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Exige un jeton valide portant l'un des roles indiques. */
    requireRole: (
      ...roles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function extractBearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme?.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

function toUser(payload: AccessTokenPayload): AuthenticatedUser {
  return {
    id: payload.sub,
    role: payload.role,
    email: payload.email,
    companyId: payload.companyId,
    driverId: payload.driverId
  };
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('user', null);

  app.decorate('authenticate', async (request: FastifyRequest) => {
    const token = extractBearer(request);
    if (!token) {
      throw new UnauthorizedError('Jeton d’accès manquant. Ajoutez l’en-tête Authorization.');
    }
    request.user = toUser(await verifyAccessToken(token));
  });

  app.decorate('optionalAuth', async (request: FastifyRequest) => {
    const token = extractBearer(request);
    if (!token) return;
    try {
      request.user = toUser(await verifyAccessToken(token));
    } catch {
      request.user = null;
    }
  });

  app.decorate(
    'requireRole',
    (...roles: UserRole[]) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        await app.authenticate(request, reply);
        if (!request.user || !roles.includes(request.user.role)) {
          throw new ForbiddenError(
            'Cette ressource est réservée aux profils : ' + roles.join(', ') + '.'
          );
        }
      }
  );
});

/** Garde-fou reutilisable : l'acteur est admin, ou proprietaire de la ressource. */
export function assertSelfOrAdmin(user: AuthenticatedUser | null, ownerId: string | null): void {
  if (!user) throw new UnauthorizedError();
  if (user.role === 'ADMIN') return;
  if (!ownerId || user.id !== ownerId) {
    throw new ForbiddenError('Vous ne pouvez accéder qu’à vos propres données.');
  }
}
