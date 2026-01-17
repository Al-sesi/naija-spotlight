-- Add WhatsApp notification preferences per category
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS whatsapp_scholarships BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_government BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_grants BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_social_tech BOOLEAN NOT NULL DEFAULT false;

