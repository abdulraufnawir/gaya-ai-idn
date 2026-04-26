-- Helper function for updated_at maintenance (idempotent, safe to (re)create)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.tryon_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  model_image_url TEXT,
  model_source TEXT,
  model_meta JSONB DEFAULT '{}'::jsonb,
  category TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tryon_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presets"
ON public.tryon_presets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presets"
ON public.tryon_presets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
ON public.tryon_presets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
ON public.tryon_presets FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_tryon_presets_user ON public.tryon_presets(user_id, last_used_at DESC NULLS LAST);

CREATE TRIGGER update_tryon_presets_updated_at
BEFORE UPDATE ON public.tryon_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();