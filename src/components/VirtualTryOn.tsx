import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Sparkles, Users, Shirt, Image, Coins, AlertCircle } from 'lucide-react';
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
  const [aiModelPrompt, setAiModelPrompt] = useState<string>('');
  const [aiModelClothingType, setAiModelClothingType] = useState<string>('');
  const [generatingModel, setGeneratingModel] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const { toast } = useToast();
  const { checkBalance, useCredits: useCreditsHook } = useCredits();

  const VIRTUAL_TRYON_COST = 2; // 2 credits per virtual try-on

  // Helper function to convert images to JPEG format
  const convertToJpeg = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image'));
              return;
            }
            const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg'
            });
            resolve(newFile);
          }, 'image/jpeg', 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const loadUserCredits = async () => {
    setLoadingCredits(true);
    try {
      const creditBalance = await checkBalance();
      if (creditBalance) {
        setUserCredits(creditBalance.credits_balance);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoadingCredits(false);
    }
  };
  useEffect(() => {
    loadUserCredits();

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

    // Listen for generated model completion
    const handleGeneratedModelReady = (event: any) => {
      const generatedModel = event.detail.model;
      if (generatedModel?.imageUrl) {
        // Set the generated model as selected for virtual try-on
        setModelImage(null);
        setModelImageUrl(generatedModel.imageUrl);
        setModelImagePreview(generatedModel.imageUrl);
        setSelectedModel(generatedModel);
        toast({
          title: 'Model AI Siap!',
          description: 'Model AI telah berhasil dibuat dan siap untuk virtual try-on'
        });
      }
    };

    window.addEventListener('setSelectedModel', handleSetSelectedModel);
    window.addEventListener('selectModelForTryOn', handleSelectModelForTryOn);
    window.addEventListener('generatedModelReady', handleGeneratedModelReady);
    
    return () => {
      window.removeEventListener('setSelectedModel', handleSetSelectedModel);
      window.removeEventListener('selectModelForTryOn', handleSelectModelForTryOn);
      window.removeEventListener('generatedModelReady', handleGeneratedModelReady);
    };
  }, [toast]);
  const handleModelImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert AVIF/WEBP to JPEG for Replicate compatibility
      let processedFile = file;
      if (file.type === 'image/avif' || file.type === 'image/webp') {
        try {
          processedFile = await convertToJpeg(file);
          toast({
            title: 'Format Dikonversi',
            description: 'Gambar telah dikonversi ke JPEG untuk kompatibilitas',
          });
        } catch (error) {
          console.error('Image conversion error:', error);
          toast({
            title: 'Konversi Gagal',
            description: 'Gagal mengkonversi format gambar. Silakan coba format lain.',
            variant: 'destructive'
          });
          return;
        }
      }
      
      setModelImage(processedFile);
      setModelImageUrl(null);
      const previewUrl = URL.createObjectURL(processedFile);
      setModelImagePreview(previewUrl);
    }
  };
  const handleClothingImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Clothing file selected:', file.name, file.size, file.type);
      
      // Check if file is valid image
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'File yang dipilih bukan gambar yang valid',
          variant: 'destructive'
        });
        return;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error', 
          description: 'Ukuran file terlalu besar. Maksimal 10MB',
          variant: 'destructive'
        });
        return;
      }
      
      // Convert AVIF/WEBP to JPEG for Replicate compatibility
      let processedFile = file;
      if (file.type === 'image/avif' || file.type === 'image/webp') {
        try {
          processedFile = await convertToJpeg(file);
          toast({
            title: 'Format Dikonversi',
            description: 'Gambar telah dikonversi ke JPEG untuk kompatibilitas',
          });
        } catch (error) {
          console.error('Image conversion error:', error);
          toast({
            title: 'Konversi Gagal',
            description: 'Gagal mengkonversi format gambar. Silakan coba format lain.',
            variant: 'destructive'
          });
          return;
        }
      }
      
      setClothingImage(processedFile);
      const previewUrl = URL.createObjectURL(processedFile);
      console.log('Clothing preview URL created:', previewUrl);
      setClothingImagePreview(previewUrl);
      
      toast({
        title: 'Berhasil',
        description: 'Gambar pakaian berhasil diupload'
      });
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

    if (!clothingCategory) {
      toast({
        title: 'Error',
        description: 'Silakan pilih kategori pakaian (Atasan/Bawahan/Gaun/Hijab)',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);
    try {
      // Beta testing: Credits system disabled

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

      // Start Replicate virtual try-on (nano-banana) with clothing category enforcement
      const {
        data: repResponse,
        error: invokeError
      } = await supabase.functions.invoke('replicate-api', {
        body: {
          action: 'virtual_tryon',
          modelImage: finalModelImageUrl,
          garmentImage: clothingImageUrl,
          projectId: project.id,
          clothingCategory: clothingCategory,
        }
      });
      if (invokeError) {
        throw new Error(`Function invoke error: ${invokeError.message}`);
      }
      if (!repResponse) {
        throw new Error('No response received from Replicate API');
      }
      if (repResponse.error) {
        throw new Error(repResponse.error);
      }

      const predictionId = repResponse.prediction_id || repResponse.predictionId || repResponse.id;

      // Update project with prediction ID
      await supabase.from('projects').update({
        prediction_id: predictionId,
        settings: {
          prediction_id: predictionId,
          model_image_url: finalModelImageUrl,
          garment_image_url: clothingImageUrl,
          clothing_category: clothingCategory
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

  const handleGenerateModel = async () => {
    if (!aiModelPrompt.trim()) {
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

      // Create project for model generation
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: `AI Model Generation - ${new Date().toLocaleDateString('id-ID')}`,
          description: aiModelPrompt.substring(0, 100),
          project_type: 'model_generation',
          status: 'processing',
          settings: {
            prompt: aiModelPrompt,
            clothing_type: aiModelClothingType,
            aspect_ratio: '2:3',
            width: 683,
            height: 1024
          }
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Use Replicate API with nano-banana for model generation
const { data: genResponse, error: genError } = await supabase.functions.invoke('replicate-api', {
        body: {
          action: 'generateModel',
          prompt: aiModelPrompt,
          clothingType: aiModelClothingType,
          aspectRatio: '2:3',
          // If user has already uploaded a garment image in this session, use it as a reference
          referenceImage: (window as any)?.lastUploadedGarmentImageUrl,
          projectId: project.id
        }
      });

      if (genError) {
        console.error('Model generation error:', genError);
        throw new Error(genError.message || 'Failed to generate model');
      }

      toast({
        title: 'Berhasil!',
        description: 'Model AI sedang dibuat. Model akan muncul di area pilih model setelah selesai diproses.',
      });

      // Reset the AI prompt
      setAiModelPrompt('');
      setAiModelClothingType('');

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
  return <div className="bg-background p-2 sm:p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-3 sm:mb-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Virtual Try-On AI</h1>
          <p className="text-sm text-muted-foreground">Upload foto model dan pakaian untuk melihat hasil virtual try-on</p>
          
          {/* Beta Notice */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1 bg-green-50 border-green-200 text-green-700">
              <Sparkles className="h-3 w-3" />
              Beta Testing - Gratis
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Sistem kredit akan datang
            </Badge>
          </div>
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
          
          <div className="flex gap-2 justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Buat Model AI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Buat Model AI</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 p-2">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Pilih Pakaian</h3>
                    <div className="flex gap-2 flex-wrap">
                      {['Atasan', 'Bawahan', 'Gaun', 'Hijab'].map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={aiModelClothingType === type ? 'default' : 'outline'}
                          onClick={() => setAiModelClothingType(type)}
                          className="flex-1 min-w-[100px]"
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">Tambahkan prompt Anda</h3>
                    <textarea 
                      className="w-full h-32 p-3 border rounded-lg resize-none text-sm"
                      placeholder="Deskripsikan penampilan model AI Anda (misalnya, pakaian, pose, latar belakang)."
                      value={aiModelPrompt}
                      onChange={(e) => setAiModelPrompt(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleGenerateModel}
                    disabled={generatingModel || !aiModelPrompt.trim() || !aiModelClothingType}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-3"
                  >
                    {generatingModel ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-background text-muted-foreground">atau</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-center">Coba saran kami</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        "Kemeja putih, jeans indigo. Latar putih polos",
                        "Atasan putih, jeans biru tua dengan sneakers",
                        "Rambut pendek, latar studio biru tua",
                        "Pria, kemeja putih, celana baggy biru tua"
                      ].map((suggestion, index) => (
                         <Button 
                           key={index}
                           variant="outline" 
                           className="h-auto p-3 text-left text-sm text-muted-foreground hover:text-foreground whitespace-normal"
                           onClick={() => setAiModelPrompt(suggestion)}
                         >
                           {suggestion}
                         </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Jelajahi lebih banyak opsi di <span className="inline-flex items-center"><Users className="h-4 w-4 mx-1" />Models</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Gallery
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Pilih Model dari Gallery</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
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
              </DialogContent>
            </Dialog>
          </div>
          
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

          {/* Clothing Category Selection */}
          <div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {[{
              key: 'atasan',
              label: 'Atasan'
            }, {
              key: 'bawahan',
              label: 'Bawahan'
            }, {
              key: 'gaun',
              label: 'Gaun'
            }, {
              key: 'hijab',
              label: 'Hijab'
            }].map(category => <Button key={category.key} variant={clothingCategory === category.key ? 'default' : 'outline'} size="sm" onClick={() => setClothingCategory(clothingCategory === category.key ? null : category.key)} className="text-xs">
                  {category.label}
                </Button>)}
            </div>
            {clothingCategory && <p className="text-xs text-muted-foreground text-center mt-1">
                Dipilih: {clothingCategory.charAt(0).toUpperCase() + clothingCategory.slice(1)}
              </p>}
          </div>
          
          <div className="relative">
            <div className="aspect-[3/4] bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors overflow-hidden min-h-[200px] sm:min-h-[250px]">
              {clothingImagePreview ? <div className="relative w-full h-full">
                  <img 
                    src={clothingImagePreview} 
                    alt="Clothing preview" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      console.error('Failed to load clothing image:', clothingImagePreview);
                      toast({
                        title: 'Error',
                        description: 'Gagal memuat gambar. Silakan coba upload ulang.',
                        variant: 'destructive'
                      });
                    }}
                    onLoad={() => {
                      console.log('Clothing image loaded successfully');
                    }}
                  />
                  <button onClick={() => {
                setClothingImage(null);
                setClothingImagePreview(null);
              }} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-8 h-8 flex items-center justify-center hover:bg-background/90 transition-colors touch-target">
                    ×
                  </button>
                </div> : <div className="relative w-full h-full">
                  {/* Shadow guide image */}
                  <img src="/lovable-uploads/65812cd8-a3b0-4c9c-9483-d9c21ac76d83.png" alt="Clothing positioning guide" className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none z-10" />
                  <label htmlFor="clothing-upload" className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors p-4 z-20">
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
                    <span className="text-base sm:text-lg font-medium text-primary mb-2 text-center">Upload foto pakaian</span>
                    <span className="text-xs sm:text-sm text-muted-foreground text-center">PNG, JPG hingga 10MB</span>
                    <Input id="clothing-upload" type="file" accept="image/*" className="sr-only" onChange={handleClothingImageChange} />
                  </label>
                </div>}
            </div>
          </div>

        </div>
      </div>

      {/* Generate Button */}
      <div className="max-w-7xl mx-auto mt-4 flex justify-center px-4">
        <Button 
          onClick={handleProcess} 
          disabled={processing || (!modelImage && !modelImageUrl) || !clothingImage || !clothingCategory} 
          size="lg" 
          className="w-full sm:w-auto sm:min-w-[300px] h-12 text-base"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Memproses...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-3" />
              Buat Virtual Try-On (Gratis - Beta)
            </>
          )}
        </Button>
      </div>
    </div>;
};
export default VirtualTryOn;