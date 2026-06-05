
import bcrypt    from 'bcrypt';
import jwt       from 'jsonwebtoken';
import { pool }  from '../../shared/db/pool.js';
import { env }   from '../../config/env.js';
import { AuthError, type AuthTokens, type JwtPayload }
  from './auth.types.js';

// Cost factor 12 = ~300ms per hash on modern hardware
// This is intentionally slow to defeat brute-force attacks
// Every doubling of cost factor doubles the attack cost
const SALT_ROUNDS = 12;

export async function register(
  email: string,
  password: string,
){
  const normalized = email.toLowerCase().trim();

  // Check uniqueness BEFORE hashing — don't waste 300ms on a dupe
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [normalized]
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw new Error(AuthError.EMAIL_TAKEN);
  }

  // bcrypt.hash salts + hashes the password
  // The salt is embedded in the output — no need to store it separately
  // Output: $2b$12$[22-char-salt][31-char-hash]
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id`,
    [normalized, passwordHash]
  );

  const user = result.rows[0] as { id: string };
  return generateTokens(user.id);
}

export async function login(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const normalized = email.toLowerCase().trim();

  const result = await pool.query(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [normalized]
  );

  const user = result.rows[0] as
    | { id: string; password_hash: string }
    | undefined;

  // ─────────────────────────────────────────────────────────
  // TIMING ATTACK PREVENTION — this is critical security code
  // ─────────────────────────────────────────────────────────
  // Without this: login with unknown email returns instantly
  // login with known email takes ~300ms (bcrypt time)
  // An attacker can enumerate valid emails by measuring response time
  // Fix: ALWAYS run bcrypt.compare, even for non-existent users
  const DUMMY = '$2b$12$notavalidhashbutstillruns.compare.at.same.speed';
  const hashToCheck = user?.password_hash ?? DUMMY;
  const isValid = await bcrypt.compare(password, hashToCheck);

  if (!user || !isValid) {
    throw new Error(AuthError.INVALID_CREDENTIALS);
  }

  return generateTokens(user.id);
}

export function generateTokens(userId: string): AuthTokens {
  const payload = { userId };

  // Access token — short window, used on every request
  const accessToken = jwt.sign(
    payload, 
    env.JWT_SECRET, 
    {
    expiresIn: env.JWT_EXPIRES_IN, // '15m'
  });  

  // Refresh token — longer window, only used to rotate tokens
  // Uses a DIFFERENT secret — if one leaks, the other is still safe
  const refreshToken = jwt.sign(
    payload, 
    env.JWT_REFRESH_SECRET, 
    {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN, // '7d
    }
);

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload {
  // Throws TokenExpiredError or JsonWebTokenError — handle in middleware
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}
