-- Phase 1: niche kits + managed email reminders
-- Run in Supabase SQL editor before deploying the branch.

-- Organization niche + label map
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS label_map jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.niche IS 'starter kit key: studio | coach | agency | salon | home_services | clinic | general';
COMMENT ON COLUMN public.organizations.label_map IS 'UI label overrides e.g. {"contact":"Member","contacts":"Members"}';

-- Booking email tracking (managed reminders; no client Twilio)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_reminder_email_due_idx
  ON public.bookings (organization_id, starts_at)
  WHERE status = 'scheduled' AND reminder_email_sent_at IS NULL;
