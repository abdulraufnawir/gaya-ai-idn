import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received Kie.AI webhook payload:', JSON.stringify(payload, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract task information from payload
    let taskId = payload.id || payload.taskId;
    let status = payload.status;
    let metadata = payload.metadata || {};
    let projectId = metadata.projectId;

    // Handle Kie.AI webhook format
    if (payload.data && payload.data.taskId) {
      taskId = payload.data.taskId;
      status = payload.data.state; // Kie.AI uses 'state' instead of 'status'
      
      // Parse metadata from the param field if it exists
      if (payload.data.param) {
        try {
          const paramData = JSON.parse(payload.data.param);
          if (paramData.metadata) {
            metadata = paramData.metadata;
            projectId = metadata.projectId;
          }
        } catch (e) {
          console.error('Failed to parse param data:', e);
        }
      }
    }

    if (!taskId || !projectId) {
      console.error('Missing taskId or projectId in webhook payload');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let updateData: any = {
      updated_at: new Date().toISOString(),
      metadata: {
        ...metadata,
        kie_webhook_payload: payload,
        last_webhook_received: new Date().toISOString()
      }
    };

    // Handle different status responses  
    if (status === 'completed' || status === 'success') {
      // Extract result image URL from payload
      let resultUrl = null;
      
      // Check Kie.AI specific resultJson format first
      if (payload.data?.resultJson) {
        try {
          const resultJson = typeof payload.data.resultJson === 'string' 
            ? JSON.parse(payload.data.resultJson) 
            : payload.data.resultJson;
          
          console.log('Parsed resultJson:', JSON.stringify(resultJson, null, 2));
          
          if (resultJson.resultUrls && Array.isArray(resultJson.resultUrls) && resultJson.resultUrls.length > 0) {
            resultUrl = resultJson.resultUrls[0];
            console.log('Found result URL in resultUrls:', resultUrl);
          } else if (resultJson.result_url) {
            resultUrl = resultJson.result_url;
            console.log('Found result URL in result_url:', resultUrl);
          } else if (resultJson.output) {
            resultUrl = Array.isArray(resultJson.output) ? resultJson.output[0] : resultJson.output;
            console.log('Found result URL in output:', resultUrl);
          }
        } catch (parseError) {
          console.error('Error parsing resultJson:', parseError);
        }
      }
      
      // Fallback to other possible locations for the result image
      if (!resultUrl) {
        if (payload.result) {
          if (typeof payload.result === 'string') {
            resultUrl = payload.result;
          } else if (payload.result.image_url) {
            resultUrl = payload.result.image_url;
          } else if (payload.result.url) {
            resultUrl = payload.result.url;
          } else if (payload.result.output) {
            resultUrl = payload.result.output;
          }
        } else if (payload.output) {
          if (typeof payload.output === 'string') {
            resultUrl = payload.output;
          } else if (Array.isArray(payload.output) && payload.output.length > 0) {
            resultUrl = payload.output[0];
          }
        } else if (payload.image_url) {
          resultUrl = payload.image_url;
        }
      }

      // Download and store image in Supabase storage if we have a result URL
      let storedImageUrl = resultUrl;
      if (resultUrl) {
        try {
          console.log('Downloading image from:', resultUrl);
          
          // Download the image
          const imageResponse = await fetch(resultUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status}`);
          }
          
          const imageBlob = await imageResponse.blob();
          const imageBuffer = await imageBlob.arrayBuffer();
          
          // Get project details to determine user ID
          const { data: project } = await supabaseClient
            .from('projects')
            .select('user_id, title')
            .eq('id', projectId)
            .single();
          
          if (project) {
            // Generate filename
            const timestamp = Date.now();
            const filename = `results/result_${projectId}_${timestamp}.jpg`;
            const storagePath = `${project.user_id}/${filename}`;
            
            console.log('Uploading image to storage path:', storagePath);
            
            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
              .from('tryon-images')
              .upload(storagePath, imageBuffer, {
                contentType: 'image/jpeg',
                upsert: true
              });
            
            if (uploadError) {
              console.error('Storage upload error:', uploadError);
            } else {
              // Get public URL
              const { data: publicUrlData } = supabaseClient.storage
                .from('tryon-images')
                .getPublicUrl(storagePath);
              
              storedImageUrl = publicUrlData.publicUrl;
              console.log('Image stored successfully at:', storedImageUrl);
            }
          }
        } catch (error) {
          console.error('Error storing image:', error);
          // Continue with original URL if storage fails
        }
      }

      updateData.status = 'completed';
      updateData.result_url = storedImageUrl;
      updateData.result_image_url = storedImageUrl;
      updateData.analysis = 'Virtual try-on completed successfully with Kie.AI';

      console.log('Task completed successfully:', {
        taskId,
        projectId,
        hasResultUrl: !!resultUrl,
        resultUrl: resultUrl
      });

    } else if (status === 'failed' || status === 'error' || status === 'fail') {
      updateData.status = 'failed';
      let errorMessage = payload.error || payload.message || 'Kie.AI task failed';
      
      // Handle Kie.AI specific error format
      if (payload.data && payload.data.failMsg) {
        errorMessage = payload.data.failMsg;
      }
      
      updateData.error_message = errorMessage;

      console.log('Task failed:', {
        taskId,
        projectId,
        error: updateData.error_message
      });

    } else {
      // For other statuses (processing, queued, etc.)
      updateData.status = 'processing';
      console.log('Task status update:', {
        taskId,
        projectId,
        status
      });
    }

    // Update the project in database
    const { error: updateError } = await supabaseClient
      .from('projects')
      .update(updateData)
      .eq('prediction_id', taskId)
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
      throw updateError;
    }

    console.log('Successfully updated project via webhook:', {
      taskId,
      projectId,
      status: updateData.status
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully',
      taskId,
      projectId,
      status: updateData.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in kie-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});