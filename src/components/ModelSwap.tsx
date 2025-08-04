import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, ArrowLeftRight, Loader2 } from 'lucide-react';
import ModelGallery from './ModelGallery';

interface ModelSwapProps {
  userId: string;
}

interface Model {
  id: string;
  name: string;
  imageUrl: string;
  type: 'template' | 'uploaded';
  uploadedAt?: string;
}

const ModelSwap = ({ userId }: ModelSwapProps) => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleOriginalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage(file);
      const previewUrl = URL.createObjectURL(file);
      setOriginalImagePreview(previewUrl);
    }
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
  };

  const uploadImage = async (file: File, type: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileName = `${user.id}/${type}_${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tryon-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('tryon-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleProcess = async () => {
    if (!originalImage || !selectedModel) {
      toast({
        title: 'Error',
        description: 'Silakan upload gambar produk dan pilih model terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload original image
      const originalImageUrl = await uploadImage(originalImage, 'original');

      // Create project in database
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: `Model Swap - ${new Date().toLocaleDateString('id-ID')}`,
          description: `Ganti model: ${selectedModel.name}`,
          project_type: 'model_swap',
          status: 'processing',
          settings: {
            original_image_url: originalImageUrl,
            model_image_url: selectedModel.imageUrl,
            model_name: selectedModel.name,
            model_type: selectedModel.type
          }
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Call Fashn API for model swap
      const { data: fashnResponse, error: fashnError } = await supabase.functions.invoke('fashn-api', {
        body: {
          action: 'run',
          model_image: selectedModel.imageUrl,
          garment_image: originalImageUrl,
          swapType: 'model_swap'
        }
      });

      if (fashnError) {
        console.error('Fashn API Error:', fashnError);
        throw new Error(fashnError.message || 'Failed to start model swap');
      }

      if (fashnResponse?.error) {
        console.error('Fashn Response Error:', fashnResponse.error);
        throw new Error(fashnResponse.error);
      }

      if (!fashnResponse?.prediction_id) {
        console.error('No prediction ID returned:', fashnResponse);
        throw new Error('No prediction ID returned from Fashn API');
      }

      // Update project with prediction ID
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          settings: {
            original_image_url: originalImageUrl,
            model_image_url: selectedModel.imageUrl,
            model_name: selectedModel.name,
            model_type: selectedModel.type,
            prediction_id: fashnResponse.prediction_id
          }
        })
        .eq('id', project.id);

      if (updateError) {
        console.error('Update project error:', updateError);
        throw updateError;
      }

      toast({
        title: 'Berhasil!',
        description: 'Model swap sedang diproses dengan AI. Silakan cek riwayat proyek untuk melihat hasilnya.',
      });

      // Reset form
      setOriginalImage(null);
      setOriginalImagePreview(null);
      setSelectedModel(null);

    } catch (error: any) {
      console.error('Model swap error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Terjadi kesalahan saat memproses model swap',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-background p-2 sm:p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-3 sm:mb-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Ganti Model AI</h1>
          <p className="text-sm text-muted-foreground">
            Pilih model dari galeri dan ganti model dalam foto produk Anda
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Model Gallery Section */}
        <ModelGallery 
          onModelSelect={handleModelSelect}
          selectedModel={selectedModel}
        />

        {/* Manual Model Swap Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 border-b p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ArrowLeftRight className="h-4 w-4" />
              Ganti Model Manual
            </CardTitle>
            <CardDescription className="text-sm">
              Upload gambar produk dan pilih model untuk ditukar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Product Image Upload */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Gambar Produk Asli</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                    <Label
                      htmlFor="original-upload"
                      className="cursor-pointer inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
                    >
                      <span>Upload Gambar Produk</span>
                      <Input
                        id="original-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleOriginalImageChange}
                      />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-2">PNG, JPG hingga 10MB</p>
                  </div>
                  
                  {originalImagePreview && (
                    <div className="relative">
                      <img 
                        src={originalImagePreview} 
                        alt="Original preview" 
                        className="w-full max-w-sm mx-auto rounded-lg shadow-md"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setOriginalImage(null);
                          setOriginalImagePreview(null);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>

                {/* Selected Model Preview */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Model yang Dipilih</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center min-h-[200px] flex items-center justify-center">
                    {selectedModel ? (
                      <div className="text-center">
                        <img 
                          src={selectedModel.imageUrl} 
                          alt={selectedModel.name}
                          className="w-full max-w-sm mx-auto rounded-lg shadow-md mb-3"
                        />
                        <p className="font-medium">{selectedModel.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedModel.type === 'template' ? 'Template Model' : 'Model Upload'}
                        </p>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <ArrowLeftRight className="mx-auto h-8 w-8 mb-3 opacity-50" />
                        <p>Pilih model dari galeri di atas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Process Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleProcess}
                  disabled={processing || !originalImage || !selectedModel}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Ganti Model
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelSwap;