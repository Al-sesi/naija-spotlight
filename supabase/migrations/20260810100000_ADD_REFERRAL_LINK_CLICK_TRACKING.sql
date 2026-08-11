-- =====================================================================
-- REFERRAL LINK CLICK TRACKING + MONITORING
--
-- Adds:
--   1. referral_link_clicks table for tracking every link visit
--   2. RLS policies (public INSERT for anonymous visitors, admin SELECT)
--   3. referral_tracking_failures table for monitoring/alerting
--   4. Helper function to atomically record a click
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. REFERRAL LINK CLICKS TABLE
--    Tracks EVERY time a referral link is visited (before signup)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_link_clicks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code   TEXT NOT NULL,
    referrer_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    visitor_ip      TEXT,
    user_agent      TEXT,
    referer_header  TEXT,
    landing_path    TEXT,
    device_type     TEXT,
    browser_name    TEXT,
    os_name         TEXT,
    country_code    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_link_clicks_code_idx
    ON public.referral_link_clicks (referral_code);

CREATE INDEX IF NOT EXISTS referral_link_clicks_referrer_idx
    ON public.referral_link_clicks (referrer_id);

CREATE INDEX IF NOT EXISTS referral_link_clicks_created_idx
    ON public.referral_link_clicks (created_at DESC);

-- ---------------------------------------------------------------------
-- 2. RLS for referral_link_clicks
--    Anonymous / signed-in users can INSERT (to record clicks)
--    Only admin/ambassador can SELECT (to view metrics)
-- ---------------------------------------------------------------------
ALTER TABLE public.referral_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record a referral click" ON public.referral_link_clicks;
CREATE POLICY "Anyone can record a referral click"
ON public.referral_link_clicks FOR INSERT
TO public
WITH CHECK (char_length(COALESCE(referral_code, '')) > 0);

DROP POLICY IF EXISTS "Admins can view referral clicks" ON public.referral_link_clicks;
CREATE POLICY "Admins can view referral clicks"
ON public.referral_link_clicks FOR SELECT
TO authenticated
USING (public.check_admin_or_ambassador(auth.uid()));

-- ---------------------------------------------------------------------
-- 3. REFERRAL TRACKING FAILURES TABLE (for monitoring / alerts)
--    Records every failed tracking attempt so admin can diagnose issues
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_tracking_failures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_type    TEXT NOT NULL,     -- 'click_record' | 'signup_lookup' | 'code_validation'
    referral_code   TEXT,
    error_message   TEXT,
    user_agent      TEXT,
    referer_header  TEXT,
    raw_url         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_tracking_failures_created_idx
    ON public.referral_tracking_failures (created_at DESC);

ALTER TABLE public.referral_tracking_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record tracking failures" ON public.referral_tracking_failures;
CREATE POLICY "Anyone can record tracking failures"
ON public.referral_tracking_failures FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view tracking failures" ON public.referral_tracking_failures;
CREATE POLICY "Admins can view tracking failures"
ON public.referral_tracking_failures FOR SELECT
TO authenticated
USING (public.check_admin_or_ambassador(auth.uid()));

-- ---------------------------------------------------------------------
-- 4. HELPER: atomically record a click + resolve referrer_id
--    Returns TRUE if the click was successfully recorded
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_referral_click(
    p_referral_code TEXT,
    p_visitor_ip   TEXT DEFAULT NULL,
    p_user_agent   TEXT DEFAULT NULL,
    p_referer      TEXT DEFAULT NULL,
    p_landing_path TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_code      TEXT;
    v_referrer  UUID;
BEGIN
    v_code := UPPER(BTRIM(COALESCE(p_referral_code, '')));
    IF char_length(v_code) = 0 THEN
        RETURN FALSE;
    END IF;

    SELECT id INTO v_referrer
    FROM public.profiles
    WHERE referral_code = v_code
    LIMIT 1;

    INSERT INTO public.referral_link_clicks (
        referral_code, referrer_id, visitor_ip, user_agent,
        referer_header, landing_path
    ) VALUES (
        v_code, v_referrer, p_visitor_ip, p_user_agent,
        p_referer, p_landing_path
    );

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.referral_tracking_failures (
        failure_type, referral_code, error_message,
        user_agent, referer_header, raw_url
    ) VALUES (
        'click_record', v_code, SQLERRM,
        p_user_agent, p_referer, COALESCE(p_landing_path, '')
    );
    RETURN FALSE;
END;
$$;

COMMIT;
