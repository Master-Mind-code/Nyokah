import 'dotenv/config';
import { z } from 'zod';

const booleanish = z
  .string()
  .transform((v) => ['1', 'true', 'yes', 'on'].includes(v.toLowerCase()));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requis'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET doit faire au moins 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET doit faire au moins 32 caracteres'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  VAT_RATE: z.coerce.number().min(0).max(1).default(0.18),
  CURRENCY: z.string().default('XOF'),

  NOTIFICATION_PROVIDER: z.enum(['mock', 'whatsapp_cloud']).default('mock'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v21.0'),

  EMAIL_PROVIDER: z.enum(['mock', 'smtp']).default('mock'),
  EMAIL_FROM: z.string().default('no-reply@nyokah.ci'),

  PAYMENT_PROVIDER: z.enum(['mock', 'cinetpay']).default('mock'),
  CINETPAY_API_KEY: z.string().optional(),
  CINETPAY_SITE_ID: z.string().optional(),
  CINETPAY_SECRET_KEY: z.string().optional(),
  PAYMENT_RETURN_URL: z.string().default('http://localhost:3000/paiement/retour'),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@nyokah.ci'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Nyokah@2026'),

  ENABLE_SWAGGER: booleanish.optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`\nConfiguration invalide. Verifiez votre fichier .env :\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const swaggerEnabled = env.ENABLE_SWAGGER ?? !isProduction;
