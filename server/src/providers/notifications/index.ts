import { env } from '../../config/env.js';
import { MockNotificationProvider } from './mock.provider.js';
import { WhatsAppCloudProvider } from './whatsapp-cloud.provider.js';
import type { NotificationProvider } from './types.js';

export * from './types.js';
export { MockNotificationProvider } from './mock.provider.js';

/** Fournisseur de secours : conserve la trace en base meme si l'API tierce tombe. */
const mock = new MockNotificationProvider();

const provider: NotificationProvider =
  env.NOTIFICATION_PROVIDER === 'whatsapp_cloud' ? new WhatsAppCloudProvider() : mock;

export function getNotificationProvider(): NotificationProvider {
  return provider;
}

/** Le simulateur reste accessible pour l'endpoint d'inspection de l'outbox. */
export function getMockNotificationProvider(): MockNotificationProvider {
  return mock;
}
