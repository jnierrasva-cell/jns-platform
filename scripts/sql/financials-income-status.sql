-- =============================================================================
-- JNS System — Income pending vs collected (Phase 3)
-- Run in Supabase SQL Editor once. Safe to re-run.
-- =============================================================================

ALTER TABLE public.financial_income_logs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid';

ALTER TABLE public.financial_income_logs
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Constrain status values (drop+add so re-runs stay idempotent)
DO $$
BEGIN
  ALTER TABLE public.financial_income_logs
    DROP CONSTRAINT IF EXISTS financial_income_logs_status_check;
  ALTER TABLE public.financial_income_logs
    ADD CONSTRAINT financial_income_logs_status_check
    CHECK (status IN ('paid', 'pending'));
END $$;

CREATE INDEX IF NOT EXISTS financial_income_logs_org_period_status_idx
  ON public.financial_income_logs (organization_id, period_month, status);

-- Backfill from legacy notes markers written before this column existed
UPDATE public.financial_income_logs
SET status = 'pending'
WHERE status = 'paid'
  AND notes IS NOT NULL
  AND notes ILIKE '%[status:pending]%';
