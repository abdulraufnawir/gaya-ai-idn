-- Create user_credits table to track credit balances and expiration
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  free_credits INTEGER NOT NULL DEFAULT 5, -- Free credits on signup
  last_reset_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit_transactions table to track all credit activities
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'free', 'expired'
  credits_amount INTEGER NOT NULL,
  credits_before INTEGER NOT NULL DEFAULT 0,
  credits_after INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ, -- Credits expire 1 year from purchase
  reference_id TEXT, -- Reference to payment or project
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_subscriptions table for premium plans
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free', -- 'free', 'basic', 'premium', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  credits_per_month INTEGER NOT NULL DEFAULT 5,
  monthly_price INTEGER NOT NULL DEFAULT 0, -- in cents (IDR)
  subscription_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_end TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view their own credits" ON public.user_credits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON public.user_credits
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert credits" ON public.user_credits
FOR INSERT WITH CHECK (true);

-- RLS Policies for credit_transactions  
CREATE POLICY "Users can view their own transactions" ON public.credit_transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON public.credit_transactions
FOR INSERT WITH CHECK (true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON public.user_subscriptions
FOR ALL USING (true);

-- Admin policies
CREATE POLICY "Admins can view all credits" ON public.user_credits
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all transactions" ON public.credit_transactions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_expires_at ON public.credit_transactions(expires_at);
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);

-- Create triggers for updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize user credits on signup
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create initial credit balance with 5 free credits
  INSERT INTO public.user_credits (
    user_id, 
    credits_balance, 
    free_credits,
    total_purchased
  ) VALUES (
    NEW.id, 
    5, -- 5 free credits
    5,
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
$$;

-- Create trigger to initialize credits on user signup
CREATE TRIGGER on_auth_user_created_init_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_credits();

-- Function to use credits (deduct from balance)
CREATE OR REPLACE FUNCTION public.use_credits(
  p_user_id UUID,
  p_credits_amount INTEGER,
  p_description TEXT DEFAULT 'Credit usage',
  p_reference_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF current_balance < p_credits_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - p_credits_amount;
  
  -- Update user credits
  UPDATE public.user_credits
  SET 
    credits_balance = new_balance,
    total_used = total_used + p_credits_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    credits_amount,
    credits_before,
    credits_after,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    'usage',
    -p_credits_amount, -- negative for usage
    current_balance,
    new_balance,
    p_reference_id,
    p_description
  );
  
  RETURN TRUE;
END;
$$;

-- Function to add credits (purchase or bonus)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_credits_amount INTEGER,
  p_transaction_type TEXT DEFAULT 'purchase',
  p_description TEXT DEFAULT 'Credit purchase',
  p_reference_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
  expiry_date TIMESTAMPTZ;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id;
  
  -- Calculate new balance
  new_balance := current_balance + p_credits_amount;
  
  -- Set expiry date (1 year from now for purchases)
  IF p_transaction_type = 'purchase' THEN
    expiry_date := now() + INTERVAL '1 year';
  END IF;
  
  -- Update user credits
  UPDATE public.user_credits
  SET 
    credits_balance = new_balance,
    total_purchased = CASE 
      WHEN p_transaction_type = 'purchase' THEN total_purchased + p_credits_amount
      ELSE total_purchased
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    credits_amount,
    credits_before,
    credits_after,
    expires_at,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_credits_amount,
    current_balance,
    new_balance,
    expiry_date,
    p_reference_id,
    p_description
  );
  
  RETURN TRUE;
END;
$$;

-- Function to expire old credits (to be run by cron job)
CREATE OR REPLACE FUNCTION public.expire_old_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER := 0;
  credit_record RECORD;
BEGIN
  -- Find and expire credits older than 1 year
  FOR credit_record IN
    SELECT DISTINCT ct.user_id, SUM(ct.credits_amount) as expired_credits
    FROM public.credit_transactions ct
    WHERE ct.transaction_type = 'purchase'
      AND ct.expires_at < now()
      AND ct.id NOT IN (
        SELECT reference_id::UUID 
        FROM public.credit_transactions 
        WHERE transaction_type = 'expired' 
        AND reference_id IS NOT NULL
      )
    GROUP BY ct.user_id
  LOOP
    -- Deduct expired credits from balance
    UPDATE public.user_credits
    SET credits_balance = GREATEST(0, credits_balance - credit_record.expired_credits),
        updated_at = now()
    WHERE user_id = credit_record.user_id;
    
    -- Record expiration transaction
    INSERT INTO public.credit_transactions (
      user_id,
      transaction_type,
      credits_amount,
      credits_before,
      credits_after,
      description
    )
    SELECT 
      credit_record.user_id,
      'expired',
      -credit_record.expired_credits,
      uc.credits_balance + credit_record.expired_credits,
      uc.credits_balance,
      'Credits expired after 1 year'
    FROM public.user_credits uc
    WHERE uc.user_id = credit_record.user_id;
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$;