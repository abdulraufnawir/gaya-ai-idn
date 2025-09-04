-- Update the trigger function to give 10 credits instead of 5
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create initial credit balance with 10 free credits
  INSERT INTO public.user_credits (
    user_id, 
    credits_balance, 
    free_credits,
    total_purchased,
    total_used
  ) VALUES (
    NEW.id, 
    10, -- 10 free credits instead of 5
    10,
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
    10,
    0,
    10,
    'Welcome bonus - 10 free credits'
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
    10,
    0
  );
  
  RETURN NEW;
END;
$function$;

-- Create admin function to give credits to any user
CREATE OR REPLACE FUNCTION public.admin_add_credits(
  p_target_user_id uuid, 
  p_credits_amount integer, 
  p_description text DEFAULT 'Admin credit allocation'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Check if the current user is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Get current balance of target user
  SELECT credits_balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = p_target_user_id;
  
  -- If user doesn't have credits record, create one
  IF current_balance IS NULL THEN
    INSERT INTO public.user_credits (
      user_id, 
      credits_balance, 
      free_credits,
      total_purchased,
      total_used
    ) VALUES (
      p_target_user_id, 
      p_credits_amount,
      0,
      0,
      0
    );
    current_balance := 0;
    new_balance := p_credits_amount;
  ELSE
    -- Calculate new balance
    new_balance := current_balance + p_credits_amount;
    
    -- Update user credits
    UPDATE public.user_credits
    SET 
      credits_balance = new_balance,
      updated_at = now()
    WHERE user_id = p_target_user_id;
  END IF;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    credits_amount,
    credits_before,
    credits_after,
    description
  ) VALUES (
    p_target_user_id,
    'admin_grant',
    p_credits_amount,
    current_balance,
    new_balance,
    p_description
  );
  
  RETURN TRUE;
END;
$function$;