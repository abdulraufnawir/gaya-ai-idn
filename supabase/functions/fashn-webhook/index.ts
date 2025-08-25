import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fashn webhook received:', req.method, req.url);
    
    const webhookData = await req.json();
    console.log('Webhook payload:', JSON.stringify(webhookData, null, 2));

    // Extract prediction data from Fashn webhook
    const { 
      id: predictionId, 
      status, 
      output, 
      error,
      // Add any additional Fashn-specific fields
    } = webhookData;

    if (!predictionId) {
      console.error('No prediction ID in webhook payload');
      return new Response('Missing prediction ID', { status: 400, headers: corsHeaders });
    }

    // Update project in database
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // Handle successful completion
    if (status === 'succeeded' && output) {
      updateData.result_image_url = Array.isArray(output) ? output[0] : output;
      console.log('Setting result image URL:', updateData.result_image_url);
    }

    // Handle errors
    if (status === 'failed' && error) {
      updateData.error_message = typeof error === 'string' ? error : JSON.stringify(error);
      console.log('Setting error message:', updateData.error_message);
    }

    // Update the project
    const { data: project, error: updateError } = await supabaseClient
      .from('projects')
      .update(updateData)
      .eq('prediction_id', predictionId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response('Database update failed', { status: 500, headers: corsHeaders });
    }

    if (!project) {
      console.error('No project found with prediction ID:', predictionId);
      return new Response('Project not found', { status: 404, headers: corsHeaders });
    }

    console.log('Successfully updated project:', project.id, 'with status:', status);

    return new Response(JSON.stringify({ 
      success: true, 
      projectId: project.id,
      status: status 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});