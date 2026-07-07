-- Track errors from Gemini API calls (icon upload/generation) for alerting
-- and debugging. Used by the upload-icon and generate-icon edge functions and
-- by the monthly spend-cap alert cron.

create table if not exists public.icon_generation_errors (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  household_id  uuid references public.households(id) on delete set null,
  function_name text not null,          -- 'upload-icon' or 'generate-icon'
  error_type    text not null,          -- 'quota_exceeded', 'invalid_key', 'model_not_found', 'gemini_error', 'general'
  error_message text not null,
  http_status   int,                    -- HTTP status from Gemini API
  raw_response  text,                   -- raw error body from Gemini (truncated)
  acknowledged  boolean not null default false  -- set to true when admin has been notified
);

-- Index for quick "unacknowledged errors" queries
create index if not exists idx_icon_gen_errors_unacked
  on public.icon_generation_errors (acknowledged, created_at desc)
  where acknowledged = false;

-- Enable RLS (service_role only — no public access)
alter table public.icon_generation_errors enable row level security;
