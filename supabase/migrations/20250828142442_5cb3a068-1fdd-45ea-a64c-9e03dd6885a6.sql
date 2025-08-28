-- Update the projects table constraint to include model_generation project type
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_project_type_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_project_type_check 
CHECK (project_type = ANY (ARRAY['virtual_tryon'::text, 'model_swap'::text, 'photo_edit'::text, 'gemini_analysis'::text, 'model_generation'::text]));