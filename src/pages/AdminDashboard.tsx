import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { 
  Users, 
  BarChart3, 
  Settings, 
  FileImage, 
  LogOut, 
  Activity,
  TrendingUp,
  Database,
  Shield
} from 'lucide-react';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import AdminProjectMonitoring from '@/components/admin/AdminProjectMonitoring';
import AdminSystemHealth from '@/components/admin/AdminSystemHealth';
import AdminRoleManager from '@/components/admin/AdminRoleManager';
import AdminAIModelManagement from '@/components/admin/AdminAIModelManagement';

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      
      // Check if user has admin role
      const { data: isAdmin } = await supabase.rpc('is_admin');
      
      if (!isAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges. Contact an administrator to get access.',
          variant: 'destructive',
        });
        navigate('/dashboard');
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      // Check if user has admin role
      const { data: isAdmin } = await supabase.rpc('is_admin');
      
      if (!isAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges. Contact an administrator to get access.',
          variant: 'destructive',
        });
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

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
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <span className="hidden sm:inline text-sm text-muted-foreground">GayaAI</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
              <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[150px] md:max-w-none">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor, manage, and analyze your GayaAI application
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="ai-models" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              AI Models
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="projects">
            <AdminProjectMonitoring />
          </TabsContent>

          <TabsContent value="ai-models">
            <AdminAIModelManagement />
          </TabsContent>

          <TabsContent value="roles">
            <AdminRoleManager />
          </TabsContent>

          <TabsContent value="system">
            <AdminSystemHealth />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;