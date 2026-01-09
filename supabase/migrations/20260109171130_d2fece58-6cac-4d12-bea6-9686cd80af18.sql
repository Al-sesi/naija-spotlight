-- Ensure opportunities are publicly readable (verified only) while keeping write access admin-only

-- Enable Row Level Security
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Reset policies (safe to re-run)
DROP POLICY IF EXISTS "Public can read verified opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admins can manage opportunities" ON public.opportunities;

-- Anyone (including logged-out visitors) can read verified opportunities
CREATE POLICY "Public can read verified opportunities"
ON public.opportunities
FOR SELECT
TO anon, authenticated
USING (COALESCE(is_verified, false) = true);

-- Only admins can insert/update/delete, and admins can also read all opportunities
CREATE POLICY "Admins can manage opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
