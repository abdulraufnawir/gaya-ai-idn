-- Fix critical security vulnerability in user_subscriptions table
-- Drop the overly permissive policy that allows anyone to do anything
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.user_subscriptions;

-- Create restrictive policies for system operations (service role only)
CREATE POLICY "Service role can insert subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete subscriptions" 
ON public.user_subscriptions 
FOR DELETE 
USING (auth.role() = 'service_role');