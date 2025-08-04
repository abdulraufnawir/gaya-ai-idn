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
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleModelImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModelImage(file);
    }
  };

  const handleClothingImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setClothingImage(file);
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
      // Create project record
      const { data, error } = await supabase
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

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: 'Proyek virtual try-on telah dibuat. Fitur AI akan segera tersedia!',
      });

      // Reset form
      setModelImage(null);
      setClothingImage(null);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Virtual Try-On AI
          </CardTitle>
          <CardDescription>
            Upload foto model dan pakaian untuk melihat hasil virtual try-on
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="model-upload">Foto Model</Label>
                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="model-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                      >
                        <span>Upload foto model</span>
                        <Input
                          id="model-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleModelImageChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG hingga 10MB</p>
                  </div>
                </div>
                {modelImage && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {modelImage.name}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="clothing-upload">Foto Pakaian</Label>
                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="clothing-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                      >
                        <span>Upload foto pakaian</span>
                        <Input
                          id="clothing-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleClothingImageChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG hingga 10MB</p>
                  </div>
                </div>
                {clothingImage && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {clothingImage.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleProcess}
              disabled={processing || !modelImage || !clothingImage}
              size="lg"
              className="min-w-[200px]"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Memproses...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Buat Virtual Try-On
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VirtualTryOn;