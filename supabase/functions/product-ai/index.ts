import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'generateProductPhoto':
        return await generateProductPhoto(params);
      case 'generateCopywriting':
        return await generateCopywriting(params);
      case 'generateSocialContent':
        return await generateSocialContent(params);
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error) {
    console.error('Error in product-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.message?.includes('Rate limit') ? 429 : error.message?.includes('Payment') ? 402 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callAI(messages: any[], model = 'google/gemini-3-flash-preview', modalities?: string[]) {
  const body: any = { model, messages };
  if (modalities) body.modalities = modalities;

  const response = await fetch(AI_GATEWAY, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 429) throw new Error('Rate limit exceeded. Coba lagi dalam beberapa saat.');
  if (response.status === 402) throw new Error('Payment required. Silakan top up credits.');
  if (!response.ok) {
    const t = await response.text();
    console.error('AI gateway error:', response.status, t);
    throw new Error('AI gateway error');
  }

  return await response.json();
}

async function generateProductPhoto({ productName, productDescription, category, style, platform, productImageUrl }) {
  console.log('Generating product photo for:', productName);

  const stylePrompts: Record<string, string> = {
    'studio-white': 'Clean white studio background, professional product photography, soft even lighting, slight shadow beneath product, commercial quality',
    'lifestyle': 'Lifestyle setting, natural environment, warm ambient lighting, product in use context, aspirational mood',
    'flat-lay': 'Top-down flat lay composition, arranged neatly with complementary props, clean background, Instagram-worthy',
    'outdoor': 'Outdoor natural setting, golden hour lighting, bokeh background, product as hero element',
    'minimalist': 'Minimalist composition, single solid color background, dramatic lighting, negative space, modern aesthetic',
    'luxury': 'Luxury setting, dark moody background, dramatic lighting, reflective surfaces, premium feel',
    'marketplace': 'Clean white background, product centered, no shadows, suitable for e-commerce marketplace listing',
    'social-story': 'Vertical composition 9:16, vibrant colors, eye-catching, designed for Instagram/TikTok stories',
  };

  const platformSizes: Record<string, string> = {
    'instagram-post': 'Square 1:1 composition',
    'instagram-story': 'Vertical 9:16 composition',
    'tiktok': 'Vertical 9:16 composition',
    'shopee': 'Square 1:1, white background, product centered',
    'tokopedia': 'Square 1:1, white background, product centered',
    'banner': 'Wide 16:9 landscape composition',
  };

  const styleDesc = stylePrompts[style] || stylePrompts['studio-white'];
  const platformDesc = platformSizes[platform] || '';

  let prompt = `Professional product photography of "${productName}". Category: ${category}. ${productDescription ? `Product details: ${productDescription}.` : ''} Style: ${styleDesc}. ${platformDesc}. High resolution, commercial quality, photorealistic.`;

  const messages: any[] = [{
    role: 'user',
    content: productImageUrl ? [
      { type: 'text', text: `Transform this product image into a professional ${style} product photo. ${prompt}` },
      { type: 'image_url', image_url: { url: productImageUrl } }
    ] : prompt
  }];

  const result = await callAI(messages, 'google/gemini-2.5-flash-image', ['image', 'text']);

  const imageData = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const textResponse = result.choices?.[0]?.message?.content || '';

  if (!imageData) {
    throw new Error('No image generated from AI');
  }

  // Upload generated image to storage
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Convert base64 to binary
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  const fileName = `product-photos/generated_${Date.now()}.png`;
  const { error: uploadError } = await supabaseClient.storage
    .from('tryon-images')
    .upload(fileName, binaryData, { contentType: 'image/png' });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    // Return base64 as fallback
    return new Response(JSON.stringify({
      success: true,
      imageUrl: imageData,
      description: textResponse,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: { publicUrl } } = supabaseClient.storage
    .from('tryon-images')
    .getPublicUrl(fileName);

  return new Response(JSON.stringify({
    success: true,
    imageUrl: publicUrl,
    description: textResponse,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function generateCopywriting({ productName, productDescription, category, platform, tone, language = 'id' }) {
  console.log('Generating copywriting for:', productName);

  const toneMap: Record<string, string> = {
    'professional': 'Professional and trustworthy',
    'casual': 'Casual, friendly, and relatable',
    'luxury': 'Premium, exclusive, aspirational',
    'playful': 'Fun, energetic, youthful',
    'informative': 'Educational and detailed',
    'urgent': 'Urgent, FOMO-inducing, promotional',
  };

  const platformGuide: Record<string, string> = {
    'instagram': 'Instagram caption with emojis, hashtags (10-15), call-to-action. Max 2200 chars but keep engaging in first 125 chars.',
    'tiktok': 'TikTok caption, short and catchy, trending hashtags, hook in first line. Max 150 chars.',
    'shopee': 'Shopee product description: structured with bullet points, highlight features & benefits, include keywords for search.',
    'tokopedia': 'Tokopedia product description: structured, detailed specs, clear pricing info, highlight USP.',
    'whatsapp': 'WhatsApp broadcast message: short, personal, include price and CTA. Use emojis sparingly.',
    'website': 'Website product copy: SEO-friendly, clear value proposition, features and benefits, call-to-action.',
  };

  const toneDesc = toneMap[tone] || toneMap['professional'];
  const platformInfo = platformGuide[platform] || platformGuide['instagram'];

  const systemPrompt = `You are an expert product copywriter for Indonesian e-commerce and social media. Write in ${language === 'id' ? 'Bahasa Indonesia' : 'English'}. Be creative, persuasive, and tailored to the platform.`;

  const userPrompt = `Write marketing copy for this product:
Product: ${productName}
Category: ${category}
Description: ${productDescription || 'No description provided'}
Platform: ${platform}
Tone: ${toneDesc}
Guidelines: ${platformInfo}

Return a JSON object with these fields:
- headline: catchy headline/hook
- body: main copy text
- hashtags: array of relevant hashtags (without #)
- cta: call-to-action text
- alt_headlines: array of 2 alternative headlines`;

  const result = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], 'google/gemini-3-flash-preview');

  let content = result.choices?.[0]?.message?.content || '';
  
  // Try to parse as JSON
  let parsed;
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1];
    parsed = JSON.parse(content.trim());
  } catch {
    // Fallback: return raw text
    parsed = {
      headline: productName,
      body: content,
      hashtags: [],
      cta: 'Beli sekarang!',
      alt_headlines: []
    };
  }

  return new Response(JSON.stringify({
    success: true,
    copywriting: parsed,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function generateSocialContent({ productName, productDescription, category, platform, contentType, productImageUrl }) {
  console.log('Generating social content for:', productName, 'platform:', platform);

  const contentTypePrompts: Record<string, string> = {
    'carousel': `Create a series of 3 slides for an Instagram carousel about "${productName}". Slide 1: Hook/attention grabber. Slide 2: Features/benefits. Slide 3: Call to action with price.`,
    'banner': `Create a promotional banner for "${productName}". Include product name prominently, key selling points, and a compelling visual composition. Wide 16:9 format.`,
    'story': `Create an Instagram/TikTok story graphic for "${productName}". Vertical 9:16 format, bold text overlay, eye-catching design, swipe-up CTA style.`,
    'promo': `Create a promotional poster for "${productName}". Include discount/offer space, product highlight, urgency elements. Bold and attention-grabbing.`,
  };

  const prompt = contentTypePrompts[contentType] || contentTypePrompts['banner'];
  const fullPrompt = `${prompt} Category: ${category}. ${productDescription || ''}. Make it vibrant, professional, and ready for ${platform}. Commercial quality.`;

  const messages: any[] = [{
    role: 'user',
    content: productImageUrl ? [
      { type: 'text', text: fullPrompt },
      { type: 'image_url', image_url: { url: productImageUrl } }
    ] : fullPrompt
  }];

  const result = await callAI(messages, 'google/gemini-2.5-flash-image', ['image', 'text']);

  const imageData = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const textResponse = result.choices?.[0]?.message?.content || '';

  if (!imageData) {
    throw new Error('No image generated');
  }

  // Upload to storage
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  const fileName = `product-content/${contentType}_${Date.now()}.png`;
  const { error: uploadError } = await supabaseClient.storage
    .from('tryon-images')
    .upload(fileName, binaryData, { contentType: 'image/png' });

  if (uploadError) {
    return new Response(JSON.stringify({
      success: true,
      imageUrl: imageData,
      description: textResponse,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: { publicUrl } } = supabaseClient.storage
    .from('tryon-images')
    .getPublicUrl(fileName);

  return new Response(JSON.stringify({
    success: true,
    imageUrl: publicUrl,
    description: textResponse,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
