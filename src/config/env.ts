//o your existing env.ts. requireEnv crashes the server at startup if a JWT secret is missing — better than a cryptic error at 3am when the first login fails.
import 'dotenv/config';
 
// Helper functions to read environment variables with type safety and defaults
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`[env] Missing required variable: ${key}`);
  return value;
} 
// For optional variables, we can provide a default value. This is useful for things like PORT or JWT expiration times.
function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development') as
    'development' | 'production' | 'test',
  PORT: parseInt(optionalEnv('PORT', '3000'), 10),

  // Database
  DB_HOST:     requireEnv('DB_HOST'),
  DB_PORT:     parseInt(requireEnv('DB_PORT'), 10),
  DB_NAME:     requireEnv('DB_NAME'),
  DB_USER:     requireEnv('DB_USER'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),

  // JWT — two separate secrets for access and refresh tokens
  // Using the same secret for both is a security mistake
  JWT_SECRET:             requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN:         optionalEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_SECRET:     requireEnv('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
} as const;

export type Env = typeof env;
