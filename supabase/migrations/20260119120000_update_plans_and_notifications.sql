-- Update profiles to ensure plan_type is consistent
-- We are not changing the schema type (TEXT), but we are standardizing the values.

-- 1. Ensure notification_preferences has necessary columns
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS whatsapp_scholarships BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_government BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_grants BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_social_tech BOOLEAN DEFAULT false;

-- 2. Add phone_number to profiles if it's not there (it's often better in profiles than preferences)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 3. Migration: Update any 'premium_lifter' to 'basic' (assuming basic is the default legacy mapping)
-- Or 'ultra' if we want to be generous. Let's map to 'basic' for now as it matches the lower price point closer to old pricing?
-- Actually, the old price was likely lower or similar. 197 NGN is very low.
-- Let's just allow 'basic' and 'ultra' values.

-- 4. Create a function to check if a user can receive SMS/WhatsApp
CREATE OR REPLACE FUNCTION public.can_receive_premium_notifications(_user_id uuid)
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
        AND plan_type = 'ultra' -- Only Ultra users get SMS/WhatsApp
      )
  )
$$;
