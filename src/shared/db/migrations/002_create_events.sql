
-- Migration: 002_create_events.sql

CREATE TABLE events (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(100)  NOT NULL,              -- e.g. 'user.signup', 'order.placed'
  payload    JSONB         NOT NULL DEFAULT '{}', -- flexible schema per event type
  status     VARCHAR(50)   NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Most common query: "give me all events for this user"
CREATE INDEX idx_events_user_id ON events(user_id);

-- For filtering by status across users (admin dashboard, workers)
CREATE INDEX idx_events_status ON events(status);

-- Composite: "give me pending events for user X, newest first"
-- This is the index your worker will use constantly in Phase 2
CREATE INDEX idx_events_user_status_created
  ON events(user_id, status, created_at DESC);

-- JSONB index — makes queries INTO the payload fast
-- e.g. WHERE payload @> '{"orderId": "123"}'
CREATE INDEX idx_events_payload ON events USING GIN(payload);

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
