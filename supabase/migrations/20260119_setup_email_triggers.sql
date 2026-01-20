-- Enable the pg_net extension to allow making HTTP requests to Edge Functions
create extension if not exists pg_net;

-- 1. Trigger Function for Welcome Emails
create or replace function public.trigger_send_welcome_email()
returns trigger as $$
declare
  -- PROJECT URL (Update if using a custom domain)
  project_url text := 'https://vdliauwtxklhlkltqqua.supabase.co/functions/v1/send-welcome-email';
  -- SERVICE ROLE KEY (You must replace this with your actual Supabase Service Role Key)
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbGlhdXd0eGtsaGxrbHRxcXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3Mjc1OCwiZXhwIjoyMDgyOTQ4NzU4fQ.DYXQwZFhtCeUM3fzyWWN84NOrAANNZvQkypAJmzjDGU';
begin
  -- Only send if email is present
  if new.email is not null then
    perform
      net.http_post(
        url := project_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'email', new.email,
          'fullName', new.full_name
        )
      );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Trigger for Welcome Emails (fires when a profile is created)
drop trigger if exists on_profile_created_send_welcome on public.profiles;
create trigger on_profile_created_send_welcome
  after insert on public.profiles
  for each row execute procedure public.trigger_send_welcome_email();


-- 3. Trigger Function for New Opportunity Notifications
create or replace function public.trigger_notify_new_opportunity()
returns trigger as $$
declare
  project_url text := 'https://vdliauwtxklhlkltqqua.supabase.co/functions/v1/notify-new-opportunity';
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbGlhdXd0eGtsaGxrbHRxcXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3Mjc1OCwiZXhwIjoyMDgyOTQ4NzU4fQ.DYXQwZFhtCeUM3fzyWWN84NOrAANNZvQkypAJmzjDGU';
begin
  perform
    net.http_post(
      url := project_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'opportunity', to_jsonb(new)
      )
    );
  return new;
end;
$$ language plpgsql security definer;

-- 4. Trigger for New Opportunities (fires when an opportunity is added)
drop trigger if exists on_opportunity_created_notify on public.opportunities;
create trigger on_opportunity_created_notify
  after insert on public.opportunities
  for each row execute procedure public.trigger_notify_new_opportunity();
