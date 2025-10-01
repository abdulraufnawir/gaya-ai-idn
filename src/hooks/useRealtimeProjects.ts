import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface UseRealtimeProjectsProps {
  userId: string | null;
  onUpdate?: () => void;
}

export const useRealtimeProjects = ({ userId, onUpdate }: UseRealtimeProjectsProps) => {
  const { toast } = useToast();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  useEffect(() => {
    if (!userId) return;

    console.log('Setting up realtime subscription for user:', userId);
    
    const channel = supabase
      .channel('project-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Realtime project update:', payload);
          
          const project = payload.new;
          
          // Show toast notification for status changes
          if (project.status === 'completed') {
            toast({
              title: "Project Complete!",
              description: `"${project.title}" has finished processing successfully.`,
            });
          } else if (project.status === 'failed') {
            toast({
              title: "Project Failed",
              description: `"${project.title}" encountered an error during processing.`,
              variant: "destructive",
            });
          }

          // Trigger callback to refetch data
          if (onUpdate) {
            onUpdate();
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setRealtimeEnabled(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      setRealtimeEnabled(false);
    };
  }, [userId, toast, onUpdate]);

  return { realtimeEnabled };
};