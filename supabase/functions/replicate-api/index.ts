import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set');
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    const { action, ...params } = await req.json();

    switch (action) {
      case 'virtual_tryon':
        return await processVirtualTryOn(replicate, params);
      case 'background_removal':
        return await removeBackground(replicate, params);
      case 'background_replacement':
        return await replaceBackground(replicate, params);
      case 'image_enhancement':
        return await enhanceImage(replicate, params);
      case 'status':
        return await getStatus(replicate, params.predictionId);
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in replicate-api function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function processVirtualTryOn(replicate: any, { modelImage, garmentImage, projectId }: { modelImage: string; garmentImage: string; projectId: string }) {
  console.log('Processing virtual try-on with Replicate');
  
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`;
  console.log('Setting webhook URL:', webhookUrl);
  
  const prediction = await replicate.predictions.create({
    version: "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
    input: {
      human_img: modelImage,
      garm_img: garmentImage,
      garment_des: "Virtual try-on result"
    },
    webhook: webhookUrl,
    webhook_events_filter: ["start", "output", "logs", "completed"]
  });

  console.log('Virtual try-on prediction created:', prediction.id);

  return new Response(JSON.stringify({ 
    predictionId: prediction.id,
    projectId: projectId 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function removeBackground(replicate: any, { imageUrl }: { imageUrl: string }) {
  console.log('Removing background for image:', imageUrl);
  
  // Generate webhook callback URL
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`;
  console.log('Setting webhook URL:', webhookUrl);
  
  const prediction = await replicate.predictions.create({
    version: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
    input: {
      image: imageUrl
    },
    webhook: webhookUrl,
    webhook_events_filter: ["start", "output", "logs", "completed"]
  });

  return new Response(JSON.stringify({ predictionId: prediction.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function replaceBackground(replicate: any, { imageUrl, prompt }: { imageUrl: string; prompt: string }) {
  console.log('Replacing background for image:', imageUrl, 'with prompt:', prompt);
  
  // Generate webhook callback URL
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`;
  console.log('Setting webhook URL:', webhookUrl);
  
  const prediction = await replicate.predictions.create({
    version: "e9e2ad4616048014645b4d3a0bc95f0b254c03dcbbbe8e6a28483bcbae4bd9a5",
    input: {
      image_url: imageUrl,
      bg_prompt: prompt
    },
    webhook: webhookUrl,
    webhook_events_filter: ["start", "output", "logs", "completed"]
  });

  return new Response(JSON.stringify({ predictionId: prediction.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function enhanceImage(replicate: any, { imageUrl }: { imageUrl: string }) {
  console.log('Enhancing image:', imageUrl);
  
  // Generate webhook callback URL
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`;
  console.log('Setting webhook URL:', webhookUrl);
  
  const prediction = await replicate.predictions.create({
    version: "tencentarc/gfpgan",
    input: {
      img: imageUrl,
      version: "v1.4",
      scale: 2
    },
    webhook: webhookUrl,
    webhook_events_filter: ["start", "output", "logs", "completed"]
  });

  return new Response(JSON.stringify({ predictionId: prediction.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getStatus(replicate: any, predictionId: string) {
  console.log('Checking status for prediction:', predictionId);
  
  const prediction = await replicate.predictions.get(predictionId);
  
  return new Response(JSON.stringify(prediction), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}