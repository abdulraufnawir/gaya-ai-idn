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

async function removeBackground(replicate: any, { imageUrl }: { imageUrl: string }) {
  console.log('Removing background for image:', imageUrl);
  
  const prediction = await replicate.predictions.create({
    version: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
    input: {
      image: imageUrl
    }
  });

  return new Response(JSON.stringify({ predictionId: prediction.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function replaceBackground(replicate: any, { imageUrl, prompt }: { imageUrl: string; prompt: string }) {
  console.log('Replacing background for image:', imageUrl, 'with prompt:', prompt);
  
  const prediction = await replicate.predictions.create({
    version: "c76e94e8e6b44b42bc65de97e41faea6f2d21b3b76a4a6b01e1e42b4b5a0e8ab",
    input: {
      image_url: imageUrl,
      bg_prompt: prompt,
      negative_prompt: "low quality, blurry, distorted, artifacts",
      sync: false,
      fast: true,
      refine_prompt: true,
      enhance_ref_image: true,
      original_quality: false,
      force_rmbg: false,
      content_moderation: false
    }
  });

  return new Response(JSON.stringify({ predictionId: prediction.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function enhanceImage(replicate: any, { imageUrl }: { imageUrl: string }) {
  console.log('Enhancing image:', imageUrl);
  
  const prediction = await replicate.predictions.create({
    version: "tencentarc/gfpgan",
    input: {
      img: imageUrl,
      version: "v1.4",
      scale: 2
    }
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