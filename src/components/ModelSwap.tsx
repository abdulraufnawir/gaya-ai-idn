import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, ArrowLeftRight, Loader2, Sparkles, Image } from 'lucide-react';
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
  
  // AI Generation states
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('2:3');
  const [generatingModel, setGeneratingModel] = useState(false);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  
  const { toast } = useToast();

  const aspectRatios = [
    { label: '1:1', value: '1:1', width: 1024, height: 1024 },
    { label: '2:3', value: '2:3', width: 683, height: 1024 },
    { label: '3:4', value: '3:4', width: 768, height: 1024 },
    { label: '4:3', value: '4:3', width: 1024, height: 768 },
    { label: '4:5', value: '4:5', width: 819, height: 1024 },
  ];

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

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const previewUrl = URL.createObjectURL(file);
      setReferenceImagePreview(previewUrl);
    }
  };

  const handleGenerateModel = async () => {
    if (!generatePrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Silakan masukkan deskripsi model yang ingin dibuat',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingModel(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const selectedRatio = aspectRatios.find(r => r.value === selectedAspectRatio);
      
      let referenceImageUrl = null;
      if (referenceImage) {
        referenceImageUrl = await uploadImage(referenceImage, 'reference');
      }

      // Create project for model generation
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: `AI Model Generation - ${new Date().toLocaleDateString('id-ID')}`,
          description: generatePrompt.substring(0, 100),
          project_type: 'model_generation',
          status: 'processing',
          settings: {
            prompt: generatePrompt,
            aspect_ratio: selectedAspectRatio,
            width: selectedRatio?.width || 683,
            height: selectedRatio?.height || 1024,
            reference_image_url: referenceImageUrl
          }
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Call image generation API (you can integrate with your preferred AI service)
      const { data: genResponse, error: genError } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'generateModel',
          prompt: generatePrompt,
          aspectRatio: selectedAspectRatio,
          referenceImage: referenceImageUrl,
          projectId: project.id
        }
      });

      if (genError) {
        console.error('Model generation error:', genError);
        throw new Error(genError.message || 'Failed to generate model');
      }

      toast({
        title: 'Berhasil!',
        description: 'Model AI sedang dibuat. Model akan muncul di galeri setelah selesai diproses.',
      });

      // Reset form
      setGeneratePrompt('');
      setReferenceImage(null);
      setReferenceImagePreview(null);

      // Trigger a custom event to refresh the model gallery
      const refreshEvent = new CustomEvent('refreshModelGallery');
      window.dispatchEvent(refreshEvent);

    } catch (error: any) {
      console.error('Model generation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Terjadi kesalahan saat membuat model AI',
        variant: 'destructive',
      });
    } finally {
      setGeneratingModel(false);
    }
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
          original_image_url: originalImageUrl,
          settings: {
            model_image_url: selectedModel.imageUrl,
            model_name: selectedModel.name,
            model_type: selectedModel.type
          }
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Call Kie.AI for model swap
      const { data: kieResponse, error: kieError } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'modelSwap',
          modelImage: selectedModel.imageUrl,
          garmentImage: originalImageUrl,
          projectId: project.id
        }
      });

      if (kieError) {
        console.error('Kie.AI API Error:', kieError);
        throw new Error(kieError.message || 'Failed to start model swap');
      }

      if (kieResponse?.error) {
        console.error('Kie.AI Response Error:', kieResponse.error);
        throw new Error(kieResponse.error);
      }

      if (!kieResponse?.prediction_id) {
        console.error('No prediction ID returned:', kieResponse);
        throw new Error('No prediction ID returned from Kie.AI API');
      }

      // Update project with prediction ID
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          prediction_id: kieResponse.prediction_id,
          settings: {
            model_image_url: selectedModel.imageUrl,
            model_name: selectedModel.name,
            model_type: selectedModel.type,
            model_used: 'google/nano-banana',
            api_provider: 'kie.ai'
          }
        })
        .eq('id', project.id);

      if (updateError) {
        console.error('Update project error:', updateError);
        throw updateError;
      }

      toast({
        title: 'Berhasil!',
        description: 'Model swap sedang diproses dengan Kie.AI nano-banana. Silakan cek riwayat proyek untuk melihat hasilnya.',
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
            Buat model AI baru atau pilih dari galeri untuk mengganti model dalam foto produk
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* AI Model Generation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate AI Model
            </CardTitle>
            <CardDescription>
              Buat model AI kustom sesuai deskripsi Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prompt Input */}
            <div className="space-y-2">
              <Label htmlFor="generate-prompt">What do you want to generate?</Label>
              <Textarea
                id="generate-prompt"
                placeholder="Example: Full-body, brown hair, hands on hips"
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Options Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Select Consistent Model */}
              <Card className="border-2 border-dashed border-muted-foreground/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowLeftRight className="w-4 h-4" />
                    <span className="font-medium">Select Consistent Model</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Generate images with the same model</p>
                </CardContent>
              </Card>

              {/* Image Reference */}
              <Card className="border-2 border-dashed border-muted-foreground/20">
                <CardContent className="p-4">
                  {referenceImagePreview ? (
                    <div className="relative">
                      <img 
                        src={referenceImagePreview} 
                        alt="Reference" 
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => {
                          setReferenceImage(null);
                          setReferenceImagePreview(null);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="reference-upload"
                      className="flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <Image className="w-4 h-4" />
                      <span className="font-medium">Image Reference</span>
                      <span className="text-sm text-muted-foreground">Copy pose or silhouette from an image</span>
                      <Input
                        id="reference-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleReferenceImageChange}
                      />
                    </label>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Aspect Ratio Selection */}
            <div className="space-y-2">
              <Label>Select Aspect Ratio</Label>
              <div className="flex gap-2 flex-wrap">
                {aspectRatios.map((ratio) => (
                  <Button
                    key={ratio.value}
                    variant={selectedAspectRatio === ratio.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAspectRatio(ratio.value)}
                    className="flex flex-col h-auto py-2"
                  >
                    <div 
                      className="w-8 h-8 border border-current mb-1"
                      style={{
                        aspectRatio: ratio.value === '1:1' ? '1' : 
                                   ratio.value === '2:3' ? '2/3' :
                                   ratio.value === '3:4' ? '3/4' :
                                   ratio.value === '4:3' ? '4/3' :
                                   '4/5'
                      }}
                    />
                    <span className="text-xs">{ratio.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerateModel}
              disabled={generatingModel || !generatePrompt.trim()}
              className="w-full"
              size="lg"
            >
              {generatingModel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating AI Model...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Model (~10s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Model Gallery Section */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Model dari Galeri</CardTitle>
            <CardDescription>
              Atau pilih model yang sudah ada dari galeri di bawah
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelGallery 
              onModelSelect={handleModelSelect}
              selectedModel={selectedModel}
            />
          </CardContent>
        </Card>

        {/* Image Upload and Process Section */}
        {selectedModel && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Gambar Produk</CardTitle>
              <CardDescription>
                Upload foto produk yang ingin diganti modelnya
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="original-upload">Gambar Produk</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 h-48">
                    {originalImagePreview ? (
                      <div className="relative h-full">
                        <img 
                          src={originalImagePreview} 
                          alt="Original" 
                          className="w-full h-full object-contain rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => {
                            setOriginalImage(null);
                            setOriginalImagePreview(null);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="original-upload"
                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors"
                      >
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium text-primary">Upload gambar produk</span>
                        <span className="text-xs text-muted-foreground">PNG, JPG hingga 10MB</span>
                        <Input
                          id="original-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleOriginalImageChange}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Selected Model Preview */}
                <div className="space-y-2">
                  <Label>Model Terpilih</Label>
                  <div className="border-2 border-primary/25 rounded-lg p-4 h-48">
                    <img 
                      src={selectedModel.imageUrl} 
                      alt={selectedModel.name} 
                      className="w-full h-full object-contain rounded"
                    />
                  </div>
                  <p className="text-sm text-center font-medium">{selectedModel.name}</p>
                </div>
              </div>

              {/* Process Button */}
              <Button 
                onClick={handleProcess}
                disabled={processing || !originalImage || !selectedModel}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Memproses Model Swap...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Proses Model Swap
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ModelSwap;