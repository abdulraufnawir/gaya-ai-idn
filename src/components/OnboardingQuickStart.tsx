import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Shirt, UserSquare2, Wand2, ArrowRight, Sparkles, X } from 'lucide-react';

interface OnboardingQuickStartProps {
  userId: string;
  onSelectStep: (tabId: string) => void;
}

const STORAGE_KEY = 'busana_onboarding_dismissed';

const steps = [
  {
    id: 'studio',
    num: '01',
    title: 'Pilih model',
    desc: 'Gunakan Model Library lokal — beragam etnis & hijab — atau upload model sendiri.',
    icon: UserSquare2,
    cta: 'Lihat Model Library',
    target: 'model-swap',
  },
  {
    id: 'try-on',
    num: '02',
    title: 'Upload baju',
    desc: 'Foto flatlay, hanging, atau di mannequin. AI akan pasangkan ke model dalam ~60 detik.',
    icon: Shirt,
    cta: 'Mulai Try-On',
    target: 'studio',
  },
  {
    id: 'edit',
    num: '03',
    title: 'Polish editorial',
    desc: 'Ganti background, retouch, dan auto-crop sesuai format Shopee, Tokopedia, IG, TikTok.',
    icon: Wand2,
    cta: 'Buka Editor',
    target: 'photo-edit',
  },
];

const OnboardingQuickStart = ({ userId, onSelectStep }: OnboardingQuickStartProps) => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === '1') {
      setLoading(false);
      return;
    }

    // Tampilkan jika user belum punya project sama sekali
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => {
        setShow((count ?? 0) === 0);
        setLoading(false);
      });
  }, [userId]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  if (loading || !show) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
      <button
        onClick={dismiss}
        aria-label="Tutup panduan"
        className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors z-10"
      >
        <X className="h-4 w-4" />
      </button>

      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Mulai dari sini
          </span>
        </div>
        <h3 className="text-xl font-bold mb-1">Buat foto fashion pertamamu — 3 langkah</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Estimasi 2 menit. Tidak perlu studio, tidak perlu model fee.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.target)}
              className="text-left p-4 rounded-lg border border-border bg-background hover:border-primary/40 hover:shadow-warm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-mono font-semibold text-muted-foreground">
                  {step.num}
                </span>
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {step.desc}
              </p>
              <span className="text-xs font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                {step.cta}
                <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button size="sm" onClick={() => onSelectStep('studio')} className="rounded-full">
            Mulai Sekarang
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Lewati panduan
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingQuickStart;
