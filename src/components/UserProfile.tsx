import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { User as UserIcon, Save, Building, CreditCard, Crown, Coins, Calendar, TrendingUp, ShoppingCart } from 'lucide-react';
import CreditPurchase from './CreditPurchase';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  business_name: string | null;
  business_type: string | null;
}

interface UserCredits {
  credits_balance: number;
  total_purchased: number;
  total_used: number;
  free_credits: number;
}

interface UserSubscription {
  plan_type: string;
  status: string;
  credits_per_month: number;
  monthly_price: number;
  subscription_start: string;
  subscription_end: string | null;
  auto_renew: boolean;
}

interface CreditTransaction {
  id: string;
  transaction_type: string;
  credits_amount: number;
  description: string;
  created_at: string;
  expires_at: string | null;
}

interface UserProfileProps {
  user: User;
}

const UserProfile = ({ user }: UserProfileProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    business_name: '',
    business_type: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchCreditsAndBilling();
  }, [user.id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          business_name: data.business_name || '',
          business_type: data.business_type || '',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchCreditsAndBilling = async () => {
    try {
      // Fetch credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creditsError && creditsError.code !== 'PGRST116') throw creditsError;
      setCredits(creditsData);

      // Fetch subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') throw subscriptionError;
      setSubscription(subscriptionData);

      // Fetch recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

    } catch (error: any) {
      toast({
        title: 'Error memuat data billing',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshCredits = async () => {
    setRefreshing(true);
    await fetchCreditsAndBilling();
    setRefreshing(false);
    toast({
      title: 'Berhasil',
      description: 'Data kredit berhasil diperbarui',
    });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const updateData = {
        user_id: user.id,
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (profile) {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert(updateData);

        if (error) throw error;
      }

      toast({
        title: 'Berhasil',
        description: 'Profil berhasil diperbarui',
      });

      fetchProfile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case 'free': return 'bg-gray-500';
      case 'basic': return 'bg-blue-500';
      case 'premium': return 'bg-purple-500';
      case 'enterprise': return 'bg-gold-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Tabs defaultValue="credits" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="credits" className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Kredit & Billing
        </TabsTrigger>
        <TabsTrigger value="purchase" className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Beli Kredit
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" />
          Profil
        </TabsTrigger>
      </TabsList>

      <TabsContent value="credits" className="space-y-6">
        {/* Billing & Credits Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-primary" />
                Sisa Kredit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">
                {credits?.credits_balance || 0}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Total digunakan: {credits?.total_used || 0}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshCredits}
                disabled={refreshing}
                className="w-full"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Memperbarui...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Refresh Kredit
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-primary" />
                Paket Saat Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getPlanBadgeColor(subscription?.plan_type || 'free')} text-white`}>
                  {subscription?.plan_type?.toUpperCase() || 'FREE'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {subscription?.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                </Badge>
              </div>
              <div className="text-lg font-semibold mb-1">
                {subscription?.monthly_price ? formatCurrency(subscription.monthly_price / 100) : 'Gratis'}
                <span className="text-sm font-normal text-muted-foreground">/bulan</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {subscription?.credits_per_month || 5} kredit per bulan
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Status Berlangganan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription?.subscription_end ? (
                <>
                  <div className="text-sm text-muted-foreground mb-1">Berakhir pada:</div>
                  <div className="font-semibold mb-2">
                    {formatDate(subscription.subscription_end)}
                  </div>
                  <Badge variant={subscription.auto_renew ? 'default' : 'secondary'} className="text-xs">
                    {subscription.auto_renew ? 'Auto-Perpanjang' : 'Manual'}
                  </Badge>
                </>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mb-1">Dimulai:</div>
                  <div className="font-semibold">
                    {subscription?.subscription_start ? formatDate(subscription.subscription_start) : 'N/A'}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Riwayat Transaksi Kredit
            </CardTitle>
            <CardDescription>
              10 transaksi terbaru untuk akun Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {transaction.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(transaction.created_at)}
                        {transaction.expires_at && (
                          <span className="ml-2">• Kadaluarsa: {formatDate(transaction.expires_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        transaction.transaction_type === 'usage' ? 'destructive' :
                        transaction.transaction_type === 'purchase' ? 'default' :
                        transaction.transaction_type === 'free' ? 'secondary' : 'outline'
                      }>
                        {transaction.transaction_type === 'usage' ? 'Digunakan' :
                         transaction.transaction_type === 'purchase' ? 'Pembelian' :
                         transaction.transaction_type === 'free' ? 'Gratis' :
                         transaction.transaction_type === 'expired' ? 'Kadaluarsa' : transaction.transaction_type}
                      </Badge>
                      <div className={`font-semibold ${
                        transaction.credits_amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.credits_amount > 0 ? '+' : ''}{transaction.credits_amount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada transaksi kredit
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="purchase">
        <CreditPurchase />
      </TabsContent>

      <TabsContent value="profile">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Profil Pengguna
            </CardTitle>
            <CardDescription>
              Kelola informasi profil dan bisnis Anda
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contoh: +62812345678"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-4 w-4" />
                <Label className="text-base font-semibold">Informasi Bisnis</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_name">Nama Bisnis</Label>
                <Input
                  id="business_name"
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Contoh: Toko Fashion Cantik"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_type">Jenis Bisnis</Label>
                <Select 
                  value={formData.business_type} 
                  onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis bisnis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fashion_retail">Fashion Retail</SelectItem>
                    <SelectItem value="online_shop">Toko Online</SelectItem>
                    <SelectItem value="boutique">Boutique</SelectItem>
                    <SelectItem value="wholesaler">Grosir</SelectItem>
                    <SelectItem value="clothing_brand">Brand Pakaian</SelectItem>
                    <SelectItem value="marketplace_seller">Seller Marketplace</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Profil
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      </TabsContent>
    </Tabs>
  );
};

export default UserProfile;