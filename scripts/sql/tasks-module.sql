-- =============================================================================
-- JNS System — Task Management & Team Productivity module
-- Run this entire script in the Supabase SQL Editor before deploying the app code.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. tasks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  start_date date,
  due_date date,
  contact_id uuid REFERENCES public.contacts (id) ON DELETE SET NULL,
  external_url text,
  project_name text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  last_follow_up_at timestamptz,
  last_follow_up_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_org_status_idx
  ON public.tasks (organization_id, status);

CREATE INDEX IF NOT EXISTS tasks_org_due_idx
  ON public.tasks (organization_id, due_date)
  WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS tasks_org_created_idx
  ON public.tasks (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tasks_contact_idx
  ON public.tasks (contact_id)
  WHERE contact_id IS NOT NULL;

COMMENT ON TABLE public.tasks IS 'Organization tasks for team productivity';
COMMENT ON COLUMN public.tasks.project_name IS 'Optional free-text project label (no separate projects table in v1)';

-- -----------------------------------------------------------------------------
-- 2. task_assignees (many-to-many)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS task_assignees_user_idx
  ON public.task_assignees (organization_id, user_id);

CREATE INDEX IF NOT EXISTS task_assignees_task_idx
  ON public.task_assignees (task_id);

-- -----------------------------------------------------------------------------
-- 3. task_comments (progress updates / remarks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_comments_task_idx
  ON public.task_comments (task_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. task_activity (audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_activity_task_idx
  ON public.task_activity (task_id, created_at DESC);

COMMENT ON COLUMN public.task_activity.action IS
  'created | assigned | unassigned | status_changed | priority_changed | comment | follow_up | updated | deleted';

-- -----------------------------------------------------------------------------
-- 5. task_attachments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_attachments_task_idx
  ON public.task_attachments (task_id);

-- -----------------------------------------------------------------------------
-- 6. updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tasks_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select_member ON public.tasks;
CREATE POLICY tasks_select_member ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = tasks.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tasks_insert_member ON public.tasks;
CREATE POLICY tasks_insert_member ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = tasks.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tasks_update_member ON public.tasks;
CREATE POLICY tasks_update_member ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = tasks.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tasks_delete_manager ON public.tasks;
CREATE POLICY tasks_delete_manager ON public.tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = tasks.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS task_assignees_select_member ON public.task_assignees;
CREATE POLICY task_assignees_select_member ON public.task_assignees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_assignees.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS task_assignees_write_member ON public.task_assignees;
CREATE POLICY task_assignees_write_member ON public.task_assignees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_assignees.organization_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_assignees.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS task_comments_select_member ON public.task_comments;
CREATE POLICY task_comments_select_member ON public.task_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_comments.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS task_comments_insert_member ON public.task_comments;
CREATE POLICY task_comments_insert_member ON public.task_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_comments.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS task_activity_select_member ON public.task_activity;
CREATE POLICY task_activity_select_member ON public.task_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_activity.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS task_activity_insert_member ON public.task_activity;
CREATE POLICY task_activity_insert_member ON public.task_activity
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_activity.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS task_attachments_select_member ON public.task_attachments;
CREATE POLICY task_attachments_select_member ON public.task_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_attachments.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS task_attachments_write_member ON public.task_attachments;
CREATE POLICY task_attachments_write_member ON public.task_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_attachments.organization_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = task_attachments.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- Storage bucket (optional; create in Dashboard if this insert is blocked)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
