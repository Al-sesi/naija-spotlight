-- Drop the old view if it exists
DROP VIEW IF EXISTS public.referral_stats;

-- Create enhanced view for Ambassador Performance
CREATE OR REPLACE VIEW public.referral_stats_detailed AS
SELECT 
  referrer.id as ambassador_id,
  referrer.full_name as ambassador_name,
  referrer.email as ambassador_email,
  referrer.referral_code,
  -- Total number of users referred
  COUNT(referred.id) as total_referrals,
  -- Active Subscriptions: Users with active status
  COUNT(CASE WHEN referred.subscription_status = 'active' THEN 1 END) as active_subscriptions,
  -- Trial Users: Users currently in trial period (and not active/paid, to avoid double counting value, though they might be active in trial)
  -- The requirement implies tracking those *relying* on the free trial vs those who paid.
  -- Usually 'active' implies paid. So we count trial users as those with valid trial_ends_at AND NOT active.
  -- OR just valid trial_ends_at. Let's assume distinct categories are preferred for "Performance".
  -- "Active Subscriptions" = Money. "Trial Users" = Potential Money.
  COUNT(CASE WHEN referred.trial_ends_at > now() AND referred.subscription_status != 'active' THEN 1 END) as trial_users
FROM public.profiles referrer
LEFT JOIN public.profiles referred ON referrer.id = referred.referred_by
GROUP BY referrer.id, referrer.full_name, referrer.email, referrer.referral_code
HAVING COUNT(referred.id) > 0; -- Only show ambassadors with at least one referral? 
-- The user might want to see everyone with a code, but the previous view showed everyone. 
-- "Ambassador Performance" usually implies seeing those who are performing.
-- Let's stick to those with referrals for the "Stats" view to keep it clean, or use LEFT JOIN carefully if we want zeros.
-- Actually, let's include everyone who has a referral code just in case, but filtering by HAVING COUNT > 0 is cleaner for a "Performance" table.
-- Let's stick to HAVING COUNT > 0 to avoid cluttering with 0-referral users.
