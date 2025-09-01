-- Check current constraint and allowed project types
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'projects_project_type_check';

-- Update the constraint to allow the new project type
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;

ALTER TABLE projects ADD CONSTRAINT projects_project_type_check 
CHECK (project_type IN (
  'virtual_tryon', 
  'model_swap', 
  'photo_edit', 
  'model_generation',
  'product_marketing'
));