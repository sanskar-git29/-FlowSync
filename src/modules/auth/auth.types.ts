
// What a full user row looks like from PostgreSQL
export interface User {
  id:           string;
  email:        string;
  passwordHash: string;
  role:         'user' | 'admin';
  createdAt:    Date;
  updatedAt:    Date;
}

// What we send back to the client (never expose password_hash)
export interface PublicUser {
  id:    string;
  email: string;
  role:  string;
}

// What's inside the JWT payload
// Keep this minimal — token size increases with payload
export interface JwtPayload {
  userId: string;  // the bridge to PostgreSQL
  iat?:   number;  // auto-added by jwt.sign()
  exp?:   number;  // auto-added based on expiresIn option
}

// What the client receives after login or register
export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

// Typed error codes — throw these from the service layer
// The error handler maps them to the right HTTP status codes
export const     AuthError = {
  EMAIL_TAKEN:         'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
} as const;

export type AuthErrorCode = typeof AuthError[keyof typeof AuthError];
