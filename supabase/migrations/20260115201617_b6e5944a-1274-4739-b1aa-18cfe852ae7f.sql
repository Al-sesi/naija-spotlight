
-- Drop the conflicting restrictive policies
DROP POLICY IF EXISTS "Anyone can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Public can read verified opportunities" ON public.opportunities;

-- Create a single permissive SELECT policy for viewing opportunities
CREATE POLICY "Anyone can view verified opportunities" 
ON public.opportunities 
FOR SELECT 
TO public
USING (COALESCE(is_verified, true) = true);
