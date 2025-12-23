-- Add status column to community_posts for approval workflow
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON public.community_posts(status);