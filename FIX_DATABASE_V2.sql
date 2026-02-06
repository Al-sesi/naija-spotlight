-- FIX_DATABASE_V2.sql
-- Run this script to force-fix the database permissions.
-- It handles the "policy already exists" error by removing old policies first.

-- 1. Ensure Categories Exist (Safe to run multiple times)
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'scholarship';
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'social';

-- 2. RESET PERMISSIONS (Drop BOTH old and new policy names to be safe)
DROP POLICY IF EXISTS "Admins can insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admins and Ambassadors can insert opportunities" ON public.opportunities;

DROP POLICY IF EXISTS "Admins can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admins and Ambassadors can update opportunities" ON public.opportunities;

DROP POLICY IF EXISTS "Admins can delete opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admins and Ambassadors can delete opportunities" ON public.opportunities;

-- 3. Create Policies Fresh
CREATE POLICY "Admins and Ambassadors can insert opportunities"
ON public.opportunities FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ambassador'
  )
);

CREATE POLICY "Admins and Ambassadors can update opportunities"
ON public.opportunities FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ambassador'
  )
);

CREATE POLICY "Admins and Ambassadors can delete opportunities"
ON public.opportunities FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ambassador'
  )
);

-- 4. Ensure Admin Role (Safe to run multiple times)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'abdulmajeedsesiadam@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END
$$;
