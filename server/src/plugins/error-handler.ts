import { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { isProduction } from '../config/env.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

function build(code: string, message: string, requestId: string, details?: unknown): ErrorBody {
  return { error: { code, message, requestId, ...(details ? { details } : {}) } };
}

/** Traduit les codes d'erreur Prisma en reponses HTTP explicites. */
function fromPrisma(
  error: Prisma.PrismaClientKnownRequestError,
  requestId: string
): { status: number; body: ErrorBody } | null {
  const target = (error.meta?.target as string[] | string | undefined) ?? [];
  const fields = Array.isArray(target) ? target.join(', ') : String(target);

  switch (error.code) {
    case 'P2002':
      return {
        status: 409,
        body: build(
          'DUPLICATE',
          `Cette valeur existe déjà${fields ? ` pour : ${fields}` : ''}.`,
          requestId,
          { fields: target }
        )
      };
    case 'P2003':
      return {
        status: 409,
        body: build(
          'FOREIGN_KEY_CONSTRAINT',
          'Cette opération référence un enregistrement inexistant ou encore lié à d’autres données.',
          requestId
        )
      };
    case 'P2025':
      return {
        status: 404,
        body: build('NOT_FOUND', 'Ressource introuvable.', requestId)
      };
    default:
      return null;
  }
}

export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply
      .status(404)
      .send(
        build(
          'ROUTE_NOT_FOUND',
          `Route ${request.method} ${request.url} introuvable.`,
          request.id
        )
      );
  });

  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof AppError) {
      if (error.statusCode >= 500) request.log.error({ err: error }, error.message);
      return reply
        .status(error.statusCode)
        .send(build(error.code, error.message, requestId, error.details));
    }

    if (error instanceof ZodError) {
      return reply.status(422).send(
        build(
          'VALIDATION_ERROR',
          'Les données fournies sont invalides.',
          requestId,
          error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
        )
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = fromPrisma(error, requestId);
      if (mapped) return reply.status(mapped.status).send(mapped.body);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      request.log.error({ err: error }, 'Requête Prisma invalide');
      return reply
        .status(400)
        .send(build('BAD_REQUEST', 'Requête invalide vers la base de données.', requestId));
    }

    // Erreurs levees par Fastify lui-meme (rate limit, payload trop grand, JSON malforme...)
    const fastifyError = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = fastifyError.statusCode ?? 500;

    // Les messages de Fastify sont en anglais et peu parlants : on traduit ceux
    // qu'un utilisateur peut reellement declencher.
    const FASTIFY_MESSAGES: Record<string, string> = {
      FST_ERR_CTP_BODY_TOO_LARGE:
        'Le contenu envoyé est trop volumineux. Réduisez la taille de la photo (2 Mo maximum recommandé).',
      FST_ERR_CTP_INVALID_MEDIA_TYPE: 'Type de contenu non pris en charge.',
      FST_ERR_CTP_EMPTY_JSON_BODY: 'Le corps de la requête est vide.'
    };

    const message =
      (fastifyError.code ? FASTIFY_MESSAGES[fastifyError.code] : undefined) ??
      fastifyError.message ??
      'Erreur inattendue.';

    if (statusCode < 500) {
      return reply
        .status(statusCode)
        .send(build(fastifyError.code ?? 'BAD_REQUEST', message, requestId));
    }

    request.log.error({ err: error }, 'Erreur interne non gérée');
    return reply
      .status(500)
      .send(
        build(
          'INTERNAL_SERVER_ERROR',
          isProduction
            ? 'Une erreur interne est survenue. Notre équipe technique a été notifiée.'
            : message,
          requestId
        )
      );
  });
});
