-- Fix critical security vulnerability in user_credits table
-- Drop the overly permissive INSERT policy that allows anyone to create credits
DROP POLICY IF EXISTS "System can insert credits" ON public.user_credits;

-- Create restrictive policy for credit creation (service role only)
CREATE POLICY "Service role can insert credits" 
ON public.user_credits 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Add admin policy for credit management
CREATE POLICY "Admins can insert credits" 
ON public.user_credits 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));