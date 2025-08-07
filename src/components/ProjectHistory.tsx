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
  result_image_url?: string;
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {projects.map((project) => (
                <div key={project.id} className="group border rounded-lg overflow-hidden hover:shadow-md transition-all bg-card cursor-pointer">
                  {/* Image Container */}
                  <div className="aspect-square relative bg-muted">
                    {(project.result_image_url || project.settings?.result_url) ? (
                      <img 
                        src={project.result_image_url || project.settings?.result_url} 
                        alt={project.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center ${(project.result_image_url || project.settings?.result_url) ? 'hidden' : ''}`}>
                      <div className="text-center">
                        <div className="w-8 h-8 bg-muted-foreground/20 rounded mx-auto mb-1"></div>
                        <p className="text-xs text-muted-foreground">No Image</p>
                      </div>
                    </div>
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(project);
                          }}
                          disabled={!project.settings?.prediction_id}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant={getStatusVariant(project.status)} className="text-xs px-2 py-0.5">
                        {getStatusText(project.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-2 space-y-1">
                    <h3 className="font-medium text-xs leading-tight line-clamp-1">{project.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{getProjectTypeText(project.project_type)}</span>
                      <span>{new Date(project.created_at).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short'
                      })}</span>
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
          projectType={selectedProject.project_type}
        />
      )}
    </div>
  );
};

export default ProjectHistory;