-- Create table for tracking app installs
CREATE TABLE IF NOT EXISTS public.app_installs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_agent TEXT,
    outcome TEXT, -- 'accepted' or 'dismissed' (updated after prompt)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_installs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (anyone can install the app)
CREATE POLICY "Allow anonymous inserts to app_installs"
    ON public.app_installs
    FOR INSERT
    WITH CHECK (true);

-- Allow users to view their own installs (optional, for debugging or future features)
CREATE POLICY "Users can view their own installs"
    ON public.app_installs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT INSERT ON public.app_installs TO anon;
GRANT INSERT ON public.app_installs TO authenticated;
GRANT SELECT ON public.app_installs TO authenticated;
