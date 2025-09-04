-- Set up trigger to automatically initialize credits for new users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();

-- Also ensure the trigger function exists and works properly
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Create initial credit balance with 5 free credits
  INSERT INTO public.user_credits (
    user_id, 
    credits_balance, 
    free_credits,
    total_purchased,
    total_used
  ) VALUES (
    NEW.id, 
    5, -- 5 free credits
    5,
    0,
    0
  );
  
  -- Create initial transaction record
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    credits_amount,
    credits_before,
    credits_after,
    description
  ) VALUES (
    NEW.id,
    'free',
    5,
    0,
    5,
    'Welcome bonus - 5 free credits'
  );
  
  -- Create free subscription record
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_type,
    status,
    credits_per_month,
    monthly_price
  ) VALUES (
    NEW.id,
    'free',
    'active',
    5,
    0
  );
  
  RETURN NEW;
END;
$function$;