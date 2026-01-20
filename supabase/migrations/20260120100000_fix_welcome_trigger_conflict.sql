-- Fix: Remove the welcome email trigger from public.profiles
-- This trigger was accidentally re-added in a previous migration, causing welcome emails
-- to be sent immediately upon signup instead of waiting for email verification.

DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;
DROP FUNCTION IF EXISTS public.trigger_send_welcome_email();
