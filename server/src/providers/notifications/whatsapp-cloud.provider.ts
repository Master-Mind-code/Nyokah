import type { NotificationChannel } from '@prisma/client';
import { env } from '../../config/env.js';
import type { DeliveryResult, NotificationProvider, OutboundMessage } from './types.js';

/**
 * WhatsApp Business Cloud API (Meta Graph).
 * Renseignez WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_ACCESS_TOKEN puis passez
 * NOTIFICATION_PROVIDER=whatsapp_cloud.
 *
 * Note metier : hors fenetre de service client de 24 h, Meta n'accepte que les
 * modeles pre-approuves. Les messages transactionnels de Nyokah (confirmation,
 * affectation chauffeur) doivent donc etre declares comme templates dans le
 * Business Manager ; `templateName` permet de les cibler.
 */
export class WhatsAppCloudProvider implements NotificationProvider {
  readonly name = 'whatsapp_cloud';

  supports(channel: NotificationChannel): boolean {
    return channel === 'WHATSAPP';
  }

  async send(message: OutboundMessage): Promise<DeliveryResult> {
    if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      return {
        providerMessageId: null,
        accepted: false,
        failureReason:
          'WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_ACCESS_TOKEN doivent être configurés.'
      };
    }

    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const templateName = message.metadata?.templateName as string | undefined;

    const payload = templateName
      ? {
          messaging_product: 'whatsapp',
          to: normalizePhone(message.to),
          type: 'template',
          template: {
            name: templateName,
            language: { code: (message.metadata?.templateLang as string) ?? 'fr' },
            components: message.metadata?.templateComponents ?? []
          }
        }
      : {
          messaging_product: 'whatsapp',
          to: normalizePhone(message.to),
          type: 'text',
          text: { preview_url: false, body: message.body }
        };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000)
      });

      const json = (await response.json().catch(() => ({}))) as {
        messages?: Array<{ id: string }>;
        error?: { message?: string };
      };

      if (!response.ok) {
        return {
          providerMessageId: null,
          accepted: false,
          failureReason: json.error?.message ?? `HTTP ${response.status}`
        };
      }

      return { providerMessageId: json.messages?.[0]?.id ?? null, accepted: true };
    } catch (error) {
      return {
        providerMessageId: null,
        accepted: false,
        failureReason: error instanceof Error ? error.message : 'Erreur réseau inconnue'
      };
    }
  }
}

/** Meta attend un numero sans "+", sans espaces ni separateurs. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}
