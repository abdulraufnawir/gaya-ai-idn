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

async function processVirtualTryOn(
  replicate: any,
  { modelImage, garmentImage, projectId, clothingCategory }: { modelImage: string; garmentImage: string; projectId: string; clothingCategory?: string }
) {
  console.log('Processing virtual try-on with Replicate nano-banana');

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`;
  console.log('Setting webhook URL:', webhookUrl);

  // Normalize category from various inputs (e.g., 'gaun', 'dress', 'gamis')
  const raw = (clothingCategory ?? '').toString().trim().toLowerCase();
  const categoryMap: Record<string, 'Atasan' | 'Bawahan' | 'Gaun' | 'Hijab'> = {
    atasan: 'Atasan', top: 'Atasan', shirt: 'Atasan',
    bawahan: 'Bawahan', bottom: 'Bawahan', celana: 'Bawahan', rok: 'Bawahan', skirt: 'Bawahan',
    gaun: 'Gaun', dress: 'Gaun', gamis: 'Gaun', abaya: 'Gaun', jubah: 'Gaun', robe: 'Gaun',
    hijab: 'Hijab', kerudung: 'Hijab', headscarf: 'Hijab'
  };
  const normalizedCategory = categoryMap[raw] ?? (['Atasan','Bawahan','Gaun','Hijab'].includes(clothingCategory as string) ? clothingCategory as any : undefined);

  // Prompt engineered to mirror Replicate.com successful setup
  let prompt = `Replace the clothing on the person in [MODEL IMAGE at top image] with the outfit from [CLOTHING IMAGE at bottom image], ensuring the model's face, body shape, and pose remain unchanged. Keep the outfit's exact design, color, fabric texture, and natural fit. Preserve realistic lighting, shadows, and background for a seamless, natural appearance.`;

  // Clothing-type hard rules
  const rules: Record<string, { hard: string; negative: string }> = {
    Atasan: {
      hard: 'HARD RULE: This is a TOP only. Replace only the upper garment. Do NOT generate a dress/gown. Bottoms stay as-is and neutral.',
      negative: 'dress, gown, long robe, abaya'
    },
    Bawahan: {
      hard: 'HARD RULE: This is a BOTTOM only. Emphasize pants/skirt. Do NOT convert to a dress. Keep the top plain and unchanged.',
      negative: 'long dress, gown, elaborate tops'
    },
    Gaun: {
      hard: 'HARD RULE: This is a full-length dress/gown reaching the ankles/feet. One-piece silhouette with no split between top and bottom. Legs, ankles and feet must be fully covered by the dress hem (only shoes may be visible). No shirt, blouse, jacket, or pants visible.',
      negative: 'shirt, t-shirt, blouse, jacket, blazer, coat, cardigan, pants, jeans, trousers, shorts, leggings, two-piece outfit, waistband, belt loops, visible trousers, visible legs, visible ankles, visible feet, calf, calves, shins, knees'
    },
    Hijab: {
      hard: 'HARD RULE: Apply a proper hijab covering hair with modest neck coverage. Keep outfit modest.',
      negative: 'uncovered hair, exposed hairline'
    }
  };

  let negativePrompt = undefined as string | undefined;
  if (normalizedCategory && rules[normalizedCategory]) {
    prompt += ` ${rules[normalizedCategory].hard}`;
    negativePrompt = rules[normalizedCategory].negative;
  }

  // Try-on model inputs (IDM-VTON). Some versions support a category hint.
  const categoryHint = normalizedCategory === 'Gaun' ? 'dresses'
    : normalizedCategory === 'Atasan' ? 'upper_body'
    : normalizedCategory === 'Bawahan' ? 'lower_body'
    : undefined;

  const prediction = normalizedCategory === 'Gaun'
    ? await replicate.predictions.create({
        model: 'google/nano-banana',
        input: {
          // Dress/gown must fully cover legs down to the ankles/feet
          prompt,
          negative_prompt: negativePrompt
            ? `${negativePrompt}, bare legs, knees, thighs, calves, visible ankles, visible feet, mini dress, knee-length dress, tunic`
            : 'bare legs, knees, thighs, calves, visible ankles, visible feet, mini dress, knee-length dress, tunic',
          image_input: [garmentImage, modelImage],
          output_format: 'jpg'
        },
        webhook: webhookUrl,
        webhook_events_filter: ['start', 'output', 'logs', 'completed']
      })
    : await replicate.predictions.create({
        version: "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
        input: {
          garm_img: garmentImage,
          human_img: modelImage,
          garment_des: normalizedCategory === 'Gaun' ? 'A full-length top to ankle-length dress/gown that fully covers the legs down to the feet' :
                       normalizedCategory === 'Atasan' ? 'An upper garment' :
                       normalizedCategory === 'Bawahan' ? 'Lower garment' :
                       'Clothing item',
          category: categoryHint,
          is_dress: normalizedCategory === 'Gaun' ? true : undefined,
          prompt,
          negative_prompt: negativePrompt
        },
        webhook: webhookUrl,
        webhook_events_filter: ['start', 'output', 'logs', 'completed']
      });

  console.log('Virtual try-on prediction created (nano-banana):', prediction.id);

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
    'Atasan': 'HARD RULE: Generate a fashion model wearing a TOP only (shirt, blouse, jacket). Do NOT generate a dress or gown. Full-body framing. Bottoms should stay simple and neutral to keep focus on the top.',
    'Bawahan': 'HARD RULE: Generate a fashion model emphasizing BOTTOMS (pants, trousers, skirt). Keep the top plain/neutral; do not redesign the top. Full-body framing.',
    'Gaun': 'HARD RULE: Generate a fashion model wearing a full-length DRESS/GOWN reaching the ankles. Do NOT generate any shirt, blouse, jacket, pants, jeans or shorts. The garment must be one continuous silhouette from chest to ankles with no visible split between top and bottom. Full-body framing.',
    'Hijab': 'HARD RULE: Generate a fashion model wearing a clearly visible HIJAB/headscarf with modest clothing. Hijab must cover the hair properly. Full-body framing.'
  };

  // Negative constraints to avoid incorrect items
  const negativeRules: Record<string, string> = {
    'Atasan': 'dress, gown, long robe, abaya, ball gown, skirt below knee',
    'Bawahan': 'gown, long dress, elaborate tops, jacket focus',
    'Gaun': 'shirt, blouse, jacket, pants, jeans, shorts, two-piece outfit, visible legs, exposed ankles, cropped top',
    'Hijab': 'uncovered hair, exposed hairline, messy scarf, short scarf'
  };

  if (clothingType && typeRules[clothingType]) finalPrompt += `${typeRules[clothingType]} `;
  finalPrompt += `Photorealistic commercial fashion photography. ${prompt}`;
  if (aspectRatio === '2:3') finalPrompt += ' Vertical 2:3 full-body composition.';

  const input: any = {
    prompt: finalPrompt,
    negative_prompt: clothingType && negativeRules[clothingType] ? negativeRules[clothingType] : undefined,
    output_format: 'jpg'
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

  let prompt = 'First image is the PRODUCT photo. Second image is the NEW MODEL reference. Replace only the person in the product photo with the model reference while preserving the PRODUCT ITEM exactly (shape, color, texture, fit). Keep composition, lighting, and shadows natural.';
  if (clothingType === 'Gaun') prompt += ' HARD RULE: The product is a full-length dress/gown to the ankles. Do NOT convert to a shirt or pants. No visible split between top and bottom. No trousers visible.';
  if (clothingType === 'Atasan') prompt += ' HARD RULE: Only the top is changed. Bottoms remain unchanged and neutral.';
  if (clothingType === 'Bawahan') prompt += ' HARD RULE: Emphasize the bottoms. Keep the top simple and unchanged.';
  if (clothingType === 'Hijab') prompt += ' HARD RULE: The model must wear a clearly visible hijab with modest styling.';

  const negativeByType: Record<string, string> = {
    'Gaun': 'shirt, blouse, jacket, pants, jeans, shorts, two-piece outfit, visible legs, mini skirt',
    'Atasan': 'dress, gown, long robe, abaya',
    'Bawahan': 'gown, long dress, complex tops',
    'Hijab': 'uncovered hair, visible hairline'
  };

  const input: any = {
    prompt,
    negative_prompt: clothingType && negativeByType[clothingType] ? negativeByType[clothingType] : undefined,
    image_input: [garmentImage, modelImage],
    output_format: 'jpg'
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
    output_format: "jpg",
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