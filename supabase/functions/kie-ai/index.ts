import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const kieApiKey = Deno.env.get('KIE_AI_API_KEY');

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

    if (!kieApiKey) {
      throw new Error('KIE_AI_API_KEY not configured');
    }

    switch (action) {
      case 'virtualTryOn':
        return await processVirtualTryOn(params);
      case 'modelSwap':
        return await processModelSwap(params);
      case 'photoEdit':
        return await processPhotoEdit(params);
      case 'generateModel':
        return await processGenerateModel(params);
      case 'status':
        return await getStatus(params);
      case 'retry':
        return await retryProcessing(params);
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in kie-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function processVirtualTryOn({ modelImage, garmentImage, projectId }) {
  console.log('Processing virtual try-on with Kie.AI nano-banana for project:', projectId);
  console.log('Model image URL:', modelImage);
  console.log('Garment image URL:', garmentImage);
  
  try {
    // Validate inputs
    if (!modelImage || !garmentImage) {
      throw new Error('Missing required images: modelImage and garmentImage are required');
    }

    if (!kieApiKey) {
      console.error('KIE_AI_API_KEY is not configured');
      throw new Error('KIE_AI_API_KEY is not configured in environment variables');
    }

    // Create the callback URL for Kie.AI to send results back
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kie-webhook`;
    console.log('Callback URL:', callbackUrl);
    
    // Use nano-banana Edit mode for virtual try-on with correct parameters
    const prompt = `Virtual try-on: Take the person from the first image and dress them in the clothing from the second image. Maintain the person's pose, body proportions, and facial features while fitting the garment naturally with proper sizing, realistic lighting, shadows, and fabric physics. High quality, photorealistic result.`;

    const requestBody = {
      model: 'google/nano-banana',
      callBackUrl: callbackUrl,
      input: {
        prompt: prompt,
        image_urls: [modelImage, garmentImage], // Array of input images: person first, clothing second
        num_images: "1"
      },
      metadata: {
        projectId: projectId,
        modelImage: modelImage,
        garmentImage: garmentImage,
        action: 'virtualTryOn'
      }
    };

    console.log('Using nano-banana Edit mode for virtual try-on:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.kie.ai/api/v1/playground/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kieApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Kie.AI API response status:', response.status);
    console.log('Kie.AI API response headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('Kie.AI API response body:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error('Kie.AI API error - Status:', response.status);
      console.error('Kie.AI API error - Response:', result);
      
      let errorMessage = 'Failed to create Kie.AI task';
      if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : result.error.message || result.error;
      } else if (result.message) {
        errorMessage = result.message;
      } else if (result.detail) {
        errorMessage = result.detail;
      }
      
      throw new Error(`Kie.AI API Error (${response.status}): ${errorMessage}`);
    }

    // Extract task ID from the nested data structure
    const taskId = result.data?.taskId || result.id || result.taskId || result.task_id;
    console.log('Extracted task ID:', taskId);
    
    if (!taskId) {
      console.error('No task ID in response:', result);
      throw new Error('No task ID returned from Kie.AI API');
    }

    // Update project with task ID
    if (projectId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseClient
        .from('projects')
        .update({
          prediction_id: taskId,
          status: 'processing',
          updated_at: new Date().toISOString(),
          metadata: {
            kie_task: result,
            processing_type: 'virtual_tryon',
            model_used: 'google/nano-banana',
            api_provider: 'kie.ai'
          }
        })
        .eq('id', projectId);

      if (updateError) {
        console.error('Error updating project:', updateError);
        throw updateError;
      }

      console.log('Successfully updated project with Kie.AI task ID:', taskId);
    }

    return new Response(JSON.stringify({
      success: true,
      id: taskId,
      prediction_id: taskId,
      status: 'processing',
      message: 'Kie.AI task created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Kie.AI processVirtualTryOn:', error);
    console.error('Error stack:', error.stack);
    
    // Update project status to failed if projectId provided
    if (projectId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabaseClient
          .from('projects')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      } catch (updateError) {
        console.error('Error updating project status to failed:', updateError);
      }
    }
    
    throw error;
  }
}

async function getStatus({ predictionId }) {
  console.log('Getting status for Kie.AI task:', predictionId);
  
  // Handle test/health check requests
  if (predictionId === 'test' || predictionId === 'health') {
    return new Response(JSON.stringify({
      id: predictionId,
      status: 'success',
      message: 'Kie.AI API is healthy',
      service: 'kie-ai',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Check the database for completed results first
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: project, error } = await supabaseClient
    .from('projects')
    .select('*')
    .eq('prediction_id', predictionId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return new Response(JSON.stringify({
      id: predictionId,
      status: 'error',
      error: 'Project not found'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }

  // If we already have results, return them
  if (project.status === 'completed' && project.result_url) {
    return new Response(JSON.stringify({
      id: predictionId,
      status: 'completed',
      result: project.result_url,
      analysis: project.analysis || 'Virtual try-on completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // If failed, return error
  if (project.status === 'failed') {
    return new Response(JSON.stringify({
      id: predictionId,
      status: 'failed',
      error: project.error_message || 'Task failed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // If still processing, check directly with Kie.AI API
  try {
    console.log('Checking task status directly with Kie.AI API for task:', predictionId);
    
    const response = await fetch(`https://api.kie.ai/api/v1/playground/getTaskStatus/${predictionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Kie.AI status response:', JSON.stringify(result, null, 2));
      
      // Update database with the latest status
      const updateData: any = {
        updated_at: new Date().toISOString(),
        metadata: {
          ...project.metadata,
          last_status_check: new Date().toISOString(),
          kie_direct_status: result
        }
      };

      if (result.status === 'completed' || result.status === 'success') {
        // Extract result URL
        let resultUrl = null;
        if (result.result) {
          if (typeof result.result === 'string') {
            resultUrl = result.result;
          } else if (result.result.image_url) {
            resultUrl = result.result.image_url;
          } else if (result.result.output) {
            resultUrl = result.result.output;
          }
        } else if (result.output) {
          resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;
        }

        updateData.status = 'completed';
        updateData.result_url = resultUrl;
        updateData.analysis = 'Virtual try-on completed successfully with Kie.AI';

        await supabaseClient
          .from('projects')
          .update(updateData)
          .eq('id', project.id);

        return new Response(JSON.stringify({
          id: predictionId,
          status: 'completed',
          result: resultUrl,
          analysis: updateData.analysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } else if (result.status === 'failed' || result.status === 'error') {
        updateData.status = 'failed';
        updateData.error_message = result.error || result.message || 'Task failed in Kie.AI';

        await supabaseClient
          .from('projects')
          .update(updateData)
          .eq('id', project.id);

        return new Response(JSON.stringify({
          id: predictionId,
          status: 'failed',
          error: updateData.error_message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Still processing
        await supabaseClient
          .from('projects')
          .update(updateData)
          .eq('id', project.id);
      }
    }
  } catch (statusError) {
    console.error('Error checking Kie.AI status:', statusError);
  }

  // Otherwise return processing status
  return new Response(JSON.stringify({
    id: predictionId,
    status: 'processing',
    message: 'Task is still processing'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processModelSwap({ modelImage, garmentImage, projectId }) {
  console.log('Processing model swap with Kie.AI nano-banana for project:', projectId);
  
  try {
    if (!modelImage || !garmentImage) {
      throw new Error('Missing required images: modelImage and garmentImage are required');
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kie-webhook`;
    
    const prompt = `Model swap: Replace the model/person in the first image with the model/person from the second image while keeping the same clothing, pose, and composition. Maintain realistic proportions, lighting, and shadows. High quality, photorealistic result.`;

    const requestBody = {
      model: 'google/nano-banana',
      callBackUrl: callbackUrl,
      input: {
        prompt: prompt,
        image_urls: [garmentImage, modelImage], // Garment first, new model second
        num_images: "1"
      },
      metadata: {
        projectId: projectId,
        modelImage: modelImage,
        garmentImage: garmentImage,
        action: 'modelSwap'
      }
    };

    console.log('Using nano-banana for model swap:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.kie.ai/api/v1/playground/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kieApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Kie.AI API error for model swap:', result);
      throw new Error(`Kie.AI API Error (${response.status}): ${result.error || result.message || 'Unknown error'}`);
    }

    const taskId = result.data?.taskId || result.id || result.taskId || result.task_id;
    
    if (!taskId) {
      throw new Error('No task ID returned from Kie.AI API');
    }

    // Update project with task ID
    if (projectId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseClient
        .from('projects')
        .update({
          prediction_id: taskId,
          status: 'processing',
          updated_at: new Date().toISOString(),
          metadata: {
            kie_task: result,
            processing_type: 'model_swap',
            model_used: 'google/nano-banana',
            api_provider: 'kie.ai'
          }
        })
        .eq('id', projectId);

      if (updateError) {
        throw updateError;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      id: taskId,
      prediction_id: taskId,
      status: 'processing',
      message: 'Model swap task created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in processModelSwap:', error);
    
    if (projectId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabaseClient
          .from('projects')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      } catch (updateError) {
        console.error('Error updating project status to failed:', updateError);
      }
    }
    
    throw error;
  }
}

async function processPhotoEdit({ originalImage, editType, prompt, projectId }) {
  console.log('Processing photo edit with Kie.AI nano-banana for project:', projectId);
  
  try {
    if (!originalImage) {
      throw new Error('Missing required image: originalImage is required');
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kie-webhook`;
    
    let finalPrompt = '';
    
    switch (editType) {
      case 'background_removal':
        finalPrompt = 'Remove the background from this image while keeping the subject intact. Create a clean, transparent background.';
        break;
      case 'background_replacement':
        finalPrompt = prompt || 'Replace the background with a modern, clean environment while keeping the subject intact.';
        break;
      case 'enhancement':
        finalPrompt = 'Enhance this image quality, improve lighting, colors, and sharpness while maintaining natural appearance.';
        break;
      default:
        finalPrompt = prompt || 'Improve this image quality and appearance.';
    }

    const requestBody = {
      model: 'google/nano-banana',
      callBackUrl: callbackUrl,
      input: {
        prompt: finalPrompt,
        image_urls: [originalImage],
        num_images: "1"
      },
      metadata: {
        projectId: projectId,
        originalImage: originalImage,
        editType: editType,
        action: 'photoEdit'
      }
    };

    console.log('Using nano-banana for photo edit:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.kie.ai/api/v1/playground/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kieApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Kie.AI API error for photo edit:', result);
      throw new Error(`Kie.AI API Error (${response.status}): ${result.error || result.message || 'Unknown error'}`);
    }

    const taskId = result.data?.taskId || result.id || result.taskId || result.task_id;
    
    if (!taskId) {
      throw new Error('No task ID returned from Kie.AI API');
    }

    // Update project with task ID
    if (projectId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseClient
        .from('projects')
        .update({
          prediction_id: taskId,
          status: 'processing',
          updated_at: new Date().toISOString(),
          metadata: {
            kie_task: result,
            processing_type: 'photo_edit',
            model_used: 'google/nano-banana',
            api_provider: 'kie.ai'
          }
        })
        .eq('id', projectId);

      if (updateError) {
        throw updateError;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      id: taskId,
      prediction_id: taskId,
      status: 'processing',
      message: 'Photo edit task created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in processPhotoEdit:', error);
    
    if (projectId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabaseClient
          .from('projects')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      } catch (updateError) {
        console.error('Error updating project status to failed:', updateError);
      }
    }
    
    throw error;
  }
}

async function processGenerateModel({ prompt, aspectRatio, referenceImage, projectId }) {
  console.log('Processing model generation with Kie.AI nano-banana for project:', projectId);
  
  try {
    if (!prompt) {
      throw new Error('Missing required parameter: prompt is required');
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kie-webhook`;
    
    // Build comprehensive AI prompt for model generation
    let finalPrompt = `Generate a high-quality fashion model image: ${prompt}. Professional photography, studio lighting, clean background, high resolution, photorealistic, commercial fashion photography style.`;
    
    // Add aspect ratio guidance
    if (aspectRatio) {
      const ratioMap = {
        '1:1': 'square format',
        '2:3': 'portrait format',
        '3:4': 'vertical format',  
        '4:3': 'horizontal format',
        '4:5': 'vertical portrait format'
      };
      finalPrompt += ` ${ratioMap[aspectRatio] || 'standard format'} composition.`;
    }

    const requestBody = {
      model: 'google/nano-banana',
      callBackUrl: callbackUrl,
      input: {
        prompt: finalPrompt,
        num_images: "1",
        ...(referenceImage && { image_urls: [referenceImage] })
      },
      metadata: {
        projectId: projectId,
        originalPrompt: prompt,
        aspectRatio: aspectRatio,
        referenceImage: referenceImage,
        action: 'generateModel'
      }
    };

    console.log('Using nano-banana for model generation:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.kie.ai/api/v1/playground/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kieApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Kie.AI API error for model generation:', result);
      throw new Error(`Kie.AI API Error (${response.status}): ${result.error || result.message || 'Unknown error'}`);
    }

    const taskId = result.data?.taskId || result.id || result.taskId || result.task_id;
    
    if (!taskId) {
      throw new Error('No task ID returned from Kie.AI API');
    }

    // Update project with task ID
    if (projectId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseClient
        .from('projects')
        .update({
          prediction_id: taskId,
          status: 'processing',
          updated_at: new Date().toISOString(),
          metadata: {
            kie_task: result,
            processing_type: 'model_generation',
            model_used: 'google/nano-banana',
            api_provider: 'kie.ai'
          }
        })
        .eq('id', projectId);

      if (updateError) {
        throw updateError;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      id: taskId,
      prediction_id: taskId,
      status: 'processing',
      message: 'Model generation task created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in processGenerateModel:', error);
    
    if (projectId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabaseClient
          .from('projects')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      } catch (updateError) {
        console.error('Error updating project status to failed:', updateError);
      }
    }
    
    throw error;
  }
}

async function retryProcessing({ projectId }) {
  console.log('Retrying Kie.AI processing for project:', projectId);
  
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

  if (error) {
    throw new Error('Project not found');
  }

  // Extract image URLs from project settings
  const settings = project.settings || {};
  const projectType = project.project_type;

  if (projectType === 'virtual_tryon') {
    const modelImage = settings.model_image_url;
    const garmentImage = settings.garment_image_url;

    if (!modelImage || !garmentImage) {
      throw new Error('Missing image URLs in project settings');
    }

    return await processVirtualTryOn({
      modelImage,
      garmentImage,
      projectId
    });
  } else if (projectType === 'model_swap') {
    const modelImage = settings.model_image_url;
    const garmentImage = settings.garment_image_url;

    if (!modelImage || !garmentImage) {
      throw new Error('Missing image URLs in project settings');
    }

    return await processModelSwap({
      modelImage,
      garmentImage,
      projectId
    });
  } else if (projectType === 'photo_edit') {
    const originalImage = project.original_image_url;
    const editType = settings.edit_type;
    const prompt = settings.prompt;

    if (!originalImage) {
      throw new Error('Missing original image URL in project');
    }

    return await processPhotoEdit({
      originalImage,
      editType,
      prompt,
      projectId
    });
  } else if (projectType === 'model_generation') {
    const prompt = settings.prompt;
    const aspectRatio = settings.aspect_ratio;
    const referenceImage = settings.reference_image_url;

    if (!prompt) {
      throw new Error('Missing prompt in project settings');
    }

    return await processGenerateModel({
      prompt,
      aspectRatio,
      referenceImage,
      projectId
    });
  } else {
    throw new Error(`Unsupported project type for retry: ${projectType}`);
  }
}
