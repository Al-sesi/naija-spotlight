-- ============================================================
-- Fix Referral Link Tracking (CORRECTED — no parenthesis bugs)
-- ============================================================

-- 1. Enable extensions (safe no-op if unavailable)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1b. Manual accent stripping fallback
CREATE OR REPLACE FUNCTION public.strip_accents_manual(s TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT TRANSLATE(
    COALESCE(s, ''),
    'ÀÁÂÃÄÅàáâãäåĀāĂăĄąÆæÇĆćĈĉĊċČčÐĎďĐđÈÉÊËèéêëĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħÌÍÎÏìíîïĨĩĪīĬĭĮįİıĴĵĶķĹĺĻļĽľĿŀŁłÑŃńŅņŇňŉŊŋÒÓÔÕÖØòóôõöøŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧÙÚÛÜùúûüŨũŪūŬŭŮůŰűŲųŴŵÝýÿŶŷŸŹźŻżŽž',
    'AAAAAAAAAAAAAAAAAAAAAAECCCCDDEEEEEEEEEEEEGGGGGGGGHHHHIIIIIIIIIIIIIIJJKKLLLLLLLLNNNNNNNNNOOOOOOOOOOOOOOOOERRRRRRSSSSSSSSTTTTTTUUUUUUUUUUUUUUUUWWYYYYYZZZZZZ'
  );
$$;

-- 1c. Pure SQL random hex generator (pgcrypto fallback via RANDOM())
CREATE OR REPLACE FUNCTION public.random_hex(len INT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars CONSTANT TEXT := '0123456789ABCDEF';
  result TEXT := '';
  i INT;
  pos INT;
BEGIN
  IF len <= 0 THEN
    RETURN '';
  END IF;

  BEGIN
    RETURN ENCODE(GEN_RANDOM_BYTES((len + 1) / 2), 'hex');
  EXCEPTION WHEN OTHERS THEN
    FOR i IN 1..len LOOP
      pos := 1 + FLOOR(RANDOM() * 16)::INT;
      result := result || SUBSTRING(chars FROM pos FOR 1);
    END LOOP;
    RETURN result;
  END;
END;
$$;

-- 2. Build referral base from name/email (broken into simple steps)
CREATE OR REPLACE FUNCTION public.build_referral_base(full_name TEXT, email TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
  at_pos INT;
  email_user TEXT;
BEGIN
  BEGIN
    cleaned := LOWER(UNACCENT(COALESCE(full_name, '')));
  EXCEPTION WHEN OTHERS THEN
    cleaned := LOWER(public.strip_accents_manual(COALESCE(full_name, '')));
  END;

  cleaned := NULLIF(regexp_replace(cleaned, '[^a-z0-9]', '', 'g'), '');

  IF cleaned IS NULL AND email IS NOT NULL THEN
    at_pos := POSITION('@' IN email);
    IF at_pos > 0 THEN
      email_user := SUBSTRING(email FROM 1 FOR at_pos - 1);
    ELSE
      email_user := email;
    END IF;
    email_user := COALESCE(NULLIF(email_user, ''), '');
    cleaned := LOWER(email_user);
    cleaned := NULLIF(regexp_replace(cleaned, '[^a-z0-9]', '', 'g'), '');
  END IF;

  IF cleaned IS NULL OR char_length(cleaned) = 0 THEN
    RETURN 'NLUSER';
  END IF;

  RETURN UPPER(cleaned);
END;
$$;

-- 3. Generate a UNIQUE referral code (always uppercase)
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code(full_name TEXT, email TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  suffix TEXT;
  attempt INT := 0;
  collision_count INT;
BEGIN
  base_code := public.build_referral_base(full_name, email);
  base_code := 'NL' || UPPER(SUBSTRING(base_code FROM 1 FOR 6));
  final_code := base_code;

  <<uniq_loop>>
  LOOP
    SELECT COUNT(*) INTO collision_count
    FROM public.profiles
    WHERE UPPER(referral_code) = final_code;

    EXIT uniq_loop WHEN collision_count = 0;

    attempt := attempt + 1;
    IF attempt > 10 THEN
      final_code := 'NL' || UPPER(SUBSTRING(REPLACE(REPLACE(public.random_hex(12), '0', 'G'), '1', 'H') FROM 1 FOR 8));
      EXIT uniq_loop;
    END IF;

    suffix := UPPER(SUBSTRING(REPLACE(REPLACE(public.random_hex(4), '0', 'X'), '1', 'Y') FROM 1 FOR 2));
    final_code := base_code || suffix;
  END LOOP uniq_loop;

  RETURN UPPER(final_code);
END;
$$;

-- 4. Normalize existing referral_codes to uppercase
UPDATE public.profiles
SET referral_code = UPPER(referral_code),
    updated_at = now()
WHERE referral_code IS NOT NULL
  AND referral_code <> UPPER(referral_code);

-- 5. Add functional index for case-insensitive lookup + unique index
CREATE INDEX IF NOT EXISTS profiles_referral_code_upper_idx
  ON public.profiles (UPPER(referral_code))
  WHERE referral_code IS NOT NULL;

DROP INDEX IF EXISTS profiles_referral_code_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_unique_idx
  ON public.profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- 6. Update the NEW USER trigger to capture referred_by + auto generate referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_referral_code TEXT;
BEGIN
  v_full_name := new.raw_user_meta_data ->> 'full_name';
  v_email := new.email;
  v_referral_code := public.generate_unique_referral_code(v_full_name, v_email);

  INSERT INTO public.profiles (id, email, full_name, referred_by, referral_code)
  VALUES (new.id, v_email, v_full_name, new.raw_user_meta_data ->> 'referred_by', v_referral_code);

  IF lower(v_email) = 'naijalift01@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- 7. Back-fill: copy referred_by from auth raw_user_meta_data for existing users
UPDATE public.profiles p
SET referred_by = (u.raw_user_meta_data ->> 'referred_by')::TEXT
FROM auth.users u
WHERE p.id = u.id
  AND p.referred_by IS NULL
  AND (u.raw_user_meta_data ->> 'referred_by') IS NOT NULL
  AND (u.raw_user_meta_data ->> 'referred_by') <> '';

-- 8. Back-fill: generate a referral_code for every user that lacks one
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, p.email
    FROM public.profiles p
    WHERE p.referral_code IS NULL
    ORDER BY p.created_at NULLS LAST
  LOOP
    v_code := public.generate_unique_referral_code(r.full_name, r.email);
    UPDATE public.profiles
    SET referral_code = v_code, updated_at = now()
    WHERE id = r.id;
  END LOOP;
END $$;
