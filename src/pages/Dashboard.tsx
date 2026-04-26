import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { User } from '@supabase/supabase-js';
import {
  Shirt,
  UserSquare2,
  Wand2,
  LogOut,
  User as UserIcon,
  FlaskConical,
  History,
  Plus,
  HelpCircle,
} from 'lucide-react';
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
import CreditPill from '@/components/CreditPill';
import ContentStudio from '@/components/product/ContentStudio';
import OnboardingQuickStart from '@/components/OnboardingQuickStart';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('studio');
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const showHelp = () => {
    // Re-enable onboarding even if previously dismissed
    localStorage.removeItem('busana_onboarding_dismissed');
    setForceOnboarding(true);
    // Scroll to top so user sees the panel
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
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

    const handleSwitchToModelTab = () => {
      setActiveTab('model-swap');
    };

    const handleSelectModelForTryOn = (event: any) => {
      setActiveTab('studio');
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

  // Greeting helper
  const greetingName = (user.email?.split('@')[0] ?? 'kamu').split(/[._-]/)[0];
  const initials = greetingName.slice(0, 2).toUpperCase();

  // Create — alur produksi konten fashion
  const createItems = [
    { id: 'studio', label: 'On-Model Try-On', icon: Shirt, desc: 'Foto produk → on-model' },
    { id: 'model-swap', label: 'Model Library', icon: UserSquare2, desc: 'Ganti model & pose' },
    { id: 'photo-edit', label: 'Editorial Edit', icon: Wand2, desc: 'Background & retouch' },
    { id: 'produk', label: 'Konten Produk', icon: FlaskConical, desc: 'Multi-kategori (Beta)', beta: true },
  ];

  // Workspace — riwayat
  const libraryItems = [
    { id: 'history', label: 'Hasil Saya', icon: History },
  ];

  // Akun
  const accountItems = [
    { id: 'profile', label: 'Akun & Kredit', icon: UserIcon },
  ];

  // Mobile bottom nav — 5 slot, semua aksi produksi + galeri
  const mobileItems = [
    { id: 'studio', label: 'Try-On', icon: Shirt },
    { id: 'model-swap', label: 'Model', icon: UserSquare2 },
    { id: 'photo-edit', label: 'Edit', icon: Wand2 },
    { id: 'produk', label: 'Produk', icon: FlaskConical },
    { id: 'history', label: 'Galeri', icon: History },
  ];

  // Avatar/profile dropdown — reused on mobile + desktop header
  const ProfileMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-1 ring-border hover:ring-primary/40 transition-all"
          aria-label="Menu akun"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Halo, {greetingName}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setActiveTab('profile')}>
          <UserIcon className="h-4 w-4 mr-2" />
          Akun & Kredit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isMobile) {
    // Mobile Layout
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Header — logo + credit pill + avatar */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-base font-bold bg-gradient-primary bg-clip-text text-transparent shrink-0">
                BUSANA.AI
              </h1>
              <div className="flex items-center gap-1.5">
                <CreditPill userId={user.id} onClick={() => setActiveTab('profile')} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={showHelp}
                  aria-label="Panduan singkat"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
                <AdminAccess />
                <ProfileMenu />
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-3">
          {/* Primary CTA — context-aware (only when not already on Try-On) */}
          {activeTab !== 'studio' && (
            <Button
              onClick={() => setActiveTab('studio')}
              className="w-full mb-3 rounded-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Mulai Try-On Baru
            </Button>
          )}

          <OnboardingQuickStart
            userId={user.id}
            onSelectStep={setActiveTab}
            forceShow={forceOnboarding}
            onDismiss={() => setForceOnboarding(false)}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="pb-20">
              <TabsContent value="studio">
                <Studio userId={user.id} />
              </TabsContent>
              <TabsContent value="produk">
                <ContentStudio userId={user.id} />
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

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
              <TabsList className="grid w-full grid-cols-5 h-16 bg-transparent rounded-none border-none p-0">
                {mobileItems.map((item) => (
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

  // Desktop Layout
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Sidebar className="w-64">
          <SidebarContent>
            <div className="p-4 border-b">
              <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                BUSANA.AI
              </h1>
            </div>

            {/* Create */}
            <SidebarGroup>
              <SidebarGroupLabel>Create</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {createItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        isActive={activeTab === item.id}
                        tooltip={item.desc}
                        className="w-full justify-start"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.beta && (
                          <span className="ml-auto text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            Beta
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Workspace */}
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {libraryItems.map((item) => (
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

            {/* Akun */}
            <SidebarGroup>
              <SidebarGroupLabel>Akun</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountItems.map((item) => (
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

            {/* Footer — credit pill + admin */}
            <div className="mt-auto p-4 border-t space-y-3">
              <CreditPill
                userId={user.id}
                onClick={() => setActiveTab('profile')}
                className="w-full justify-center"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
                <AdminAccess />
              </div>
            </div>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <h2 className="font-semibold">Dashboard</h2>
            </div>
            <div className="flex items-center gap-3">
              {activeTab !== 'studio' && (
                <Button
                  size="sm"
                  onClick={() => setActiveTab('studio')}
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Mulai Try-On
                </Button>
              )}
              <ProfileMenu />
            </div>
          </header>

          <div className="flex-1 p-6">
            <OnboardingQuickStart userId={user.id} onSelectStep={setActiveTab} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="studio">
                <Studio userId={user.id} />
              </TabsContent>
              <TabsContent value="produk">
                <ContentStudio userId={user.id} />
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
