-- Performance indexes for contact / pipeline / note mutations and list views.
-- Safe to re-run (IF NOT EXISTS). Apply in Supabase SQL editor.

-- Contacts: org-scoped lists ordered by created/updated, stage filter, email dedupe.
CREATE INDEX IF NOT EXISTS contacts_org_created_idx
  ON public.contacts (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contacts_org_updated_idx
  ON public.contacts (organization_id, updated_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS contacts_org_stage_idx
  ON public.contacts (organization_id, pipeline_stage_id);

CREATE INDEX IF NOT EXISTS contacts_org_email_lower_idx
  ON public.contacts (organization_id, lower(email));

-- Notes and activity by contact (detail page).
CREATE INDEX IF NOT EXISTS contact_notes_contact_created_idx
  ON public.contact_notes (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS email_activity_contact_created_idx
  ON public.email_activity (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bookings_contact_starts_idx
  ON public.bookings (contact_id, starts_at DESC);

-- Pipeline stages ordered by position within org.
CREATE INDEX IF NOT EXISTS pipeline_stages_org_position_idx
  ON public.pipeline_stages (organization_id, position);

-- Domain events / workflow routing (emit is sync write, route is after()).
CREATE INDEX IF NOT EXISTS domain_events_org_type_created_idx
  ON public.domain_events (organization_id, type, created_at DESC);
