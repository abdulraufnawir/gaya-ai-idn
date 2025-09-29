import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDIT-MANAGER] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client using service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { action, credits, description, reference_id, transaction_type } = await req.json();
    logStep("Request received", { action, credits, description });

    let result;

    switch (action) {
      case 'check_balance':
        // Get current credits balance
        const { data: creditsData, error: creditsError } = await supabaseClient
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (creditsError && creditsError.code !== 'PGRST116') throw creditsError;
        
        result = {
          success: true,
          credits_balance: creditsData?.credits_balance || 0,
          total_purchased: creditsData?.total_purchased || 0,
          total_used: creditsData?.total_used || 0,
          free_credits: creditsData?.free_credits || 0
        };
        break;

      case 'use_credits':
        // Use credits (deduct from balance)
        if (!credits || credits <= 0) throw new Error("Invalid credits amount");
        
        const { data: useResult, error: useError } = await supabaseClient
          .rpc('use_credits', {
            p_user_id: user.id,
            p_credits_amount: credits,
            p_description: description || 'Credit usage',
            p_reference_id: reference_id || null
          });

        if (useError) throw useError;
        
        result = {
          success: useResult,
          message: useResult ? 'Credits deducted successfully' : 'Insufficient credits'
        };
        break;

      case 'add_credits':
        // Only allow admin users or service role to add credits directly
        // Regular credit additions should go through payment verification
        if (transaction_type !== 'admin_grant' && transaction_type !== 'free') {
          throw new Error('Direct credit addition not allowed. Use payment system instead.');
        }
        
        // Add credits (purchase or bonus)
        if (!credits || credits <= 0) throw new Error("Invalid credits amount");
        
        const { data: addResult, error: addError } = await supabaseClient
          .rpc('add_credits', {
            p_user_id: user.id,
            p_credits_amount: credits,
            p_transaction_type: transaction_type || 'purchase',
            p_description: description || 'Credit purchase',
            p_reference_id: reference_id || null
          });

        if (addError) throw addError;
        
        result = {
          success: addResult,
          message: addResult ? 'Credits added successfully' : 'Failed to add credits'
        };
        break;

      case 'get_transactions':
        // Get transaction history
        const { data: transactionsData, error: transactionsError } = await supabaseClient
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (transactionsError) throw transactionsError;
        
        result = {
          success: true,
          transactions: transactionsData || []
        };
        break;

      case 'expire_credits':
        // Expire old credits (admin function)
        const { data: expireResult, error: expireError } = await supabaseClient
          .rpc('expire_old_credits');

        if (expireError) throw expireError;
        
        result = {
          success: true,
          expired_count: expireResult,
          message: `Expired credits for ${expireResult} users`
        };
        break;

      default:
        throw new Error("Invalid action. Supported actions: check_balance, use_credits, add_credits, get_transactions, expire_credits");
    }

    logStep("Operation completed", { action, result });
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in credit-manager", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});