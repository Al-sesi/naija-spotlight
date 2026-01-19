-- Enable pg_net extension if not already enabled
create extension if not exists pg_net with schema extensions;

-- 1. Trigger for Welcome Email (Fires when a new profile is created)
create or replace function public.trigger_send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  project_url text := 'https://YOUR_PROJECT_REF.supabase.co'; -- REPLACE WITH YOUR PROJECT URL
  service_role_key text := 'YOUR_SERVICE_ROLE_KEY'; -- REPLACE WITH YOUR SERVICE ROLE KEY
begin
  perform
    net.http_post(
      url := project_url || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'email', new.email,
        'fullName', new.full_name
      )
    );
  return new;
end;
$$;

drop trigger if exists on_profile_created_send_welcome on public.profiles;

create trigger on_profile_created_send_welcome
  after insert on public.profiles
  for each row
  execute function public.trigger_send_welcome_email();


-- 2. Trigger for New Opportunity Notification (Fires when a new opportunity is added)
create or replace function public.trigger_notify_new_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  project_url text := 'https://YOUR_PROJECT_REF.supabase.co'; -- REPLACE WITH YOUR PROJECT URL
  service_role_key text := 'YOUR_SERVICE_ROLE_KEY'; -- REPLACE WITH YOUR SERVICE ROLE KEY
begin
  -- Only trigger for verified opportunities
  if new.is_verified = true then
    perform
      net.http_post(
        url := project_url || '/functions/v1/notify-new-opportunity',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'opportunity', row_to_json(new)
        )
      );
  end if;
  return new;
end;
$$;

drop trigger if exists on_opportunity_created_notify on public.opportunities;

create trigger on_opportunity_created_notify
  after insert on public.opportunities
  for each row
  execute function public.trigger_notify_new_opportunity();
