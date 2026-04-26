import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { processImageForUpload } from '@/lib/imageProcessing';
import { Upload, Sparkles, Users, Image, Download, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import ModelGallery from './ModelGallery';

interface VirtualTryOnProps {
  userId: string;
}

type ActiveJob = {
  projectId: string;
  predictionId: string;
  startedAt: number;
  modelImageUrl: string;
  garmentImageUrl: string;
  category: string;
  status: 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  errorMessage?: string;
};

const ESTIMATED_DURATION_MS = 25_000; // observed: ~20-25s end-to-end
const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 120_000;

const VirtualTryOn = ({
  userId
}: VirtualTryOnProps) => {
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null); // For selected models
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [modelImagePreview, setModelImagePreview] = useState<string | null>(null);
  const [clothingImagePreview, setClothingImagePreview] = useState<string | null>(null);
  const [lastGarmentUploadedUrl, setLastGarmentUploadedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [clothingCategory, setClothingCategory] = useState<string | null>(null);
  const [aiModelPrompt, setAiModelPrompt] = useState<string>('');
  const [aiModelClothingType, setAiModelClothingType] = useState<string>('');
  const [generatingModel, setGeneratingModel] = useState(false);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Image preprocessing: HEIC→JPEG, AVIF/WEBP→JPEG, auto-resize, compress.
  // Returns the final File ready for upload, or null if user-facing error already shown.
  const preprocessForUpload = async (file: File): Promise<File | null> => {
    try {
      const result = await processImageForUpload(file);
      if (result.wasTranscoded) {
        toast({
          title: 'Format dikonversi',
          description: 'Foto HEIC/AVIF/WEBP diubah ke JPEG agar kompatibel.',
        });
      }
      if (result.wasResized || result.processedSizeKB < result.originalSizeKB * 0.7) {
        // Subtle hint only — no toast spam for routine compression.
        console.log(
          `[image] ${file.name}: ${result.originalSizeKB} KB → ${result.processedSizeKB} KB ` +
          `(resized: ${result.wasResized})`,
        );
      }
      return result.file;
    } catch (err: any) {
      console.error('[image] processing error', err);
      toast({
        title: 'Gambar tidak didukung',
        description: err?.message || 'Gagal memproses gambar. Coba JPG/PNG.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Unified model-selection handler (consolidated from 3 overlapping listeners).
  // Dedupe rapid-fire events (<300ms) to avoid double-toast / state thrash.
  useEffect(() => {
    let lastUrl: string | null = null;
    let lastAt = 0;

    const applyModel = (model: any, source: 'gallery' | 'ai') => {
      if (!model?.imageUrl) return;
      const now = Date.now();
      if (model.imageUrl === lastUrl && now - lastAt < 300) return;
      lastUrl = model.imageUrl;
      lastAt = now;

      setModelImage(null);
      setModelImageUrl(model.imageUrl);
      setModelImagePreview(model.imageUrl);
      setSelectedModel(model);
      toast({
        title: source === 'ai' ? 'Model AI Siap!' : 'Model dipilih',
        description: source === 'ai'
          ? 'Model AI berhasil dibuat dan siap untuk virtual try-on'
          : 'Model berhasil dipilih untuk virtual try-on',
      });
    };

    const onGallery = (e: any) => applyModel(e.detail?.model, 'gallery');
    const onAi = (e: any) => applyModel(e.detail?.model, 'ai');

    window.addEventListener('setSelectedModel', onGallery);
    window.addEventListener('selectModelForTryOn', onGallery);
    window.addEventListener('generatedModelReady', onAi);

    return () => {
      window.removeEventListener('setSelectedModel', onGallery);
      window.removeEventListener('selectModelForTryOn', onGallery);
      window.removeEventListener('generatedModelReady', onAi);
    };
  }, [toast]);
  const handleModelImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      toast({
        title: 'Format tidak didukung',
        description: 'File yang dipilih bukan gambar.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Maksimal 25 MB. Gambar besar akan diperkecil otomatis.',
        variant: 'destructive',
      });
      return;
    }

    const processed = await preprocessForUpload(file);
    if (!processed) return;

    setModelImage(processed);
    setModelImageUrl(null);
    const previewUrl = URL.createObjectURL(processed);
    setModelImagePreview(previewUrl);
  };

  const handleClothingImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      toast({
        title: 'Format tidak didukung',
        description: 'File yang dipilih bukan gambar.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Maksimal 25 MB.',
        variant: 'destructive',
      });
      return;
    }

    const processed = await preprocessForUpload(file);
    if (!processed) return;

    setClothingImage(processed);
    const previewUrl = URL.createObjectURL(processed);
    setClothingImagePreview(previewUrl);
    // Reset cached uploaded URL so a fresh upload re-captures it on Generate
    setLastGarmentUploadedUrl(null);
  };
  const handleProcess = async () => {
    const hasModel = Boolean(modelImage || modelImageUrl);
    const hasGarment = Boolean(clothingImage);
    if (!hasModel || !hasGarment) {
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
      // Get model image URL - either from uploaded file or selected model
      let finalModelImageUrl = modelImageUrl;

      // If modelImageUrl is a local/relative asset path (Vite dev OR hashed prod build),
      // fetch and re-upload it to Supabase so KIE AI can access it.
      const isRemoteHttpUrl = (u: string) =>
        u.startsWith('http://') || u.startsWith('https://');

      if (modelImageUrl && !isRemoteHttpUrl(modelImageUrl)) {
        try {
          const response = await fetch(modelImageUrl);
          const blob = await response.blob();
          const file = new File([blob], `template-model-${Date.now()}.jpg`, { type: 'image/jpeg' });
          finalModelImageUrl = await uploadImage(file, 'model');
        } catch (error) {
          console.error('Error uploading template model:', error);
          throw new Error('Failed to process template model image');
        }
      } else if (!modelImageUrl && modelImage) {
        finalModelImageUrl = await uploadImage(modelImage, 'model');
      }

      const clothingImageUrl = await uploadImage(clothingImage!, 'clothing');
      setLastGarmentUploadedUrl(clothingImageUrl);
      // Normalize clothing category to Title Case expected by backend
      const normalizedCategory = clothingCategory
        ? clothingCategory.charAt(0).toUpperCase() + clothingCategory.slice(1).toLowerCase()
        : null;

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

      // Start KIE AI virtual try-on with clothing category enforcement
      const {
        data: kieResponse,
        error: invokeError
      } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'virtualTryOn',
          modelImage: finalModelImageUrl,
          garmentImage: clothingImageUrl,
          projectId: project.id,
          clothingCategory: normalizedCategory,
        }
      });
      if (invokeError) {
        throw new Error(`Function invoke error: ${invokeError.message}`);
      }
      if (!kieResponse) {
        throw new Error('No response received from KIE AI');
      }
      if (kieResponse.error) {
        throw new Error(kieResponse.error);
      }

      const predictionId = kieResponse.prediction_id || kieResponse.id;

      // Update project with prediction ID
      await supabase.from('projects').update({
        prediction_id: predictionId,
        settings: {
          prediction_id: predictionId,
          model_image_url: finalModelImageUrl,
          garment_image_url: clothingImageUrl,
          clothing_category: normalizedCategory
        }
      }).eq('id', project.id);

      // Set active job — DO NOT reset form. Inline viewer will render below.
      setActiveJob({
        projectId: project.id,
        predictionId,
        startedAt: Date.now(),
        modelImageUrl: finalModelImageUrl!,
        garmentImageUrl: clothingImageUrl,
        category: normalizedCategory!,
        status: 'processing',
      });
      setElapsedMs(0);
      startPolling(project.id);
    } catch (error: any) {
      toast({
        title: 'Gagal memulai',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Poll project row until status === 'completed' or 'failed'
  const startPolling = (projectId: string) => {
    stopPolling();
    const startedAt = Date.now();

    tickRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);

    const tick = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('status, result_url, result_image_url, error_message')
          .eq('id', projectId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return;

        if (data.status === 'completed') {
          const url = data.result_url || data.result_image_url;
          stopPolling();
          setActiveJob((j) => j && j.projectId === projectId
            ? { ...j, status: 'completed', resultUrl: url ?? undefined }
            : j);
          toast({ title: 'Selesai!', description: 'Virtual try-on siap dilihat.' });
        } else if (data.status === 'failed') {
          stopPolling();
          setActiveJob((j) => j && j.projectId === projectId
            ? { ...j, status: 'failed', errorMessage: data.error_message ?? 'Generation failed' }
            : j);
          toast({
            title: 'Generasi gagal',
            description: data.error_message || 'Coba lagi dalam beberapa saat.',
            variant: 'destructive',
          });
        } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          stopPolling();
          setActiveJob((j) => j && j.projectId === projectId
            ? { ...j, status: 'failed', errorMessage: 'Timeout — coba lagi.' }
            : j);
        }
      } catch (e) {
        console.error('[poll] error', e);
      }
    };

    tick(); // immediate first poll
    pollRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  };

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  const handleNewTryOn = () => {
    stopPolling();
    setActiveJob(null);
    setElapsedMs(0);
    setModelImage(null);
    setModelImageUrl(null);
    setClothingImage(null);
    setModelImagePreview(null);
    setClothingImagePreview(null);
    setSelectedModel(null);
    setClothingCategory(null);
    setLastGarmentUploadedUrl(null);
  };

  const handleSwapGarmentOnly = () => {
    stopPolling();
    setActiveJob(null);
    setElapsedMs(0);
    setClothingImage(null);
    setClothingImagePreview(null);
    setLastGarmentUploadedUrl(null);
    // Keep model + category
  };

  const handleDownloadResult = async () => {
    if (!activeJob?.resultUrl) return;
    try {
      const res = await fetch(activeJob.resultUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tryon-${activeJob.projectId}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // Fallback: open in new tab
      window.open(activeJob.resultUrl, '_blank');
    }
  };
  const uploadImage = async (file: File, type: string): Promise<string> => {
    // Sanitize filename: lowercase extension, remove spaces/special chars
    const rawBase = file.name.normalize('NFKD').replace(/[\s]+/g, '_').replace(/[^\w.-]/g, '_');
    const dotIdx = rawBase.lastIndexOf('.');
    const base = dotIdx > 0
      ? rawBase.slice(0, dotIdx) + rawBase.slice(dotIdx).toLowerCase()
      : rawBase;
    const fileName = `${userId}/${type}_${Date.now()}_${base}`;

    // Retry with exponential backoff for transient gateway errors (502/503/504/network)
    const maxAttempts = 3;
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { error } = await supabase.storage
          .from('tryon-images')
          .upload(fileName, file, {
            upsert: true,
            contentType: file.type || 'image/jpeg',
            cacheControl: '3600',
          });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from('tryon-images')
          .getPublicUrl(fileName);
        return publicUrl;
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || '').toLowerCase();
        const isTransient =
          msg.includes('502') ||
          msg.includes('503') ||
          msg.includes('504') ||
          msg.includes('bad gateway') ||
          msg.includes('gateway') ||
          msg.includes('network') ||
          msg.includes('failed to fetch') ||
          msg.includes('timeout');
        console.warn(`[upload] attempt ${attempt}/${maxAttempts} failed`, err);
        if (!isTransient || attempt === maxAttempts) break;
        // Backoff: 1s, 2s
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }

    const friendly =
      (lastError?.message || '').toLowerCase().includes('502') ||
      (lastError?.message || '').toLowerCase().includes('gateway')
        ? 'Server penyimpanan sedang sibuk (gateway error). Coba lagi dalam beberapa detik atau perkecil ukuran gambar.'
        : (lastError?.message || 'Gagal mengunggah gambar.');
    throw new Error(friendly);
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

      // Use KIE AI for model generation
      const { data: genResponse, error: genError } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'generateModel',
          prompt: aiModelPrompt,
          clothingType: aiModelClothingType,
          aspectRatio: '2:3',
          referenceImage: lastGarmentUploadedUrl ?? undefined,
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
            <Badge variant="outline" className="flex items-center gap-1 bg-success/10 border-success/30 text-success">
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
                    variant="hero"
                    size="lg"
                    className="w-full"
                  >
                    {generatingModel ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
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
                      <div className="w-full border-t border-border" />
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

      {/* Generate Button — hidden once a job is active so result viewer takes focus */}
      {!activeJob && (
        <div className="max-w-7xl mx-auto mt-4 flex justify-center px-4">
          <Button
            onClick={handleProcess}
            disabled={processing || (!modelImage && !modelImageUrl) || !clothingImage || !clothingCategory}
            size="lg"
            className="w-full sm:w-auto sm:min-w-[300px] h-12 text-base"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-3"></div>
                Mengirim ke AI...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-3" />
                Generate
                <Badge variant="secondary" className="ml-2 text-[10px]">Beta · Gratis</Badge>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Inline Result Viewer */}
      {activeJob && (
        <div className="max-w-7xl mx-auto mt-6 px-2 sm:px-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft">
            {/* Status header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {activeJob.status === 'processing' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    <span className="font-medium">Memproses virtual try-on...</span>
                  </>
                )}
                {activeJob.status === 'completed' && (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-medium">Hasil siap</span>
                  </>
                )}
                {activeJob.status === 'failed' && (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium">Generasi gagal</span>
                  </>
                )}
              </div>
              {activeJob.status === 'processing' && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {(elapsedMs / 1000).toFixed(0)}s / ~{Math.round(ESTIMATED_DURATION_MS / 1000)}s
                </span>
              )}
            </div>

            {/* Progress bar (processing only) */}
            {activeJob.status === 'processing' && (
              <div className="mb-4">
                <Progress value={Math.min(95, (elapsedMs / ESTIMATED_DURATION_MS) * 100)} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  AI sedang memasangkan pakaian ke model. Estimasi ~25 detik.
                </p>
              </div>
            )}

            {/* Result grid: model | garment | result */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">Model</p>
                <div className="aspect-[3/4] bg-muted/20 rounded-lg overflow-hidden">
                  <img src={activeJob.modelImageUrl} alt="Model" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">Pakaian</p>
                <div className="aspect-[3/4] bg-muted/20 rounded-lg overflow-hidden">
                  <img src={activeJob.garmentImageUrl} alt="Pakaian" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">
                  Hasil {activeJob.status === 'completed' ? '✨' : ''}
                </p>
                <div className="aspect-[3/4] bg-muted/20 rounded-lg overflow-hidden relative ring-2 ring-primary/20">
                  {activeJob.status === 'completed' && activeJob.resultUrl ? (
                    <img src={activeJob.resultUrl} alt="Hasil try-on" className="w-full h-full object-cover" />
                  ) : activeJob.status === 'failed' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      <XCircle className="h-8 w-8 text-destructive mb-2" />
                      <p className="text-xs text-muted-foreground">{activeJob.errorMessage}</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                      <Sparkles className="h-8 w-8 text-primary/40 animate-pulse mb-2" />
                      <p className="text-xs text-muted-foreground">Generating...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {activeJob.status === 'completed' && (
                <Button onClick={handleDownloadResult} variant="default" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {activeJob.status !== 'processing' && (
                <>
                  <Button onClick={handleSwapGarmentOnly} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Coba pakaian lain
                  </Button>
                  <Button onClick={handleNewTryOn} variant="ghost" size="sm">
                    Try-on baru
                  </Button>
                </>
              )}
              {activeJob.status === 'processing' && (
                <p className="text-xs text-muted-foreground">
                  Anda boleh meninggalkan halaman — hasil tetap tersimpan di Riwayat.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>;
};
export default VirtualTryOn;