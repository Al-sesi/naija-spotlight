
-- Create app_installs table to track PWA installations
CREATE TABLE IF NOT EXISTS public.app_installs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_agent TEXT,
    platform TEXT,
    outcome TEXT, -- 'accepted', 'dismissed', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_installs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all app installs"
ON public.app_installs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Users can insert their own install stats"
ON public.app_installs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can insert install stats (for non-logged in users)"
ON public.app_installs
FOR INSERT
TO anon
WITH CHECK (true);
