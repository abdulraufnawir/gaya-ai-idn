-- Rating tabel
CREATE TABLE public.tryon_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL UNIQUE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  reasons TEXT[] DEFAULT '{}'::text[],
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tryon_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ratings"
ON public.tryon_ratings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ratings"
ON public.tryon_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
ON public.tryon_ratings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
ON public.tryon_ratings FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_tryon_ratings_user ON public.tryon_ratings(user_id, created_at DESC);
CREATE INDEX idx_tryon_ratings_rating ON public.tryon_ratings(rating);

CREATE TRIGGER update_tryon_ratings_updated_at
BEFORE UPDATE ON public.tryon_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tambah kolom retry tracking di projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_project_id UUID;

CREATE INDEX IF NOT EXISTS idx_projects_parent ON public.projects(parent_project_id);