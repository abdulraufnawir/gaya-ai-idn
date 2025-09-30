-- Create ai_prompts table for managing AI prompts per feature
CREATE TABLE public.ai_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_prompts
CREATE POLICY "Admins can view all prompts" 
ON public.ai_prompts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert prompts" 
ON public.ai_prompts 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update prompts" 
ON public.ai_prompts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete prompts" 
ON public.ai_prompts 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to read active prompts (for edge functions)
CREATE POLICY "Service role can read prompts" 
ON public.ai_prompts 
FOR SELECT 
USING (auth.role() = 'service_role');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts for each feature
INSERT INTO public.ai_prompts (feature_name, system_prompt, user_prompt_template, description) VALUES
('virtual_tryon', 'You are an AI assistant specialized in virtual try-on image generation. Generate realistic try-on results that maintain the model''s pose and the garment''s details.', 'Generate a virtual try-on image with the following model and garment', 'System prompt for virtual try-on AI feature'),
('model_generation', 'You are an AI assistant specialized in generating realistic human models for fashion e-commerce. Create diverse, professional-looking models suitable for clothing try-on.', 'Generate a model image based on: {description}', 'System prompt for AI model generation feature'),
('product_marketing', 'You are an AI assistant specialized in product marketing and background generation. Create professional, appealing marketing images that highlight the product.', 'Create a marketing image for: {product_description}', 'System prompt for product marketing AI feature'),
('background_removal', 'You are an AI assistant specialized in background removal. Remove backgrounds cleanly while preserving subject details.', 'Remove the background from this image', 'System prompt for background removal feature'),
('image_enhancement', 'You are an AI assistant specialized in image enhancement. Improve image quality, lighting, and overall appeal while maintaining authenticity.', 'Enhance this image to improve quality and appeal', 'System prompt for image enhancement feature');