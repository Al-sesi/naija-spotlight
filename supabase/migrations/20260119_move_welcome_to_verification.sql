-- 1. Drop the old trigger that sends email immediately on signup (profile creation)
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;

-- 2. Create the function to handle verification event
CREATE OR REPLACE FUNCTION public.handle_verification_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- PROJECT URL: Update this if you are using a custom domain or different project
  project_url text := 'https://vdliauwtxklhlkltqqua.supabase.co/functions/v1/send-welcome-email';
  
  -- SERVICE ROLE KEY: You MUST replace this with your actual Service Role Key
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbGlhdXd0eGtsaGxrbHRxcXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3Mjc1OCwiZXhwIjoyMDgyOTQ4NzU4fQ.DYXQwZFhtCeUM3fzyWWN84NOrAANNZvQkypAJmzjDGU';
  
  user_full_name text;
BEGIN
  -- Check if email was just confirmed (changed from NULL to a timestamp)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Try to get name from metadata (standard Supabase Auth location)
    user_full_name := NEW.raw_user_meta_data ->> 'full_name';
    
    -- Fallback if name is missing
    IF user_full_name IS NULL THEN
      user_full_name := 'Champion';
    END IF;

    -- Call the Edge Function
    PERFORM
      net.http_post(
        url := project_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'email', NEW.email,
          'fullName', user_full_name
        )
      );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Create the trigger on auth.users to watch for verification
DROP TRIGGER IF EXISTS on_auth_user_verification ON auth.users;

CREATE TRIGGER on_auth_user_verification
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_verification_welcome_email();
