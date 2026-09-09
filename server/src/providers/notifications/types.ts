import type { NotificationChannel } from '@prisma/client';

export interface OutboundMessage {
  channel: NotificationChannel;
  /** Numero WhatsApp/SMS au format international, ou adresse e-mail. */
  to: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
  providerMessageId: string | null;
  /** `true` si le fournisseur a accepte le message. */
  accepted: boolean;
  failureReason?: string;
}

/**
 * Contrat unique pour tous les canaux sortants. Basculer du simulateur vers
 * l'API WhatsApp Business ne demande que de changer NOTIFICATION_PROVIDER.
 */
export interface NotificationProvider {
  readonly name: string;
  supports(channel: NotificationChannel): boolean;
  send(message: OutboundMessage): Promise<DeliveryResult>;
}
