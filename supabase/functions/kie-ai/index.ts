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
  
  try {
    // Create the callback URL for Kie.AI to send results back
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kie-webhook`;
    
    // Create a detailed prompt for virtual try-on
    const prompt = `Create a realistic virtual try-on image showing a person wearing the specified garment. The person should be wearing the clothing item naturally with proper fit, realistic lighting, shadows, and fabric physics. Maintain natural body proportions and realistic styling. High quality, photorealistic result.`;

    const requestBody = {
      model: 'google/nano-banana',
      callBackUrl: callbackUrl,
      input: {
        prompt: prompt,
        num_images: "1"
      },
      metadata: {
        projectId: projectId,
        modelImage: modelImage,
        garmentImage: garmentImage,
        action: 'virtualTryOn'
      }
    };

    console.log('Sending request to Kie.AI:', JSON.stringify(requestBody, null, 2));

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
      console.error('Kie.AI API error:', result);
      throw new Error(result.error?.message || result.message || 'Failed to create Kie.AI task');
    }

    console.log('Kie.AI task created:', result);

    const taskId = result.id || result.taskId;
    
    if (!taskId) {
      throw new Error('No task ID returned from Kie.AI');
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
    throw new Error('Project not found');
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
