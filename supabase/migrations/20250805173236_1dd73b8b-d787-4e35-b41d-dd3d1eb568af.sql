-- Create admin policies for profiles table
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create admin policies for projects table
CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any project" 
ON public.projects 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));