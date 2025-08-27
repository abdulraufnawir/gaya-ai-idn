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
    
    // Create a detailed prompt for virtual try-on using a different model approach
    const prompt = `Virtual try-on: Place the clothing item from the garment image onto the person in the model image. Maintain realistic fit, lighting, and proportions.`;

    // Try different model configurations for better compatibility
    const requestBody = {
      model: 'fashn/fashn-ai-virtual-try-on', // Try using fashn model instead
      callBackUrl: callbackUrl,
      input: {
        prompt: prompt,
        image: modelImage,  // Person image
        mask_image: garmentImage, // Clothing image
        num_inference_steps: 30,
        guidance_scale: 7.5,
        strength: 0.8
      },
      metadata: {
        projectId: projectId,
        modelImage: modelImage,
        garmentImage: garmentImage,
        action: 'virtualTryOn'
      }
    };

    console.log('Trying fashn model for virtual try-on:', JSON.stringify(requestBody, null, 2));

    let response = await fetch('https://api.kie.ai/api/v1/playground/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kieApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    // If fashn model fails, try nano-banana with corrected parameters
    if (!response.ok) {
      console.log('Fashn model failed, trying nano-banana with different parameters');
      
      const nanoRequestBody = {
        model: 'google/nano-banana',
        callBackUrl: callbackUrl,
        input: {
          prompt: "realistic virtual clothing try-on, maintain person identity and pose",
          image: modelImage,
          control_image: garmentImage,
          num_inference_steps: 25,
          guidance_scale: 8.0,
          controlnet_conditioning_scale: 1.0
        },
        metadata: {
          projectId: projectId,
          modelImage: modelImage,
          garmentImage: garmentImage,
          action: 'virtualTryOn'
        }
      };

      console.log('Trying nano-banana with corrected parameters:', JSON.stringify(nanoRequestBody, null, 2));

      response = await fetch('https://api.kie.ai/api/v1/playground/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kieApiKey}`
        },
        body: JSON.stringify(nanoRequestBody)
      });
    }

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
  const modelImage = settings.model_image_url;
  const garmentImage = settings.garment_image_url;

  if (!modelImage || !garmentImage) {
    throw new Error('Missing image URLs in project settings');
  }

  // Retry the virtual try-on process
  return await processVirtualTryOn({
    modelImage,
    garmentImage,
    projectId
  });
}
