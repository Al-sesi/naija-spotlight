-- ================================================
-- PHASE 1: AI-POWERED OPPORTUNITY MATCHING SCHEMA
-- ================================================

-- 1. Add new columns to profiles table for user onboarding data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS lga TEXT,
ADD COLUMN IF NOT EXISTS highest_qualification TEXT,
ADD COLUMN IF NOT EXISTS field_of_study TEXT,
ADD COLUMN IF NOT EXISTS institution TEXT,
ADD COLUMN IF NOT EXISTS is_current_student BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
ADD COLUMN IF NOT EXISTS career_statuses TEXT[],
ADD COLUMN IF NOT EXISTS skills TEXT[],
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS preferred_location TEXT,
ADD COLUMN IF NOT EXISTS preferred_industries TEXT[],
ADD COLUMN IF NOT EXISTS opportunity_level TEXT,
ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS referral_code TEXT,
ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- 2. Create user_behavior table for continuous learning
CREATE TABLE IF NOT EXISTS public.user_behavior (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('view', 'save', 'apply', 'ignore', 'click', 'share')),
    action_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create opportunity_metadata table for richer opportunity data
CREATE TABLE IF NOT EXISTS public.opportunity_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE UNIQUE,
    eligibility_requirements TEXT,
    age_requirement TEXT,
    education_requirement TEXT,
    language_requirement TEXT,
    keywords TEXT[],
    tags TEXT[],
    location_requirement TEXT,
    industry TEXT,
    salary_range TEXT,
    benefits TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create recommendations table to cache match scores
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    match_reasons TEXT[],
    is_top_match BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    is_hidden_gem BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, opportunity_id)
);

-- 5. Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('new_match', 'deadline_reminder', 'expiring_soon', 'better_match')),
    related_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create recommendation_analytics table for admin dashboard
CREATE TABLE IF NOT EXISTS public.recommendation_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    total_recommendations INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_saves INTEGER DEFAULT 0,
    total_applications INTEGER DEFAULT 0,
    date_recorded TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id ON public.user_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_opportunity_id ON public.user_behavior(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_match_score ON public.recommendations(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);

-- 8. Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.user_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_analytics ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
-- Profiles: Users can read and update their own profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- User Behavior: Users can view and insert their own behavior
CREATE POLICY "Users can view their own behavior"
ON public.user_behavior FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavior"
ON public.user_behavior FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recommendations: Users can view their own recommendations
CREATE POLICY "Users can view their own recommendations"
ON public.recommendations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Opportunity Metadata: Everyone can view
CREATE POLICY "Everyone can view opportunity metadata"
ON public.opportunity_metadata FOR SELECT
TO authenticated
USING (true);

-- Notifications: Users can view and update their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.user_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Analytics: Admins only
CREATE POLICY "Admins can view analytics"
ON public.recommendation_analytics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Functions for AI matching (simplified first, will expand later)
CREATE OR REPLACE FUNCTION public.calculate_match_score(
    p_user_id UUID,
    p_opportunity_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_profile RECORD;
    v_opportunity RECORD;
    v_opportunity_meta RECORD;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    
    -- Get opportunity
    SELECT * INTO v_opportunity FROM public.opportunities WHERE id = p_opportunity_id;
    
    -- Get opportunity metadata
    SELECT * INTO v_opportunity_meta FROM public.opportunity_metadata WHERE opportunity_id = p_opportunity_id;
    
    -- Base score starts at 0
    v_score := 0;
    
    -- 1. Match category with user interests (15 points)
    IF v_profile.interests && ARRAY[v_opportunity.category::TEXT] THEN
        v_score := v_score + 15;
    END IF;
    
    -- 2. Match location (10 points)
    IF v_profile.preferred_location = 'Nigeria Only' AND v_opportunity.state IS NOT NULL THEN
        v_score := v_score + 10;
    ELSIF v_profile.preferred_location = 'Remote Only' AND v_opportunity.is_remote = true THEN
        v_score := v_score + 10;
    END IF;
    
    -- 3. Match level (10 points)
    IF v_profile.opportunity_level = v_opportunity.level THEN
        v_score := v_score + 10;
    END IF;
    
    -- 4. Match skills (20 points)
    IF v_profile.skills && v_opportunity_meta.tags THEN
        v_score := v_score + 20;
    END IF;
    
    -- 5. Match industry (15 points)
    IF v_profile.preferred_industries && ARRAY[v_opportunity_meta.industry] THEN
        v_score := v_score + 15;
    END IF;
    
    -- 6. Check if deadline is open (10 points)
    IF v_opportunity.deadline IS NULL OR v_opportunity.deadline > NOW() THEN
        v_score := v_score + 10;
    END IF;
    
    -- 7. Verified opportunity (10 points)
    IF v_opportunity.is_verified = true THEN
        v_score := v_score + 10;
    END IF;
    
    -- 8. Is remote (10 points if user likes remote)
    IF v_opportunity.is_remote = true THEN
        v_score := v_score + 10;
    END IF;
    
    -- Cap the score at 100
    IF v_score > 100 THEN
        v_score := 100;
    END IF;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;
