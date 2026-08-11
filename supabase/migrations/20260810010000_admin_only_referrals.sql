-- ============================================================
-- Admin-Only Referral Codes (MASTER RESET + ROBUST FIXES)
--
-- 1. Wipe ALL existing auto-generated referral codes (fresh start)
-- 2. Update handle_new_user() trigger: NEVER auto-generate codes
--    - Still capture referred_by from signup metadata (signups via links ARE tracked)
-- 3. Protection trigger: only admins/ambassadors can write to referral_code
--    - FIXED: ambassadors stored in profiles.role are now correctly recognized
--    - FIXED: raises exception for unauthorized changes (no silent failures)
-- 4. RLS-friendly helper: check_admin_or_ambassador() used by trigger + policies
-- 5. Normalize referred_by on signup to ALWAYS be uppercase (matches code format)
-- ============================================================

-- ----------------------------------------------------------------
-- Helper: Is a user admin / moderator / ambassador?
--
--   IMPORTANT: `public.user_roles.role` is a Postgres ENUM `app_role`
--   with values ONLY: ('admin', 'moderator', 'user').
--   It does NOT contain 'ambassador'. Ambassadors are stored in
--   `public.profiles.role` which is a free-form TEXT column with
--   value 'ambassador'.
--   So NEVER check 'ambassador' inside the user_roles IN() clause
--   — doing so raises "invalid input value for enum app_role".
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

  -- 1. Staff roles (admin or moderator) — these live in user_roles enum
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('admin', 'moderator')
  ) INTO v_is_staff;

  IF v_is_staff THEN
    RETURN TRUE;
  END IF;

  -- 2. Ambassador role lives ONLY in profiles.role TEXT column
  SELECT p.role INTO v_profile_role
  FROM public.profiles p
  WHERE p.id = p_user_id
  LIMIT 1;

  RETURN COALESCE(v_profile_role, '') IN ('ambassador', 'admin');
END;
$$;

-- ----------------------------------------------------------------
-- 1. Wipe all existing referral codes (clean slate for admin-only model)
-- ----------------------------------------------------------------
UPDATE public.profiles
SET referral_code = NULL,
    updated_at = now()
WHERE referral_code IS NOT NULL;

-- ----------------------------------------------------------------
-- 2. Rewrite handle_new_user() trigger
--    - referral_code = NULL always (admin assigns later)
--    - referred_by = UPPER(trimmed) for case-insensitive matching
--    - Also backstop: only capture referred_by if the code actually EXISTS
--      (prevents typos / invalid codes from polluting rows)
-- ----------------------------------------------------------------
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
  v_email := new.email;

  -- Validate and normalize referred_by before storing
  v_raw_ref := new.raw_user_meta_data ->> 'referred_by';
  v_clean_ref := NULL;
  v_valid_ref := NULL;

  IF v_raw_ref IS NOT NULL THEN
    v_clean_ref := UPPER(BTRIM(v_raw_ref));
    IF char_length(v_clean_ref) > 0 THEN
      SELECT p.referral_code INTO v_valid_ref
      FROM public.profiles p
      WHERE p.referral_code = v_clean_ref
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referred_by, referral_code)
  VALUES (
    new.id,
    v_email,
    v_full_name,
    v_valid_ref,   -- Only store referral if code was confirmed valid
    NULL           -- Admin assigns referral_code LATER (never auto)
  );

  IF lower(v_email) = 'naijalift01@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- ----------------------------------------------------------------
-- 3. Block non-admin users from modifying any referral_code
--    - Raises exception for unauthorized changes (no silent revert)
--    - Correctly recognizes ambassadors via profiles.role column
--    - NULL caller (superuser / internal trigger) always allowed
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_non_admin_referral_code_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_uid UUID;
  is_allowed BOOLEAN := false;
BEGIN
  IF NEW.referral_code IS NOT DISTINCT FROM OLD.referral_code THEN
    RETURN NEW;
  END IF;

  caller_uid := auth.uid();
  IF caller_uid IS NULL THEN
    RETURN NEW;
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

-- ----------------------------------------------------------------
-- 4. Also normalize / validate referred_by on profile UPDATEs
--    (in case a backend script or admin ever back-fills it manually)
-- ----------------------------------------------------------------
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
    RETURN NEW;
  END IF;

  NEW.referred_by := v_clean_ref;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_referred_by_trigger ON public.profiles;

CREATE TRIGGER normalize_referred_by_trigger
  BEFORE UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_referred_by();

-- ----------------------------------------------------------------
-- 5. BACKFILL ADMIN ROLES for the hardcoded owner emails
--    (so even users who signed up BEFORE this trigger existed
--     can still create referral links in OgaHouse)
-- ----------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_uid UUID;
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

-- ----------------------------------------------------------------
-- 6. RLS: replace the overly-narrow "update own profile only"
--    policy with two policies — same as hotfix migration.
--    (This is what actually makes admin referral issuance work.)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

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
-- 7. Allow admins to READ user_roles to verify their own role
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.check_admin_or_ambassador(auth.uid()));
