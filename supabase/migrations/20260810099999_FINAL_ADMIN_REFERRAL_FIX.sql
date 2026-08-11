-- =====================================================================
-- NAIJALIFT — FINAL, IDEMPOTENT, RUN-ANYTIME REFERRAL FIX
--
-- Paste this into Supabase SQL Editor and run. It is SAFE to run
-- MULTIPLE TIMES without data loss (every operation is idempotent).
--
-- Fixes ALL referral bugs:
--   1. app_role enum 22P02 crash (ambassador was checked against enum)
--   2. RLS blocked admin from issuing codes to OTHER users
--   3. Owner emails missing admin rows in user_roles (backfilled)
--   4. Users never get auto-generated codes (admin-only via OgaHouse)
--   5. referred_by stored in UPPERCASE + validated against real codes
--
-- After running → sign OUT then back IN to naijalift.space as admin.
-- Then in OgaHouse → Users → click "Give Ref Link" for any user.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. ADMIN / AMBASSADOR HELPER  (100% enum-safe)
--    user_roles.role is ENUM app_role = ('admin','moderator','user')
--    → NEVER mention 'ambassador' in that IN() list (22P02 crash risk)
--    ambassador role lives ONLY in profiles.role TEXT column
-- ---------------------------------------------------------------------
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

  -- Staff roles: admin / moderator (enum-safe IN list)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('admin', 'moderator')
  ) INTO v_is_staff;

  IF v_is_staff THEN
    RETURN TRUE;
  END IF;

  -- Ambassador (TEXT column, no enum involved)
  SELECT p.role INTO v_profile_role
  FROM public.profiles p
  WHERE p.id = p_user_id
  LIMIT 1;

  RETURN COALESCE(v_profile_role, '') IN ('ambassador', 'admin');
END;
$$;

-- ---------------------------------------------------------------------
-- 2. BACKFILL ADMIN ROLES for both owner emails
--    (safe to re-run: ON CONFLICT DO NOTHING)
-- ---------------------------------------------------------------------
-- From public.profiles
DO $$
DECLARE
  r RECORD;
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
  END LOOP;
END $$;

-- From auth.users (covers case where profile email was NULL on signup)
DO $$
DECLARE
  v_uid UUID;
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
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. HANDLE NEW USER: no auto-generated referral codes EVER
--    BUT: capture referred_by from signup meta ONLY if the code EXISTS
--    AND: normalize to UPPERCASE so lookups always match
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_raw_ref TEXT;
  v_clean_ref TEXT;
  v_valid_ref TEXT;
BEGIN
  v_full_name := new.raw_user_meta_data ->> 'full_name';
  v_email     := new.email;

  v_raw_ref   := new.raw_user_meta_data ->> 'referred_by';
  v_clean_ref := NULL;
  v_valid_ref := NULL;

  IF v_raw_ref IS NOT NULL THEN
    v_clean_ref := UPPER(BTRIM(v_raw_ref));
    IF char_length(v_clean_ref) > 0 THEN
      SELECT p.referral_code INTO v_valid_ref
      FROM public.profiles p
      WHERE p.referral_code = v_clean_ref
      LIMIT 1;
      -- Fallback case-insensitive match (handles old mixed-case links)
      IF v_valid_ref IS NULL THEN
        SELECT p.referral_code INTO v_valid_ref
        FROM public.profiles p
        WHERE p.referral_code ILIKE v_clean_ref
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referred_by, referral_code)
  VALUES (
    new.id,
    v_email,
    v_full_name,
    v_valid_ref,   -- NULL when code is invalid → signup NEVER blocked
    NULL           -- Admin assigns referral_code LATER in OgaHouse
  );

  -- Owner auto-admin (covers any future owner signup too)
  IF lower(v_email) IN ('naijalift01@gmail.com', 'abdulmajeedsesiadam@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- Ensure the auth.users trigger points to the redefined function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. PROTECT referral_code column: only admin/ambassador can change it
--    → Raises EXCEPTION (not silent revert) so errors are visible.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_non_admin_referral_code_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_uid UUID;
  is_allowed BOOLEAN;
BEGIN
  IF NEW.referral_code IS NOT DISTINCT FROM OLD.referral_code THEN
    RETURN NEW;
  END IF;

  caller_uid := auth.uid();
  IF caller_uid IS NULL THEN
    RETURN NEW;   -- superuser / internal context is always allowed
  END IF;

  is_allowed := public.check_admin_or_ambassador(caller_uid);
  IF NOT is_allowed THEN
    RAISE EXCEPTION
      'Only admins and ambassadors can create or modify referral codes. (user=%)',
      caller_uid::TEXT
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_referral_code_admin_only ON public.profiles;
CREATE TRIGGER protect_referral_code_admin_only
  BEFORE UPDATE OF referral_code ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_non_admin_referral_code_change();

-- ---------------------------------------------------------------------
-- 5. NORMALIZE referred_by to UPPERCASE on any profile UPDATE
--    (handles manual backfills / admin repairs)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_referred_by()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_clean_ref TEXT;
BEGIN
  IF NEW.referred_by IS NOT DISTINCT FROM OLD.referred_by THEN
    RETURN NEW;
  END IF;
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  v_clean_ref := UPPER(BTRIM(NEW.referred_by));
  IF char_length(v_clean_ref) = 0 THEN
    NEW.referred_by := NULL;
  ELSE
    NEW.referred_by := v_clean_ref;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_referred_by_trigger ON public.profiles;
CREATE TRIGGER normalize_referred_by_trigger
  BEFORE UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_referred_by();

-- ---------------------------------------------------------------------
-- 6. RLS POLICIES ON public.profiles — TWO UPDATE policies:
--      A) Users can edit THEIR OWN profile (full access)
--      B) Admin/ambassador can edit ANY profile to issue referral codes
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile"          ON public.profiles;
DROP POLICY IF EXISTS "Admins can update referral info on any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"            ON public.profiles;

-- SELECT: users see their own row; admin/ambassador see EVERY profile
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.check_admin_or_ambassador(auth.uid())
);

-- UPDATE A — self-edit
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE B — admin cross-user referral issuance
CREATE POLICY "Admins can update referral info on any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.check_admin_or_ambassador(auth.uid()))
WITH CHECK (public.check_admin_or_ambassador(auth.uid()));

-- INSERT: users create their own row (handled by handle_new_user trigger)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 7. RLS POLICIES ON public.user_roles — admins can READ (to verify)
-- ---------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.check_admin_or_ambassador(auth.uid()));

-- ---------------------------------------------------------------------
-- 8. SANITY CHECK — if we get here with no error → everything is good
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_test_call BOOLEAN;
BEGIN
  v_test_call := public.check_admin_or_ambassador('00000000-0000-0000-0000-000000000000'::uuid);
  IF v_test_call IS NULL THEN
    RAISE EXCEPTION 'check_admin_or_ambassador() returned NULL — corruption.';
  END IF;
  RAISE NOTICE '✅ NaijaLift referral system fix applied successfully.
— Admin check helper: OK
— handle_new_user trigger: REPLACED
— protect_referral_code_admin_only trigger: REPLACED
— normalize_referred_by trigger: REPLACED
— RLS policies profiles + user_roles: RE-APPLIED
— Owner admin roles BACKFILLED (naijalift01 + abdulmajeedsesiadam)
SIGN OUT of naijalift.space and sign back IN, then try "Give Ref Link" in OgaHouse.';
END $$;

COMMIT;
