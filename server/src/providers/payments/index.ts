import { env } from '../../config/env.js';
import { CinetPayAdapter } from './cinetpay.adapter.js';
import { MockPaymentAdapter } from './mock.adapter.js';
import type { PaymentAdapter } from './types.js';

export * from './types.js';

const adapter: PaymentAdapter =
  env.PAYMENT_PROVIDER === 'cinetpay' ? new CinetPayAdapter() : new MockPaymentAdapter();

export function getPaymentAdapter(): PaymentAdapter {
  return adapter;
}
