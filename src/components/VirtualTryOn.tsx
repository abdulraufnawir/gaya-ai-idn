import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { processImageForUpload } from '@/lib/imageProcessing';
import { Upload, Sparkles, Users, Image, Download, RotateCcw, CheckCircle2, XCircle, Layers, X, Plus } from 'lucide-react';
import ModelGallery from './ModelGallery';
import TryOnPresets, { type TryOnPreset } from './TryOnPresets';
import ResultRating from './ResultRating';
import LookbookPanel from './LookbookPanel';
import MarketplaceExport from './MarketplaceExport';
import BackgroundSelector, { type BackgroundPresetKey, BACKGROUND_PRESETS } from './BackgroundSelector';

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
  status: 'processing' | 'completed' | 'failed' | 'swapping_background';
  resultUrl?: string;
  baseResultUrl?: string;        // pre-background-swap result (for "revert")
  backgroundPreset?: BackgroundPresetKey | null;
  errorMessage?: string;
  retryCount?: number;
  parentProjectId?: string | null;
};

type BulkGarmentItem = {
  id: string;            // local uuid
  file: File;
  previewUrl: string;
  category: string;      // per-garment category (defaults to global pick)
  uploadedUrl?: string;  // populated lazily during run
  projectId?: string;
  predictionId?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  errorMessage?: string;
  startedAt?: number;
  finishedAt?: number;
};

