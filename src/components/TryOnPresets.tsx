import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bookmark, Star, Trash2, Save, X } from 'lucide-react';

export type TryOnPreset = {
  id: string;
  name: string;
  model_image_url: string | null;
  model_source: string | null;
  model_meta: Record<string, any> | null;
  category: string | null;
  settings: Record<string, any> | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
};

type PresetSnapshot = {
  modelImageUrl: string | null;
  modelSource: 'gallery' | 'upload' | 'ai' | null;
  modelMeta?: Record<string, any>;
  category: string | null;
};

interface TryOnPresetsProps {
  userId: string;
  /** Current state used when user clicks "Save" */
  current: PresetSnapshot;
  /** Called when user picks a preset to apply */
  onApply: (preset: TryOnPreset) => void;
}

const TryOnPresets = ({ userId, current, onApply }: TryOnPresetsProps) => {
  const { toast } = useToast();
  const [presets, setPresets] = useState<TryOnPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tryon_presets')
        .select('*')
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setPresets((data ?? []) as unknown as TryOnPreset[]);
    } catch (err: any) {
      console.error('[presets] load error', err);
      toast({
        title: 'Gagal memuat preset',
        description: err?.message ?? 'Coba lagi sebentar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const canSave = Boolean(current.modelImageUrl && current.category);

  const handleSave = async () => {
    if (!canSave) {
      toast({
        title: 'Belum lengkap',
        description: 'Pilih model dan kategori dulu sebelum menyimpan preset.',
        variant: 'destructive',
      });
      return;
    }
    const name = presetName.trim() || `Preset ${new Date().toLocaleDateString('id-ID')}`;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('tryon_presets')
        .insert({
          user_id: userId,
          name,
          model_image_url: current.modelImageUrl,
          model_source: current.modelSource ?? 'gallery',
          model_meta: current.modelMeta ?? {},
          category: current.category,
          settings: {},
        })
        .select()
        .single();
      if (error) throw error;
      setPresets((prev) => [data as unknown as TryOnPreset, ...prev]);
      setSaveOpen(false);
      setPresetName('');
      toast({
        title: 'Preset disimpan',
        description: `"${name}" siap dipakai ulang.`,
      });
    } catch (err: any) {
      console.error('[presets] save error', err);
      toast({
        title: 'Gagal menyimpan',
        description: err?.message ?? 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async (preset: TryOnPreset) => {
    onApply(preset);
    setBrowseOpen(false);
    // Fire & forget — bump usage stats
    try {
      await supabase
        .from('tryon_presets')
        .update({
          use_count: (preset.use_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', preset.id);
      setPresets((prev) =>
        prev.map((p) =>
          p.id === preset.id
            ? { ...p, use_count: (p.use_count ?? 0) + 1, last_used_at: new Date().toISOString() }
            : p,
        ),
      );
    } catch (err) {
      console.warn('[presets] usage bump failed (non-fatal)', err);
    }
  };

  const handleDelete = async (preset: TryOnPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Hapus preset "${preset.name}"?`)) return;
    try {
      const { error } = await supabase.from('tryon_presets').delete().eq('id', preset.id);
      if (error) throw error;
      setPresets((prev) => prev.filter((p) => p.id !== preset.id));
      toast({ title: 'Preset dihapus' });
    } catch (err: any) {
      toast({
        title: 'Gagal menghapus',
        description: err?.message ?? 'Coba lagi.',
        variant: 'destructive',
      });
    }
  };

  const recent = presets.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto mb-3 sm:mb-4">
      <div className="rounded-lg border border-border bg-muted/20 p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-2">
          <Bookmark className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Preset</span>
          <Badge variant="secondary" className="text-[10px]">
            {presets.length}
          </Badge>
        </div>

        {/* Quick-apply chips for top 4 most-recent presets */}
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {loading && (
            <span className="text-xs text-muted-foreground">Memuat...</span>
          )}
          {!loading && recent.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Belum ada preset. Simpan kombinasi favorit untuk dipakai ulang sekali klik.
            </span>
          )}
          {recent.map((p) => (
            <button
              key={p.id}
              onClick={() => handleApply(p)}
              className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background hover:bg-accent hover:border-primary/40 transition-colors text-xs max-w-[200px]"
              title={`${p.name} · ${p.category ?? ''}`}
            >
              {p.model_image_url && (
                <img
                  src={p.model_image_url}
                  alt=""
                  className="w-5 h-5 rounded object-cover flex-shrink-0"
                />
              )}
              <span className="truncate">{p.name}</span>
              {p.category && (
                <span className="text-[9px] text-muted-foreground flex-shrink-0">
                  · {p.category}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {presets.length > 4 && (
            <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Lihat semua
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Semua preset</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleApply(p)}
                      className="group relative rounded-lg border border-border overflow-hidden hover:border-primary/60 transition-colors text-left"
                    >
                      <div className="aspect-[3/4] bg-muted/30">
                        {p.model_image_url ? (
                          <img
                            src={p.model_image_url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No model
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-background">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {p.category ?? '—'}
                          </span>
                          {p.use_count > 0 && (
                            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5" />
                              {p.use_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(p, e)}
                        className="absolute top-1 right-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Hapus preset"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!canSave}
                title={canSave ? 'Simpan kombinasi saat ini' : 'Pilih model + kategori dulu'}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Simpan preset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Simpan preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-3">
                  {current.modelImageUrl && (
                    <img
                      src={current.modelImageUrl}
                      alt=""
                      className="w-16 h-20 rounded object-cover"
                    />
                  )}
                  <div className="text-sm space-y-1 flex-1">
                    <p>
                      <span className="text-muted-foreground">Model:</span>{' '}
                      {current.modelSource ?? 'belum dipilih'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Kategori:</span>{' '}
                      {current.category ?? '—'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Nama preset
                  </label>
                  <Input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Contoh: Hijabi Casual, Studio Putih..."
                    maxLength={60}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default TryOnPresets;
