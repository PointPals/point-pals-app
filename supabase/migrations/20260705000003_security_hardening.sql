-- =============================================================================
-- PointPals — Security hardening migration
-- Target: Supabase Dashboard SQL Editor
-- =============================================================================
-- Addresses:
--   1. Memories bucket: add missing UPDATE policy
--   2. Assets bucket: restrict uploads to authenticated household members
--   3. Support messages: require auth + enforce user_id + rate limit
--   4. SECURITY DEFINER functions: revoke public EXECUTE, add SET search_path
--   5. Function search path: add WHERE missing
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Memories bucket: add UPDATE policy (was missing)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Users need to be able to update memory records (e.g. rotate a photo,
-- change description). Policy mirrors SELECT/INSERT/DELETE rules:
-- authenticated + member of the household whose ID is in the folder path.

drop policy if exists memories_update on storage.objects;
create policy memories_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'memories'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Assets bucket: restrict uploads to household members
-- ═══════════════════════════════════════════════════════════════════════════════
-- The assets bucket is public (anyone can read icons via CDN), but INSERT was
-- open to ALL authenticated users. Narrow it to users who are members of at
-- least one household.

drop policy if exists assets_insert on storage.objects;
create policy assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'assets'
    and exists (
      select 1 from public.household_members
      where user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Support messages: require auth + enforce user_id
-- ═══════════════════════════════════════════════════════════════════════════════
-- Current policy allows ANY anon user to insert with check (true).
-- This permits unlimited spam with forged emails.

-- First, restrict INSERT to authenticated users only
revoke insert on public.support_messages from anon;

drop policy if exists "anyone can submit a support message" on public.support_messages;
create policy "authenticated users can submit support messages"
  on public.support_messages
  for insert
  to authenticated
  with check (
    -- Enforce that user_id matches the authenticated user
    user_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Assets bucket: restrict object listing to authenticated users only
-- ═══════════════════════════════════════════════════════════════════════════════
-- The assets bucket is public (files accessible via CDN URLs), but the SELECT
-- policy allowed anon to LIST all objects (bucket enumeration). Files still
-- work via direct CDN URLs without this policy.

drop policy if exists assets_select on storage.objects;
create policy assets_select on storage.objects
  for select to authenticated
  using (bucket_id = 'assets');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Revoke public EXECUTE on SECURITY DEFINER functions
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  func RECORD;
BEGIN
  FOR func IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('public', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM public, anon;', func.proname, func.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated;', func.proname, func.args);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Add SET search_path to any SECURITY DEFINER function missing it
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  func RECORD;
  def TEXT;
BEGIN
  FOR func IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    def := pg_get_functiondef(func.oid);
    IF def !~* 'SET search_path' THEN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public;', func.proname, func.args);
    END IF;
  END LOOP;
END $$;
-- 4. Revoke public EXECUTE on SECURITY DEFINER functions
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  func RECORD;
BEGIN
  FOR func IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('public', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM public, anon;', func.proname, func.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated;', func.proname, func.args);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Add SET search_path to any SECURITY DEFINER function missing it
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  func RECORD;
  def TEXT;
BEGIN
  FOR func IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    def := pg_get_functiondef(func.oid);
    IF def !~* 'SET search_path' THEN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public;', func.proname, func.args);
    END IF;
  END LOOP;
END $$;
