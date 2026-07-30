-- ============================================================
-- Monthly Application Quota System
-- Replaces 30-day free trial with: FREE = 5 applications/month
-- Premium users = unlimited applications
-- ============================================================

-- 1. Add quota tracking columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS applications_this_month INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMP WITH TIME ZONE
  DEFAULT (now() + interval '30 days');

-- 2. Function to auto-reset the monthly quota if the current reset date has passed
CREATE OR REPLACE FUNCTION public.reset_quota_if_expired(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_reset_at TIMESTAMP WITH TIME ZONE;
  v_subscription_status TEXT;
  v_trial_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT quota_reset_at, subscription_status, trial_ends_at
  INTO v_reset_at, v_subscription_status, v_trial_ends_at
  FROM public.profiles
  WHERE id = p_user_id;

  -- If no reset date set at all, set it to 30 days from now
  IF v_reset_at IS NULL THEN
    UPDATE public.profiles
      SET applications_this_month = 0,
          quota_reset_at = now() + interval '30 days'
      WHERE id = p_user_id;
    RETURN;
  END IF;

  -- If reset date is in the past, reset the counter and schedule next reset
  IF v_reset_at < now() THEN
    UPDATE public.profiles
      SET applications_this_month = 0,
          quota_reset_at = now() + interval '30 days'
      WHERE id = p_user_id;
  END IF;
END;
$$;

-- 3. Helper: Is user considered premium (unlimited applications)?
--    Owner email OR subscription_status = 'active'
--    NOTE: Trial period no longer confers premium access after this migration.
CREATE OR REPLACE FUNCTION public.is_premium_user(p_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_status TEXT;
  v_plan TEXT;
BEGIN
  SELECT email,
         COALESCE(subscription_status, 'inactive') AS subscription_status,
         plan_type
  INTO v_email, v_status, v_plan
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_email IS NOT NULL AND lower(v_email) = 'naijalift01@gmail.com' THEN
    RETURN true;
  END IF;

  RETURN v_status = 'active';
END;
$$;

-- 4. Trigger function: auto-increment application counter on applied status change
CREATE OR REPLACE FUNCTION public.track_application_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert path: only count when status is 'applied'
  IF (TG_OP = 'INSERT') THEN
    IF NEW.status = 'applied' THEN
      PERFORM public.reset_quota_if_expired(NEW.user_id);
      IF NOT public.is_premium_user(NEW.user_id) THEN
        UPDATE public.profiles
          SET applications_this_month = applications_this_month + 1
          WHERE id = NEW.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Update path: only count when transitioning FROM non-applied -> 'applied'
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.status <> 'applied' AND NEW.status = 'applied' THEN
      PERFORM public.reset_quota_if_expired(NEW.user_id);
      IF NOT public.is_premium_user(NEW.user_id) THEN
        UPDATE public.profiles
          SET applications_this_month = applications_this_month + 1
          WHERE id = NEW.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Attach quota tracking trigger to user_applications table
DROP TRIGGER IF EXISTS track_quota_on_apply ON public.user_applications;

CREATE TRIGGER track_quota_on_apply
  AFTER INSERT OR UPDATE OF status
  ON public.user_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.track_application_quota();

-- 6. Backfill: Set quota_reset_at for existing users where it's NULL
UPDATE public.profiles
SET quota_reset_at = COALESCE(quota_reset_at, created_at + interval '30 days')
WHERE quota_reset_at IS NULL;

-- 7. Backfill: Count applications already marked as applied this month
--    (from quota_reset_at backward to applied_at, or 30 days)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, quota_reset_at FROM public.profiles
  LOOP
    -- Auto-adjust if the stored reset date is in the past
    IF r.quota_reset_at IS NULL OR r.quota_reset_at < now() THEN
      UPDATE public.profiles
        SET quota_reset_at = now() + interval '30 days',
            applications_this_month = 0
        WHERE id = r.id;
    ELSE
      UPDATE public.profiles p
      SET applications_this_month = (
        SELECT COUNT(1)
        FROM public.user_applications ua
        WHERE ua.user_id = r.id
          AND ua.status = 'applied'
          AND ua.applied_at >= (r.quota_reset_at - interval '30 days')
          AND ua.applied_at <= r.quota_reset_at
      )
      WHERE p.id = r.id;
    END IF;
  END LOOP;
END;
$$;

-- 8. Grant execute permissions to authenticated users for the reset helper
GRANT EXECUTE ON FUNCTION public.reset_quota_if_expired(UUID) TO authenticated;
