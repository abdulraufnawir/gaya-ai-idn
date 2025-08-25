import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const fashnApiKey = Deno.env.get('FASHN_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (!fashnApiKey) {
      throw new Error('FASHN_API_KEY not configured');
    }

    switch (action) {
      case 'run':
        return await runPrediction(params);
      case 'status':
        return await getStatus(params.id);
      case 'credits':
        return await getCredits();
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in fashn-api function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function runPrediction({ modelImage, garmentImage, modelName = 'tryon-v1.6', swapType = 'tryon' }) {
  // Generate webhook callback URL
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fashn-webhook`;
  console.log('Setting webhook URL:', webhookUrl);
  
  // For model swapping, we use different model configurations
  let requestBody;
  
  if (swapType === 'model_swap') {
    // For model swapping: swap the model while keeping the garment
    requestBody = {
      model_name: 'tryon-v1.6', // Currently using try-on model for swapping
      inputs: {
        model_image: modelImage, // New model to replace with
        garment_image: garmentImage // Original image containing the garment
      },
      webhook_url: webhookUrl
    };
  } else {
    // Default try-on behavior
    requestBody = {
      model_name: modelName,
      inputs: {
        model_image: modelImage,
        garment_image: garmentImage
      },
      webhook_url: webhookUrl
    };
  }

  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch('https://api.fashn.ai/v1/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${fashnApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to start prediction');
  }

  console.log('Fashn API success response:', data);

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getStatus(predictionId) {
  const response = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${fashnApiKey}`,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get prediction status');
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getCredits() {
  const response = await fetch('https://api.fashn.ai/v1/credits', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${fashnApiKey}`,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get credits');
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}