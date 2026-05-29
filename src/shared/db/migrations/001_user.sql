
-- Migration: 001_create_users.sql
-- Run once. Never edit after applying. Add a new migration to change schema.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- enables uuid_generate_v4()

CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(50)   NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  is_verified   BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Unique index on email — enforces no duplicate accounts
-- Also makes WHERE email = $1 lookups fast (O(log n) not O(n))
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- For admin queries like "show me recently registered users"
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
