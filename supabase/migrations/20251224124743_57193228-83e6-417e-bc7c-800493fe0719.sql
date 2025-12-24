-- Create subscription categories enum
CREATE TYPE public.subscription_category AS ENUM ('scholarship', 'government', 'grant', 'social_tech');

-- Create subscriptions table to track active subscriptions
CREATE TABLE public.subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category subscription_category NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    price_naira INTEGER NOT NULL DEFAULT 197,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' or 'yearly'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, category)
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_scholarships BOOLEAN NOT NULL DEFAULT false,
    email_government BOOLEAN NOT NULL DEFAULT false,
    email_grants BOOLEAN NOT NULL DEFAULT false,
    email_social_tech BOOLEAN NOT NULL DEFAULT false,
    sms_scholarships BOOLEAN NOT NULL DEFAULT false,
    sms_government BOOLEAN NOT NULL DEFAULT false,
    sms_grants BOOLEAN NOT NULL DEFAULT false,
    sms_social_tech BOOLEAN NOT NULL DEFAULT false,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trial_ends_at to profiles for tracking 30-day trial
ALTER TABLE public.profiles 
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" 
ON public.subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" 
ON public.subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for notification_preferences
CREATE POLICY "Users can view own preferences" 
ON public.notification_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
ON public.notification_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
ON public.notification_preferences FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all preferences (for sending notifications)
CREATE POLICY "Admins can view all preferences" 
ON public.notification_preferences FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Trigger to set trial_ends_at when profile is created
CREATE OR REPLACE FUNCTION public.set_trial_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Set 30-day trial from now
    NEW.trial_ends_at := now() + interval '30 days';
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_set_trial
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_trial_period();

-- Update existing profiles to have trial period
UPDATE public.profiles 
SET trial_ends_at = created_at + interval '30 days'
WHERE trial_ends_at IS NULL;

-- Create updated_at triggers
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();