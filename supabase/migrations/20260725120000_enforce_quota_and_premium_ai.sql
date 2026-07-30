-- ============================================================
-- Server-Side Enforcement: Monthly Application Quota (5/mo)
-- Prevents free users from applying (status='applied') when over the limit
-- ============================================================

-- 1. Helper: Check if the user can still apply this month
--    Returns TRUE if allowed, FALSE if quota exceeded
CREATE OR REPLACE FUNCTION public.can_user_apply(p_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_applications INTEGER;
  v_reset_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Premium users always get unlimited
  IF public.is_premium_user(p_user_id) THEN
    RETURN true;
  END IF;

  -- Attempt a soft reset first (no-op if already up-to-date)
  PERFORM public.reset_quota_if_expired(p_user_id);

  SELECT applications_this_month, quota_reset_at
  INTO v_applications, v_reset_at
  FROM public.profiles
  WHERE id = p_user_id;

  -- If no record or counter is missing, allow (will be initialized by other triggers)
  IF v_applications IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_applications < 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_apply(UUID) TO authenticated;

-- 2. Before-insert trigger: prevent applying when quota is exceeded
CREATE OR REPLACE FUNCTION public.enforce_application_quota_before()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_going_to_apply boolean := false;
BEGIN
  -- Determine if this operation results in status = 'applied'
  IF TG_OP = 'INSERT' THEN
    v_going_to_apply := (NEW.status = 'applied');
  ELSIF TG_OP = 'UPDATE' THEN
    v_going_to_apply := (OLD.status <> 'applied' AND NEW.status = 'applied');
  END IF;

  IF v_going_to_apply AND NOT public.can_user_apply(NEW.user_id) THEN
    RAISE EXCEPTION 'Monthly application quota of 5 exceeded. Please upgrade to Premium to apply more.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach the BEFORE trigger — runs BEFORE the row is written, so we can block it
DROP TRIGGER IF EXISTS enforce_quota_before_apply ON public.user_applications;

CREATE TRIGGER enforce_quota_before_apply
  BEFORE INSERT OR UPDATE OF status
  ON public.user_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_application_quota_before();
