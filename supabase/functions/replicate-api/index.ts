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
      case 'generateModel':
        return await generateModel(replicate, params);
      case 'modelSwap':
        return await processModelSwap(replicate, params);
      case 'photoEdit':
        return await processPhotoEdit(replicate, params);
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

async function generateModel(
  replicate: any,
  { prompt, clothingType, aspectRatio, referenceImage, projectId }: { prompt: string; clothingType?: string; aspectRatio?: string; referenceImage?: string; projectId: string }
) {
  console.log('Generating model with nano-banana for project:', projectId);

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`;

  // Build prompt with clothing type context and strict constraints
  let finalPrompt = '';
  const typeRules: Record<string, string> = {
    'Atasan': 'Generate a fashion model wearing a TOP only (shirt, blouse, jacket). Do not generate a dress or gown. Show full body. Bottoms should be simple neutral to keep focus on the top.',
    'Bawahan': 'Generate a fashion model wearing BOTTOMS (pants, trousers, skirt). Do not change the top significantly; keep it neutral to highlight the bottoms. Full body shot.',
    'Gaun': 'Generate a fashion model wearing a ONE-PIECE DRESS/GOWN. Do not generate shirts, jackets, or pants. Ensure the dress extends below the knees. Full body shot.',
    'Hijab': 'Generate a fashion model wearing a HIJAB/headscarf with modest clothing. Ensure hijab is clearly visible and correctly draped. Full body shot.'
  };

  if (clothingType && typeRules[clothingType]) finalPrompt += `${typeRules[clothingType]} `;
  finalPrompt += `Photorealistic commercial fashion photography. ${prompt}`;
  if (aspectRatio === '2:3') finalPrompt += ' Vertical 2:3 full-body composition.';

  const input: any = {
    prompt: finalPrompt,
    output_format: 'webp'
  };
  if (referenceImage) input.image_input = [referenceImage];

  const prediction = await replicate.predictions.create({
    model: 'google/nano-banana',
    input,
    webhook: webhookUrl,
    webhook_events_filter: ['start', 'output', 'logs', 'completed']
  });

  console.log('Model generation prediction created:', prediction.id);

  return new Response(JSON.stringify({
    predictionId: prediction.id,
    projectId: projectId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processModelSwap(
  replicate: any,
  { modelImage, garmentImage, projectId, clothingType }: { modelImage: string; garmentImage: string; projectId: string; clothingType?: string }
) {
  console.log('Processing model swap with nano-banana for project:', projectId);

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`;

  let prompt = 'First image is the PRODUCT photo. Second image is the NEW MODEL reference. Replace only the person in the product photo with the model reference while preserving the product exactly (shape, color, texture, fit). Natural shadows and lighting.';
  if (clothingType === 'Gaun') prompt += ' Ensure the outfit remains a full dress/gown; do not convert to shirts or pants.';
  if (clothingType === 'Atasan') prompt += ' Ensure the top is replaced while bottoms remain unchanged.';
  if (clothingType === 'Bawahan') prompt += ' Ensure the bottoms are replaced or highlighted while the top stays neutral.';
  if (clothingType === 'Hijab') prompt += ' Ensure the model wears a visible hijab with modest styling.';

  const input: any = {
    prompt,
    image_input: [garmentImage, modelImage],
    output_format: 'webp'
  };

  const prediction = await replicate.predictions.create({
    model: 'google/nano-banana',
    input,
    webhook: webhookUrl,
    webhook_events_filter: ['start', 'output', 'logs', 'completed']
  });

  console.log('Model swap prediction created:', prediction.id);

  return new Response(JSON.stringify({
    predictionId: prediction.id,
    projectId: projectId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processPhotoEdit(replicate: any, { originalImage, editType, prompt, backgroundImage, selectedColor, projectId }: { originalImage: string; editType: string; prompt?: string; backgroundImage?: string; selectedColor?: string; projectId: string }) {
  console.log('Processing photo edit with nano-banana for project:', projectId);
  
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`;
  
  let editPrompt = '';
  
  switch (editType) {
    case 'background_removal':
      editPrompt = 'Remove the background and make it transparent. Keep the main subject intact and clean edges.';
      break;
    case 'background_replacement':
      if (backgroundImage) {
        editPrompt = `Replace the background with the provided reference image. Maintain natural lighting and shadows.`;
      } else if (selectedColor) {
        editPrompt = prompt || `Replace the background with a solid color: ${selectedColor}. Professional studio background.`;
      } else {
        editPrompt = prompt || 'Replace with a professional studio background';
      }
      break;
    case 'image_enhancement':
      editPrompt = 'Enhance image quality, improve lighting, sharpen details, increase resolution. Professional commercial photography quality.';
      break;
    case 'custom_edit':
      editPrompt = prompt || 'Professional photo editing';
      break;
    default:
      editPrompt = prompt || 'Edit the image professionally';
  }
  
  const input: any = {
    prompt: editPrompt,
    image: originalImage,
    output_format: "webp",
    output_quality: 90
  };
  
  if (backgroundImage) {
    input.reference_image = backgroundImage;
  }
  
  const prediction = await replicate.predictions.create({
    version: "google/nano-banana",
    input: input,
    webhook: webhookUrl,
    webhook_events_filter: ["start", "output", "logs", "completed"]
  });

  console.log('Photo edit prediction created:', prediction.id);

  return new Response(JSON.stringify({ 
    predictionId: prediction.id,
    projectId: projectId 
  }), {
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