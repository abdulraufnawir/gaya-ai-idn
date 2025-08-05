-- Create admin role for current user (assuming the logged-in user should be admin)
-- Get the current user's ID and assign admin role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('acd7edbe-fc21-41fe-8f82-9d1121c98bd2', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;