-- Add columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Create index for faster lookup of referral codes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Function to generate unique referral code (8 chars, alphanumeric excluding confusing chars)
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text[] := '{A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer := 0;
  is_unique boolean := false;
BEGIN
  WHILE NOT is_unique LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || chars[1+floor(random()*(array_length(chars, 1)))::int];
    END LOOP;
    
    BEGIN
      PERFORM 1 FROM public.profiles WHERE referral_code = result;
      IF NOT FOUND THEN
        is_unique := true;
      END IF;
    END;
  END LOOP;
  RETURN result;
END;
$$;

-- Backfill existing users with referral codes
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    UPDATE public.profiles
    SET referral_code = public.generate_unique_referral_code()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Update handle_new_user to handle referral logic AND preserve auto-admin logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  provided_referral_code text;
  new_referral_code text;
BEGIN
  -- Get the referral code from metadata if it exists
  provided_referral_code := new.raw_user_meta_data ->> 'referral_code';
  
  -- If a code was provided, try to find the referrer
  IF provided_referral_code IS NOT NULL AND length(provided_referral_code) > 0 THEN
    SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = provided_referral_code LIMIT 1;
  END IF;

  -- Generate a new referral code for this user
  new_referral_code := public.generate_unique_referral_code();

  -- Insert the new profile
  -- Note: The set_trial_period trigger (BEFORE INSERT) will still run and set trial_ends_at
  INSERT INTO public.profiles (id, email, full_name, referred_by, referral_code)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data ->> 'full_name',
    referrer_id,
    new_referral_code
  );

  -- Auto-admin logic for specific email (Preserved from 20260116134500_auto_admin_naijalift01.sql)
  IF lower(new.email) = 'naijalift01@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$;

-- Create tracking view for Ambassadors
CREATE OR REPLACE VIEW public.referral_stats AS
SELECT 
  p.id as ambassador_id,
  p.full_name as ambassador_name,
  p.referral_code,
  COUNT(r.id) as referral_count
FROM public.profiles p
LEFT JOIN public.profiles r ON p.id = r.referred_by
GROUP BY p.id, p.full_name, p.referral_code;
