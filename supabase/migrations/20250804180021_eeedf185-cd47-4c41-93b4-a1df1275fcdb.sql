-- Add new columns to projects table for Fashn.ai integration
ALTER TABLE public.projects 
ADD COLUMN prediction_id TEXT,
ADD COLUMN result_url TEXT,
ADD COLUMN error_message TEXT,
ADD COLUMN metadata JSONB;

-- Create storage bucket for try-on images
INSERT INTO storage.buckets (id, name, public) VALUES ('tryon-images', 'tryon-images', true);

-- Create storage policies for try-on images
CREATE POLICY "Users can upload their own try-on images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tryon-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own try-on images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tryon-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Try-on images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tryon-images');