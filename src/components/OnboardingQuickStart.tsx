import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import step1 from '@/assets/onboarding/step-1-flatlay.jpg';
import step2 from '@/assets/onboarding/step-2-onmodel.jpg';
import step3 from '@/assets/onboarding/step-3-editorial.jpg';

interface OnboardingQuickStartProps {
  userId: string;
  onSelectStep: (tabId: string) => void;
  /** When true, ignore localStorage dismissal and the "no projects" check. Used for Help recall. */
  forceShow?: boolean;
  /** Called when user closes (X or "Lewati"). Parent can clear forceShow. */
  onDismiss?: () => void;
}

const STORAGE_KEY = 'busana_onboarding_dismissed';

const steps = [
  {
    id: 'studio',
    num: '01',
    title: 'Pilih model',
    desc: 'Model Library lokal — beragam etnis & hijab — atau upload model sendiri.',
    cta: 'Lihat Model',
    target: 'model-swap',
    img: step2,
    imgAlt: 'Contoh model lokal Indonesia berhijab',
  },
  {
    id: 'try-on',
    num: '02',
    title: 'Upload baju',
    desc: 'Foto flatlay, hanging, atau mannequin. AI pasangkan ke model dalam ~60 detik.',
    cta: 'Mulai Try-On',
    target: 'studio',
    img: step1,
    imgAlt: 'Contoh foto flatlay produk fashion',
  },
  {
    id: 'edit',
    num: '03',
    title: 'Polish editorial',
    desc: 'Ganti background, retouch, & auto-crop untuk Shopee, Tokopedia, IG, TikTok.',
    cta: 'Buka Editor',
    target: 'photo-edit',
    img: step3,
    imgAlt: 'Contoh hasil editorial dengan background lifestyle',
  },
];

const OnboardingQuickStart = ({
  userId,
  onSelectStep,
  forceShow = false,
  onDismiss,
}: OnboardingQuickStartProps) => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (forceShow) {
      setShow(true);
      setLoading(false);
      return;
    }

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === '1') {
      setShow(false);
      setLoading(false);
      return;
    }

    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => {
        setShow((count ?? 0) === 0);
        setLoading(false);
      });
  }, [userId, forceShow]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
    onDismiss?.();
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

      <CardContent className="p-5 md:p-6">
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
              className="text-left rounded-lg border border-border bg-background hover:border-primary/40 hover:shadow-warm transition-all group overflow-hidden flex flex-row md:flex-col"
            >
              {/* Thumbnail — visual proof */}
              <div className="relative shrink-0 w-24 md:w-full aspect-square overflow-hidden bg-muted">
                <img
                  src={step.img}
                  alt={step.imgAlt}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2 left-2 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-background/90 text-foreground border border-border">
                  {step.num}
                </span>
              </div>

              {/* Text */}
              <div className="p-3 md:p-4 flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed line-clamp-3">
                  {step.desc}
                </p>
                <span className="text-xs font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {step.cta}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
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
