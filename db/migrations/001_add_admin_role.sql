BEGIN;

ALTER TABLE rpa_restart.app_user
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'rpa_restart.app_user'::regclass
      AND conname = 'app_user_role_check'
  ) THEN
    ALTER TABLE rpa_restart.app_user
      ADD CONSTRAINT app_user_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

INSERT INTO rpa_restart.app_user (email, display_name, role)
VALUES
  ('hyebin.park@changshininc.com', 'Hyebin Park', 'admin'),
  ('rpa100@changshininc.com', 'RPA Admin', 'admin')
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    is_active = true;

COMMIT;
