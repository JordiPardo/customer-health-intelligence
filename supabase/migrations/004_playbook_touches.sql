-- Historical retention playbooks applied to accounts (input to the causal pipeline)
CREATE TABLE IF NOT EXISTS playbook_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  treatment TEXT NOT NULL,
  touched_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_touches_customer
  ON playbook_touches(customer_id);

ALTER TABLE playbook_touches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view playbook touches" ON playbook_touches;
CREATE POLICY "Members can view playbook touches"
  ON playbook_touches FOR SELECT
  USING (public.user_belongs_to_organization(public.customer_organization_id(customer_id)));

NOTIFY pgrst, 'reload schema';
