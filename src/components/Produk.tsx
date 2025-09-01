import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Sparkles, Image, Wand2 } from 'lucide-react';

interface ProdukProps {
  userId: string;
}

const Produk = ({ userId }: ProdukProps) => {
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [marketingStyle, setMarketingStyle] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const marketingStyles = [
    { value: 'lifestyle', label: 'Lifestyle', description: 'Gaya hidup modern dan kasual' },
    { value: 'luxury', label: 'Luxury', description: 'Mewah dan eksklusif' },
    { value: 'minimalist', label: 'Minimalist', description: 'Sederhana dan bersih' },
    { value: 'vintage', label: 'Vintage', description: 'Klasik dan retro' },
    { value: 'sporty', label: 'Sporty', description: 'Aktif dan dinamis' },
    { value: 'elegant', label: 'Elegant', description: 'Elegan dan formal' },
  ];

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'File yang dipilih bukan gambar yang valid',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Ukuran file terlalu besar. Maksimal 10MB',
          variant: 'destructive',
        });
        return;
      }

      setProductImage(file);
      const previewUrl = URL.createObjectURL(file);
      setProductImagePreview(previewUrl);

      toast({
        title: 'Berhasil',
        description: 'Gambar produk berhasil diupload',
      });
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${userId}/product_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('tryon-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('tryon-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleProcess = async () => {
    if (!productImage || !productName.trim() || !marketingStyle) {
      toast({
        title: 'Error',
        description: 'Silakan lengkapi semua field yang diperlukan',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const productImageUrl = await uploadImage(productImage);

      // Create project record
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: `Marketing Produk - ${productName}`,
          description: `Marketing material untuk ${productName}`,
          project_type: 'product_marketing',
          status: 'processing',
          settings: {
            product_name: productName,
            product_description: productDescription,
            marketing_style: marketingStyle,
            product_image_url: productImageUrl,
          },
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create marketing prompt based on style and product info
      const styleInfo = marketingStyles.find(s => s.value === marketingStyle);
      const marketingPrompt = `Create a ${styleInfo?.description} marketing image for ${productName}. ${productDescription ? `Product description: ${productDescription}.` : ''} Make it visually appealing for social media and advertising.`;

      // Call AI service for product marketing enhancement
      const { data: response, error: invokeError } = await supabase.functions.invoke('kie-ai', {
        body: {
          action: 'enhanceProduct',
          productImage: productImageUrl,
          prompt: marketingPrompt,
          style: marketingStyle,
          projectId: project.id,
        },
      });

      if (invokeError) {
        throw new Error(`Function invoke error: ${invokeError.message}`);
      }

      if (!response) {
        throw new Error('No response received from AI service');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Update project with prediction ID
      await supabase
        .from('projects')
        .update({
          prediction_id: response.prediction_id,
        })
        .eq('id', project.id);

      toast({
        title: 'Berhasil!',
        description: 'Materi marketing sedang diproses. Silakan cek riwayat proyek untuk melihat hasilnya.',
      });

      // Reset form
      setProductImage(null);
      setProductImagePreview(null);
      setProductName('');
      setProductDescription('');
      setMarketingStyle('');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 border-blue-200 text-blue-700">
            <Sparkles className="h-3 w-3" />
            Beta Feature
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Produk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Gambar Produk
            </CardTitle>
            <CardDescription>
              Upload foto produk yang ingin dijadikan materi marketing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="product-image">Gambar Produk</Label>
              <div className="mt-2">
                <input
                  id="product-image"
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="product-image"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
                >
                  {productImagePreview ? (
                    <img
                      src={productImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <>
                      <Image className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Klik untuk upload gambar produk
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="product-name">Nama Produk *</Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Kaos Premium Cotton"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="product-description">Deskripsi Produk (Opsional)</Label>
              <Textarea
                id="product-description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Deskripsi singkat tentang produk..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pilihan Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Style Marketing
            </CardTitle>
            <CardDescription>
              Pilih gaya visual untuk materi marketing Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="marketing-style">Gaya Marketing *</Label>
              <Select value={marketingStyle} onValueChange={setMarketingStyle}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih gaya marketing" />
                </SelectTrigger>
                <SelectContent>
                  {marketingStyles.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{style.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {style.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {marketingStyle && (
              <div>
                <Label>Preview Style</Label>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {marketingStyles.find(s => s.value === marketingStyle)?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {marketingStyles.find(s => s.value === marketingStyle)?.description}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Process Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleProcess}
          disabled={processing || !productImage || !productName.trim() || !marketingStyle}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Memproses...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Buat Materi Marketing
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Produk;