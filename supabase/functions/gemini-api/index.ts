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
      case 'status':
        return await getStatus(params);
      case 'retry':
        return await retryProcessing(params);
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey}`, {
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey}`, {
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
  console.log('Processing virtual try-on with Gemini 2.5 Flash Image Preview for project:', projectId);
  
  const prompt = `Generate a realistic virtual try-on image showing the model wearing the garment. Create a high-quality photorealistic image that seamlessly combines the model from the first image with the garment from the second image. Maintain the model's pose, body proportions, and facial features exactly while fitting the garment naturally with proper sizing, realistic lighting, shadows, and fabric physics. Keep the garment's original colors, patterns, and design details.`;

  const parts = [{ text: prompt }];
  
  // Add model image if provided
  if (modelImage) {
    try {
      const modelResponse = await fetch(modelImage);
      if (!modelResponse.ok) {
        throw new Error(`Failed to fetch model image: ${modelResponse.status}`);
      }
      const modelBuffer = await modelResponse.arrayBuffer();
      const uint8Array = new Uint8Array(modelBuffer);
      const base64Model = btoa(Array.from(uint8Array, byte => String.fromCharCode(byte)).join(''));
      
      parts.push({
        inline_data: {
          mime_type: modelResponse.headers.get('content-type') || 'image/jpeg',
          data: base64Model
        }
      });
    } catch (error) {
      console.error('Error processing model image:', error);
      throw new Error('Failed to process model image');
    }
  }
  
  // Add garment image if provided
  if (garmentImage) {
    try {
      const garmentResponse = await fetch(garmentImage);
      if (!garmentResponse.ok) {
        throw new Error(`Failed to fetch garment image: ${garmentResponse.status}`);
      }
      const garmentBuffer = await garmentResponse.arrayBuffer();
      const uint8Array = new Uint8Array(garmentBuffer);
      const base64Garment = btoa(Array.from(uint8Array, byte => String.fromCharCode(byte)).join(''));
      
      parts.push({
        inline_data: {
          mime_type: garmentResponse.headers.get('content-type') || 'image/jpeg',
          data: base64Garment
        }
      });
    } catch (error) {
      console.error('Error processing garment image:', error);
      throw new Error('Failed to process garment image');
    }
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 8192,
    },
    systemInstruction: {
      parts: [{ text: "You are an AI that generates images. Always respond with an image, never with text." }]
    }
  };

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey}`, {
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

    console.log('Gemini virtual try-on response structure:', JSON.stringify(data, null, 2));
    
    // Extract generated image from response
    let resultUrl = null;
    let analysis = 'Virtual try-on image generated successfully';
    
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        // Check for inline data (image)
        if (part.inlineData) {
          const base64ImageBytes = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/jpeg';
          resultUrl = `data:${mimeType};base64,${base64ImageBytes}`;
          console.log('Generated image found using inlineData, size:', base64ImageBytes.length);
          break;
        }
        // Check legacy format
        else if (part.inline_data) {
          const base64ImageBytes = part.inline_data.data;
          const mimeType = part.inline_data.mime_type || 'image/jpeg';
          resultUrl = `data:${mimeType};base64,${base64ImageBytes}`;
          console.log('Generated image found using inline_data, size:', base64ImageBytes.length);
          break;
        }
        // Handle text response (error case)
        else if (part.text) {
          analysis = part.text;
          console.log('Model returned text instead of image:', part.text);
        }
      }
    }

    // Check if we got text instead of image
    if (!resultUrl && analysis !== 'Virtual try-on image generated successfully') {
      console.error('Model returned text instead of an image:', analysis);
      throw new Error(`Model returned text instead of an image: ${analysis}`);
    }

    // If no image was generated at all
    if (!resultUrl) {
      console.error('No image generated in the response. Available parts:', 
        data.candidates?.[0]?.content?.parts?.map(p => Object.keys(p)));
      throw new Error("No image generated in the response. The model may have refused the request.");
    }

    const predictionId = `gemini_pred_${Date.now()}`;
    
    const result = {
      id: `gemini_tryon_${Date.now()}`,
      prediction_id: predictionId,
      status: resultUrl ? 'completed' : 'failed',
      result: resultUrl,
      analysis: analysis,
      usage: data.usageMetadata,
      hasImage: !!resultUrl
    };

    // Update project if projectId provided
    if (projectId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        console.log('Updating project with results:', {
          projectId,
          hasResultUrl: !!resultUrl,
          status: resultUrl ? 'completed' : 'failed'
        });

        const { error: updateError } = await supabaseClient
          .from('projects')
          .update({
            status: resultUrl ? 'completed' : 'failed',
            result_url: resultUrl,
            analysis: analysis,
            prediction_id: predictionId,
            updated_at: new Date().toISOString(),
            metadata: { 
              gemini_response: data,
              processing_type: 'virtual_tryon',
              model_used: 'gemini-2.5-flash-image-preview',
              has_generated_image: !!resultUrl
            }
          })
          .eq('id', projectId);

        if (updateError) {
          console.error('Error updating project:', updateError);
        } else {
          console.log('Successfully updated project with status:', resultUrl ? 'completed' : 'failed');
        }
      } catch (error) {
        console.error('Error in project update:', error);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in Gemini API call:', error);
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey}`, {
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
          model_used: 'gemini-2.5-flash-image-preview'
        }
      })
      .eq('id', projectId);
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getStatus({ predictionId }) {
  console.log('Getting status for Gemini prediction:', predictionId);
  
  // Since Gemini API returns results immediately, we check the database for completed results
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Find the project with this prediction ID
  const { data: project, error } = await supabaseClient
    .from('projects')
    .select('*')
    .eq('prediction_id', predictionId)
    .single();

  if (error || !project) {
    console.error('Project not found for prediction:', predictionId, error);
    return new Response(JSON.stringify({ 
      error: 'Prediction not found',
      status: 'failed'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('Project found:', {
    id: project.id,
    status: project.status,
    has_result_url: !!project.result_url,
    has_result_image_url: !!project.result_image_url,
    has_metadata: !!project.metadata
  });

  // If project is still processing, check metadata for completed results
  if (project.status === 'processing' && project.metadata) {
    const metadata = project.metadata as any;
    const geminiResponse = metadata.gemini_response;
    
    if (geminiResponse?.candidates?.[0]?.content?.parts) {
      console.log('Found existing Gemini response, checking for image data...');
      
      let resultUrl = null;
      for (const part of geminiResponse.candidates[0].content.parts) {
        const imageData = part.inline_data?.data || part.inlineData?.data;
        if (imageData) {
          const mimeType = part.inline_data?.mime_type || part.inlineData?.mimeType || 'image/jpeg';
          resultUrl = `data:${mimeType};base64,${imageData}`;
          console.log('Found generated image in metadata, updating project...');
          break;
        }
      }
      
      if (resultUrl) {
        // Update project with the found result
        const { error: updateError } = await supabaseClient
          .from('projects')
          .update({
            status: 'completed',
            result_url: resultUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id);
        
        if (updateError) {
          console.error('Error updating project:', updateError);
        } else {
          console.log('Successfully updated project with existing result');
          // Return updated status
          const result = {
            id: predictionId,
            status: 'completed',
            output: null,
            result_url: resultUrl,
            error: null,
            created_at: project.created_at,
            completed_at: new Date().toISOString()
          };

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
  }

  // Return the project status and results
  const result = {
    id: predictionId,
    status: project.status,
    output: project.result_image_url ? [project.result_image_url] : null,
    result_url: project.result_url,
    error: project.error_message,
    created_at: project.created_at,
    completed_at: project.updated_at
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function retryProcessing({ projectId }) {
  console.log('Retrying processing for project:', projectId);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get project details
  const { data: project, error } = await supabaseClient
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    console.error('Project not found:', projectId, error);
    return new Response(JSON.stringify({ 
      error: 'Project not found',
      status: 'failed'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get image URLs from project settings
  const settings = project.settings as any;
  const modelImage = settings?.model_image_url;
  const garmentImage = settings?.garment_image_url;

  if (!modelImage || !garmentImage) {
    console.error('Missing image URLs in project settings');
    return new Response(JSON.stringify({ 
      error: 'Missing image URLs',
      status: 'failed'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('Retrying virtual try-on with:', { modelImage, garmentImage, projectId });
  
  // Retry the virtual try-on processing
  return await processVirtualTryOn({ modelImage, garmentImage, projectId });
}