-- Phase 5: link experiments to playbook treatments and segments
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS treatment TEXT,
  ADD COLUMN IF NOT EXISTS segment TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_experiments_organization_id
  ON experiments(organization_id);
