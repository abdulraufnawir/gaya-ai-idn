import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Edit3, Wand2 } from 'lucide-react';

interface PhotoEditorProps {
  userId: string;
}

const PhotoEditor = ({ userId }: PhotoEditorProps) => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage(file);
    }
  };

  const handleProcess = async () => {
    if (!originalImage || !editPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Silakan upload gambar dan masukkan deskripsi edit',
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
          title: `Photo Edit - ${new Date().toLocaleDateString('id-ID')}`,
          description: editPrompt,
          project_type: 'photo_edit',
          status: 'processing',
          settings: { prompt: editPrompt }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: 'Proyek edit foto telah dibuat. Fitur AI akan segera tersedia!',
      });

      setOriginalImage(null);
      setEditPrompt('');
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
            {originalImage && (
              <p className="text-sm text-green-600 mt-2">
                ✓ {originalImage.name}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Label htmlFor="edit-prompt">Deskripsi Edit</Label>
            <Textarea
              id="edit-prompt"
              placeholder="Jelaskan bagaimana Anda ingin mengedit foto ini..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={4}
            />
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Saran Edit:</Label>
              <div className="flex flex-wrap gap-2">
                {promptSuggestions.map((suggestion, index) => (
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

          <div className="flex justify-center">
            <Button
              onClick={handleProcess}
              disabled={processing || !originalImage || !editPrompt.trim()}
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
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Foto
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