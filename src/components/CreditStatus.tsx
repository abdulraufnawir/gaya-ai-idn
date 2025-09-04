import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCredits } from '@/hooks/useCredits';
import { Coins, Zap, RefreshCw } from 'lucide-react';

interface CreditStatusProps {
  userId: string;
}

const CreditStatus = ({ userId }: CreditStatusProps) => {
  const { checkBalance, initializeCredits, loading } = useCredits();
  const [balance, setBalance] = useState<any>(null);
  const [hasCredits, setHasCredits] = useState<boolean | null>(null);

  const loadBalance = async () => {
    const result = await checkBalance();
    setBalance(result);
    setHasCredits(result !== null);
  };

  useEffect(() => {
    loadBalance();
  }, [userId]);

  const handleInitializeCredits = async () => {
    const success = await initializeCredits();
    if (success) {
      await loadBalance(); // Refresh balance after initialization
    }
  };

  if (hasCredits === null) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Mengecek status kredit...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasCredits || !balance) {
    return (
      <Card className="w-full border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Aktivasi Kredit Diperlukan
          </CardTitle>
          <CardDescription>
            Akun Anda belum diaktifkan. Klik tombol di bawah untuk mendapatkan 5 kredit gratis!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleInitializeCredits} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Mengaktifkan...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Aktifkan Kredit Gratis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Status Kredit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Saldo Kredit:</span>
          <Badge variant="secondary" className="text-lg font-bold">
            {balance.credits_balance} Kredit
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Kredit Gratis:</span>
            <p className="font-medium">{balance.free_credits}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Digunakan:</span>
            <p className="font-medium">{balance.total_used}</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadBalance} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Perbarui Saldo
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreditStatus;