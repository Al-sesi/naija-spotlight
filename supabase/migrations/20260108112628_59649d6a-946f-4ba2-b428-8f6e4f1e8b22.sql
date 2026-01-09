-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paystack_customer_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paystack_subscription_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_started_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp with time zone DEFAULT NULL;

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);

-- Function to check if user has active premium subscription
CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND (
        subscription_status = 'active'
        OR (trial_ends_at IS NOT NULL AND trial_ends_at > now())
      )
  )
$$;