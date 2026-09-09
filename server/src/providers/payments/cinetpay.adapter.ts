import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider, PaymentStatus } from '@prisma/client';
import { env } from '../../config/env.js';
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentAdapter,
  PaymentStatusResult,
  WebhookEvent
} from './types.js';

const API_BASE = 'https://api-checkout.cinetpay.com/v2';

/**
 * CinetPay — agregateur couvrant Wave, Orange Money, MTN Money, Moov Money et
 * carte bancaire en Afrique de l'Ouest.
 *
 * Prerequis : CINETPAY_API_KEY, CINETPAY_SITE_ID et CINETPAY_SECRET_KEY
 * (ce dernier sert au HMAC des notifications). Le montant doit etre un multiple
 * de 5 en XOF, contrainte de l'operateur.
 */
export class CinetPayAdapter implements PaymentAdapter {
  readonly name: PaymentProvider = 'CINETPAY';

  private assertConfigured(): void {
    if (!env.CINETPAY_API_KEY || !env.CINETPAY_SITE_ID) {
      throw new Error(
        'CINETPAY_API_KEY et CINETPAY_SITE_ID doivent être renseignés pour utiliser CinetPay.'
      );
    }
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    this.assertConfigured();

    const response = await fetch(`${API_BASE}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: env.CINETPAY_API_KEY,
        site_id: env.CINETPAY_SITE_ID,
        transaction_id: input.reference,
        amount: roundToNearest5(input.amount),
        currency: input.currency,
        description: input.description,
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
        channels: 'ALL',
        customer_name: input.customer.name,
        customer_email: input.customer.email,
        customer_phone_number: input.customer.phone,
        metadata: JSON.stringify(input.metadata ?? {})
      }),
      signal: AbortSignal.timeout(15_000)
    });

    const json = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      data?: { payment_token?: string; payment_url?: string };
    };

    if (!response.ok || json.code !== '201') {
      throw new Error(`CinetPay a refusé la transaction : ${json.message ?? `HTTP ${response.status}`}`);
    }

    return {
      externalId: json.data?.payment_token ?? null,
      checkoutUrl: json.data?.payment_url ?? null,
      status: 'EN_COURS',
      raw: json
    };
  }

  async verify(reference: string): Promise<PaymentStatusResult> {
    this.assertConfigured();

    const response = await fetch(`${API_BASE}/payment/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: env.CINETPAY_API_KEY,
        site_id: env.CINETPAY_SITE_ID,
        transaction_id: reference
      }),
      signal: AbortSignal.timeout(15_000)
    });

    const json = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      data?: { status?: string };
    };

    return {
      status: mapStatus(json.data?.status, json.code),
      failureReason: json.code === '00' ? undefined : json.message,
      raw: json
    };
  }

  async parseWebhook(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookEvent | null> {
    const body = payload as Record<string, string | undefined> | null;
    if (!body?.cpm_trans_id) return null;

    // CinetPay signe la notification (HMAC-SHA256) dans l'en-tete x-token.
    if (env.CINETPAY_SECRET_KEY) {
      const received = firstHeader(headers['x-token']);
      if (!received || !this.isSignatureValid(body, received)) return null;
    }

    const status = mapStatus(body.cpm_result === '00' ? 'ACCEPTED' : 'REFUSED');

    return {
      reference: body.cpm_trans_id,
      externalId: body.payment_token ?? null,
      status,
      amount: body.cpm_amount ? Number(body.cpm_amount) : undefined,
      raw: payload
    };
  }

  /** Concatenation ordonnee imposee par CinetPay pour le calcul du HMAC. */
  private isSignatureValid(body: Record<string, string | undefined>, received: string): boolean {
    const fields = [
      'cpm_site_id',
      'cpm_trans_id',
      'cpm_trans_date',
      'cpm_amount',
      'cpm_currency',
      'signature',
      'payment_method',
      'cpm_phone_prefixe',
      'cel_phone_num',
      'cpm_language',
      'cpm_version',
      'cpm_payment_config',
      'cpm_page_action',
      'cpm_custom',
      'cpm_designation',
      'cpm_error_message'
    ];

    const data = fields.map((f) => body[f] ?? '').join('');
    const expected = createHmac('sha256', env.CINETPAY_SECRET_KEY as string)
      .update(data)
      .digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(received, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}

function firstHeader(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapStatus(status?: string, code?: string): PaymentStatus {
  if (code && code !== '00') return 'ECHOUE';
  switch (status) {
    case 'ACCEPTED':
      return 'REUSSI';
    case 'REFUSED':
      return 'ECHOUE';
    case 'PENDING':
    case 'WAITING_FOR_CUSTOMER':
      return 'EN_COURS';
    default:
      return 'EN_ATTENTE';
  }
}

/** Les montants XOF acceptes par les operateurs mobile money sont multiples de 5. */
function roundToNearest5(amount: number): number {
  return Math.round(amount / 5) * 5;
}
