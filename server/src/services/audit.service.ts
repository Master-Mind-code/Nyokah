import type { FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';

/** Champs jamais persistes dans le journal d'audit. */
const REDACTED_KEYS = new Set(['password', 'passwordHash', 'token', 'tokenHash', 'refreshToken']);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      REDACTED_KEYS.has(k) ? '[REDACTED]' : redact(v)
    ])
  );
}

export interface AuditInput {
  request?: FastifyRequest;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/**
 * Trace une action sensible. Volontairement non bloquant : une panne du journal
 * ne doit jamais faire echouer une reservation.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  const user = input.request?.user ?? null;

  try {
    await prisma.auditLog.create({
      data: {
        actorId: user?.id ?? null,
        actorEmail: user?.email ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: input.before ? (redact(input.before) as object) : undefined,
        after: input.after ? (redact(input.after) as object) : undefined,
        ip: input.request?.ip ?? null,
        userAgent: (input.request?.headers['user-agent'] as string | undefined) ?? null
      }
    });
  } catch (error) {
    input.request?.log.warn({ err: error }, "Echec d'ecriture du journal d'audit");
  }
}
