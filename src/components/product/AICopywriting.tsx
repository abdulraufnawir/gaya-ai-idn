import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PenTool, Loader2, Copy, Check } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  primary_image_url: string | null;
}

interface AICopywritingProps {
  userId: string;
  product: Product | null;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'shopee', label: 'Shopee', icon: '🛒' },
  { value: 'tokopedia', label: 'Tokopedia', icon: '🏪' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'website', label: 'Website', icon: '🌐' },
];

const TONES = [
  { value: 'professional', label: 'Profesional' },
  { value: 'casual', label: 'Santai' },
  { value: 'luxury', label: 'Mewah' },
  { value: 'playful', label: 'Fun' },
  { value: 'informative', label: 'Informatif' },
  { value: 'urgent', label: 'Promo/FOMO' },
];

interface CopyResult {
  headline: string;
  body: string;
  hashtags: string[];
  cta: string;
  alt_headlines: string[];
}

const AICopywriting = ({ userId, product }: AICopywritingProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [selectedTone, setSelectedTone] = useState('casual');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<CopyResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!product) {
      toast({ title: 'Error', description: 'Pilih produk terlebih dahulu', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('product-ai', {
        body: {
          action: 'generateCopywriting',
          productName: product.name,
          productDescription: product.description,
          category: product.category,
          platform: selectedPlatform,
          tone: selectedTone,
          language: 'id',
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setResult(data.copywriting);

      // Save to product_content
      await (supabase as any).from('product_content').insert({
        user_id: userId,
        product_id: product.id,
        content_type: 'copywriting',
        title: `Copy ${selectedPlatform} - ${product.name}`,
        content_text: JSON.stringify(data.copywriting),
        platform: selectedPlatform,
        settings: { tone: selectedTone, platform: selectedPlatform },
      } as any);

      toast({ title: 'Berhasil!', description: 'Copywriting berhasil di-generate' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: 'Disalin!', description: 'Teks berhasil disalin ke clipboard' });
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(text, field)}>
      {copiedField === field ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PenTool className="h-4 w-4" />
            AI Copywriting
          </CardTitle>
          <CardDescription className="text-xs">
            Generate caption, deskripsi, dan hashtag otomatis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Product */}
          {product ? (
            <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
              {product.primary_image_url ? (
                <img src={product.primary_image_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">📦</div>
              )}
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 border-2 border-dashed rounded-lg text-center">
              <p className="text-sm text-muted-foreground">← Pilih produk dari katalog</p>
            </div>
          )}

          {/* Platform */}
          <div>
            <Label className="text-xs font-medium">Platform</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPlatform(p.value)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    selectedPlatform === p.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-base">{p.icon}</div>
                  <span className="text-[10px]">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <Label className="text-xs font-medium">Tone/Nada</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TONES.map(t => (
                <Badge
                  key={t.value}
                  variant={selectedTone === t.value ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setSelectedTone(t.value)}
                >
                  {t.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Generate */}
          <Button onClick={handleGenerate} disabled={processing || !product} className="w-full" size="lg">
            {processing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
            ) : (
              <><PenTool className="h-4 w-4 mr-2" />Generate Copywriting</>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-medium">Headline</Label>
                  <CopyButton text={result.headline} field="headline" />
                </div>
                <p className="text-sm font-semibold">{result.headline}</p>
                {result.alt_headlines?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Alternatif:</p>
                    {result.alt_headlines.map((h, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">• {h}</p>
                        <CopyButton text={h} field={`alt-${i}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-medium">Caption/Body</Label>
                  <CopyButton text={result.body} field="body" />
                </div>
                <p className="text-sm whitespace-pre-wrap">{result.body}</p>
              </div>

              {result.hashtags?.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-medium">Hashtags</Label>
                    <CopyButton text={result.hashtags.map(h => `#${h}`).join(' ')} field="hashtags" />
                  </div>
                  <p className="text-sm text-primary">{result.hashtags.map(h => `#${h}`).join(' ')}</p>
                </div>
              )}

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-medium">Call to Action</Label>
                  <CopyButton text={result.cta} field="cta" />
                </div>
                <p className="text-sm font-medium">{result.cta}</p>
              </div>

              {/* Copy All */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const allText = `${result.headline}\n\n${result.body}\n\n${result.hashtags?.map(h => `#${h}`).join(' ')}\n\n${result.cta}`;
                  copyToClipboard(allText, 'all');
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Salin Semua
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AICopywriting;
