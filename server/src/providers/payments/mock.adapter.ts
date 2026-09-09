import { randomUUID } from 'node:crypto';
import type { PaymentProvider } from '@prisma/client';
import { env } from '../../config/env.js';
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentAdapter,
  PaymentStatusResult,
  WebhookEvent
} from './types.js';

/**
 * Simulateur d'encaissement. Le lien de paiement pointe vers l'endpoint
 * POST /api/v1/payments/:reference/simulate, qui permet de rejouer un succes
 * ou un echec sans compte marchand.
 */
export class MockPaymentAdapter implements PaymentAdapter {
  readonly name: PaymentProvider = 'MOCK';

  private readonly pending = new Map<string, { amount: number; externalId: string }>();

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const externalId = `mock_${randomUUID()}`;
    this.pending.set(input.reference, { amount: input.amount, externalId });

    return {
      externalId,
      checkoutUrl: `${env.API_URL}/api/v1/payments/${input.reference}/simulate`,
      status: 'EN_COURS',
      raw: { simulated: true, amount: input.amount, currency: input.currency }
    };
  }

  async verify(reference: string): Promise<PaymentStatusResult> {
    const record = this.pending.get(reference);
    return {
      status: record ? 'EN_COURS' : 'EN_ATTENTE',
      raw: { simulated: true, reference }
    };
  }

  async parseWebhook(payload: unknown): Promise<WebhookEvent | null> {
    const body = payload as { reference?: string; status?: string; amount?: number } | null;
    if (!body?.reference) return null;

    const succeeded = body.status !== 'failed' && body.status !== 'ECHOUE';

    return {
      reference: body.reference,
      externalId: this.pending.get(body.reference)?.externalId ?? null,
      status: succeeded ? 'REUSSI' : 'ECHOUE',
      amount: body.amount,
      raw: payload
    };
  }
}
