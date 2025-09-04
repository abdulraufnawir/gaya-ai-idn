import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Set the auth header for the client
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user already has credits
    const { data: existingCredits } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingCredits) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already has credits initialized',
          credits: existingCredits 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Initialize credits for the user
    const { error: creditsError } = await supabaseClient
      .from('user_credits')
      .insert({
        user_id: user.id,
        credits_balance: 5,
        free_credits: 5,
        total_purchased: 0,
        total_used: 0
      });

    if (creditsError) throw creditsError;

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'free',
        credits_amount: 5,
        credits_before: 0,
        credits_after: 5,
        description: 'Manual credit initialization - Welcome bonus'
      });

    if (transactionError) throw transactionError;

    // Create subscription record
    const { error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_type: 'free',
        status: 'active',
        credits_per_month: 5,
        monthly_price: 0
      });

    if (subscriptionError) throw subscriptionError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Credits initialized successfully!',
        credits: {
          credits_balance: 5,
          free_credits: 5,
          total_purchased: 0,
          total_used: 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});