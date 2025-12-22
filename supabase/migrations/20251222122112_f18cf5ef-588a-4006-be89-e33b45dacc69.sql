-- Add new opportunity types to the enum
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'scholarship';
ALTER TYPE public.opportunity_type ADD VALUE IF NOT EXISTS 'social';

-- Add level column for scholarships
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS level text;