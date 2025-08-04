import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Users } from 'lucide-react';

interface ModelSwapProps {
  userId: string;
}

const ModelSwap = ({ userId }: ModelSwapProps) => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [targetModel, setTargetModel] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleOriginalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage(file);
    }
  };

  const handleTargetModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetModel(file);
    }
  };

  const handleProcess = async () => {
    if (!originalImage || !targetModel) {
      toast({
        title: 'Error',
        description: 'Silakan upload gambar asli dan target model',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: `Model Swap - ${new Date().toLocaleDateString('id-ID')}`,
          description: 'Model swap project',
          project_type: 'model_swap',
          status: 'processing'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: 'Proyek penggantian model telah dibuat. Fitur AI akan segera tersedia!',
      });

      setOriginalImage(null);
      setTargetModel(null);
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
            <Users className="h-5 w-5" />
            Ganti Model AI
          </CardTitle>
          <CardDescription>
            Ganti model dalam foto produk Anda dengan model yang berbeda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="original-upload">Foto Asli</Label>
                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="original-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                      >
                        <span>Upload foto asli</span>
                        <Input
                          id="original-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleOriginalImageChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG hingga 10MB</p>
                  </div>
                </div>
                {originalImage && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {originalImage.name}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="target-upload">Target Model</Label>
                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="target-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                      >
                        <span>Upload foto target model</span>
                        <Input
                          id="target-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleTargetModelChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG hingga 10MB</p>
                  </div>
                </div>
                {targetModel && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {targetModel.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleProcess}
              disabled={processing || !originalImage || !targetModel}
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
                  <Users className="h-4 w-4 mr-2" />
                  Ganti Model
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelSwap;