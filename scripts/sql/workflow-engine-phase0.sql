-- =============================================================================
-- JNS System — Workflow / Automation Engine (Phase 0)
-- Run in Supabase SQL Editor before relying on app code.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workflows_org_key_uidx
  ON public.workflows (organization_id, key)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workflows_system_key_uidx
  ON public.workflows (key)
  WHERE organization_id IS NULL AND is_system = true;

CREATE INDEX IF NOT EXISTS workflows_org_status_idx
  ON public.workflows (organization_id, status)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS workflows_trigger_idx
  ON public.workflows (trigger_type, status);

CREATE TABLE IF NOT EXISTS public.workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version)
);

CREATE INDEX IF NOT EXISTS workflow_versions_workflow_idx
  ON public.workflow_versions (workflow_id, version DESC);

CREATE TABLE IF NOT EXISTS public.domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  type text NOT NULL,
  entity_type text,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS domain_events_org_created_idx
  ON public.domain_events (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS domain_events_org_type_idx
  ON public.domain_events (organization_id, type, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS domain_events_org_idem_uidx
  ON public.domain_events (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.workflow_versions (id) ON DELETE SET NULL,
  trigger_event text NOT NULL,
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'waiting', 'completed', 'failed', 'cancelled')),
  idempotency_key text,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS workflow_runs_org_started_idx
  ON public.workflow_runs (organization_id, started_at DESC);

CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx
  ON public.workflow_runs (workflow_id, started_at DESC);

CREATE INDEX IF NOT EXISTS workflow_runs_status_idx
  ON public.workflow_runs (organization_id, status)
  WHERE status IN ('running', 'waiting');

CREATE UNIQUE INDEX IF NOT EXISTS workflow_runs_org_idem_uidx
  ON public.workflow_runs (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.workflow_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.workflow_runs (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  node_id text NOT NULL,
  action_key text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  attempt int NOT NULL DEFAULT 1,
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS workflow_run_steps_run_idx
  ON public.workflow_run_steps (run_id, started_at);

CREATE TABLE IF NOT EXISTS public.workflow_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.workflow_runs (id) ON DELETE CASCADE,
  node_id text NOT NULL,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'locked', 'done', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  locked_at timestamptz,
  locked_by text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_jobs_due_idx
  ON public.workflow_jobs (status, run_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS workflow_jobs_run_idx
  ON public.workflow_jobs (run_id);

CREATE TABLE IF NOT EXISTS public.workflow_idempotency (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  key text NOT NULL,
  run_id uuid REFERENCES public.workflow_runs (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, key)
);

CREATE OR REPLACE FUNCTION public.set_workflows_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workflows_set_updated_at ON public.workflows;
CREATE TRIGGER workflows_set_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workflows_updated_at();

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflows_select_member ON public.workflows;
CREATE POLICY workflows_select_member ON public.workflows
  FOR SELECT
  USING (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = workflows.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflows_write_manager ON public.workflows;
CREATE POLICY workflows_write_manager ON public.workflows
  FOR ALL
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = workflows.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('ceo', 'admin')
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = workflows.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS workflow_versions_select_member ON public.workflow_versions;
CREATE POLICY workflow_versions_select_member ON public.workflow_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          w.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.org_members m
            WHERE m.organization_id = w.organization_id
              AND m.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS domain_events_select_member ON public.domain_events;
CREATE POLICY domain_events_select_member ON public.domain_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = domain_events.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_runs_select_member ON public.workflow_runs;
CREATE POLICY workflow_runs_select_member ON public.workflow_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = workflow_runs.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_run_steps_select_member ON public.workflow_run_steps;
CREATE POLICY workflow_run_steps_select_member ON public.workflow_run_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = workflow_run_steps.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_jobs_select_manager ON public.workflow_jobs;
CREATE POLICY workflow_jobs_select_manager ON public.workflow_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = workflow_jobs.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS workflow_idempotency_select_manager ON public.workflow_idempotency;
CREATE POLICY workflow_idempotency_select_manager ON public.workflow_idempotency
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = workflow_idempotency.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('ceo', 'admin')
    )
  );
