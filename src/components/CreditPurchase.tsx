import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Crown, Sparkles, Zap, Star, Check } from 'lucide-react';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in IDR
  bonus_credits: number;
  popular?: boolean;
  icon: any;
  features: string[];
}

const CreditPurchase = () => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  const creditPackages: CreditPackage[] = [
    {
      id: 'starter',
      name: 'Paket Starter',
      credits: 25,
      price: 49000,
      bonus_credits: 5,
      icon: Coins,
      features: ['25 Kredit + 5 Bonus', 'Berlaku 1 Tahun', 'Virtual Try-On', 'Model Swap']
    },
    {
      id: 'popular',
      name: 'Paket Popular',
      credits: 100,
      price: 149000,
      bonus_credits: 25,
      popular: true,
      icon: Star,
      features: ['100 Kredit + 25 Bonus', 'Berlaku 1 Tahun', 'Semua Fitur AI', 'Priority Support', 'Export HD']
    },
    {
      id: 'pro',
      name: 'Paket Pro',
      credits: 250,
      price: 299000,
      bonus_credits: 75,
      icon: Crown,
      features: ['250 Kredit + 75 Bonus', 'Berlaku 1 Tahun', 'Unlimited AI Features', '24/7 Priority Support', 'API Access', 'Custom Models']
    },
    {
      id: 'enterprise',
      name: 'Paket Enterprise',
      credits: 1000,
      price: 999000,
      bonus_credits: 500,
      icon: Zap,
      features: ['1000 Kredit + 500 Bonus', 'Berlaku 1 Tahun', 'White Label', 'Dedicated Support', 'Custom Integration', 'Bulk Processing']
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasing(true);
    setSelectedPackage(pkg.id);

    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Anda harus login untuk melakukan pembelian');
      }

      // Get user profile for payment details
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', session.user.id)
        .single();

      // Create Midtrans payment
      const response = await supabase.functions.invoke('midtrans-payment', {
        body: {
          packageId: pkg.id,
          packageName: pkg.name,
          credits: pkg.credits + pkg.bonus_credits,
          price: pkg.price,
          userEmail: session.user.email,
          userName: profile?.full_name || 'User'
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Gagal membuat pembayaran');
      }

      const { paymentUrl, orderId } = response.data;

      if (paymentUrl) {
        // Redirect to Midtrans payment page
        window.open(paymentUrl, '_blank');
        
        toast({
          title: 'Pembayaran Dimulai',
          description: 'Silakan selesaikan pembayaran di halaman yang baru dibuka. Kredit akan ditambahkan otomatis setelah pembayaran berhasil.',
        });
      } else {
        throw new Error('URL pembayaran tidak tersedia');
      }

    } catch (error: any) {
      toast({
        title: 'Pembelian Gagal',
        description: error.message || 'Terjadi kesalahan saat memproses pembayaran',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Beli Kredit AI</h2>
        <p className="text-muted-foreground">
          Pilih paket kredit yang sesuai dengan kebutuhan bisnis fashion Anda
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {creditPackages.map((pkg) => {
          const IconComponent = pkg.icon;
          const isSelected = selectedPackage === pkg.id;
          const isPurchasing = purchasing && isSelected;
          
          return (
            <Card 
              key={pkg.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                pkg.popular ? 'border-primary ring-2 ring-primary/20' : ''
              } ${isSelected ? 'scale-105 shadow-xl' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Terpopuler
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-3">
                <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <CardDescription className="text-xs">
                  {pkg.credits} + {pkg.bonus_credits} kredit bonus
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatPrice(pkg.price)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ~{Math.round(pkg.price / (pkg.credits + pkg.bonus_credits)).toLocaleString()} per kredit
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {pkg.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing}
                  variant={pkg.popular ? 'default' : 'outline'}
                >
                  {isPurchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4 mr-2" />
                      Beli Sekarang
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-2">Info Penting</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Semua kredit berlaku selama 1 tahun dari tanggal pembelian</p>
              <p>• Kredit dapat digunakan untuk semua fitur AI BUSANA</p>
              <p>• Pembayaran aman dengan Midtrans Payment Gateway</p>
              <p>• Dapatkan invoice resmi untuk keperluan bisnis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditPurchase;