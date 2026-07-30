-- ============================================================
-- Email Integrity Fixes: Deduplicate opportunity notifications,
-- fix broadcast filters, and correct premium-gated notification
-- permission function (was checking obsolete plan_type='ultra')
-- ============================================================

-- 1. DROP the database trigger that posts to notify-new-opportunity.
--    Why: the admin form already invokes the edge function in its
--    onSuccess handler, and having both caused DUPLICATE emails
--    (2x per user) every time an opportunity was added.
DROP TRIGGER IF EXISTS on_opportunity_created_notify ON public.opportunities;
DROP FUNCTION IF EXISTS public.trigger_notify_new_opportunity();

-- 2. Fix the premium-notification gate function so it matches any
--    active subscriber (not the obsolete plan_type='ultra' value).
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
      AND subscription_status = 'active'
  )
$$;

-- 3. Make sure notification_preferences rows exist for every user who
--    ever gets an email.  Users without a row are treated as opted-IN
--    by default (consistent with legacy behavior), but adding rows now
--    lets admins opt users out manually if needed.
INSERT INTO public.notification_preferences (user_id, email_scholarships, email_government, email_grants, email_social_tech)
SELECT
  p.id AS user_id,
  true, true, true, true
FROM public.profiles p
LEFT JOIN public.notification_preferences np ON np.user_id = p.id
WHERE np.id IS NULL
ON CONFLICT DO NOTHING;
