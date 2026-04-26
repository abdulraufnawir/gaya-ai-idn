import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Crop, ImageDown, Check } from 'lucide-react';

type FormatPreset = {
  key: string;
  label: string;
  platform: string;
  width: number;
  height: number;
  ratio: string;
  fitMode: 'crop' | 'pad';
  /** vertical bias for cropping, 0 = top, 0.5 = center, 1 = bottom. Fashion: keep face in frame. */
  yBias?: number;
  /** background color for pad mode */
  padColor?: string;
};

const FORMATS: FormatPreset[] = [
  // Marketplace
  { key: 'shopee', label: 'Shopee', platform: 'Marketplace', width: 1024, height: 1024, ratio: '1:1', fitMode: 'pad', padColor: '#ffffff' },
  { key: 'tokopedia', label: 'Tokopedia', platform: 'Marketplace', width: 1024, height: 1024, ratio: '1:1', fitMode: 'pad', padColor: '#ffffff' },
  { key: 'tiktok_shop', label: 'TikTok Shop', platform: 'Marketplace', width: 1080, height: 1080, ratio: '1:1', fitMode: 'pad', padColor: '#ffffff' },
  // Social
  { key: 'ig_feed', label: 'IG Feed', platform: 'Instagram', width: 1080, height: 1350, ratio: '4:5', fitMode: 'crop', yBias: 0.35 },
  { key: 'ig_square', label: 'IG Square', platform: 'Instagram', width: 1080, height: 1080, ratio: '1:1', fitMode: 'crop', yBias: 0.35 },
  { key: 'ig_reels', label: 'IG Reels', platform: 'Instagram', width: 1080, height: 1920, ratio: '9:16', fitMode: 'crop', yBias: 0.4 },
  { key: 'ig_story', label: 'IG Story', platform: 'Instagram', width: 1080, height: 1920, ratio: '9:16', fitMode: 'crop', yBias: 0.4 },
  // TikTok
  { key: 'tiktok_video', label: 'TikTok Video', platform: 'TikTok', width: 1080, height: 1920, ratio: '9:16', fitMode: 'crop', yBias: 0.4 },
  // Marketing
  { key: 'wa_status', label: 'WA Status', platform: 'Marketing', width: 1080, height: 1920, ratio: '9:16', fitMode: 'crop', yBias: 0.4 },
  { key: 'fb_post', label: 'FB Post', platform: 'Marketing', width: 1200, height: 1200, ratio: '1:1', fitMode: 'pad', padColor: '#ffffff' },
];

interface MarketplaceExportProps {
  imageUrl: string;
  filenameBase?: string;
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar'));
    img.src = url;
  });

/**
 * Smart-fit: crop = cover with vertical yBias (preserves head); pad = contain on padColor.
 */
const renderToCanvas = (img: HTMLImageElement, preset: FormatPreset): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext('2d')!;

  if (preset.fitMode === 'pad') {
    ctx.fillStyle = preset.padColor ?? '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // contain
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  } else {
    // cover with yBias
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (canvas.width - w) / 2;
    const yBias = preset.yBias ?? 0.35;
    // y so the subject upper part stays visible
    const overflowY = h - canvas.height;
    const y = -overflowY * yBias;
    ctx.drawImage(img, x, y, w, h);
  }
  return canvas;
};

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Gagal encode JPEG'))),
      'image/jpeg',
      0.92,
    );
  });

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const MarketplaceExport = ({ imageUrl, filenameBase = 'busana' }: MarketplaceExportProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(['shopee', 'ig_feed']));
  const [working, setWorking] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const togglePreset = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const buildPreview = async (preset: FormatPreset, img: HTMLImageElement) => {
    const canvas = renderToCanvas(img, preset);
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && Object.keys(previews).length === 0) {
      try {
        const img = await loadImage(imageUrl);
        const out: Record<string, string> = {};
        // Build preview for each preset (small)
        for (const p of FORMATS) {
          out[p.key] = await buildPreview(p, img);
        }
        setPreviews(out);
      } catch (err) {
        console.error('[export] preview failed', err);
      }
    }
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      toast({
        title: 'Pilih dulu format',
        description: 'Centang minimal satu platform.',
        variant: 'destructive',
      });
      return;
    }
    setWorking(true);
    try {
      const img = await loadImage(imageUrl);
      let count = 0;
      for (const preset of FORMATS) {
        if (!selected.has(preset.key)) continue;
        const canvas = renderToCanvas(img, preset);
        const blob = await canvasToBlob(canvas);
        triggerDownload(
          blob,
          `${filenameBase}_${preset.key}_${preset.width}x${preset.height}.jpg`,
        );
        count++;
        // small gap so browsers don't block multi-download
        await new Promise((r) => setTimeout(r, 250));
      }
      toast({
        title: `${count} file di-export`,
        description: 'Cek folder Download Anda — siap upload.',
      });
    } catch (err: any) {
      console.error('[export] error', err);
      toast({
        title: 'Gagal export',
        description: err?.message ?? 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setWorking(false);
    }
  };

  // Group by platform
  const groups = FORMATS.reduce<Record<string, FormatPreset[]>>((acc, p) => {
    (acc[p.platform] ??= []).push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImageDown className="h-4 w-4 mr-2" />
          Export Marketplace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Auto-Format Marketplace
          </DialogTitle>
          <DialogDescription>
            Pilih platform — kami auto-crop & resize sesuai rasio masing-masing. Subject bias
            ke atas supaya wajah & upper body tetap dalam frame.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {Object.entries(groups).map(([platform, presets]) => (
            <div key={platform}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {platform}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {presets.map((p) => {
                  const picked = selected.has(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => togglePreset(p.key)}
                      className={`group relative rounded-lg border-2 overflow-hidden text-left transition-colors ${
                        picked
                          ? 'border-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                        {previews[p.key] ? (
                          <img
                            src={previews[p.key]}
                            alt={p.label}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <div className="p-2 bg-background">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{p.label}</p>
                          {picked && <Check className="h-3 w-3 text-primary" />}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            {p.ratio}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {p.width}×{p.height}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} format dipilih · gratis (tanpa kredit)`
              : 'Pilih format yang ingin di-export'}
          </p>
          <Button onClick={handleExport} disabled={working || selected.size === 0}>
            {working ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengexport...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selected.size > 0 ? `${selected.size} file` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarketplaceExport;
