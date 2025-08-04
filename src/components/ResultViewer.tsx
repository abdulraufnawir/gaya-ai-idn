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
}

const ResultViewer = ({ projectId, predictionId, title }: ResultViewerProps) => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStatus = async () => {
    if (!predictionId) return;
    
    setLoading(true);
    try {
      const { data: response } = await supabase.functions.invoke('fashn-api', {
        body: {
          action: 'status',
          id: predictionId
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setResult(response);

      // Update project status in database using settings field
      if (response.status === 'completed' || response.status === 'failed') {
        const { data: project } = await supabase
          .from('projects')
          .select('settings')
          .eq('id', projectId)
          .single();

        const currentSettings = project?.settings as Record<string, any> || {};
        const updatedSettings = {
          ...currentSettings,
          result_url: response.output?.[0] || null,
          error_message: response.error || null
        };

        await supabase
          .from('projects')
          .update({
            status: response.status,
            settings: updatedSettings
          })
          .eq('id', projectId);
      }

      if (response.status === 'completed') {
        toast({
          title: 'Selesai!',
          description: 'Hasil virtual try-on telah selesai diproses.',
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
    if (!result?.output?.[0]) return;
    
    try {
      const response = await fetch(result.output[0]);
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
    
    // Poll for updates if still processing
    let interval: NodeJS.Timeout;
    if (result?.status === 'processing' || result?.status === 'in_queue' || result?.status === 'starting') {
      interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [predictionId, result?.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      case 'in_queue': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Selesai';
      case 'failed': return 'Gagal';
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
        {result?.output?.[0] && (
          <div className="space-y-4">
            <img 
              src={result.output[0]} 
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
            {result?.error && <p className="text-sm mt-1">{result.error}</p>}
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