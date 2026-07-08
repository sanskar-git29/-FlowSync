//o your existing env.ts. requireEnv crashes the server at startup if a JWT secret is missing — better than a cryptic error at 3am when the first login fails.
import "dotenv/config";

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
  NODE_ENV: optionalEnv("NODE_ENV", "development") as
    | "development"
    | "production"
    | "test",
  PORT: parseInt(optionalEnv("PORT", "3000"), 10),

  // Database
  DB_HOST: requireEnv("DB_HOST"),
  DB_PORT: parseInt(requireEnv("DB_PORT"), 10),
  DB_NAME: requireEnv("DB_NAME"),
  DB_USER: requireEnv("DB_USER"),
  DB_PASSWORD: requireEnv("DB_PASSWORD"),

  // JWT — two separate secrets for access and refresh tokens
  // Using the same secret for both is a security mistake
  JWT_SECRET: requireEnv("JWT_SECRET") as string,
  JWT_EXPIRES_IN: optionalEnv("JWT_EXPIRES_IN", "15m") as string,
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET") as string,
  JWT_REFRESH_EXPIRES_IN: optionalEnv("JWT_REFRESH_EXPIRES_IN", "7d") as string,

  REDIS_HOST: requireEnv("REDIS_HOST"),
  REDIS_PORT: parseInt(requireEnv("REDIS_PORT"), 10),
  REDIS_PASSWORD: optionalEnv("REDIS_PASSWORD", ""),
  QUEUE_CONCURRENCY: parseInt(optionalEnv("QUEUE_CONCURRENCY", "5"), 10),
  QUEUE_MAX_ATTEMPTS: parseInt(optionalEnv("QUEUE_MAX_ATTEMPTS", "3"), 10),

  WS_PORT: parseInt(optionalEnv("WS_PORT", "4000"), 10),
} as const;

export type Env = typeof env;
