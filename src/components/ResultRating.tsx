import { useEffect, useState } from 'react';
import { Star, RotateCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResultRatingProps {
  userId: string;
  projectId: string;
  /** Called when user wants to regenerate (typically rating ≤ 3). */
  onRegenerate: () => void;
  /** Disable regenerate button (e.g., already retrying or no source data). */
  regenerateDisabled?: boolean;
  retryCount?: number;
}

const NEGATIVE_REASONS = [
  'Wajah berubah',
  'Pakaian tidak pas',
  'Warna salah',
  'Pose aneh',
  'Detail hilang',
  'Background masalah',
];

const ResultRating = ({
  userId,
  projectId,
  onRegenerate,
  regenerateDisabled,
  retryCount = 0,
}: ResultRatingProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Load existing rating for this project (if any) — supports edit
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('tryon_ratings')
        .select('id, rating, reasons, comment')
        .eq('project_id', projectId)
        .maybeSingle();
      if (cancelled || !data) return;
      setExistingId(data.id);
      setRating(data.rating);
      setReasons(data.reasons ?? []);
      setComment(data.comment ?? '');
      setSubmitted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const isLowRating = rating !== null && rating <= 3;

  const toggleReason = (r: string) => {
    setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const handleSubmit = async () => {
    if (rating === null) return;
    setSubmitting(true);
    try {
      if (existingId) {
        const { error } = await supabase
          .from('tryon_ratings')
          .update({ rating, reasons, comment: comment.trim() || null })
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tryon_ratings')
          .insert({
            user_id: userId,
            project_id: projectId,
            rating,
            reasons,
            comment: comment.trim() || null,
          })
          .select('id')
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }
      setSubmitted(true);
      toast({
        title: 'Terima kasih atas feedbacknya',
        description: isLowRating
          ? 'Kami catat — coba "Generate ulang" untuk hasil yang lebih baik.'
          : 'Feedback Anda membantu meningkatkan kualitas AI.',
      });
    } catch (err: any) {
      console.error('[rating] submit error', err);
      toast({
        title: 'Gagal kirim rating',
        description: err?.message ?? 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Rating hasil:</span>
          <div
            className="flex items-center gap-0.5"
            onMouseLeave={() => setHover(null)}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hover ?? rating ?? 0) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onClick={() => {
                    setRating(n);
                    setSubmitted(false);
                  }}
                  className="p-0.5 transition-transform hover:scale-110"
                  aria-label={`${n} bintang`}
                >
                  <Star
                    className={`h-5 w-5 transition-colors ${
                      active
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/40'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          {submitted && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Check className="h-2.5 w-2.5" /> Tersimpan
            </Badge>
          )}
        </div>

        {retryCount > 0 && (
          <span className="text-xs text-muted-foreground">
            Generate ke-{retryCount + 1}
          </span>
        )}
      </div>

      {/* Negative-feedback chips appear when rating ≤ 3 */}
      {isLowRating && !submitted && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-xs text-muted-foreground">Apa yang kurang? (boleh pilih lebih dari 1)</p>
          <div className="flex flex-wrap gap-1.5">
            {NEGATIVE_REASONS.map((r) => {
              const picked = reasons.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleReason(r)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    picked
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/40'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Komentar tambahan (opsional)"
            maxLength={300}
            rows={2}
            className="w-full text-xs p-2 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        {rating !== null && !submitted && (
          <Button onClick={handleSubmit} size="sm" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Kirim rating'}
          </Button>
        )}
        {isLowRating && (
          <Button
            onClick={onRegenerate}
            size="sm"
            variant="default"
            disabled={regenerateDisabled}
            className="bg-primary"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1.5" />
            Generate ulang (gratis)
          </Button>
        )}
      </div>
    </div>
  );
};

export default ResultRating;
