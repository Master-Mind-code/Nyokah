/**
 * Erreurs applicatives. Toutes portent un code stable, exploitable cote client,
 * et un message deja redige en francais pour l'utilisateur final.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requete invalide.', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Les donnees fournies sont invalides.') {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentification requise.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Vous n'avez pas les droits necessaires pour cette action.") {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Ressource') {
    super(404, 'NOT_FOUND', `${resource} introuvable.`);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit avec l etat actuel de la ressource.', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, 'UNPROCESSABLE', message, details);
  }
}
