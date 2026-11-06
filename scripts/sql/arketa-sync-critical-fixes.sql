-- Run in Supabase SQL editor (or migration) once.
-- Safe / idempotent adds for Arketa sync critical fixes.

-- Surface richer sync health on locations
alter table public.arketa_locations
  add column if not exists last_sync_error text,
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists timezone text default 'America/Los_Angeles';

-- Google connection re-auth flag (invalid_grant / revoked refresh)
alter table public.connections
  add column if not exists needs_reauth boolean not null default false,
  add column if not exists last_auth_error text;

comment on column public.arketa_locations.timezone is
  'IANA timezone for Google Calendar event times (e.g. America/Los_Angeles)';
comment on column public.arketa_locations.consecutive_failures is
  'Incremented on failed syncs; reset to 0 on success';
comment on column public.connections.needs_reauth is
  'True when refresh token is invalid; user must reconnect Google';
