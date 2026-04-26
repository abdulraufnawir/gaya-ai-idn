import { useEffect, useState } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Coins, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditPillProps {
  userId: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact credit balance pill for dashboard header.
 * Replaces the oversized CreditStatus card on /dashboard.
 * - Shows balance inline; click → opens Akun & Kredit tab.
 * - If user has no credits row yet, shows "Aktivasi" CTA inline.
 */
const CreditPill = ({ userId, onClick, className }: CreditPillProps) => {
  const { checkBalance, initializeCredits, loading } = useCredits();
  const [balance, setBalance] = useState<any>(null);
  const [hasCredits, setHasCredits] = useState<boolean | null>(null);

  const load = async () => {
    const result = await checkBalance();
    setBalance(result);
    setHasCredits(result !== null);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (hasCredits === null) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground animate-pulse',
          className
        )}
      >
        <Coins className="h-3.5 w-3.5" />
        <span>—</span>
      </div>
    );
  }

  if (!hasCredits || !balance) {
    return (
      <button
        onClick={async () => {
          const ok = await initializeCredits();
          if (ok) await load();
        }}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60',
          className
        )}
      >
        <Zap className="h-3.5 w-3.5" />
        <span>{loading ? 'Mengaktifkan…' : 'Aktifkan kredit'}</span>
      </button>
    );
  }

  const low = (balance.credits_balance ?? 0) <= 3;

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors',
        low
          ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15'
          : 'bg-muted text-foreground border-border hover:bg-muted/70',
        className
      )}
      aria-label={`Saldo ${balance.credits_balance} kredit`}
    >
      <Coins className="h-3.5 w-3.5" />
      <span>{balance.credits_balance} kredit</span>
      {low && <span className="ml-1 text-[10px] uppercase tracking-wide opacity-80">Top-up</span>}
    </button>
  );
};

export default CreditPill;
