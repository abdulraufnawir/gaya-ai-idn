import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw } from 'lucide-react';

interface StatusCheckerProps {
  userId: string;
}

export const StatusChecker = ({ userId }: StatusCheckerProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkAllProcessingProjects = async () => {
    setLoading(true);
    try {
      // Get all processing projects
      const { data: projects, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'processing')
        .not('prediction_id', 'is', null);

      if (fetchError) throw fetchError;

      console.log('Found processing projects:', projects?.length);

      for (const project of projects || []) {
        if (!project.prediction_id) continue;

        try {
          // Check status using fashn-api
          const { data: response } = await supabase.functions.invoke('fashn-api', {
            body: { action: 'status', id: project.prediction_id }
          });

          console.log(`Project ${project.id} status:`, response);

          if (response && !response.error) {
            const resultUrl = response.output?.[0] || response.urls?.[0] || null;
            
            if (response.status === 'completed' && resultUrl) {
              // Update project with result
              const updatedSettings = {
                ...(project.settings as Record<string, any> || {}),
                result_url: resultUrl,
                error_message: null
              };

              await supabase
                .from('projects')
                .update({
                  status: 'completed',
                  result_image_url: resultUrl,
                  settings: updatedSettings,
                  error_message: null
                })
                .eq('id', project.id);

              console.log(`Updated project ${project.id} with result`);
            } else if (response.status === 'failed') {
              // Update project as failed
              const updatedSettings = {
                ...(project.settings as Record<string, any> || {}),
                error_message: response.error || 'Processing failed'
              };

              await supabase
                .from('projects')
                .update({
                  status: 'failed',
                  settings: updatedSettings,
                  error_message: response.error || 'Processing failed'
                })
                .eq('id', project.id);

              console.log(`Updated project ${project.id} as failed`);
            }
          }
        } catch (error) {
          console.error(`Error checking project ${project.id}:`, error);
        }
      }

      toast({
        title: "Status Check Complete",
        description: `Checked ${projects?.length || 0} processing projects`,
      });

    } catch (error) {
      console.error('Error checking project statuses:', error);
      toast({
        title: "Error",
        description: "Failed to check project statuses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Manual Status Checker</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={checkAllProcessingProjects}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking...' : 'Check All Processing Projects'}
        </Button>
      </CardContent>
    </Card>
  );
};