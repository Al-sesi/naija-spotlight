-- 1. Ensure RLS is enabled on profiles (it likely is, but good to be sure)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy allowing Admins to view all profiles
-- We check against the user_roles table for the 'admin' role
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 3. (Fallback) Allow Ambassadors to view their own profile (usually covered by 'Users can view own profile')
-- But we need to ensure the query .eq('role', 'ambassador') works.
-- If the previous policy covers admins, that's enough for the Admin Dashboard.

-- 4. Data Repair: Ensure any profile with a 'LIFT%' referral code has the 'ambassador' role
-- This handles cases where the Edge Function might have set the code but failed to set the role (unlikely with service role, but possible if logic branched)
UPDATE public.profiles
SET role = 'ambassador'
WHERE referral_code LIKE 'LIFT%' AND (role IS NULL OR role != 'ambassador');
