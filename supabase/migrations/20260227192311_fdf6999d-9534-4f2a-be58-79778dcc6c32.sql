
-- Add missing columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled Project';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS original_image_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS result_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS analysis TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Add missing columns to user_subscriptions
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT true;

-- Add missing columns to credit_transactions
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Create ai_prompts table for admin prompt manager
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT '',
  user_prompt_template TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  clothing_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prompts" ON public.ai_prompts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read active prompts" ON public.ai_prompts
  FOR SELECT USING (is_active = true);
