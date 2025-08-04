-- Create storage policies for tryon-images bucket to allow authenticated users to upload and access their own files

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tryon-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tryon-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'tryon-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tryon-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view files in tryon-images bucket (for displaying results)
CREATE POLICY "Public access to tryon-images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tryon-images');