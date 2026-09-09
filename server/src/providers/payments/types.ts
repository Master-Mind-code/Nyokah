import type { PaymentProvider, PaymentStatus } from '@prisma/client';

export interface CheckoutInput {
  /** Reference interne du paiement (PAY-...), renvoyee telle quelle par le PSP. */
  reference: string;
  amount: number;
  currency: string;
  description: string;
  customer: { name: string; email: string; phone: string };
  /** Page du front ou l'utilisateur revient apres paiement. */
  returnUrl: string;
  /** Endpoint serveur a serveur recevant la confirmation. */
  notifyUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutResult {
  externalId: string | null;
  checkoutUrl: string | null;
  status: PaymentStatus;
  raw?: unknown;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  failureReason?: string;
  raw?: unknown;
}

export interface WebhookEvent {
  reference: string;
  externalId: string | null;
  status: PaymentStatus;
  amount?: number;
  raw: unknown;
}

/**
 * Contrat commun a tous les encaisseurs (mobile money, carte, virement).
 * Le domaine ne connait que cette interface : brancher Wave ou Orange Money
 * revient a ajouter une classe et une entree dans la fabrique.
 */
export interface PaymentAdapter {
  readonly name: PaymentProvider;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Verification serveur a serveur, seule source de verite avant encaissement. */
  verify(reference: string, externalId: string | null): Promise<PaymentStatusResult>;
  /**
   * Analyse et authentifie une notification entrante.
   * Retourne `null` si la signature est invalide : l'appelant repond alors 401.
   */
  parseWebhook(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookEvent | null>;
}
