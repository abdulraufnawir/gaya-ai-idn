import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { User } from '@supabase/supabase-js';
import { Upload, Sparkles, Users, Edit3, LogOut, User as UserIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import Studio from '@/components/Studio';
import ModelSwap from '@/components/ModelSwap';
import PhotoEditor from '@/components/PhotoEditor';
import ProjectHistory from '@/components/ProjectHistory';
import UserProfile from '@/components/UserProfile';
import AdminAccess from '@/components/AdminAccess';
import CreditStatus from '@/components/CreditStatus';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('studio');
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

    // Listen for model selection event to switch to studio
    const handleSelectModelForTryOn = (event: any) => {
      setActiveTab('studio');
      // Dispatch the model data to VirtualTryOn component
      const virtualTryOnEvent = new CustomEvent('setSelectedModel', {
        detail: { model: event.detail.model }
      });
      window.dispatchEvent(virtualTryOnEvent);
    };

    window.addEventListener('switchToModelTab', handleSwitchToModelTab);
    window.addEventListener('selectModelForTryOn', handleSelectModelForTryOn);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('switchToModelTab', handleSwitchToModelTab);
      window.removeEventListener('selectModelForTryOn', handleSelectModelForTryOn);
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

  const menuItems = [
    { id: 'studio', label: 'Studio', icon: Upload },
    { id: 'model-swap', label: 'Ganti Model', icon: Users },
    { id: 'photo-edit', label: 'Edit Foto', icon: Edit3 },
    { id: 'history', label: 'Riwayat', icon: Sparkles },
    { id: 'profile', label: 'Profil', icon: UserIcon },
  ];

  if (isMobile) {
    // Mobile Layout - Bottom Navigation
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  BUSANA.AI
                </h1>
                <span className="text-sm text-muted-foreground">Dashboard</span>
              </div>
              <div className="flex items-center space-x-3">
                <AdminAccess />
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-3">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-1">Selamat datang di BUSANA.AI</h2>
            <p className="text-sm text-muted-foreground">
              Gunakan AI untuk mengembangkan bisnis fashion Anda
            </p>
          </div>

          {/* Credit Status - Mobile */}
          <div className="mb-4">
            <CreditStatus userId={user.id} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Content area with bottom padding for fixed nav */}
            <div className="pb-20">
              <TabsContent value="studio">
                <Studio userId={user.id} />
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
            </div>

            {/* Bottom Navigation - Mobile */}
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
              <TabsList className="grid w-full grid-cols-5 h-16 bg-transparent rounded-none border-none p-0">
                {menuItems.map((item) => (
                  <TabsTrigger 
                    key={item.id}
                    value={item.id}
                    className="flex flex-col items-center justify-center gap-1 p-2 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none border-none h-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-[10px] leading-tight">{item.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  // Desktop Layout - Sidebar Navigation
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Sidebar */}
        <Sidebar className="w-64">
          <SidebarContent>
            {/* Logo in Sidebar */}
            <div className="p-4 border-b">
              <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                BUSANA.AI
              </h1>
            </div>

            {/* Navigation Menu */}
            <SidebarGroup>
              <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        isActive={activeTab === item.id}
                        className="w-full justify-start"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* User Actions */}
            <div className="mt-auto p-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground truncate">
                  {user.email}
                </span>
                <AdminAccess />
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Dashboard</h2>
            </div>
          </header>

          <div className="flex-1 p-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Selamat datang di BUSANA.AI</h2>
            <p className="text-muted-foreground">
              Gunakan AI untuk mengembangkan bisnis fashion Anda
            </p>
          </div>

          {/* Credit Status - Desktop */}
          <div className="mb-6">
            <CreditStatus userId={user.id} />
          </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="studio">
                <Studio userId={user.id} />
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;