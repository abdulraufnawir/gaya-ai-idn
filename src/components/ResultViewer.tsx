import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, RefreshCw, Eye } from 'lucide-react';

interface ResultViewerProps {
  projectId: string;
  predictionId: string;
  title: string;
  projectType?: string;
}

const ResultViewer = ({ projectId, predictionId, title, projectType }: ResultViewerProps) => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStatus = async () => {
    if (!predictionId) return;
    
    setLoading(true);
    try {
      // Use different APIs based on project type
      const isPhotoEdit = projectType === 'photo_edit';
      const apiFunction = isPhotoEdit ? 'replicate-api' : 'fashn-api';
      const requestBody = isPhotoEdit 
        ? { action: 'status', predictionId: predictionId }
        : { action: 'status', id: predictionId };
      
      const { data: response } = await supabase.functions.invoke(apiFunction, {
        body: requestBody
      });

      if (response.error) {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error.message || 'An error occurred';
        throw new Error(errorMessage);
      }

      setResult(response);

      // Update project status in database using both top-level and settings fields
      if (response.status === 'completed' || response.status === 'failed') {
        const { data: project } = await supabase
          .from('projects')
          .select('settings')
          .eq('id', projectId)
          .single();

        const currentSettings = project?.settings as Record<string, any> || {};
        const resultUrl = response.output?.[0] || response.urls?.[0] || null;
        
        const updatedSettings = {
          ...currentSettings,
          result_url: resultUrl,
          error_message: response.error || null
        };

        // Update both settings and top-level fields for consistency
        await supabase
          .from('projects')
          .update({
            status: response.status === 'completed' ? 'completed' : 'failed',
            result_image_url: resultUrl,
            settings: updatedSettings,
            error_message: response.error || null
          })
          .eq('id', projectId);
      }

      if (response.status === 'completed' || response.status === 'succeeded') {
        toast({
          title: 'Selesai!',
          description: projectType === 'photo_edit' 
            ? 'Foto editing telah selesai diproses.' 
            : 'Hasil virtual try-on telah selesai diproses.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = async () => {
    const imageUrl = result?.output?.[0] || result?.urls?.[0];
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_result.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengunduh hasil',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    checkStatus();
  }, [predictionId]);

  useEffect(() => {
    // Poll for updates if still processing
    let interval: NodeJS.Timeout;
    if (result?.status === 'processing' || result?.status === 'in_queue' || result?.status === 'starting' || result?.status === 'starting') {
      interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [result?.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'succeeded': return 'text-green-600';
      case 'failed':
      case 'canceled': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      case 'in_queue': return 'text-yellow-600';
      case 'starting': return 'text-blue-500';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
      case 'succeeded': return 'Selesai';
      case 'failed':
      case 'canceled': return 'Gagal';
      case 'processing': return 'Memproses';
      case 'in_queue': return 'Antrian';
      case 'starting': return 'Memulai';
      default: return 'Tidak diketahui';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Status: <span className={getStatusColor(result?.status || 'unknown')}>
            {getStatusText(result?.status || 'unknown')}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(result?.output?.[0] || result?.urls?.[0]) && (
          <div className="space-y-4">
            <img 
              src={result.output?.[0] || result.urls?.[0]} 
              alt="Result" 
              className="w-full rounded-lg shadow-lg"
            />
            <Button onClick={downloadResult} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Unduh Hasil
            </Button>
          </div>
        )}
        
        {(result?.status === 'processing' || result?.status === 'in_queue' || result?.status === 'starting') && (
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">
              Sedang memproses... Ini mungkin membutuhkan waktu hingga 40 detik.
            </p>
          </div>
        )}

        {result?.status === 'failed' && (
          <div className="text-center text-red-600">
            <p>Pemrosesan gagal. Silakan coba lagi.</p>
            {result?.error && (
              <p className="text-sm mt-1">
                {typeof result.error === 'string' 
                  ? result.error 
                  : result.error.message || 'Unknown error occurred'}
              </p>
            )}
          </div>
        )}

        <Button 
          onClick={checkStatus} 
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Periksa Status
        </Button>
      </CardContent>
    </Card>
  );
};

export default ResultViewer;