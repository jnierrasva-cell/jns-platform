-- =============================================================================
-- JNS System — Lemon Squeezy webhook event store (Phase 1)
-- Run in Supabase SQL Editor once. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'lemon_squeezy',
  -- Lemon delivers event name in meta.event_name; data.id is subscription id
  event_name text NOT NULL,
  event_id text NOT NULL,
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  subscription_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Provider timestamps when available (renews_at / ends_at / updated_at)
  provider_updated_at timestamptz,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Deduplicate deliveries (LS may retry the same event)
CREATE UNIQUE INDEX IF NOT EXISTS billing_webhook_events_provider_event_uidx
  ON public.billing_webhook_events (provider, event_id);

CREATE INDEX IF NOT EXISTS billing_webhook_events_org_idx
  ON public.billing_webhook_events (organization_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS billing_webhook_events_sub_idx
  ON public.billing_webhook_events (subscription_id, processed_at DESC);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
-- No client policies — service role only.
