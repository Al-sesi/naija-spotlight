-- ============================================================
-- Referral System Enhancements
-- Ensures unique referral codes, adds indexes, and helpers
-- ============================================================

-- 1. Make sure referral_code and referred_by columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- 2. Enforce uniqueness of referral codes
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_unique_idx ON public.profiles (referral_code)
WHERE referral_code IS NOT NULL;

-- 3. Index for fast lookup of who a user referred
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by)
WHERE referred_by IS NOT NULL;

-- 4. Helper function to look up a referrer profile by referral code
CREATE OR REPLACE FUNCTION public.get_referrer_id_by_code(code TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles WHERE referral_code = code LIMIT 1;
$$;

-- 5. Helper to count total referrals for any user
CREATE OR REPLACE FUNCTION public.count_total_referrals(referrer_id UUID)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM public.profiles
  WHERE referred_by IN (
    SELECT referral_code FROM public.profiles WHERE id = referrer_id
  );
$$;

-- 6. Helper to count paid subscribers from referrals
CREATE OR REPLACE FUNCTION public.count_paid_referrals(referrer_id UUID)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM public.profiles
  WHERE referred_by IN (
    SELECT referral_code FROM public.profiles WHERE id = referrer_id
  ) AND subscription_status = 'active';
$$;
