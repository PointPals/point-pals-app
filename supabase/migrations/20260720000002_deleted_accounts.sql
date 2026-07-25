-- =============================================================================
-- Re-registration block — prevent trial abuse after account deletion
-- =============================================================================
-- When a user deletes their account, we record their email so that if they
-- try to sign up again, they get an immediate subscription wall instead of
-- another free trial.
--
-- Apple Guideline 5.1.1(v) is satisfied: the user truly deletes their data
-- (auth user deleted, household cascade). They CAN re-register — they just
-- don't get a second trial.
-- =============================================================================

-- 1. Table to track deleted accounts
create table if not exists public.deleted_accounts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  household_id uuid,
  had_trial   boolean not null default false,
  deleted_at  timestamptz not null default now(),
  restored_at timestamptz  -- set when support re-activates the account
);

-- Index for fast lookups on sign-up
create index if not exists idx_deleted_accounts_email on public.deleted_accounts (email);

comment on table public.deleted_accounts is
  'Emails of users who deleted their accounts — used to deny a second free trial on re-sign-up';
