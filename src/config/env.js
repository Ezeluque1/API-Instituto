import 'dotenv/config';
import { z } from 'zod';

// Valida las variables de entorno al arrancar. Si falta algo, el proceso muere
// aca con un mensaje claro en vez de romper mas tarde con un `undefined`.
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Error en las variables de entorno (.env):');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isDev: raw.NODE_ENV === 'development',
  isProd: raw.NODE_ENV === 'production',
  // "*" queda tal cual; una lista separada por comas se convierte en array.
  corsOrigin:
    raw.CORS_ORIGIN === '*'
      ? '*'
      : raw.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
};

export default env;
