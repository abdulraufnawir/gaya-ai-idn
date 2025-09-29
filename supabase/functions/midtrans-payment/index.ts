import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY');
const MIDTRANS_API_URL = 'https://api.sandbox.midtrans.com'; // Use https://api.midtrans.com for production

serve(async (req) => {
  console.log('[MIDTRANS-PAYMENT] Function started');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[MIDTRANS-PAYMENT] No authorization header');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[MIDTRANS-PAYMENT] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[MIDTRANS-PAYMENT] User authenticated:', { userId: user.id });

    const { packageId, packageName, credits, price, userEmail, userName } = await req.json();
    console.log('[MIDTRANS-PAYMENT] Payment request:', { packageId, packageName, credits, price });

    // Generate unique order ID
    const orderId = `order_${user.id.slice(0, 8)}_${Date.now()}`;

    // Create Midtrans transaction
    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: price
      },
      customer_details: {
        email: userEmail || user.email,
        first_name: userName || 'User'
      },
      item_details: [
        {
          id: packageId,
          price: price,
          quantity: 1,
          name: `${packageName} - ${credits} Credits`
        }
      ],
      custom_field1: user.id, // Store user ID for webhook verification
      custom_field2: packageId,
      custom_field3: credits.toString()
    };

    console.log('[MIDTRANS-PAYMENT] Creating Midtrans transaction');

    const midtransResponse = await fetch(`${MIDTRANS_API_URL}/v2/charge`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(MIDTRANS_SERVER_KEY + ':')}`
      },
      body: JSON.stringify(midtransPayload)
    });

    const midtransData = await midtransResponse.json();
    console.log('[MIDTRANS-PAYMENT] Midtrans response:', { status: midtransResponse.status });

    if (!midtransResponse.ok) {
      console.error('[MIDTRANS-PAYMENT] Midtrans error:', midtransData);
      return new Response(JSON.stringify({ 
        error: 'Payment initialization failed',
        details: midtransData
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store pending transaction in database
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'pending_purchase',
        credits_amount: credits,
        credits_before: 0, // Will be updated when payment is confirmed
        credits_after: 0,
        reference_id: orderId,
        description: `Pending purchase: ${packageName}`,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      });

    if (transactionError) {
      console.error('[MIDTRANS-PAYMENT] Database error:', transactionError);
      return new Response(JSON.stringify({ error: 'Failed to create transaction record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[MIDTRANS-PAYMENT] Transaction created successfully');

    return new Response(JSON.stringify({
      success: true,
      orderId: orderId,
      paymentUrl: midtransData.redirect_url,
      token: midtransData.token,
      transactionStatus: midtransData.transaction_status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[MIDTRANS-PAYMENT] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});