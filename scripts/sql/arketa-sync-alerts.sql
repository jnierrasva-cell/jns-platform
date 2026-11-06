-- Optional columns for failure-alert dedupe and cron observability.
-- Safe to run multiple times.

alter table public.arketa_locations
  add column if not exists last_failure_alert_at timestamptz;

-- Global cron heartbeat (single-row style key/value if you prefer a settings table later).
-- For now we store last successful cron finish on each location via last_synced_at;
-- this optional table tracks platform-wide cron runs.
create table if not exists public.system_cron_runs (
  job text primary key,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_ok boolean,
  last_summary jsonb,
  updated_at timestamptz default now()
);
