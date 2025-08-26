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

      // Call Gemini API for model swap
      const { data: geminiResponse, error: geminiError } = await supabase.functions.invoke('gemini-api', {
        body: {
          action: 'modelSwap',
          modelImage: selectedModel.imageUrl,
          garmentImage: originalImageUrl,
          projectId: project.id
        }
      });

      if (geminiError) {
        console.error('Gemini API Error:', geminiError);
        throw new Error(geminiError.message || 'Failed to start model swap');
      }

      if (geminiResponse?.error) {
        console.error('Gemini Response Error:', geminiResponse.error);
        throw new Error(geminiResponse.error);
      }

      if (!geminiResponse?.prediction_id) {
        console.error('No prediction ID returned:', geminiResponse);
        throw new Error('No prediction ID returned from Gemini API');
      }

      // Update project with prediction ID
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          prediction_id: geminiResponse.prediction_id,
          settings: {
            model_image_url: selectedModel.imageUrl,
            model_name: selectedModel.name,
            model_type: selectedModel.type
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

      </div>
    </div>
  );
};

export default ModelSwap;