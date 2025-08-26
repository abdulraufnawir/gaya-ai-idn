import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      case 'virtualTryOn':
        return await processVirtualTryOn(params);
      case 'modelSwap':
        return await processModelSwap(params);
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

async function processVirtualTryOn({ modelImage, garmentImage, projectId }) {
  console.log('Processing virtual try-on with Gemini 2.5 Flash for project:', projectId);
  
  try {
    const prompt = `Create a detailed description for a virtual try-on result by combining these images. 
Analyze the model and garment, then describe how the garment would look when worn by the model. 
Include details about:
1. How the garment would fit on the model's body shape and pose
2. Color matching and overall aesthetic
3. Styling suggestions
4. Realistic lighting and shadow considerations
5. Overall fashion assessment

Provide a comprehensive virtual try-on analysis.`;

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
        temperature: 0.7,
        topK: 32,
        topP: 0.9,
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
      throw new Error(data.error?.message || 'Failed to process virtual try-on');
    }

    console.log('Gemini virtual try-on response:', data);

    const result = {
      id: `gemini_tryon_${Date.now()}`,
      prediction_id: `gemini_pred_${Date.now()}`,
      status: 'completed',
      result: data.candidates[0]?.content?.parts[0]?.text || 'Virtual try-on processing completed',
      usage: data.usageMetadata
    };

    // Update project if projectId provided
    if (projectId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseClient
        .from('projects')
        .update({
          status: 'completed',
          result_url: `data:text/plain;base64,${btoa(result.result)}`,
          metadata: { 
            gemini_response: data,
            processing_type: 'virtual_tryon',
            model_used: 'gemini-2.0-flash-exp'
          }
        })
        .eq('id', projectId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in processVirtualTryOn:', error);
    throw error;
  }
}

async function processModelSwap({ modelImage, garmentImage, projectId }) {
  console.log('Processing model swap with Gemini 2.5 Flash for project:', projectId);
  
  const prompt = `Perform a detailed analysis for model swapping by replacing the model in the product image with the new model while keeping the same garment.
Analyze both images and provide:
1. How the new model would look wearing the garment from the original image
2. Pose and positioning adjustments needed
3. Lighting and composition considerations
4. Style compatibility assessment
5. Realistic visualization description

Provide a comprehensive model swap analysis with detailed descriptions.`;

  const parts = [{ text: prompt }];
  
  // Add model image if provided (new model to swap to)
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
  
  // Add garment image if provided (original image with the garment)
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
      temperature: 0.7,
      topK: 32,
      topP: 0.9,
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
    throw new Error(data.error?.message || 'Failed to process model swap');
  }

  console.log('Gemini model swap response:', data);

  const result = {
    id: `gemini_swap_${Date.now()}`,
    prediction_id: `gemini_pred_${Date.now()}`,
    status: 'completed',
    result: data.candidates[0]?.content?.parts[0]?.text || 'Model swap processing completed',
    usage: data.usageMetadata
  };

  // Update project if projectId provided
  if (projectId) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient
      .from('projects')
      .update({
        status: 'completed',
        result_url: `data:text/plain;base64,${btoa(result.result)}`,
        metadata: { 
          gemini_response: data,
          processing_type: 'model_swap',
          model_used: 'gemini-2.0-flash-exp'
        }
      })
      .eq('id', projectId);
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}