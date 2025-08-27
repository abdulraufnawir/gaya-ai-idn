-- Create a more robust admin check function that handles authentication properly
CREATE OR REPLACE FUNCTION public.check_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    current_user_id uuid;
    is_admin_user boolean := false;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Return false if no user is authenticated
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has admin role
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = current_user_id
          AND role = 'admin'
    ) INTO is_admin_user;
    
    RETURN is_admin_user;
END;
$$;