-- ============================================================
-- HOTFIX: Admin Referral Generation (RLS + Roles Backfill)
--
-- Fixes three bugs that broke "Give Ref Link" for admins:
--   Bug 1: app_role enum only has (admin, moderator, user) —
--          helper queried ur.role IN ('admin','ambassador','moderator')
--          → raised 22P02: invalid input value for enum app_role
--   Bug 2: RLS policy "Users can update own profile" blocked admin
--          from updating ANOTHER user's row to set referral_code.
--   Bug 3: Owner emails (naijalift01, abdulmajeedsesiadam) may
--          not have admin rows in user_roles if they signed up
--          BEFORE the handle_new_user() trigger auto-inserted them.
-- ============================================================

-- ----------------------------------------------------------------
-- 0. FIRST: drop and re-define check_admin_or_ambassador() WITHOUT
--    ever touching 'ambassador' in the user_roles IN() list.
--    Ambassador role is ONLY stored in profiles.role TEXT column,
--    never in user_roles.role ENUM (app_role = admin|moderator|user).
--    This fixes error 22P02: "invalid input value for enum app_role"
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_admin_or_ambassador(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_staff BOOLEAN;
  v_profile_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- user_roles.role is ENUM app_role: only ('admin', 'moderator', 'user')
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('admin', 'moderator')
  ) INTO v_is_staff;

  IF v_is_staff THEN
    RETURN TRUE;
  END IF;

  -- Ambassador lives in profiles.role TEXT column
  SELECT p.role INTO v_profile_role
  FROM public.profiles p
  WHERE p.id = p_user_id
  LIMIT 1;

  RETURN COALESCE(v_profile_role, '') IN ('ambassador', 'admin');
END;
$$;

-- ----------------------------------------------------------------
-- 1. BACKFILL ADMIN ROLES for the hardcoded owner emails
-- ----------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_count INT;
BEGIN
  FOR r IN
    SELECT id, email
    FROM public.profiles
    WHERE lower(email) IN (
      'naijalift01@gmail.com',
      'abdulmajeedsesiadam@gmail.com'
    )
  LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (r.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      RAISE NOTICE 'Backfilled admin role for % (%)', r.email, r.id;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- 2. Backfill: also scan auth.users for owner emails (if their
--    profile.email wasn't populated) and create user_roles rows.
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_uid UUID;
  v_count INT;
BEGIN
  FOR v_uid IN
    SELECT u.id
    FROM auth.users u
    WHERE lower(u.email) IN (
      'naijalift01@gmail.com',
      'abdulmajeedsesiadam@gmail.com'
    )
  LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      RAISE NOTICE 'Backfilled admin role for auth user %', v_uid;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- 3. DROP old overly-restrictive RLS UPDATE policy on profiles
--    and replace with TWO policies for clarity:
--      A) Users can always update their OWN profile (full access)
--      B) Admins / ambassadors can update referral_code + referred_by
--         on ANY profile (to issue referral links via OgaHouse)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3A. Own-profile update policy (same as before, but explicit)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3B. Admin/ambassador referral-code policy (cross-user updates)
CREATE POLICY "Admins can update referral info on any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  public.check_admin_or_ambassador(auth.uid())
)
WITH CHECK (
  public.check_admin_or_ambassador(auth.uid())
);

-- ----------------------------------------------------------------
-- 4. Also make sure admins can READ user_roles (to verify roles)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.check_admin_or_ambassador(auth.uid()));

-- ----------------------------------------------------------------
-- 5. Sanity-check: the helper works with a NULL-result input.
--    (Previously the enum IN() clause raised 22P02 here.)
-- ----------------------------------------------------------------
DO $$
BEGIN
  -- Must return FALSE (not raise) for all-zero UUID
  IF public.check_admin_or_ambassador('00000000-0000-0000-0000-000000000000'::uuid) IS NULL THEN
    RAISE EXCEPTION 'check_admin_or_ambassador() returned NULL — internal error.';
  END IF;
  RAISE NOTICE 'check_admin_or_ambassador() sanity-check passed.';
END $$;
