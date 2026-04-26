-- Lookbook variations: pose & background derivatives of a base try-on result
CREATE TABLE public.lookbook_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_project_id UUID NOT NULL,
  variation_type TEXT NOT NULL, -- 'pose' | 'background'
  variation_key TEXT NOT NULL,  -- e.g. 'front', 'side', 'studio_white', 'bali_outdoor'
  variation_label TEXT NOT NULL,
  source_image_url TEXT NOT NULL,
  result_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing' | 'completed' | 'failed'
  error_message TEXT,
  credits_used INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lookbook_user ON public.lookbook_variations(user_id, created_at DESC);
CREATE INDEX idx_lookbook_source ON public.lookbook_variations(source_project_id);

ALTER TABLE public.lookbook_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variations"
  ON public.lookbook_variations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variations"
  ON public.lookbook_variations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variations"
  ON public.lookbook_variations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variations"
  ON public.lookbook_variations FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_lookbook_variations_updated_at
  BEFORE UPDATE ON public.lookbook_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();