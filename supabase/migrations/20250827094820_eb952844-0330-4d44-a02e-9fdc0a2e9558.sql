-- Grant admin access to abdulraufnawir@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('acd7edbe-fc21-41fe-8f82-9d1121c98bd2', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;