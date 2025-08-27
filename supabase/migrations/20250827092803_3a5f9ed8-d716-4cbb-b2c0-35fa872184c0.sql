-- Remove the problematic check constraint if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;

-- Add the missing analysis column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis text;

-- Add a proper check constraint for project_type that allows the values being used
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check 
CHECK (project_type IN ('virtual_tryon', 'model_swap', 'photo_edit', 'gemini_analysis'));