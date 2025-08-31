import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Edit3, Wand2, Loader2, Image, Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhotoEditorProps {
  userId: string;
}

const PhotoEditor = ({ userId }: PhotoEditorProps) => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [editType, setEditType] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('');
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

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setBackgroundImagePreview(previewUrl);
      // Clear text prompt when background image is uploaded
      setEditPrompt('');
      setSelectedColor('');
    }
  };

  const handleProcess = async () => {
    if (!originalImage) {
      toast({
        title: 'Error',
        description: 'Silakan upload gambar terlebih dahulu',
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

    // Validation for background replacement
    if (editType === 'background_replacement' && !backgroundImage && !editPrompt.trim() && !selectedColor) {
      toast({
        title: 'Error',
        description: 'Silakan upload background image, pilih warna, atau tulis deskripsi background',
        variant: 'destructive',
      });
      return;
    }

    // Validation for custom edit
    if (editType === 'custom_edit' && !editPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Silakan tulis instruksi edit kustom',
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

      // Upload image to Supabase Storage first with user-specific folder structure
      const fileName = `${user.id}/photo-edit-${Date.now()}-${originalImage.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tryon-images')
        .upload(fileName, originalImage);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tryon-images')
        .getPublicUrl(fileName);

      // Upload background image if provided
      let backgroundUrl = null;
      if (backgroundImage) {
        const backgroundFileName = `${user.id}/background-${Date.now()}-${backgroundImage.name}`;
        const { data: backgroundUploadData, error: backgroundUploadError } = await supabase.storage
          .from('tryon-images')
          .upload(backgroundFileName, backgroundImage);

        if (backgroundUploadError) throw backgroundUploadError;

        const { data: { publicUrl: backgroundPublicUrl } } = supabase.storage
          .from('tryon-images')
          .getPublicUrl(backgroundFileName);
        
        backgroundUrl = backgroundPublicUrl;
      }

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
            : editType === 'custom_edit'
            ? `Edit kustom: ${editPrompt}`
            : editPrompt,
          project_type: 'photo_edit',
          status: 'processing',
          settings: { 
            edit_type: editType,
            prompt: editPrompt,
            selected_color: selectedColor,
            background_image_url: backgroundUrl,
            original_image_url: publicUrl
          }
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Call Kie.AI for photo editing  
      const { data: kieResponse, error: kieError } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'photoEdit',
          originalImage: publicUrl,
          backgroundImage: backgroundUrl,
          editType: editType,
          prompt: editPrompt,
          selectedColor: selectedColor,
          projectId: project.id
        }
      });

      if (kieError) {
        console.error('Kie.AI API Error:', kieError);
        throw new Error(kieError.message || 'Failed to start image processing');
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
            edit_type: editType,
            prompt: editPrompt,
            selected_color: selectedColor,
            background_image_url: backgroundUrl,
            original_image_url: publicUrl,
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
        description: 'Foto sedang diproses dengan Kie.AI nano-banana. Silakan cek riwayat proyek untuk melihat hasilnya.',
      });

      // Reset form
      setOriginalImage(null);
      setOriginalImagePreview(null);
      setBackgroundImage(null);
      setBackgroundImagePreview(null);
      setEditType('');
      setEditPrompt('');
      setSelectedColor('');
      
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Edit3 className="h-4 w-4" />
            Editor Foto AI
          </CardTitle>
          <CardDescription className="text-sm">
            Edit foto produk Anda dengan kekuatan AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          {/* Image Upload Section */}
          <div>
            <Label htmlFor="photo-upload" className="text-sm">Upload Foto</Label>
            <div className="mt-2 flex justify-center px-4 py-4 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
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
                <SelectItem value="custom_edit">Edit Kustom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Background Replacement Options */}
          {editType === 'background_replacement' && (
            <div className="space-y-6">
              {/* Upload Background Image */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Upload Background Image
                </Label>
                <div className="flex justify-center px-4 py-4 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="background-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                      >
                        <span>Upload background image</span>
                        <Input
                          id="background-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleBackgroundImageChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG hingga 10MB</p>
                  </div>
                </div>
                {backgroundImagePreview && (
                  <div className="mt-3">
                    <img 
                      src={backgroundImagePreview} 
                      alt="Background Preview" 
                      className="w-full max-w-xs mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-green-600 mt-2 text-center">
                      ✓ {backgroundImage?.name}
                    </p>
                  </div>
                )}
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted-foreground/25" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ATAU</span>
                </div>
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-3 w-3" />
                  Pilih Warna
                </Label>
                <div className="grid grid-cols-8 gap-1.5">
                  {[
                    { name: 'Putih', color: '#FFFFFF' },
                    { name: 'Abu Terang', color: '#F5F5F5' },
                    { name: 'Abu', color: '#9CA3AF' },
                    { name: 'Hitam', color: '#000000' },
                    { name: 'Biru Muda', color: '#DBEAFE' },
                    { name: 'Biru', color: '#3B82F6' },
                    { name: 'Hijau Muda', color: '#D1FAE5' },
                    { name: 'Hijau', color: '#10B981' },
                    { name: 'Merah Muda', color: '#FCE7F3' },
                    { name: 'Merah', color: '#EF4444' },
                    { name: 'Kuning Muda', color: '#FEF3C7' },
                    { name: 'Ungu', color: '#8B5CF6' }
                  ].map((colorOption, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedColor(colorOption.color);
                        setEditPrompt(`Background warna ${colorOption.name.toLowerCase()}`);
                        setBackgroundImage(null);
                        setBackgroundImagePreview(null);
                      }}
                      className={`w-6 h-6 rounded-md border transition-all ${
                        selectedColor === colorOption.color 
                          ? 'border-primary ring-1 ring-primary scale-110' 
                          : 'border-muted-foreground/30 hover:border-primary/60 hover:scale-105'
                      }`}
                      style={{ backgroundColor: colorOption.color }}
                      title={colorOption.name}
                    />
                  ))}
                </div>
                {selectedColor && (
                  <p className="text-xs text-green-600">
                    ✓ {editPrompt}
                  </p>
                )}
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted-foreground/25" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ATAU</span>
                </div>
              </div>

              {/* Text Description */}
              <div className="space-y-3">
                <Label htmlFor="edit-prompt">Deskripsi Background Baru</Label>
                <Textarea
                  id="edit-prompt"
                  placeholder="Jelaskan background yang diinginkan, contoh: studio putih bersih, pemandangan pantai, ruang kantor modern..."
                  value={editPrompt}
                  onChange={(e) => {
                    setEditPrompt(e.target.value);
                    setSelectedColor('');
                    setBackgroundImage(null);
                    setBackgroundImagePreview(null);
                  }}
                  rows={3}
                />
              </div>
              
              {/* Background Suggestions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Saran Background:</Label>
                <div className="flex flex-wrap gap-2">
                  {['Studio putih profesional', 'Pemandangan alam', 'Ruang kantor modern', 'Background abstrak', 'Gradient elegan'].map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditPrompt(suggestion);
                        setSelectedColor('');
                        setBackgroundImage(null);
                        setBackgroundImagePreview(null);
                      }}
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

          {/* Custom Edit Prompt */}
          {editType === 'custom_edit' && (
            <div className="space-y-4">
              <Label htmlFor="custom-edit-prompt">Instruksi Edit Kustom</Label>
              <Textarea
                id="custom-edit-prompt"
                placeholder="Tulis instruksi edit Anda sendiri, contoh: ubah warna menjadi merah, tambahkan efek vintage, hilangkan objek tertentu..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Tulis dengan detail apa yang ingin Anda ubah dari gambar ini.
              </p>
            </div>
          )}

          {/* Process Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleProcess}
              disabled={processing || !originalImage || !editType || 
                (editType === 'background_replacement' && !backgroundImage && !editPrompt.trim() && !selectedColor) ||
                (editType === 'custom_edit' && !editPrompt.trim())}
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