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

    return () => subscription.unsubscribe();
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              GayaAI
            </h1>
            <span className="text-muted-foreground">Dashboard</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Halo, {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Selamat datang di GayaAI</h2>
          <p className="text-muted-foreground">
            Gunakan AI untuk mengembangkan bisnis fashion Anda
          </p>
        </div>

        <Tabs defaultValue="virtual-tryon" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="virtual-tryon" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Virtual Try-On
            </TabsTrigger>
            <TabsTrigger value="model-swap" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ganti Model
            </TabsTrigger>
            <TabsTrigger value="photo-edit" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Edit Foto
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Riwayat
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Profil
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