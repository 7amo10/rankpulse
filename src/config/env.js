import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3030').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('dev-rankpulse-secret-key-999-secure'),
  GEMINI_API_KEY: z.string().optional(),
  CACHE_TTL_SECONDS: z.string().default('3600').transform((val) => parseInt(val, 10)),
  DB_PATH: z.string().default('rankpulse.db')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;
export default config;
