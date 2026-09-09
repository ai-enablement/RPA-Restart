CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS rpa_restart;
COMMENT ON SCHEMA rpa_restart IS 'RPA Restart application data';
REVOKE CREATE ON SCHEMA rpa_restart FROM PUBLIC;

CREATE TABLE IF NOT EXISTS rpa_restart.app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_user_email_unique UNIQUE (email),
  CONSTRAINT app_user_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE IF NOT EXISTS rpa_restart.rpa_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  flow_webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rpa_restart.user_rpa_access (
  user_id uuid NOT NULL REFERENCES rpa_restart.app_user(id) ON DELETE CASCADE,
  rpa_task_id uuid NOT NULL REFERENCES rpa_restart.rpa_task(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, rpa_task_id)
);

CREATE TABLE IF NOT EXISTS rpa_restart.flow_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rpa_task_id uuid NOT NULL REFERENCES rpa_restart.rpa_task(id),
  requested_by uuid NOT NULL REFERENCES rpa_restart.app_user(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  detail text
);

CREATE INDEX IF NOT EXISTS flow_run_user_requested_idx
  ON rpa_restart.flow_run (requested_by, requested_at DESC);
CREATE INDEX IF NOT EXISTS flow_run_task_requested_idx
  ON rpa_restart.flow_run (rpa_task_id, requested_at DESC);

INSERT INTO rpa_restart.app_user (email, display_name, role)
VALUES
  ('hyebin.park@changshininc.com', 'Hyebin Park', 'admin'),
  ('rpa100@changshininc.com', 'RPA Admin', 'admin')
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    is_active = true;

-- Example setup:
-- INSERT INTO rpa_restart.app_user (email, display_name) VALUES ('user@company.com', '홍길동');
-- INSERT INTO rpa_restart.rpa_task (name, description, category) VALUES ('SAP 재고 갱신', '재고 데이터를 갱신합니다.', 'Supply Chain');
-- INSERT INTO rpa_restart.user_rpa_access (user_id, rpa_task_id)
-- SELECT u.id, r.id FROM rpa_restart.app_user u CROSS JOIN rpa_restart.rpa_task r
-- WHERE u.email = 'user@company.com' AND r.name = 'SAP 재고 갱신';
