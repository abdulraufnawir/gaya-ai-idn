-- Add clothing_types column to ai_prompts table
ALTER TABLE public.ai_prompts 
ADD COLUMN clothing_types text[] DEFAULT '{}';

COMMENT ON COLUMN public.ai_prompts.clothing_types IS 'Array of applicable clothing types: atasan, bawahan, gaun, hijab';