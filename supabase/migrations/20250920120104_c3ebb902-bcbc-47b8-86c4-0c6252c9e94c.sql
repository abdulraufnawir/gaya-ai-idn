-- Create trigger to initialize credits for new users
-- First, drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;

-- Create trigger to initialize user credits when they sign up
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_credits();

-- Also ensure the handle_new_user trigger exists for profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();