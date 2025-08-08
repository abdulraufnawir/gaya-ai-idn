-- Add updated_at triggers to keep timestamps fresh
DO $$ BEGIN
  -- Projects updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_projects_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Profiles updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;