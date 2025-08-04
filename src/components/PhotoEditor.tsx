import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Edit3, Wand2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhotoEditorProps {
  userId: string;
}

const PhotoEditor = ({ userId }: PhotoEditorProps) => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [editType, setEditType] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setOriginalImagePreview(previewUrl);
    }
  };

  const handleProcess = async () => {
    if (!originalImage || (!editPrompt.trim() && editType !== 'background_removal' && editType !== 'image_enhancement')) {
      toast({
        title: 'Error',
        description: 'Silakan upload gambar dan pilih jenis edit',
        variant: 'destructive',
      });
      return;
    }

    if (!editType) {
      toast({
        title: 'Error',
        description: 'Silakan pilih jenis edit yang diinginkan',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      // Get the authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('Auth user:', user);
      console.log('Auth error:', userError);
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Upload image to Supabase Storage first
      const fileName = `photo-edit-${Date.now()}-${originalImage.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tryon-images')
        .upload(fileName, originalImage);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tryon-images')
        .getPublicUrl(fileName);

      // Create project in database
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: `Photo Edit - ${new Date().toLocaleDateString('id-ID')}`,
          description: editType === 'background_removal' 
            ? 'Hapus background foto' 
            : editType === 'image_enhancement'
            ? 'Tingkatkan kualitas foto'
            : editPrompt,
          project_type: 'photo_edit',
          status: 'processing',
          settings: { 
            edit_type: editType,
            prompt: editPrompt,
            original_image_url: publicUrl
          }
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Call Replicate API based on edit type
      const { data: replicateResponse, error: replicateError } = await supabase.functions.invoke('replicate-api', {
        body: {
          action: editType,
          imageUrl: publicUrl,
          ...(editType === 'background_replacement' && { prompt: editPrompt })
        }
      });

      if (replicateError) {
        console.error('Replicate API Error:', replicateError);
        throw new Error(replicateError.message || 'Failed to start photo editing');
      }

      if (replicateResponse?.error) {
        console.error('Replicate Response Error:', replicateResponse.error);
        throw new Error(replicateResponse.error);
      }

      if (!replicateResponse?.predictionId) {
        console.error('No prediction ID returned:', replicateResponse);
        throw new Error('No prediction ID returned from Replicate');
      }

      // Update project with prediction ID
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          settings: {
            edit_type: editType,
            prompt: editPrompt,
            original_image_url: publicUrl,
            prediction_id: replicateResponse.predictionId
          }
        })
        .eq('id', project.id);

      if (updateError) {
        console.error('Update project error:', updateError);
        throw updateError;
      }

      toast({
        title: 'Berhasil!',
        description: 'Foto sedang diproses dengan AI. Silakan cek riwayat proyek untuk melihat hasilnya.',
      });

      // Reset form
      setOriginalImage(null);
      setOriginalImagePreview(null);
      setEditType('');
      setEditPrompt('');
      
    } catch (error: any) {
      console.error('Photo editing error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Terjadi kesalahan saat memproses foto',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const promptSuggestions = [
    'Ganti background menjadi studio putih',
    'Tingkatkan kualitas dan pencahayaan',
    'Hapus background dan buat transparan',
    'Ubah warna pakaian menjadi merah',
    'Tambahkan efek professional lighting',
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editor Foto AI
          </CardTitle>
          <CardDescription>
            Edit foto produk Anda dengan kekuatan AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Upload Section */}
          <div>
            <Label htmlFor="photo-upload">Upload Foto</Label>
            <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="flex text-sm text-muted-foreground">
                  <label
                    htmlFor="photo-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                  >
                    <span>Upload foto produk</span>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG hingga 10MB</p>
              </div>
            </div>
            {originalImagePreview && (
              <div className="mt-4">
                <img 
                  src={originalImagePreview} 
                  alt="Preview" 
                  className="w-full max-w-sm mx-auto rounded-lg shadow-md"
                />
                <p className="text-sm text-green-600 mt-2 text-center">
                  ✓ {originalImage?.name}
                </p>
              </div>
            )}
          </div>

          {/* Edit Type Selection */}
          <div className="space-y-3">
            <Label>Jenis Edit</Label>
            <Select value={editType} onValueChange={setEditType}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis edit yang diinginkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="background_removal">Hapus Background</SelectItem>
                <SelectItem value="background_replacement">Ganti Background</SelectItem>
                <SelectItem value="image_enhancement">Tingkatkan Kualitas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Edit Description (only for background replacement) */}
          {editType === 'background_replacement' && (
            <div className="space-y-4">
              <Label htmlFor="edit-prompt">Deskripsi Background Baru</Label>
              <Textarea
                id="edit-prompt"
                placeholder="Jelaskan background yang diinginkan, contoh: studio putih bersih, pemandangan pantai, ruang kantor modern..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={3}
              />
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Saran Background:</Label>
                <div className="flex flex-wrap gap-2">
                  {['Studio putih profesional', 'Pemandangan alam', 'Ruang kantor modern', 'Background abstrak', 'Gradient elegan'].map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setEditPrompt(suggestion)}
                      className="text-xs"
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Process Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleProcess}
              disabled={processing || !originalImage || !editType || (editType === 'background_replacement' && !editPrompt.trim())}
              size="lg"
              className="min-w-[200px]"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Proses dengan AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotoEditor;