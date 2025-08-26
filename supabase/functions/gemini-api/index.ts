import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

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

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    switch (action) {
      case 'analyze':
        return await analyzeImage(params);
      case 'generate':
        return await generateContent(params);
      case 'process':
        return await processImages(params);
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in gemini-api function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function analyzeImage({ imageUrl, prompt = "Analyze this image" }) {
  console.log('Analyzing image with Gemini 2.5:', imageUrl);
  
  // Convert image URL to base64
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  
  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: imageResponse.headers.get('content-type') || 'image/jpeg',
            data: base64Image
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Gemini API error:', data);
    throw new Error(data.error?.message || 'Failed to analyze image');
  }

  console.log('Gemini analysis response:', data);

  return new Response(JSON.stringify({
    success: true,
    analysis: data.candidates[0]?.content?.parts[0]?.text || 'No analysis available',
    usage: data.usageMetadata
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateContent({ prompt, modelImage, garmentImage, projectId }) {
  console.log('Generating content with Gemini 2.5 for project:', projectId);
  
  const parts = [{ text: prompt }];
  
  // Add model image if provided
  if (modelImage) {
    const modelResponse = await fetch(modelImage);
    const modelBuffer = await modelResponse.arrayBuffer();
    const base64Model = btoa(String.fromCharCode(...new Uint8Array(modelBuffer)));
    
    parts.push({
      inline_data: {
        mime_type: modelResponse.headers.get('content-type') || 'image/jpeg',
        data: base64Model
      }
    });
  }
  
  // Add garment image if provided
  if (garmentImage) {
    const garmentResponse = await fetch(garmentImage);
    const garmentBuffer = await garmentResponse.arrayBuffer();
    const base64Garment = btoa(String.fromCharCode(...new Uint8Array(garmentBuffer)));
    
    parts.push({
      inline_data: {
        mime_type: garmentResponse.headers.get('content-type') || 'image/jpeg',
        data: base64Garment
      }
    });
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Gemini API error:', data);
    throw new Error(data.error?.message || 'Failed to generate content');
  }

  console.log('Gemini generation response:', data);

  // Return a response that mimics the structure expected by the frontend
  return new Response(JSON.stringify({
    success: true,
    id: `gemini_${Date.now()}`, // Generate a unique ID for tracking
    status: 'completed',
    result: data.candidates[0]?.content?.parts[0]?.text || 'No content generated',
    usage: data.usageMetadata
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processImages({ modelImage, garmentImage, prompt, projectId }) {
  console.log('Processing images with Gemini 2.5 for project:', projectId);
  
  const defaultPrompt = `Analyze these fashion images and provide detailed insights about:
1. The model's pose and styling
2. The clothing item's design, color, and characteristics
3. How well they would work together for a virtual try-on
4. Suggestions for improving the combination
5. Fashion recommendations based on the style`;

  const finalPrompt = prompt || defaultPrompt;
  
  return await generateContent({ 
    prompt: finalPrompt, 
    modelImage, 
    garmentImage, 
    projectId 
  });
}