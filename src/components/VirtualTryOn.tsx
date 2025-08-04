import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Sparkles } from 'lucide-react';

interface VirtualTryOnProps {
  userId: string;
}

const VirtualTryOn = ({ userId }: VirtualTryOnProps) => {
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [modelImagePreview, setModelImagePreview] = useState<string | null>(null);
  const [clothingImagePreview, setClothingImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleModelImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModelImage(file);
      const previewUrl = URL.createObjectURL(file);
      setModelImagePreview(previewUrl);
    }
  };

  const handleClothingImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setClothingImage(file);
      const previewUrl = URL.createObjectURL(file);
      setClothingImagePreview(previewUrl);
    }
  };

  const handleProcess = async () => {
    if (!modelImage || !clothingImage) {
      toast({
        title: 'Error',
        description: 'Silakan upload gambar model dan pakaian',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      // First, upload images to storage
      const modelImageUrl = await uploadImage(modelImage, 'model');
      const clothingImageUrl = await uploadImage(clothingImage, 'clothing');

      // Create project record
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: `Virtual Try-On - ${new Date().toLocaleDateString('id-ID')}`,
          description: 'Virtual try-on project',
          project_type: 'virtual_tryon',
          status: 'processing'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Start Fashn.ai prediction
      const { data: fashnResponse } = await supabase.functions.invoke('fashn-api', {
        body: {
          action: 'run',
          modelImage: modelImageUrl,
          garmentImage: clothingImageUrl,
          modelName: 'tryon-v1.6'
        }
      });

      if (fashnResponse.error) {
        throw new Error(fashnResponse.error);
      }

      // Update project with prediction ID using settings for now
      await supabase
        .from('projects')
        .update({
          settings: {
            prediction_id: fashnResponse.id,
            model_image_url: modelImageUrl,
            garment_image_url: clothingImageUrl
          }
        })
        .eq('id', project.id);

      toast({
        title: 'Berhasil!',
        description: 'Virtual try-on sedang diproses. Silakan cek riwayat proyek untuk melihat hasilnya.',
      });

      // Reset form
      setModelImage(null);
      setClothingImage(null);
      setModelImagePreview(null);
      setClothingImagePreview(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const uploadImage = async (file: File, type: string): Promise<string> => {
    const fileName = `${userId}/${type}_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('tryon-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('tryon-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Virtual Try-On AI</h1>
          <p className="text-muted-foreground">Upload foto model dan pakaian untuk melihat hasil virtual try-on</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
        {/* Select Model */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Select Model
              <div className="w-4 h-4 bg-muted-foreground/20 rounded-full flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            </h2>
          </div>
          
          <div className="relative">
            <div className="aspect-[3/4] bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors overflow-hidden">
              {modelImagePreview ? (
                <div className="relative w-full h-full">
                  <img 
                    src={modelImagePreview} 
                    alt="Model preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setModelImage(null);
                      setModelImagePreview(null);
                    }}
                    className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-8 h-8 flex items-center justify-center hover:bg-background/90 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="model-upload"
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors"
                >
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <span className="text-lg font-medium text-primary mb-2">Upload foto model</span>
                  <span className="text-sm text-muted-foreground">PNG, JPG hingga 10MB</span>
                  <Input
                    id="model-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleModelImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          {modelImage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                Generate AI Model
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                My Models
              </Button>
            </div>
          )}
        </div>

        {/* Select Garment */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Select Garment
              <div className="w-4 h-4 bg-muted-foreground/20 rounded-full flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            </h2>
          </div>
          
          <div className="relative">
            <div className="aspect-[3/4] bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors overflow-hidden">
              {clothingImagePreview ? (
                <div className="relative w-full h-full">
                  <img 
                    src={clothingImagePreview} 
                    alt="Clothing preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setClothingImage(null);
                      setClothingImagePreview(null);
                    }}
                    className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-8 h-8 flex items-center justify-center hover:bg-background/90 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="clothing-upload"
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors"
                >
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <span className="text-lg font-medium text-primary mb-2">Upload foto pakaian</span>
                  <span className="text-sm text-muted-foreground">PNG, JPG hingga 10MB</span>
                  <Input
                    id="clothing-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleClothingImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          {clothingImage && (
            <div className="grid grid-cols-4 gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                Auto
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Top
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Bottom
              </Button>
              <Button variant="default" size="sm" className="text-xs">
                Full-body
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <div className="max-w-7xl mx-auto mt-8 flex justify-center">
        <Button
          onClick={handleProcess}
          disabled={processing || !modelImage || !clothingImage}
          size="lg"
          className="min-w-[300px] h-12 text-lg"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Memproses...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-3" />
              Buat Virtual Try-On
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VirtualTryOn;