const ESTIMATED_DURATION_MS = 25_000; // observed: ~20-25s end-to-end
const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 120_000;
const BULK_MAX_ITEMS = 10;

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
  const [backgroundPreset, setBackgroundPreset] = useState<BackgroundPresetKey | null>(null);
  const [aiModelPrompt, setAiModelPrompt] = useState<string>('');
  const [aiModelClothingType, setAiModelClothingType] = useState<string>('');
  const [generatingModel, setGeneratingModel] = useState(false);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // Bulk mode (1 model × N garments, sequential)
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkGarmentItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState<number | null>(null);
  const bulkAbortRef = useRef(false);

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
        backgroundPreset, // chained after try-on completes
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

  // After try-on completes, optionally chain a background swap so the user
  // gets a single seamless flow (model + garment + background) in one click.
  const chainBackgroundSwap = async (
    projectId: string,
    baseResultUrl: string,
    bgKey: BackgroundPresetKey,
  ) => {
    const { data, error } = await supabase.functions.invoke('lookbook-generate', {
      body: {
        userId,
        sourceProjectId: projectId,
        sourceImageUrl: baseResultUrl,
        variations: [{ type: 'background', key: bgKey }],
      },
    });
    if (error) {
      const ctx = (error as any)?.context;
      if (ctx?.status === 402) throw new Error('Kredit tidak cukup untuk ganti background');
      throw error;
    }
    const ok = (data?.results ?? []).find((r: any) => r.status === 'completed');
    if (!ok?.resultUrl) {
      const failMsg = (data?.results ?? [])[0]?.error ?? 'Background swap gagal';
      throw new Error(failMsg);
    }
    // Persist the swapped result on the original project so history shows the final image
    await supabase
      .from('projects')
      .update({ result_url: ok.resultUrl, result_image_url: ok.resultUrl })
      .eq('id', projectId);

    setActiveJob((j) => j && j.projectId === projectId
      ? { ...j, status: 'completed', resultUrl: ok.resultUrl, baseResultUrl }
      : j);
    toast({ title: 'Background diganti!', description: `Hasil siap dengan ${ok.label}.` });
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
          // Chain background swap if user pre-selected one
          if (url && backgroundPreset) {
            setActiveJob((j) => j && j.projectId === projectId
              ? { ...j, status: 'swapping_background', baseResultUrl: url, resultUrl: url }
              : j);
            chainBackgroundSwap(projectId, url, backgroundPreset).catch((err) => {
              console.error('[bg-swap] error', err);
              // Background swap failed but try-on succeeded — keep base result, surface a soft toast
              setActiveJob((j) => j && j.projectId === projectId
                ? { ...j, status: 'completed', resultUrl: url }
                : j);
              toast({
                title: 'Background gagal diganti',
                description: 'Hasil try-on tetap tersedia. Coba ganti background lewat panel Lookbook.',
                variant: 'destructive',
              });
            });
            return;
          }
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
    setBackgroundPreset(null);
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

  // Apply a saved preset: restore model + category, leave garment empty so user just uploads it.
  const handleApplyPreset = (preset: TryOnPreset) => {
    if (bulkRunning || activeJob?.status === 'processing') {
      toast({
        title: 'Tunggu proses selesai',
        description: 'Tidak bisa ganti preset saat AI sedang bekerja.',
        variant: 'destructive',
      });
      return;
    }
    // Reset garment state so user uploads fresh one for this preset
    setClothingImage(null);
    setClothingImagePreview(null);
    setLastGarmentUploadedUrl(null);
    // Apply model
    if (preset.model_image_url) {
      setModelImage(null);
      setModelImageUrl(preset.model_image_url);
      setModelImagePreview(preset.model_image_url);
      setSelectedModel(preset.model_meta ?? { imageUrl: preset.model_image_url });
    }
    // Apply category (preset stores Title Case; UI uses lowercase)
    if (preset.category) {
      setClothingCategory(preset.category.toLowerCase());
    }
    toast({
      title: `Preset "${preset.name}" diterapkan`,
      description: 'Tinggal upload pakaian dan tekan Generate.',
    });
  };

  // Re-generate using SAME model+garment+category but new prediction (different seed).
  // Creates a NEW project linked via parent_project_id, increments retry_count.
  const handleRegenerate = async () => {
    if (!activeJob || activeJob.status === 'processing') return;
    const parentJob = activeJob;
    const nextRetry = (parentJob.retryCount ?? 0) + 1;
    if (nextRetry > 3) {
      toast({
        title: 'Batas retry tercapai',
        description: 'Sudah 3x generate ulang. Coba ganti foto pakaian/model.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create new project linked to parent
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: `Re-Try-On #${nextRetry} - ${new Date().toLocaleDateString('id-ID')}`,
          description: `Regenerate dari hasil sebelumnya (rating jelek)`,
          project_type: 'virtual_tryon',
          status: 'processing',
          retry_count: nextRetry,
          parent_project_id: parentJob.parentProjectId ?? parentJob.projectId,
        })
        .select()
        .single();
      if (projectError) throw projectError;

      const { data: kieResponse, error: invokeError } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'virtualTryOn',
          modelImage: parentJob.modelImageUrl,
          garmentImage: parentJob.garmentImageUrl,
          projectId: project.id,
          clothingCategory: parentJob.category,
        },
      });
      if (invokeError) throw new Error(invokeError.message);
      if (!kieResponse || kieResponse.error) throw new Error(kieResponse?.error || 'AI invoke gagal');

      const predictionId = kieResponse.prediction_id || kieResponse.id;
      await supabase.from('projects').update({
        prediction_id: predictionId,
        settings: {
          prediction_id: predictionId,
          model_image_url: parentJob.modelImageUrl,
          garment_image_url: parentJob.garmentImageUrl,
          clothing_category: parentJob.category,
          regenerated: true,
          parent_project_id: parentJob.parentProjectId ?? parentJob.projectId,
        },
      }).eq('id', project.id);

      setActiveJob({
        projectId: project.id,
        predictionId,
        startedAt: Date.now(),
        modelImageUrl: parentJob.modelImageUrl,
        garmentImageUrl: parentJob.garmentImageUrl,
        category: parentJob.category,
        status: 'processing',
        retryCount: nextRetry,
        parentProjectId: parentJob.parentProjectId ?? parentJob.projectId,
      });
      setElapsedMs(0);
      startPolling(project.id);
      toast({ title: `Generate ulang #${nextRetry}`, description: 'AI mencoba lagi dengan seed baru.' });
    } catch (err: any) {
      console.error('[regenerate] error', err);
      toast({
        title: 'Gagal generate ulang',
        description: err?.message ?? 'Coba lagi.',
        variant: 'destructive',
      });
    }
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

  // ============================================================
  // BULK MODE — 1 model × N garments, sequential queue
  // ============================================================

  const handleBulkAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting same files
    if (!files.length) return;

    const remaining = BULK_MAX_ITEMS - bulkItems.length;
    if (remaining <= 0) {
      toast({
        title: 'Batas tercapai',
        description: `Maksimal ${BULK_MAX_ITEMS} pakaian per batch.`,
        variant: 'destructive',
      });
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > accepted.length) {
      toast({
        title: 'Sebagian dilewati',
        description: `Hanya ${accepted.length} pakaian ditambahkan (max ${BULK_MAX_ITEMS}).`,
      });
    }

    const defaultCategory = clothingCategory
      ? clothingCategory.charAt(0).toUpperCase() + clothingCategory.slice(1).toLowerCase()
      : 'Atasan';

    const newItems: BulkGarmentItem[] = [];
    for (const file of accepted) {
      if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) continue;
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: 'Dilewati: terlalu besar',
          description: `${file.name} > 25 MB`,
          variant: 'destructive',
        });
        continue;
      }
      const processed = await preprocessForUpload(file);
      if (!processed) continue;
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: processed,
        previewUrl: URL.createObjectURL(processed),
        category: defaultCategory,
        status: 'pending',
      });
    }
    if (newItems.length) {
      setBulkItems((prev) => [...prev, ...newItems]);
    }
  };

  const handleBulkRemoveItem = (id: string) => {
    if (bulkRunning) return;
    setBulkItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleBulkSetCategory = (id: string, category: string) => {
    if (bulkRunning) return;
    setBulkItems((prev) => prev.map((i) => (i.id === id ? { ...i, category } : i)));
  };

  const handleBulkClearAll = () => {
    if (bulkRunning) return;
    bulkItems.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setBulkItems([]);
  };

  // Resolve model URL once (reused across all items in batch)
  const resolveModelUrlForBatch = async (): Promise<string> => {
    const isRemoteHttpUrl = (u: string) =>
      u.startsWith('http://') || u.startsWith('https://');

    if (modelImageUrl && isRemoteHttpUrl(modelImageUrl)) return modelImageUrl;
    if (modelImageUrl && !isRemoteHttpUrl(modelImageUrl)) {
      const response = await fetch(modelImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `template-model-${Date.now()}.jpg`, { type: 'image/jpeg' });
      return await uploadImage(file, 'model');
    }
    if (modelImage) return await uploadImage(modelImage, 'model');
    throw new Error('Tidak ada model terpilih');
  };

  // Poll a single bulk item's project until completion. Returns when terminal.
  const pollBulkItem = (item: BulkGarmentItem): Promise<void> => {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const interval = window.setInterval(async () => {
        if (bulkAbortRef.current) {
          window.clearInterval(interval);
          resolve();
          return;
        }
        try {
          const { data } = await supabase
            .from('projects')
            .select('status, result_url, result_image_url, error_message')
            .eq('id', item.projectId!)
            .maybeSingle();
          if (!data) return;

          if (data.status === 'completed') {
            window.clearInterval(interval);
            const url = data.result_url || data.result_image_url || undefined;
            setBulkItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? { ...it, status: 'completed', resultUrl: url, finishedAt: Date.now() }
                  : it,
              ),
            );
            resolve();
          } else if (data.status === 'failed') {
            window.clearInterval(interval);
            setBulkItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? {
                      ...it,
                      status: 'failed',
                      errorMessage: data.error_message ?? 'Generation failed',
                      finishedAt: Date.now(),
                    }
                  : it,
              ),
            );
            resolve();
          } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
            window.clearInterval(interval);
            setBulkItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? { ...it, status: 'failed', errorMessage: 'Timeout', finishedAt: Date.now() }
                  : it,
              ),
            );
            resolve();
          }
        } catch (err) {
          console.error('[bulk-poll] error', err);
        }
      }, POLL_INTERVAL_MS);
    });
  };

  const handleBulkProcess = async () => {
    if (bulkRunning) return;
    const hasModel = Boolean(modelImage || modelImageUrl);
    if (!hasModel) {
      toast({
        title: 'Pilih model dulu',
        description: 'Bulk mode butuh 1 model untuk semua pakaian.',
        variant: 'destructive',
      });
      return;
    }
    const queue = bulkItems.filter((i) => i.status === 'pending' || i.status === 'failed');
    if (!queue.length) {
      toast({
        title: 'Tidak ada pakaian',
        description: 'Tambahkan pakaian terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }

    setBulkRunning(true);
    bulkAbortRef.current = false;

    let modelUrl: string;
    try {
      modelUrl = await resolveModelUrlForBatch();
    } catch (err: any) {
      toast({
        title: 'Gagal siapkan model',
        description: err?.message ?? 'Coba pilih model lain.',
        variant: 'destructive',
      });
      setBulkRunning(false);
      return;
    }

    // Reset failed items back to pending so retries work
    setBulkItems((prev) =>
      prev.map((i) =>
        i.status === 'failed'
          ? { ...i, status: 'pending', errorMessage: undefined, resultUrl: undefined }
          : i,
      ),
    );

    for (let idx = 0; idx < bulkItems.length; idx++) {
      if (bulkAbortRef.current) break;
      // Re-read the latest snapshot from state (closure may be stale)
      const snapshot = bulkItems[idx];
      if (!snapshot) continue;
      if (snapshot.status === 'completed') continue;

      setBulkCurrentIndex(idx);

      // 1. Upload garment
      setBulkItems((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, status: 'uploading', startedAt: Date.now() } : it)),
      );
      let garmentUrl: string;
      try {
        garmentUrl = await uploadImage(snapshot.file, 'clothing');
      } catch (err: any) {
        setBulkItems((prev) =>
          prev.map((it, i) =>
            i === idx
              ? { ...it, status: 'failed', errorMessage: err?.message ?? 'Upload gagal', finishedAt: Date.now() }
              : it,
          ),
        );
        continue;
      }

      // 2. Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: `Bulk Try-On #${idx + 1} - ${new Date().toLocaleDateString('id-ID')}`,
          description: `Bulk virtual try-on (${snapshot.category})`,
          project_type: 'virtual_tryon',
          status: 'processing',
        })
        .select()
        .single();

      if (projectError || !project) {
        setBulkItems((prev) =>
          prev.map((it, i) =>
            i === idx
              ? { ...it, status: 'failed', errorMessage: 'Gagal buat project', finishedAt: Date.now() }
              : it,
          ),
        );
        continue;
      }

      // 3. Invoke kie-ai
      const { data: kieResponse, error: invokeError } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'virtualTryOn',
          modelImage: modelUrl,
          garmentImage: garmentUrl,
          projectId: project.id,
          clothingCategory: snapshot.category,
        },
      });

      if (invokeError || !kieResponse || kieResponse.error) {
        const msg = invokeError?.message || kieResponse?.error || 'AI invoke gagal';
        setBulkItems((prev) =>
          prev.map((it, i) =>
            i === idx ? { ...it, status: 'failed', errorMessage: msg, finishedAt: Date.now() } : it,
          ),
        );
        continue;
      }

      const predictionId = kieResponse.prediction_id || kieResponse.id;
      await supabase.from('projects').update({
        prediction_id: predictionId,
        settings: {
          prediction_id: predictionId,
          model_image_url: modelUrl,
          garment_image_url: garmentUrl,
          clothing_category: snapshot.category,
          bulk_batch: true,
        },
      }).eq('id', project.id);

      setBulkItems((prev) =>
        prev.map((it, i) =>
          i === idx
            ? {
                ...it,
                uploadedUrl: garmentUrl,
                projectId: project.id,
                predictionId,
                status: 'processing',
              }
            : it,
        ),
      );

      // 4. Poll until done
      await pollBulkItem({ ...snapshot, projectId: project.id, predictionId });
    }

    setBulkCurrentIndex(null);
    setBulkRunning(false);

    // Toast counts using latest snapshot via functional setter
    setBulkItems((prev) => {
      const ok = prev.filter((i) => i.status === 'completed').length;
      const fail = prev.filter((i) => i.status === 'failed').length;
      toast({
        title: bulkAbortRef.current ? 'Batch dihentikan' : 'Batch selesai',
        description: `${ok} berhasil · ${fail} gagal · total ${prev.length}`,
      });
      return prev;
    });
  };

  const handleBulkStop = () => {
    bulkAbortRef.current = true;
  };

  const handleBulkDownloadAll = async () => {
    const completed = bulkItems.filter((i) => i.status === 'completed' && i.resultUrl);
    if (!completed.length) return;
    for (let i = 0; i < completed.length; i++) {
      const item = completed[i];
      try {
        const res = await fetch(item.resultUrl!);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tryon-bulk-${i + 1}-${item.projectId}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // small stagger so browsers don't block multi-download
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        window.open(item.resultUrl!, '_blank');
      }
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

          {/* Mode Toggle: Single vs Bulk */}
          <div className="mt-4 inline-flex rounded-lg border border-border bg-muted/30 p-1 mx-auto">
            <button
              type="button"
              onClick={() => !bulkRunning && setBulkMode(false)}
              disabled={bulkRunning}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !bulkMode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-3 w-3 inline mr-1" />
              Single
            </button>
            <button
              type="button"
              onClick={() => !activeJob && setBulkMode(true)}
              disabled={Boolean(activeJob)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                bulkMode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3 w-3 inline mr-1" />
              Bulk · 1 model × N
              <Badge variant="secondary" className="ml-1.5 text-[9px] px-1">PRO</Badge>
            </button>
          </div>
        </div>
      </div>

      {/* Preset bar — quick save & apply favorite combos */}
      <TryOnPresets
        userId={userId}
        current={{
          modelImageUrl: modelImageUrl ?? modelImagePreview,
          modelSource: selectedModel ? (selectedModel.source ?? 'gallery') : (modelImage ? 'upload' : null),
          modelMeta: selectedModel ?? undefined,
          category: clothingCategory
            ? clothingCategory.charAt(0).toUpperCase() + clothingCategory.slice(1).toLowerCase()
            : null,
        }}
        onApply={handleApplyPreset}
      />

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
                    <span className="text-xs sm:text-sm text-muted-foreground text-center">JPG, PNG, HEIC · auto-compress</span>
                    <Input id="model-upload" type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={handleModelImageChange} />
                  </label>
                </div>}
            </div>
          </div>

        </div>

        {/* Select Garment — Single OR Bulk */}
        {!bulkMode ? (
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
                      <span className="text-xs sm:text-sm text-muted-foreground text-center">JPG, PNG, HEIC · auto-compress</span>
                      <Input id="clothing-upload" type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={handleClothingImageChange} />
                    </label>
                  </div>}
              </div>
            </div>
          </div>
        ) : (
          /* ======= BULK GARMENT PANEL ======= */
          <div className="space-y-3">
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2">
                <Layers className="h-5 w-5" />
                Pakaian (Batch)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Upload sampai {BULK_MAX_ITEMS} pakaian. Semua akan di-try-on ke 1 model yang sama.
              </p>
            </div>

            {/* Default category picker (applied to new uploads) */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { key: 'atasan', label: 'Atasan' },
                { key: 'bawahan', label: 'Bawahan' },
                { key: 'gaun', label: 'Gaun' },
                { key: 'hijab', label: 'Hijab' },
              ].map((c) => (
                <Button
                  key={c.key}
                  variant={clothingCategory === c.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setClothingCategory(clothingCategory === c.key ? null : c.key)}
                  className="text-xs"
                  disabled={bulkRunning}
                >
                  {c.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {clothingCategory
                ? `Default kategori untuk upload baru: ${clothingCategory.charAt(0).toUpperCase() + clothingCategory.slice(1)}`
                : 'Pilih kategori default (bisa diubah per pakaian)'}
            </p>

            {/* Upload area */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-4 hover:border-primary/50 transition-colors">
              <label
                htmlFor="bulk-upload"
                className={`flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  bulkRunning || bulkItems.length >= BULK_MAX_ITEMS ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Plus className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Tambah pakaian ({bulkItems.length}/{BULK_MAX_ITEMS})
                </span>
                <span className="text-xs text-muted-foreground">Pilih multiple file sekaligus</span>
                <Input
                  id="bulk-upload"
                  type="file"
                  multiple
                  accept="image/*,.heic,.heif"
                  className="sr-only"
                  onChange={handleBulkAddFiles}
                  disabled={bulkRunning}
                />
              </label>
            </div>

            {/* Items grid */}
            {bulkItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{bulkItems.length} item</span>
                  {!bulkRunning && (
                    <Button onClick={handleBulkClearAll} variant="ghost" size="sm" className="text-xs h-7">
                      Hapus semua
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-1">
                  {bulkItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                        bulkCurrentIndex === idx
                          ? 'border-primary ring-2 ring-primary/30'
                          : item.status === 'completed'
                          ? 'border-success/50'
                          : item.status === 'failed'
                          ? 'border-destructive/50'
                          : 'border-border'
                      }`}
                    >
                      <div className="aspect-square bg-muted/20">
                        <img
                          src={item.resultUrl ?? item.previewUrl}
                          alt={`Garment ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Status overlay */}
                      {item.status === 'uploading' && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                        </div>
                      )}
                      {item.status === 'processing' && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center">
                          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                          <span className="text-[10px] mt-1 font-medium">AI...</span>
                        </div>
                      )}
                      {item.status === 'completed' && (
                        <div className="absolute top-1 left-1 bg-success text-success-foreground rounded-full p-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      )}
                      {item.status === 'failed' && (
                        <div className="absolute inset-0 bg-destructive/20 flex flex-col items-center justify-center p-1">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-[9px] text-center mt-1 line-clamp-2 px-1">
                            {item.errorMessage}
                          </span>
                        </div>
                      )}

                      {/* Remove button */}
                      {!bulkRunning && item.status !== 'processing' && item.status !== 'uploading' && (
                        <button
                          onClick={() => handleBulkRemoveItem(item.id)}
                          className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded-full w-5 h-5 flex items-center justify-center"
                          aria-label="Hapus"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}

                      {/* Per-item category */}
                      <div className="px-1 py-1 bg-background/95 border-t border-border">
                        <select
                          value={item.category}
                          onChange={(e) => handleBulkSetCategory(item.id, e.target.value)}
                          disabled={bulkRunning}
                          className="w-full text-[10px] bg-transparent border-0 outline-none cursor-pointer"
                        >
                          <option value="Atasan">Atasan</option>
                          <option value="Bawahan">Bawahan</option>
                          <option value="Gaun">Gaun</option>
                          <option value="Hijab">Hijab</option>
                        </select>
                      </div>

                      {/* Download single result */}
                      {item.status === 'completed' && item.resultUrl && (
                        <a
                          href={item.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="absolute bottom-7 right-1 bg-background/90 hover:bg-background rounded-full w-6 h-6 flex items-center justify-center"
                          aria-label="Download"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Background pre-selector — only in single mode, before generate */}
      {!bulkMode && !activeJob && (
        <div className="max-w-7xl mx-auto mt-4 px-4">
          <BackgroundSelector
            value={backgroundPreset}
            onChange={setBackgroundPreset}
            disabled={processing}
          />
        </div>
      )}

      {/* Action Bar — Single mode (Generate) */}
      {!bulkMode && !activeJob && (() => {
        const missing: string[] = [];
        if (!modelImage && !modelImageUrl) missing.push('foto model');
        if (!clothingImage) missing.push('foto pakaian');
        if (!clothingCategory) missing.push('kategori pakaian');
        const hasMissing = missing.length > 0;

        const handleClick = () => {
          if (hasMissing) {
            toast({
              title: 'Lengkapi dulu',
              description: `Belum ada: ${missing.join(', ')}.`,
              variant: 'destructive',
            });
            return;
          }
          handleProcess();
        };

        return (
          <div className="max-w-7xl mx-auto mt-4 flex flex-col items-center gap-2 px-4">
            <Button
              onClick={handleClick}
              disabled={processing}
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
                  {backgroundPreset ? (
                    <Badge variant="secondary" className="ml-2 text-[10px]">2 langkah · 2 kredit</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2 text-[10px]">Beta · Gratis</Badge>
                  )}
                </>
              )}
            </Button>
            {hasMissing && !processing && (
              <p className="text-xs text-muted-foreground">
                Lengkapi: <span className="text-destructive font-medium">{missing.join(', ')}</span>
              </p>
            )}
          </div>
        );
      })()}

      {/* Action Bar — Bulk mode */}
      {bulkMode && (
        <div className="max-w-7xl mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 px-4">
          {!bulkRunning ? (
            <>
              <Button
                onClick={handleBulkProcess}
                disabled={(!modelImage && !modelImageUrl) || bulkItems.filter(i => i.status === 'pending' || i.status === 'failed').length === 0}
                size="lg"
                className="h-12 text-base sm:min-w-[280px]"
              >
                <Layers className="h-5 w-5 mr-2" />
                Generate {bulkItems.filter(i => i.status === 'pending' || i.status === 'failed').length} pakaian
                <Badge variant="secondary" className="ml-2 text-[10px]">Beta · Gratis</Badge>
              </Button>
              {bulkItems.some(i => i.status === 'completed') && (
                <Button onClick={handleBulkDownloadAll} variant="outline" size="lg" className="h-12">
                  <Download className="h-4 w-4 mr-2" />
                  Download semua
                </Button>
              )}
            </>
          ) : (
            <div className="w-full max-w-2xl space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Memproses {(bulkCurrentIndex ?? 0) + 1} dari {bulkItems.length}...
                </span>
                <span className="text-xs text-muted-foreground">
                  {bulkItems.filter(i => i.status === 'completed').length} selesai · {bulkItems.filter(i => i.status === 'failed').length} gagal
                </span>
              </div>
              <Progress
                value={((bulkItems.filter(i => i.status === 'completed' || i.status === 'failed').length) / bulkItems.length) * 100}
                className="h-2"
              />
              <div className="flex justify-center">
                <Button onClick={handleBulkStop} variant="outline" size="sm">
                  Hentikan setelah item ini
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Estimasi total: ~{Math.round((ESTIMATED_DURATION_MS * bulkItems.length) / 1000)}s.
                Anda boleh tinggal halaman — hasil tetap di Riwayat.
              </p>
            </div>
          )}
        </div>
      )}


      {/* Inline Result Viewer */}
      {!bulkMode && activeJob && (
        <div className="max-w-7xl mx-auto mt-6 px-2 sm:px-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft">
            {/* Status header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {activeJob.status === 'processing' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    <span className="font-medium">
                      {activeJob.backgroundPreset
                        ? 'Langkah 1/2 — Memasangkan pakaian...'
                        : 'Memproses virtual try-on...'}
                    </span>
                  </>
                )}
                {activeJob.status === 'swapping_background' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    <span className="font-medium">
                      Langkah 2/2 — Mengganti background...
                    </span>
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
                  {activeJob.backgroundPreset
                    ? `AI memasangkan pakaian. Setelah selesai, background akan otomatis diganti ke "${
                        BACKGROUND_PRESETS.find((b) => b.key === activeJob.backgroundPreset)?.label
                      }".`
                    : 'AI sedang memasangkan pakaian ke model. Estimasi ~25 detik.'}
                </p>
              </div>
            )}
            {activeJob.status === 'swapping_background' && (
              <div className="mb-4">
                <Progress value={70} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Mengganti background ke "
                  {BACKGROUND_PRESETS.find((b) => b.key === activeJob.backgroundPreset)?.label}
                  "... ~10 detik.
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
                  ) : activeJob.status === 'swapping_background' && activeJob.baseResultUrl ? (
                    <>
                      <img
                        src={activeJob.baseResultUrl}
                        alt="Try-on (sebelum background diganti)"
                        className="w-full h-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px]">
                        <Sparkles className="h-8 w-8 text-primary animate-pulse mb-2" />
                        <p className="text-xs font-medium">Mengganti background...</p>
                      </div>
                    </>
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
                <>
                  <Button onClick={handleDownloadResult} variant="default" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  {activeJob.resultUrl && (
                    <MarketplaceExport
                      imageUrl={activeJob.resultUrl}
                      filenameBase={`busana-${activeJob.projectId.slice(0, 8)}`}
                    />
                  )}
                </>
              )}
              {activeJob.status !== 'processing' && activeJob.status !== 'swapping_background' && (
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
              {(activeJob.status === 'processing' || activeJob.status === 'swapping_background') && (
                <p className="text-xs text-muted-foreground">
                  Anda boleh meninggalkan halaman — hasil tetap tersimpan di Riwayat.
                </p>
              )}
            </div>

            {/* Lookbook (pose + background variations) — landing page promise */}
            {activeJob.status === 'completed' && activeJob.resultUrl && (
              <LookbookPanel
                userId={userId}
                sourceProjectId={activeJob.projectId}
                sourceImageUrl={activeJob.resultUrl}
              />
            )}

            {/* Rating + auto-regenerate (Sprint 6) */}
            {activeJob.status === 'completed' && (
              <ResultRating
                userId={userId}
                projectId={activeJob.projectId}
                retryCount={activeJob.retryCount ?? 0}
                onRegenerate={handleRegenerate}
                regenerateDisabled={(activeJob.retryCount ?? 0) >= 3}
              />
            )}
          </div>
        </div>
      )}
    </div>;
};
export default VirtualTryOn;