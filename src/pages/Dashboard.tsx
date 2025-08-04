import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Upload, Sparkles, Users, Edit3, LogOut, User as UserIcon } from 'lucide-react';
import VirtualTryOn from '@/components/VirtualTryOn';
import ModelSwap from '@/components/ModelSwap';
import PhotoEditor from '@/components/PhotoEditor';
import ProjectHistory from '@/components/ProjectHistory';
import UserProfile from '@/components/UserProfile';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('virtual-tryon');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate('/auth');
      }
    });

    // Listen for custom event to switch to model tab
    const handleSwitchToModelTab = () => {
      setActiveTab('model-swap');
    };

    window.addEventListener('switchToModelTab', handleSwitchToModelTab);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('switchToModelTab', handleSwitchToModelTab);
    };
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                GayaAI
              </h1>
              <span className="hidden sm:inline text-sm text-muted-foreground">Dashboard</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[150px] md:max-w-none">
                Halo, {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-3">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-1">Selamat datang di GayaAI</h2>
          <p className="text-sm text-muted-foreground">
            Gunakan AI untuk mengembangkan bisnis fashion Anda
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4 h-auto">
            <TabsTrigger value="virtual-tryon" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Upload className="h-4 w-4" />
              <span className="text-center">Virtual Try-On</span>
            </TabsTrigger>
            <TabsTrigger value="model-swap" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="text-center">Ganti Model</span>
            </TabsTrigger>
            <TabsTrigger value="photo-edit" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Edit3 className="h-4 w-4" />
              <span className="text-center">Edit Foto</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Sparkles className="h-4 w-4" />
              <span className="text-center">Riwayat</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <UserIcon className="h-4 w-4" />
              <span className="text-center">Profil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="virtual-tryon">
            <VirtualTryOn userId={user.id} />
          </TabsContent>

          <TabsContent value="model-swap">
            <ModelSwap userId={user.id} />
          </TabsContent>

          <TabsContent value="photo-edit">
            <PhotoEditor userId={user.id} />
          </TabsContent>

          <TabsContent value="history">
            <ProjectHistory userId={user.id} />
          </TabsContent>

          <TabsContent value="profile">
            <UserProfile user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;