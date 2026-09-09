ALTER TABLE rpa_restart.flow_run
  ADD COLUMN IF NOT EXISTS trigger_type text NOT NULL DEFAULT 'restart';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flow_run_trigger_type_check'
      AND conrelid = 'rpa_restart.flow_run'::regclass
  ) THEN
    ALTER TABLE rpa_restart.flow_run ADD CONSTRAINT flow_run_trigger_type_check
      CHECK (trigger_type IN ('restart', 'schedule'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS flow_run_trigger_type_requested_idx
  ON rpa_restart.flow_run (trigger_type, requested_at DESC);
