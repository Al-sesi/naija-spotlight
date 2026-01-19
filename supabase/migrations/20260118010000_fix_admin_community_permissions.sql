-- Grant admin role to specific emails if they exist
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- For abdulmajeedsesiadam@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'abdulmajeedsesiadam@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- For naijalift01@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'naijalift01@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Add RLS policies for Admins on community_posts
-- Drop existing policies if they conflict (unlikely given names, but good practice to be safe or use distinct names)

CREATE POLICY "Admins can update any post"
ON public.community_posts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any post"
ON public.community_posts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
