import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, User, Search, Sparkles, CheckCircle, X } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  imageUrl: string;
  type: 'template' | 'uploaded';
  uploadedAt?: string;
}

interface ModelGalleryProps {
  onModelSelect: (model: Model) => void;
  selectedModel?: Model | null;
}

const ModelGallery = ({ onModelSelect, selectedModel }: ModelGalleryProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Template models yang disediakan aplikasi - semua dihapus
  const templateModels: Model[] = [];

  useEffect(() => {
    loadUploadedModels();
  }, []);

  const loadUploadedModels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('ModelGallery: No user found');
        return;
      }

      console.log('ModelGallery: Loading models for user:', user.id);

      // Load models dari storage
      const { data: files, error } = await supabase.storage
        .from('tryon-images')
        .list(`${user.id}/models`, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('ModelGallery: Error loading models:', error);
        return;
      }

      console.log('ModelGallery: Files found:', files);

      const uploadedModels: Model[] = files?.map(file => ({
        id: `uploaded-${file.name}`,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        imageUrl: supabase.storage
          .from('tryon-images')
          .getPublicUrl(`${user.id}/models/${file.name}`).data.publicUrl,
        type: 'uploaded',
        uploadedAt: file.created_at
      })) || [];

      console.log('ModelGallery: Uploaded models:', uploadedModels);

      const allModels = [...templateModels, ...uploadedModels];
      console.log('ModelGallery: Setting models:', allModels);
      setModels(allModels);
    } catch (error) {
      console.error('ModelGallery: Error loading models:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Silakan upload file gambar',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileName = `model-${Date.now()}-${file.name}`;
      const filePath = `${user.id}/models/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tryon-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tryon-images')
        .getPublicUrl(filePath);

      const newModel: Model = {
        id: `uploaded-${fileName}`,
        name: fileName.replace(/\.[^/.]+$/, ""),
        imageUrl: publicUrl,
        type: 'uploaded',
        uploadedAt: new Date().toISOString()
      };

      setModels(prev => [newModel, ...prev.filter(m => m.type === 'uploaded')]);

      toast({
        title: 'Berhasil!',
        description: 'Model berhasil diupload',
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupload model',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteModel = async (model: Model) => {
    if (model.type === 'template') return; // Can't delete template models
    
    try {
      // Extract full storage key from public URL
      const url = new URL(model.imageUrl);
      const pathPrefix = '/storage/v1/object/public/tryon-images/';
      const fullPath = url.pathname.includes(pathPrefix)
        ? decodeURIComponent(url.pathname.split(pathPrefix)[1])
        : null;
      
      if (fullPath) {
        const { error } = await supabase.storage
          .from('tryon-images')
          .remove([fullPath]);

        if (error) throw error;

        // Remove from state
        setModels(prev => prev.filter(m => m.id !== model.id));
        
        toast({
          title: 'Berhasil',
          description: 'Model berhasil dihapus',
        });
      } else {
        throw new Error('Tidak dapat menentukan path file.');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus model: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
      });
    }
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <User className="h-4 w-4" />
          Pilih Model
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-4">
          {/* Upload New Model */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
            <Label
              htmlFor="model-upload"
              className="cursor-pointer inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
            >
              <span>Upload Model Baru</span>
              <Input
                id="model-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG hingga 10MB
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className={`relative group cursor-pointer transition-all duration-200 ${
                    selectedModel?.id === model.id
                      ? 'ring-2 ring-primary ring-offset-2'
                      : 'hover:scale-105'
                  }`}
                  onClick={() => {
                    onModelSelect(model);
                    // Dispatch event to switch to Virtual Try-On and set model
                    const event = new CustomEvent('selectModelForTryOn', {
                      detail: { model }
                    });
                    window.dispatchEvent(event);
                  }}
                >
                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                  <img
                    src={model.imageUrl}
                    alt={model.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="opacity-90"
                    >
                      Pilih Model
                    </Button>
                  </div>

                  {/* Delete Button for uploaded models */}
                  {model.type === 'uploaded' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModel(model);
                      }}
                      className="absolute top-2 right-2 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {/* Selected Indicator */}
                  {selectedModel?.id === model.id && (
                    <div className="absolute top-2 left-2">
                      <CheckCircle className="h-6 w-6 text-primary bg-white rounded-full" />
                    </div>
                  )}
                </div>

                {/* Model Info */}
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium truncate">{model.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={model.type === 'template' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {model.type === 'template' ? (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Template
                        </>
                      ) : (
                        'Upload'
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredModels.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>Tidak ada model ditemukan</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelGallery;