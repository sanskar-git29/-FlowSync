import 'dotenv/config';    // loads .env file into process.env

// A small typed validator — no extra library needed
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    // crash immediately with a helpful message
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// This object is the single source of truth for all config.
// Import { env } everywhere — never process.env directly.
export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development') as
    'development' | 'production' | 'test',

  PORT: parseInt(optionalEnv('PORT', '3000'), 10),

  // These throw at startup if missing — fail fast
  DB_HOST:     requireEnv('DB_HOST'),
  DB_PORT:     parseInt(requireEnv('DB_PORT'), 10),
  DB_NAME:     requireEnv('DB_NAME'),
  DB_USER:     requireEnv('DB_USER'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),

  JWT_SECRET:  requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '15m'),
} as const;           // as const → all values are readonly

// Export the type so you can use it in other files
export type Env = typeof env;