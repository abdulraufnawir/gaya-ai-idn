import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Download, Eye, Trash2 } from 'lucide-react';
import ResultViewer from './ResultViewer';

interface Project {
  id: string;
  title: string;
  description: string;
  project_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  settings?: any;
}

interface ProjectHistoryProps {
  userId: string;
}

const ProjectHistory = ({ userId }: ProjectHistoryProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
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

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      toast({
        title: 'Berhasil',
        description: 'Proyek berhasil dihapus',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'virtual_tryon':
        return 'Virtual Try-On';
      case 'model_swap':
        return 'Ganti Model';
      case 'photo_edit':
        return 'Edit Foto';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'processing':
        return 'Diproses';
      case 'failed':
        return 'Gagal';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Selesai';
      case 'processing': return 'Memproses';
      case 'failed': return 'Gagal';
      default: return status;
    }
  };

  const getProjectTypeText = (type: string) => {
    switch (type) {
      case 'virtual_tryon': return 'Virtual Try-On';
      case 'model_swap': return 'Model Swap';
      case 'photo_edit': return 'Photo Editor';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Riwayat Proyek
          </CardTitle>
          <CardDescription>
            Lihat semua proyek AI yang telah Anda buat
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Memuat riwayat proyek...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Belum ada proyek yang dibuat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base">{project.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{project.description}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusVariant(project.status)} className="text-xs">
                          {getStatusText(project.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getProjectTypeText(project.project_type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Dibuat: {new Date(project.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="flex gap-2 sm:flex-col sm:w-auto w-full">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedProject(project)}
                        disabled={!project.settings?.prediction_id}
                        className="flex-1 sm:flex-none touch-target"
                      >
                        <Eye className="h-4 w-4 sm:mr-0 mr-2" />
                        <span className="sm:hidden">Lihat</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteProject(project.id)}
                        className="flex-1 sm:flex-none touch-target"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-0 mr-2" />
                        <span className="sm:hidden">Hapus</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && selectedProject.settings?.prediction_id && (
        <ResultViewer
          projectId={selectedProject.id}
          predictionId={selectedProject.settings.prediction_id}
          title={selectedProject.title}
        />
      )}
    </div>
  );
};

export default ProjectHistory;