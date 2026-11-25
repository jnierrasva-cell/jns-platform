-- =============================================================================
-- JNS System — Workspace Financials & Cashflow module
-- Run in Supabase SQL Editor before deploying app code.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- organization_id = workspace (matches rest of platform).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. workspace_financial_access (CEO grants View / Edit)
-- role: 'view' | 'edit'
-- CEO always has implicit full access (no row required).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_financial_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('view', 'edit')),
  granted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_financial_access_org_idx
  ON public.workspace_financial_access (organization_id);

CREATE INDEX IF NOT EXISTS workspace_financial_access_user_idx
  ON public.workspace_financial_access (user_id);

COMMENT ON TABLE public.workspace_financial_access IS
  'Explicit Financials tab access. CEO always has access; others need a row.';

-- -----------------------------------------------------------------------------
-- 2. financial_recurring_items (master payables / payroll)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_recurring_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('salary', 'utility', 'rent', 'other')),
  default_amount numeric(14, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'biweekly', 'one_time')),
  due_day integer CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31)),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_recurring_items_org_active_idx
  ON public.financial_recurring_items (organization_id, is_active);

-- -----------------------------------------------------------------------------
-- 3. financial_monthly_entries (per-month checklist + snapshots)
-- When a period is opened for the first time, active recurring items are
-- snapshotted into unpaid rows. Past months are never rewritten when master
-- amounts change.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_monthly_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  period_month text NOT NULL, -- YYYY-MM
  recurring_item_id uuid REFERENCES public.financial_recurring_items (id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('salary', 'utility', 'rent', 'other')),
  expected_amount numeric(14, 2) NOT NULL DEFAULT 0,
  actual_amount numeric(14, 2),
  status text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid')),
  due_date date,
  paid_at timestamptz,
  paid_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_monthly_entries_org_period_idx
  ON public.financial_monthly_entries (organization_id, period_month);

CREATE INDEX IF NOT EXISTS financial_monthly_entries_org_status_idx
  ON public.financial_monthly_entries (organization_id, period_month, status);

-- -----------------------------------------------------------------------------
-- 4. financial_income_logs (monthly revenue)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_income_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  period_month text NOT NULL, -- YYYY-MM
  source_label text NOT NULL,
  amount numeric(14, 2) NOT NULL DEFAULT 0,
  notes text,
  logged_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_income_logs_org_period_idx
  ON public.financial_income_logs (organization_id, period_month);

-- -----------------------------------------------------------------------------
-- 5. updated_at triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_financial_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS financial_recurring_items_updated_at ON public.financial_recurring_items;
CREATE TRIGGER financial_recurring_items_updated_at
  BEFORE UPDATE ON public.financial_recurring_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_financial_updated_at();

DROP TRIGGER IF EXISTS financial_monthly_entries_updated_at ON public.financial_monthly_entries;
CREATE TRIGGER financial_monthly_entries_updated_at
  BEFORE UPDATE ON public.financial_monthly_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_financial_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Access helper (SQL) — CEO or explicit grant
-- Used by RLS policies.
--
-- Do NOT touch public.is_org_ceo(uuid) — it already exists and is referenced by
-- org_members / invites / connections / email_templates policies.
-- Only create has_financial_access (new to this module).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.has_financial_access(uuid, text);

CREATE OR REPLACE FUNCTION public.has_financial_access(org_id uuid, min_role text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members m
    WHERE m.organization_id = org_id
      AND m.user_id = auth.uid()
      AND m.role = 'ceo'
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_financial_access a
    WHERE a.organization_id = org_id
      AND a.user_id = auth.uid()
      AND (
        min_role = 'view'
        OR (min_role = 'edit' AND a.role = 'edit')
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.workspace_financial_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_recurring_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_monthly_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_income_logs ENABLE ROW LEVEL SECURITY;

-- Access table: members can read grants for their org; only CEO can write
DROP POLICY IF EXISTS financial_access_select ON public.workspace_financial_access;
CREATE POLICY financial_access_select ON public.workspace_financial_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = workspace_financial_access.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS financial_access_ceo_write ON public.workspace_financial_access;
CREATE POLICY financial_access_ceo_write ON public.workspace_financial_access
  FOR ALL
  USING (public.is_org_ceo(organization_id))
  WITH CHECK (public.is_org_ceo(organization_id));

-- Recurring items
DROP POLICY IF EXISTS financial_recurring_select ON public.financial_recurring_items;
CREATE POLICY financial_recurring_select ON public.financial_recurring_items
  FOR SELECT
  USING (public.has_financial_access(organization_id, 'view'));

DROP POLICY IF EXISTS financial_recurring_write ON public.financial_recurring_items;
CREATE POLICY financial_recurring_write ON public.financial_recurring_items
  FOR ALL
  USING (public.has_financial_access(organization_id, 'edit'))
  WITH CHECK (public.has_financial_access(organization_id, 'edit'));

-- Monthly entries
DROP POLICY IF EXISTS financial_entries_select ON public.financial_monthly_entries;
CREATE POLICY financial_entries_select ON public.financial_monthly_entries
  FOR SELECT
  USING (public.has_financial_access(organization_id, 'view'));

DROP POLICY IF EXISTS financial_entries_write ON public.financial_monthly_entries;
CREATE POLICY financial_entries_write ON public.financial_monthly_entries
  FOR ALL
  USING (public.has_financial_access(organization_id, 'edit'))
  WITH CHECK (public.has_financial_access(organization_id, 'edit'));

-- Income logs
DROP POLICY IF EXISTS financial_income_select ON public.financial_income_logs;
CREATE POLICY financial_income_select ON public.financial_income_logs
  FOR SELECT
  USING (public.has_financial_access(organization_id, 'view'));

DROP POLICY IF EXISTS financial_income_write ON public.financial_income_logs;
CREATE POLICY financial_income_write ON public.financial_income_logs
  FOR ALL
  USING (public.has_financial_access(organization_id, 'edit'))
  WITH CHECK (public.has_financial_access(organization_id, 'edit'));
