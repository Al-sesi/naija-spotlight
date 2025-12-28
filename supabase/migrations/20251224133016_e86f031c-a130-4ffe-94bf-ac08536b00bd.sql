-- Create site_alerts table for admin announcements
CREATE TABLE public.site_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.site_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active alerts
CREATE POLICY "Anyone can view active alerts"
ON public.site_alerts
FOR SELECT
USING (true);

-- Only admins can modify alerts
CREATE POLICY "Admins can insert alerts"
ON public.site_alerts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts"
ON public.site_alerts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete alerts"
ON public.site_alerts
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_site_alerts_updated_at
BEFORE UPDATE ON public.site_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default alert for beta
INSERT INTO public.site_alerts (message, is_active, type)
VALUES ('🎉 Welcome to NAIJALIFT Beta! Enjoy free access to all premium features during our pilot phase.', true, 'success');