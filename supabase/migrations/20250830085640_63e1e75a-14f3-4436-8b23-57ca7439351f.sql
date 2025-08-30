-- Fix credit_transactions security issue by replacing the overly permissive policy
-- Remove the insecure "System can insert transactions" policy
DROP POLICY IF EXISTS "System can insert transactions" ON public.credit_transactions;

-- Create a secure policy that only allows service role operations
-- This ensures only our authenticated edge functions can insert transactions
CREATE POLICY "Service role can insert transactions" 
ON public.credit_transactions 
FOR INSERT 
WITH CHECK (
  -- Only allow inserts from service role (our edge functions)
  auth.role() = 'service_role' OR
  -- Or allow inserts where user_id matches the authenticated user
  (auth.uid() = user_id AND auth.role() = 'authenticated')
);

-- Also add a policy to allow system operations for credit management
CREATE POLICY "System operations for credit management"
ON public.credit_transactions
FOR INSERT
WITH CHECK (
  -- Allow service role operations (edge functions)
  auth.role() = 'service_role'
);