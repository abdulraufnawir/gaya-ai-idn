-- Drop the existing constraint with the typo
ALTER TABLE public.projects DROP CONSTRAINT projects_project_type_check;

-- Add the corrected constraint
ALTER TABLE public.projects ADD CONSTRAINT projects_project_type_check 
CHECK (project_type = ANY (ARRAY['virtual_tryon'::text, 'model_swap'::text, 'photo_edit'::text]));