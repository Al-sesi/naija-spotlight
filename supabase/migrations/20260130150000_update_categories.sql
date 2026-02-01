-- Add new opportunity types to the enum
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'recruitment';
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'internship';
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'competition';

-- Migrate existing 'government' opportunities to 'recruitment'
UPDATE public.opportunities 
SET category = 'recruitment' 
WHERE category = 'government';

-- Note: We are keeping 'government' in the enum and as a column suffix in notification_preferences
-- to avoid complex migration of columns and potential data loss/downtime.
-- The application logic will map 'recruitment' category to 'government' preferences where necessary.
