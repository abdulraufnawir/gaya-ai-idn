import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Replicate webhook received:', req.method, req.url);
    
    const webhookData = await req.json();
    console.log('Webhook payload:', JSON.stringify(webhookData, null, 2));

    // Extract prediction data from Replicate webhook
    const { 
      id: predictionId, 
      status, 
      output, 
      error,
      logs 
    } = webhookData;

    if (!predictionId) {
      console.error('No prediction ID in webhook payload');
      return new Response('Missing prediction ID', { status: 400, headers: corsHeaders });
    }

    // Update project in database
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // Handle successful completion
    if (status === 'succeeded' && output) {
      updateData.status = 'completed'; // Map Replicate's 'succeeded' to our 'completed' status
      const originalUrl = Array.isArray(output) ? output[0] : output;
      
      // Download and store image in Supabase storage
      let storedImageUrl = originalUrl;
      try {
        console.log('Downloading image from:', originalUrl);
        
        // Download the image
        const imageResponse = await fetch(originalUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        
        // Get project details to determine user ID
        const { data: project } = await supabaseClient
          .from('projects')
          .select('user_id, title')
          .eq('prediction_id', predictionId)
          .single();
        
        if (project) {
          // Generate filename
          const timestamp = Date.now();
          const filename = `results/result_${project.id || predictionId}_${timestamp}.jpg`;
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
      
      updateData.result_image_url = storedImageUrl;
      updateData.result_url = storedImageUrl;
      console.log('Setting result image URL:', storedImageUrl);
    }

    // Handle errors
    if (status === 'failed' && error) {
      updateData.error_message = typeof error === 'string' ? error : JSON.stringify(error);
      console.log('Setting error message:', updateData.error_message);
    }

    // Update the project
    const { data: project, error: updateError } = await supabaseClient
      .from('projects')
      .update(updateData)
      .eq('prediction_id', predictionId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response('Database update failed', { status: 500, headers: corsHeaders });
    }

    if (!project) {
      console.error('No project found with prediction ID:', predictionId);
      return new Response('Project not found', { status: 404, headers: corsHeaders });
    }

    console.log('Successfully updated project:', project.id, 'with status:', status);

    return new Response(JSON.stringify({ 
      success: true, 
      projectId: project.id,
      status: status 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});