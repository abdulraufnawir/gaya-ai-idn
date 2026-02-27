import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, Download, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  primary_image_url: string | null;
}

interface AIProductPhotoProps {
  userId: string;
  product: Product | null;
}

const STYLES = [
  { value: 'studio-white', label: 'Studio Putih', icon: '🏢' },
  { value: 'lifestyle', label: 'Lifestyle', icon: '🌿' },
  { value: 'flat-lay', label: 'Flat Lay', icon: '📐' },
  { value: 'minimalist', label: 'Minimalis', icon: '⬜' },
  { value: 'luxury', label: 'Mewah', icon: '✨' },
  { value: 'outdoor', label: 'Outdoor', icon: '🌅' },
  { value: 'marketplace', label: 'Marketplace', icon: '🛒' },
  { value: 'social-story', label: 'Story/Reels', icon: '📱' },
];

const PLATFORMS = [
  { value: 'instagram-post', label: 'IG Post (1:1)' },
  { value: 'instagram-story', label: 'IG Story (9:16)' },
  { value: 'tiktok', label: 'TikTok (9:16)' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'tokopedia', label: 'Tokopedia' },
  { value: 'banner', label: 'Banner (16:9)' },
];

const AIProductPhoto = ({ userId, product }: AIProductPhotoProps) => {
  const [selectedStyle, setSelectedStyle] = useState('studio-white');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram-post');
  const [processing, setProcessing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!product) {
      toast({ title: 'Error', description: 'Pilih produk terlebih dahulu dari katalog', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('product-ai', {
        body: {
          action: 'generateProductPhoto',
          productName: product.name,
          productDescription: product.description,
          category: product.category,
          style: selectedStyle,
          platform: selectedPlatform,
          productImageUrl: product.primary_image_url,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setGeneratedImage(data.imageUrl);

      // Save to product_content
      await (supabase as any).from('product_content').insert({
        user_id: userId,
        product_id: product.id,
        content_type: 'photo',
        title: `${product.name} - ${STYLES.find(s => s.value === selectedStyle)?.label}`,
        image_url: data.imageUrl,
        platform: selectedPlatform,
        template_type: selectedStyle,
        settings: { style: selectedStyle, platform: selectedPlatform },
      } as any);

      toast({ title: 'Berhasil!', description: 'Foto produk berhasil di-generate' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            AI Product Photography
          </CardTitle>
          <CardDescription className="text-xs">
            Generate foto produk profesional dengan berbagai style dan format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Product */}
          {product ? (
            <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
              {product.primary_image_url ? (
                <img src={product.primary_image_url} alt={product.name} className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-lg">📦</div>
              )}
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 border-2 border-dashed rounded-lg text-center">
              <p className="text-sm text-muted-foreground">← Pilih produk dari katalog di sebelah kiri</p>
            </div>
          )}

          {/* Style Selection */}
          <div>
            <Label className="text-xs font-medium">Style Foto</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {STYLES.map(style => (
                <button
                  key={style.value}
                  onClick={() => setSelectedStyle(style.value)}
                  className={`p-2 rounded-lg border text-center transition-all text-xs ${
                    selectedStyle === style.value
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-lg mb-1">{style.icon}</div>
                  <span className="text-[10px]">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <Label className="text-xs font-medium">Platform</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PLATFORMS.map(p => (
                <Badge
                  key={p.value}
                  variant={selectedPlatform === p.value ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setSelectedPlatform(p.value)}
                >
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={processing || !product} className="w-full" size="lg">
            {processing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Generate Foto Produk</>
            )}
          </Button>

          {/* Result */}
          {generatedImage && (
            <div className="space-y-2">
              <Label className="text-xs">Hasil:</Label>
              <div className="rounded-lg overflow-hidden border">
                <img src={generatedImage} alt="Generated" className="w-full" />
              </div>
              <a href={generatedImage} download target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIProductPhoto;
