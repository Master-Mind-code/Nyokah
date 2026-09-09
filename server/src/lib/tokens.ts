import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  companyId: string | null;
  driverId: string | null;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({
    role: payload.role,
    email: payload.email,
    companyId: payload.companyId,
    driverId: payload.driverId
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer('nyokah-api')
    .setAudience('nyokah-app')
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, accessSecret, {
      issuer: 'nyokah-api',
      audience: 'nyokah-app'
    });

    return {
      sub: payload.sub as string,
      role: payload.role as UserRole,
      email: payload.email as string,
      companyId: (payload.companyId as string | null) ?? null,
      driverId: (payload.driverId as string | null) ?? null
    };
  } catch {
    throw new UnauthorizedError('Session expirée ou jeton invalide. Veuillez vous reconnecter.');
  }
}

/**
 * Les refresh tokens sont des secrets opaques : seule leur empreinte SHA-256 est
 * stockee, ce qui rend une fuite de la base inexploitable pour se connecter.
 */
export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash: hashToken(token), expiresAt };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
