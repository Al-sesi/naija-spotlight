-- =====================================================================
-- PATCH: Make the EXISTING link for Sunday Fidelis Ugbahi work RIGHT NOW
--   User email : ugbahiugbahi@gmail.com   (confirmed)
--   Shared URL  : https://www.naijalift.space/sign-up?ref=sundayfideXJ8K
--
-- Run this AFTER you run 20260810099999_FINAL_ADMIN_REFERRAL_FIX.sql
--
-- Strategy:
--   1. Look up user by their EXACT email (ugbahiugbahi@gmail.com)
--      with a fallback to name-match if email differs
--   2. Ensure the stored referral_code = 'SUNDAYFIDEXJ8K' which is the
--      UPPER() of 'sundayfideXJ8K' so that after Auth.tsx uppercases
--      the URL param, the two match exactly via eq() lookup.
--      (NOTE: previously had TYPO SUNDAYFIXJ8K — missing "DE" from fide)
--   3. Print user_id, stored code, and re-verification SELECT.
--
-- SAFE to re-run (idempotent: uses UPDATE and only overrides if not set,
-- or overrides always if FORCE = TRUE below).
-- =====================================================================

DO $$
DECLARE
  v_user_id      UUID;
  v_full_name    TEXT;
  v_email        TEXT;
  v_current_code TEXT;
  v_target_code  TEXT := 'SUNDAYFIDEXJ8K';   -- UPPER('sundayfideXJ8K'): s-u-n-d-a-y-f-i-d-e-X-J-8-K
  v_forced       BOOLEAN := TRUE;          -- CRITICAL: overwrite existing (potentially WRONG) SUNDAYFIXJ8K code
BEGIN
  -- 1) Find the user by EXACT email first
  SELECT id, full_name, email, referral_code
    INTO v_user_id, v_full_name, v_email, v_current_code
    FROM public.profiles
   WHERE lower(email) = lower('ugbahiugbahi@gmail.com')
   LIMIT 1;

  -- 2) Fallback: name-based lookup for safety
  IF v_user_id IS NULL THEN
    SELECT id, full_name, email, referral_code
      INTO v_user_id, v_full_name, v_email, v_current_code
      FROM public.profiles
     WHERE lower(full_name) LIKE lower('%Sunday Fidelis Ugbahi%')
        OR lower(full_name) LIKE lower('%ugbahi%')
        OR lower(full_name) LIKE lower('%sundayfide%')
     ORDER BY created_at ASC
     LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION E'Could not find Sunday Fidelis Ugbahi in profiles.\n'
      'Search ran for: email=ugbahiugbahi@gmail.com + name LIKE %%sunday%% / %%ugbahi%%.\n'
      'Verify user actually signed up at least once: SELECT id,full_name,email FROM public.profiles ORDER BY created_at DESC LIMIT 50;';
  END IF;

  -- 3) Store the target code
  IF v_current_code IS NULL OR v_forced THEN
    UPDATE public.profiles
       SET referral_code = v_target_code,
           updated_at    = now()
     WHERE id = v_user_id;
    RAISE NOTICE '✅ referral_code SET for Sunday Fidelis Ugbahi';
  ELSE
    RAISE NOTICE 'ℹ️  Sunday Fidelis Ugbahi already had referral_code = %. Leaving intact. (Re-run with v_forced := TRUE in the DECLARE block to overwrite).', v_current_code;
    v_target_code := v_current_code;
  END IF;

  RAISE NOTICE E'\n'
    'user_id      : %\n'
    'full_name    : %\n'
    'email        : %\n'
    'stored code  : %\n'
    'URL param    : sundayfideXJ8K → after UPPER() → SUNDAYFIDEXJ8K → DB match ✅\n'
    'Shared URL   : https://www.naijalift.space/sign-up?ref=sundayfideXJ8K\n'
    'Verify SQL   : SELECT id, full_name, email, referral_code FROM public.profiles WHERE id = ''%'';',
    v_user_id,
    COALESCE(v_full_name, '<no name>'),
    COALESCE(v_email, '<no email>'),
    v_target_code,
    v_user_id;
END $$;
