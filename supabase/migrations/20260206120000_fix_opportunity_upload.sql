-- Add missing opportunity types to the enum
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'scholarship';
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'social';

-- Update RLS for opportunities to allow ambassadors to insert
DROP POLICY IF EXISTS "Admins can insert opportunities" ON public.opportunities;
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

-- Update RLS for opportunities to allow ambassadors to update
DROP POLICY IF EXISTS "Admins can update opportunities" ON public.opportunities;
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

-- Update RLS for opportunities to allow ambassadors to delete
DROP POLICY IF EXISTS "Admins can delete opportunities" ON public.opportunities;
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

-- Ensure specific admin email has admin role
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
