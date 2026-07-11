CREATE TABLE workflows (
  id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(255) NOT NULL,
  trigger_event_type VARCHAR(100) NOT NULL,
  is_active          BOOLEAN      NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflows_user_id   ON workflows(user_id);
CREATE INDEX idx_workflows_active    ON workflows(user_id, trigger_event_type) WHERE is_active = true;

CREATE TABLE workflow_steps (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  position    INTEGER     NOT NULL,
  type        VARCHAR(50) NOT NULL CHECK (type IN ('webhook','delay','condition','email')),
  config      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_id, position)
);

CREATE INDEX idx_workflow_steps_wf ON workflow_steps(workflow_id, position);

CREATE TABLE workflow_runs (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id  UUID        NOT NULL REFERENCES workflows(id),
  event_id     UUID        NOT NULL REFERENCES events(id),
  status       VARCHAR(50) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','running','completed','failed')),
  current_step INTEGER     NOT NULL DEFAULT 1,
  context      JSONB       NOT NULL DEFAULT '{}',
  error        TEXT,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_runs_wf     ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);

CREATE TABLE workflow_step_runs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_run_id UUID        NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id         UUID        NOT NULL REFERENCES workflow_steps(id),
  position        INTEGER     NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','completed','failed','skipped')),
  input           JSONB       NOT NULL DEFAULT '{}',
  output          JSONB,
  error           TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_step_runs_wf_run ON workflow_step_runs(workflow_run_id);