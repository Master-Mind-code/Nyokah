import { randomUUID } from 'node:crypto';
import type { NotificationChannel } from '@prisma/client';
import type { DeliveryResult, NotificationProvider, OutboundMessage } from './types.js';

/**
 * Fournisseur de developpement : n'appelle aucune API externe, journalise le
 * message et conserve les 200 derniers envois pour inspection via
 * GET /api/v1/notifications/outbox (utile pour les demos et les tests E2E).
 */
export class MockNotificationProvider implements NotificationProvider {
  readonly name = 'mock';

  private readonly outbox: Array<OutboundMessage & { sentAt: string; id: string }> = [];

  supports(_channel: NotificationChannel): boolean {
    return true;
  }

  async send(message: OutboundMessage): Promise<DeliveryResult> {
    const id = randomUUID();
    this.outbox.unshift({ ...message, id, sentAt: new Date().toISOString() });
    if (this.outbox.length > 200) this.outbox.length = 200;
    return { providerMessageId: `mock_${id}`, accepted: true };
  }

  getOutbox(limit = 50) {
    return this.outbox.slice(0, limit);
  }

  clearOutbox(): void {
    this.outbox.length = 0;
  }
}
