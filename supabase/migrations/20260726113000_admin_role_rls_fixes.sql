-- ============================================================
-- Admin Role & Ambassador: RLS + Integrity Fixes
-- 1. Grants admins full RLS access to user_roles (read/write any row)
-- 2. Grants admins permission to UPDATE any profile's role column
-- 3. Also lets moderator read user_roles so moderators can see users
-- 4. Ensures OWNER_EMAILS admin users always have the admin row
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fix: Admins and moderators must be able to READ ALL user_roles
--    (Default policy only let users see their own rows,
--     so the Ambassadors/Team list never showed other admins)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

-- ------------------------------------------------------------
-- 2. Fix: Admins need to INSERT/DELETE user_roles to promote
--    other users to Admin / Moderator
-- ------------------------------------------------------------
CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- 3. Fix: Profiles UPDATE currently only lets users edit
--    their own row. Admins need to flip profiles.role between
--    'user' and 'ambassador'.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
);

-- ------------------------------------------------------------
-- 4. Make sure the core OWNER_EMAILS always have an admin row
--    in user_roles, so checks like `has_role(uid, 'admin')`
--    succeed even if auto-admin seed has not fired for them yet.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  FOREACH v_user_id IN ARRAY ARRAY(
    SELECT id FROM auth.users
    WHERE lower(email) IN (
      lower('abdulmajeedsesiadam@gmail.com'),
      lower('naijalift01@gmail.com')
    )
  ) LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;
