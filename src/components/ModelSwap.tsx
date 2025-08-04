import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Users, Sparkles, User, Image as ImageIcon, Wand2 } from 'lucide-react';

interface ModelSwapProps {
  userId: string;
}

const ModelSwap = ({ userId }: ModelSwapProps) => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [targetModel, setTargetModel] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [targetModelPreview, setTargetModelPreview] = useState<string | null>(null);
  const [generatedModelPreview, setGeneratedModelPreview] = useState<string | null>(null);
  const [modelDescription, setModelDescription] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [generatingModel, setGeneratingModel] = useState(false);
  const { toast } = useToast();

  const handleOriginalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage(file);
      const previewUrl = URL.createObjectURL(file);
      setOriginalImagePreview(previewUrl);
    }
  };

  const handleTargetModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetModel(file);
      const previewUrl = URL.createObjectURL(file);
      setTargetModelPreview(previewUrl);
    }
  };

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const previewUrl = URL.createObjectURL(file);
      setReferenceImagePreview(previewUrl);
    }
  };

  const generateAIModel = async () => {
    if (!modelDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Silakan masukkan deskripsi model terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingModel(true);

    try {
      // Here you would integrate with an AI image generation service
      // For now, we'll simulate the generation process
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second simulation
      
      // In a real implementation, you would call an AI service like:
      // const { data: aiResponse } = await supabase.functions.invoke('generate-ai-model', {
      //   body: { description: modelDescription, referenceImage: referenceImagePreview }
      // });
      
      toast({
        title: 'Fitur Akan Datang',
        description: 'Fitur generate AI model akan segera tersedia!',
      });
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGeneratingModel(false);
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
      // Upload images to storage
      const originalImageUrl = await uploadImage(originalImage, 'original');
      const targetModelUrl = await uploadImage(targetModel, 'target');

      // Create project record
      const { data: project, error: projectError } = await supabase
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

      if (projectError) throw projectError;

      // Start Fashn.ai prediction for model swap (using try-on with swapped model)
      const { data: fashnResponse } = await supabase.functions.invoke('fashn-api', {
        body: {
          action: 'run',
          modelImage: targetModelUrl,
          garmentImage: originalImageUrl,
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
            original_image_url: originalImageUrl,
            target_model_url: targetModelUrl
          }
        })
        .eq('id', project.id);

      toast({
        title: 'Berhasil!',
        description: 'Model swap sedang diproses. Silakan cek riwayat proyek untuk melihat hasilnya.',
      });

      setOriginalImage(null);
      setTargetModel(null);
      setOriginalImagePreview(null);
      setTargetModelPreview(null);
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
    <div className="bg-background p-3 sm:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Ganti Model AI</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ganti model dalam foto produk atau buat model AI yang konsisten
          </p>
        </div>
      </div>

      {/* AI Model Generation Section */}
      <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Sparkles className="h-5 w-5" />
              Generate Model AI
            </CardTitle>
            <CardDescription>
              Buat model AI yang konsisten berdasarkan deskripsi dan referensi gambar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-6">
              {/* Model Description */}
              <div className="space-y-3">
                <Label htmlFor="model-description" className="text-base font-medium">
                  Deskripsi Model
                </Label>
                <Textarea
                  id="model-description"
                  placeholder="Contoh: Perempuan, rambut coklat panjang, kulit putih, tinggi badan sedang, usia 25 tahun"
                  value={modelDescription}
                  onChange={(e) => setModelDescription(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Berikan deskripsi detail tentang model yang Anda inginkan
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reference Image Upload */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Gambar Referensi (Opsional)
                  </Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-primary/50 transition-colors">
                    {referenceImagePreview ? (
                      <div className="relative">
                        <img 
                          src={referenceImagePreview} 
                          alt="Reference preview" 
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setReferenceImage(null);
                            setReferenceImagePreview(null);
                          }}
                          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-8 h-8 flex items-center justify-center hover:bg-background/90 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                        <div>
                          <Input
                            id="reference-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleReferenceImageChange}
                            className="hidden"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => document.getElementById('reference-upload')?.click()}
                            className="w-full"
                          >
                            Upload Referensi
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upload gambar sebagai referensi pose atau gaya
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex flex-col justify-center space-y-3">
                  <Button
                    onClick={generateAIModel}
                    disabled={generatingModel || !modelDescription.trim()}
                    className="w-full h-12"
                  >
                    {generatingModel ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating... (~10s)
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate AI Model
                      </>
                    )}
                  </Button>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <User className="h-3 w-3 mr-1" />
                      Pilih Model Konsisten
                    </Button>
                  </div>
                </div>

                {/* Generated Model Preview */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Model Hasil Generate</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                    {generatedModelPreview ? (
                      <img 
                        src={generatedModelPreview} 
                        alt="Generated model" 
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Model Anda akan muncul di sini
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traditional Model Swap Section */}
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5" />
              Ganti Model Manual
            </CardTitle>
            <CardDescription>
              Upload foto asli dan foto model target untuk mengganti model secara manual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Image Upload */}
              <div className="space-y-4">
                <Label htmlFor="original-upload" className="text-base font-medium">
                  Foto Asli Produk
                </Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-8 text-center hover:border-primary/50 transition-colors">
                  {originalImagePreview ? (
                    <div className="space-y-4">
                      <img 
                        src={originalImagePreview} 
                        alt="Original image preview" 
                        className="w-full h-60 sm:h-80 object-cover rounded-lg mx-auto"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOriginalImage(null);
                          setOriginalImagePreview(null);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        Hapus Gambar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center">
                        <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-base sm:text-lg font-medium mb-2">Upload foto asli</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                          Foto produk dengan model yang ingin diganti
                        </p>
                        <Input
                          id="original-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleOriginalImageChange}
                          className="hidden"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => document.getElementById('original-upload')?.click()}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Pilih File
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Model Upload */}
              <div className="space-y-4">
                <Label htmlFor="target-upload" className="text-base font-medium">
                  Model Target
                </Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-8 text-center hover:border-primary/50 transition-colors">
                  {targetModelPreview ? (
                    <div className="space-y-4">
                      <img 
                        src={targetModelPreview} 
                        alt="Target model preview" 
                        className="w-full h-60 sm:h-80 object-cover rounded-lg mx-auto"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTargetModel(null);
                          setTargetModelPreview(null);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        Hapus Gambar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-base sm:text-lg font-medium mb-2">Upload model target</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                          Foto model yang akan menggantikan model asli
                        </p>
                        <Input
                          id="target-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleTargetModelChange}
                          className="hidden"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => document.getElementById('target-upload')?.click()}
                          className="w-full"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Pilih File
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Process Button */}
            <div className="text-center pt-4 sm:pt-6">
              <Button
                onClick={handleProcess}
                disabled={processing || !originalImage || !targetModel}
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-background mr-2"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5 mr-2" />
                    Ganti Model
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelSwap;