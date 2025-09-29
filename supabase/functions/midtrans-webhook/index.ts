import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY');

async function verifySignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): Promise<string> {
  const data = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-512", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

serve(async (req) => {
  console.log('[MIDTRANS-WEBHOOK] Webhook received');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification = await req.json();
    console.log('[MIDTRANS-WEBHOOK] Notification received:', {
      orderId: notification.order_id,
      transactionStatus: notification.transaction_status,
      paymentType: notification.payment_type
    });

    // Verify signature
    const signatureKey = await verifySignature(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
      MIDTRANS_SERVER_KEY ?? ''
    );

    if (signatureKey !== notification.signature_key) {
      console.error('[MIDTRANS-WEBHOOK] Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    console.log('[MIDTRANS-WEBHOOK] Processing transaction:', { orderId, transactionStatus, fraudStatus });

    // Get the pending transaction
    const { data: pendingTransaction, error: fetchError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('reference_id', orderId)
      .eq('transaction_type', 'pending_purchase')
      .single();

    if (fetchError || !pendingTransaction) {
      console.error('[MIDTRANS-WEBHOOK] Transaction not found:', fetchError);
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = pendingTransaction.user_id;
    const creditsAmount = pendingTransaction.credits_amount;

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        console.log('[MIDTRANS-WEBHOOK] Payment successful, adding credits');

        // Get current user credits
        const { data: userCredits, error: creditsError } = await supabase
          .from('user_credits')
          .select('credits_balance')
          .eq('user_id', userId)
          .single();

        if (creditsError) {
          console.error('[MIDTRANS-WEBHOOK] Error fetching user credits:', creditsError);
          return new Response(JSON.stringify({ error: 'Failed to fetch user credits' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const currentBalance = userCredits?.credits_balance || 0;
        const newBalance = currentBalance + creditsAmount;

        // Update user credits
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({
            credits_balance: newBalance,
            total_purchased: supabase.rpc('coalesce', {
              expression: `total_purchased + ${creditsAmount}`,
              fallback: creditsAmount
            }),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[MIDTRANS-WEBHOOK] Error updating credits:', updateError);
          return new Response(JSON.stringify({ error: 'Failed to update credits' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update transaction record
        const { error: transactionUpdateError } = await supabase
          .from('credit_transactions')
          .update({
            transaction_type: 'purchase',
            credits_before: currentBalance,
            credits_after: newBalance,
            description: pendingTransaction.description.replace('Pending purchase:', 'Successful purchase:')
          })
          .eq('id', pendingTransaction.id);

        if (transactionUpdateError) {
          console.error('[MIDTRANS-WEBHOOK] Error updating transaction:', transactionUpdateError);
        }

        console.log('[MIDTRANS-WEBHOOK] Credits added successfully');

      } else {
        console.log('[MIDTRANS-WEBHOOK] Payment fraud detected');
        
        // Update transaction as failed
        const { error: transactionUpdateError } = await supabase
          .from('credit_transactions')
          .update({
            transaction_type: 'failed_purchase',
            description: pendingTransaction.description.replace('Pending purchase:', 'Failed purchase (fraud):')
          })
          .eq('id', pendingTransaction.id);

        if (transactionUpdateError) {
          console.error('[MIDTRANS-WEBHOOK] Error updating failed transaction:', transactionUpdateError);
        }
      }
    } else if (transactionStatus === 'pending') {
      console.log('[MIDTRANS-WEBHOOK] Payment pending');
      // Keep transaction as pending
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
      console.log('[MIDTRANS-WEBHOOK] Payment failed/cancelled/expired');
      
      // Update transaction as failed
      const { error: transactionUpdateError } = await supabase
        .from('credit_transactions')
        .update({
          transaction_type: 'failed_purchase',
          description: pendingTransaction.description.replace('Pending purchase:', `Failed purchase (${transactionStatus}):`)
        })
        .eq('id', pendingTransaction.id);

      if (transactionUpdateError) {
        console.error('[MIDTRANS-WEBHOOK] Error updating failed transaction:', transactionUpdateError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[MIDTRANS-WEBHOOK] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
