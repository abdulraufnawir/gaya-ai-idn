import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Sparkles, Users, Shirt, Image } from 'lucide-react';
import ModelGallery from './ModelGallery';
interface VirtualTryOnProps {
  userId: string;
}
const VirtualTryOn = ({
  userId
}: VirtualTryOnProps) => {
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null); // For selected models
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [modelImagePreview, setModelImagePreview] = useState<string | null>(null);
  const [clothingImagePreview, setClothingImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [clothingCategory, setClothingCategory] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    // Listen for model selection from ModelGallery
    const handleSetSelectedModel = (event: any) => {
      const selectedModel = event.detail.model;
      if (selectedModel?.imageUrl) {
        // Clear any uploaded file and set the selected model URL
        setModelImage(null);
        setModelImageUrl(selectedModel.imageUrl);
        setModelImagePreview(selectedModel.imageUrl);
        setSelectedModel(selectedModel);
        toast({
          title: 'Berhasil',
          description: 'Model berhasil dipilih untuk virtual try-on'
        });
      }
    };

    // Listen for model selection from gallery within VirtualTryOn
    const handleSelectModelForTryOn = (event: any) => {
      const selectedModel = event.detail.model;
      if (selectedModel?.imageUrl) {
        // Clear any uploaded file and set the selected model URL
        setModelImage(null);
        setModelImageUrl(selectedModel.imageUrl);
        setModelImagePreview(selectedModel.imageUrl);
        setSelectedModel(selectedModel);
        toast({
          title: 'Berhasil',
          description: 'Model berhasil dipilih untuk virtual try-on'
        });
      }
    };
    window.addEventListener('setSelectedModel', handleSetSelectedModel);
    window.addEventListener('selectModelForTryOn', handleSelectModelForTryOn);
    return () => {
      window.removeEventListener('setSelectedModel', handleSetSelectedModel);
      window.removeEventListener('selectModelForTryOn', handleSelectModelForTryOn);
    };
  }, [toast]);
  const handleModelImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModelImage(file);
      setModelImageUrl(null); // Clear selected model URL when uploading new file
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
    if (!modelImage && !modelImageUrl || !clothingImage) {
      toast({
        title: 'Error',
        description: 'Silakan upload gambar model dan pakaian',
        variant: 'destructive'
      });
      return;
    }
    setProcessing(true);
    try {
      // Get model image URL - either from uploaded file or selected model
      const finalModelImageUrl = modelImageUrl || (await uploadImage(modelImage!, 'model'));
      const clothingImageUrl = await uploadImage(clothingImage, 'clothing');

      // Create project record
      const {
        data: project,
        error: projectError
      } = await supabase.from('projects').insert({
        user_id: userId,
        title: `Virtual Try-On - ${new Date().toLocaleDateString('id-ID')}`,
        description: 'Virtual try-on project',
        project_type: 'virtual_tryon',
        status: 'processing'
      }).select().single();
      if (projectError) throw projectError;

      // Start Kie.AI virtual try-on
      const {
        data: kieResponse,
        error: invokeError
      } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'virtualTryOn',
          modelImage: finalModelImageUrl,
          garmentImage: clothingImageUrl,
          projectId: project.id,
          clothingCategory: clothingCategory
        }
      });
      if (invokeError) {
        throw new Error(`Function invoke error: ${invokeError.message}`);
      }
      if (!kieResponse) {
        throw new Error('No response received from Kie.AI');
      }
      if (kieResponse.error) {
        throw new Error(kieResponse.error);
      }

      // Update project with prediction ID using settings for now
      await supabase.from('projects').update({
        prediction_id: kieResponse.prediction_id,
        settings: {
          prediction_id: kieResponse.prediction_id,
          model_image_url: finalModelImageUrl,
          garment_image_url: clothingImageUrl
        }
      }).eq('id', project.id);
      toast({
        title: 'Berhasil!',
        description: 'Virtual try-on sedang diproses dengan Kie.AI. Silakan cek riwayat proyek untuk melihat hasilnya.'
      });

      // Reset form
      setModelImage(null);
      setModelImageUrl(null);
      setClothingImage(null);
      setModelImagePreview(null);
      setClothingImagePreview(null);
      setSelectedModel(null);
      setClothingCategory(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };
  const uploadImage = async (file: File, type: string): Promise<string> => {
    const fileName = `${userId}/${type}_${Date.now()}_${file.name}`;
    const {
      data,
      error
    } = await supabase.storage.from('tryon-images').upload(fileName, file);
    if (error) throw error;
    const {
      data: {
        publicUrl
      }
    } = supabase.storage.from('tryon-images').getPublicUrl(fileName);
    return publicUrl;
  };
  return <div className="bg-background p-2 sm:p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-3 sm:mb-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Virtual Try-On AI</h1>
          <p className="text-sm text-muted-foreground">Upload foto model dan pakaian untuk melihat hasil virtual try-on</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pilih Model */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2">
              Pilih Model
              <div className="w-4 h-4 bg-muted-foreground/20 rounded-full flex items-center justify-center">
              </div>
            </h2>
          </div>
          
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Gallery
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="mt-4">
              <div className="relative">
                <div className="aspect-[3/4] bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors overflow-hidden min-h-[200px] sm:min-h-[250px]">
                  {modelImagePreview ? <div className="relative w-full h-full">
                      <img src={modelImagePreview} alt="Model preview" className="w-full h-full object-cover" />
                      <button onClick={() => {
                    setModelImage(null);
                    setModelImageUrl(null);
                    setModelImagePreview(null);
                    setSelectedModel(null);
                  }} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-8 h-8 flex items-center justify-center hover:bg-background/90 transition-colors touch-target">
                        ×
                      </button>
                    </div> : <div className="relative w-full h-full">
                      {/* Shadow guide image */}
                      <img src="/lovable-uploads/0d135a5e-fd0c-41e5-a384-1c2ffeabc466.png" alt="Person positioning guide" className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none z-10" />
                      <label htmlFor="model-upload" className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors p-4 z-20">
                        <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
                        <span className="text-base sm:text-lg font-medium text-primary mb-2 text-center">Upload foto model</span>
                        <span className="text-xs sm:text-sm text-muted-foreground text-center">PNG, JPG hingga 10MB</span>
                        <Input id="model-upload" type="file" accept="image/*" className="sr-only" onChange={handleModelImageChange} />
                      </label>
                    </div>}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                
              </div>
            </TabsContent>
            
            <TabsContent value="gallery" className="mt-4">
              <div className="max-h-[400px] overflow-y-auto">
                <ModelGallery onModelSelect={model => {
                setModelImage(null);
                setModelImageUrl(model.imageUrl);
                setModelImagePreview(model.imageUrl);
                setSelectedModel(model);
                toast({
                  title: 'Berhasil',
                  description: 'Model berhasil dipilih untuk virtual try-on'
                });
              }} selectedModel={selectedModel} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Select Garment */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2">
              Pilih Pakaian
              <div className="w-4 h-4 bg-muted-foreground/20 rounded-full flex items-center justify-center">
               </div>
            </h2>
          </div>
          
          <div className="relative">
            <div className="aspect-[3/4] bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors overflow-hidden min-h-[200px] sm:min-h-[250px]">
              {clothingImagePreview ? <div className="relative w-full h-full">
                  <img src={clothingImagePreview} alt="Clothing preview" className="w-full h-full object-cover" />
                  <button onClick={() => {
                setClothingImage(null);
                setClothingImagePreview(null);
              }} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-8 h-8 flex items-center justify-center hover:bg-background/90 transition-colors touch-target">
                    ×
                  </button>
                </div> : <div className="relative w-full h-full">
                  {/* Shadow guide image */}
                  <img src="/lovable-uploads/647f3782-e153-4df6-b7b9-ec908912bca5.png" alt="Clothing positioning guide" className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none z-10" />
                  <label htmlFor="clothing-upload" className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors p-4 z-20">
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
                    <span className="text-base sm:text-lg font-medium text-primary mb-2 text-center">Upload foto pakaian</span>
                    <span className="text-xs sm:text-sm text-muted-foreground text-center">PNG, JPG hingga 10MB</span>
                    <Input id="clothing-upload" type="file" accept="image/*" className="sr-only" onChange={handleClothingImageChange} />
                  </label>
                </div>}
            </div>
          </div>

          {/* Clothing Category Selection */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2 text-center">Pilih kategori pakaian (opsional)</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { key: 'atasan', label: 'Atasan' },
                { key: 'bawahan', label: 'Bawahan' }, 
                { key: 'gaun', label: 'Gaun' },
                { key: 'hijab', label: 'Hijab' }
              ].map((category) => (
                <Button
                  key={category.key}
                  variant={clothingCategory === category.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setClothingCategory(clothingCategory === category.key ? null : category.key)}
                  className="text-xs"
                >
                  {category.label}
                </Button>
              ))}
            </div>
            {clothingCategory && (
              <p className="text-xs text-muted-foreground text-center mt-1">
                Dipilih: {clothingCategory.charAt(0).toUpperCase() + clothingCategory.slice(1)}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Model and Garment Options */}
      <div className="max-w-7xl mx-auto mt-4 space-y-3">
        {/* Model Options */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center px-4">
          <Button variant="outline" size="sm" className="flex items-center gap-2 min-w-[140px]" onClick={() => {
          toast({
            title: 'Coming Soon',
            description: 'Fitur Generate AI Model akan segera hadir'
          });
        }}>
            <Sparkles className="h-4 w-4" />
            Generate AI Model
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2 min-w-[140px]" onClick={() => {
          const event = new CustomEvent('switchToModelTab');
          window.dispatchEvent(event);
        }}>
            <Users className="h-4 w-4" />
            Model Saya
          </Button>
        </div>

      </div>

      {/* Generate Button */}
      <div className="max-w-7xl mx-auto mt-4 flex justify-center px-4">
        <Button onClick={handleProcess} disabled={processing || !modelImage && !modelImageUrl || !clothingImage} size="lg" className="w-full sm:w-auto sm:min-w-[300px] h-12 text-base">
          {processing ? <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Memproses...
            </> : <>
              <Sparkles className="h-5 w-5 mr-3" />
              Buat Virtual Try-On
            </>}
        </Button>
      </div>
    </div>;
};
export default VirtualTryOn;