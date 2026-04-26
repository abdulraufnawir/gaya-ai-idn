import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Layers, Wand2, Loader2, Download, X, Check } from 'lucide-react';

const POSES = [
  { key: 'front', label: 'Tampak Depan' },
  { key: 'side', label: 'Tampak Samping' },
  { key: 'three_quarter', label: '3/4 Angle' },
  { key: 'walking', label: 'Walking' },
  { key: 'hand_pocket', label: 'Tangan di Saku' },
  { key: 'back', label: 'Tampak Belakang' },
];

const BACKGROUNDS = [
  { key: 'studio_white', label: 'Studio Putih' },
  { key: 'studio_grey', label: 'Studio Abu' },
  { key: 'bali_outdoor', label: 'Outdoor Bali' },
  { key: 'jakarta_street', label: 'Jalanan Jakarta' },
  { key: 'cafe_lifestyle', label: 'Cafe Lifestyle' },
  { key: 'beach', label: 'Pantai' },
  { key: 'rooftop_night', label: 'Rooftop Malam' },
];

interface LookbookPanelProps {
  userId: string;
  sourceProjectId: string;
  sourceImageUrl: string;
}

type Variation = {
  id: string;
  variation_type: 'pose' | 'background';
  variation_key: string;
  variation_label: string;
  result_image_url: string | null;
  status: 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
};

const LookbookPanel = ({ userId, sourceProjectId, sourceImageUrl }: LookbookPanelProps) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'pose' | 'background'>('pose');
  const [selectedPoses, setSelectedPoses] = useState<Set<string>>(new Set());
  const [selectedBgs, setSelectedBgs] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);

  const loadVariations = async () => {
    const { data, error } = await supabase
      .from('lookbook_variations')
      .select('*')
      .eq('source_project_id', sourceProjectId)
      .order('created_at', { ascending: false });
    if (!error && data) setVariations(data as unknown as Variation[]);
  };

  useEffect(() => {
    loadVariations();
    // realtime updates while a job is running
    const channel = supabase
      .channel(`lookbook-${sourceProjectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lookbook_variations',
          filter: `source_project_id=eq.${sourceProjectId}`,
        },
        () => loadVariations(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceProjectId]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const totalSelected = selectedPoses.size + selectedBgs.size;

  const handleGenerate = async () => {
    if (totalSelected === 0) {
      toast({
        title: 'Pilih dulu variasi',
        description: 'Centang pose atau background yang ingin di-generate.',
        variant: 'destructive',
      });
      return;
    }
    if (totalSelected > 6) {
      toast({
        title: 'Maksimal 6 variasi sekaligus',
        description: 'Kurangi pilihan agar tidak melebihi batas.',
        variant: 'destructive',
      });
      return;
    }

    setRunning(true);
    try {
      const variationsPayload = [
        ...Array.from(selectedPoses).map((k) => ({ type: 'pose' as const, key: k })),
        ...Array.from(selectedBgs).map((k) => ({ type: 'background' as const, key: k })),
      ];

      const { data, error } = await supabase.functions.invoke('lookbook-generate', {
        body: {
          userId,
          sourceProjectId,
          sourceImageUrl,
          variations: variationsPayload,
        },
      });

      if (error) {
        const ctx = (error as any)?.context;
        if (ctx?.status === 402) {
          toast({
            title: 'Kredit tidak cukup',
            description: 'Top-up kredit untuk lanjut generate variasi.',
            variant: 'destructive',
          });
        } else if (ctx?.status === 429) {
          toast({
            title: 'Terlalu banyak request',
            description: 'Tunggu sebentar lalu coba lagi.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      const failed = (data?.results ?? []).filter((r: any) => r.status === 'failed');
      const ok = (data?.results ?? []).filter((r: any) => r.status === 'completed');
      toast({
        title: failed.length === 0 ? 'Lookbook siap!' : 'Sebagian variasi gagal',
        description: `${ok.length} variasi berhasil${
          failed.length > 0 ? `, ${failed.length} gagal` : ''
        }.`,
        variant: failed.length > 0 && ok.length === 0 ? 'destructive' : 'default',
      });

      setSelectedPoses(new Set());
      setSelectedBgs(new Set());
      await loadVariations();
    } catch (err: any) {
      console.error('[lookbook] generate error', err);
      toast({
        title: 'Gagal generate',
        description: err?.message ?? 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  const downloadVariation = async (v: Variation) => {
    if (!v.result_image_url) return;
    try {
      const res = await fetch(v.result_image_url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lookbook-${v.variation_type}-${v.variation_key}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(v.result_image_url, '_blank');
    }
  };

  const deleteVariation = async (v: Variation) => {
    if (!confirm(`Hapus variasi "${v.variation_label}"?`)) return;
    const { error } = await supabase
      .from('lookbook_variations')
      .delete()
      .eq('id', v.id);
    if (error) {
      toast({ title: 'Gagal hapus', description: error.message, variant: 'destructive' });
      return;
    }
    setVariations((prev) => prev.filter((x) => x.id !== v.id));
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Lookbook Multi-Pose & Editorial Background</span>
        <Badge variant="secondary" className="text-[10px]">1 kredit / variasi</Badge>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('pose')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            tab === 'pose'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pose ({selectedPoses.size})
        </button>
        <button
          type="button"
          onClick={() => setTab('background')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            tab === 'background'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Background ({selectedBgs.size})
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(tab === 'pose' ? POSES : BACKGROUNDS).map((p) => {
          const set = tab === 'pose' ? selectedPoses : selectedBgs;
          const setter = tab === 'pose' ? setSelectedPoses : setSelectedBgs;
          const picked = set.has(p.key);
          const alreadyDone = variations.some(
            (v) =>
              v.variation_type === tab &&
              v.variation_key === p.key &&
              v.status === 'completed',
          );
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => toggle(set, setter, p.key)}
              disabled={running}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors flex items-center gap-1 ${
                picked
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:border-primary/40'
              }`}
            >
              {picked && <Check className="h-3 w-3" />}
              {p.label}
              {alreadyDone && (
                <span className="text-[9px] opacity-70">·dibuat</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {totalSelected > 0
            ? `${totalSelected} variasi dipilih · ${totalSelected} kredit`
            : 'Pilih sampai 6 variasi sekaligus'}
        </p>
        <Button
          onClick={handleGenerate}
          size="sm"
          disabled={running || totalSelected === 0}
        >
          {running ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Generate {totalSelected > 0 ? `(${totalSelected})` : ''}
            </>
          )}
        </Button>
      </div>

      {variations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Hasil variasi ({variations.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {variations.map((v) => (
              <div
                key={v.id}
                className="group relative aspect-[3/4] rounded-lg border border-border overflow-hidden bg-muted/20"
              >
                {v.status === 'completed' && v.result_image_url ? (
                  <img
                    src={v.result_image_url}
                    alt={v.variation_label}
                    className="w-full h-full object-cover"
                  />
                ) : v.status === 'processing' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mb-1" />
                    <p className="text-[10px] text-muted-foreground text-center px-1">
                      {v.variation_label}
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                    <X className="h-5 w-5 text-destructive mb-1" />
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {v.error_message ?? 'Gagal'}
                    </p>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <p className="text-[10px] text-white font-medium truncate">
                    {v.variation_label}
                  </p>
                </div>
                {v.status === 'completed' && (
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => downloadVariation(v)}
                      className="bg-background/90 hover:bg-background rounded-full w-6 h-6 flex items-center justify-center"
                      aria-label="Download"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteVariation(v)}
                      className="bg-background/90 hover:bg-destructive hover:text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      aria-label="Hapus"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LookbookPanel;
