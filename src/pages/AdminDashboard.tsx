import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  Shield
} from 'lucide-react';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import AdminProjectMonitoring from '@/components/admin/AdminProjectMonitoring';
import AdminSystemHealth from '@/components/admin/AdminSystemHealth';
import AdminRoleManager from '@/components/admin/AdminRoleManager';
import AdminAIModelManagement from '@/components/admin/AdminAIModelManagement';
import AdminAIModels from '@/components/admin/AdminAIModels';

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('AdminDashboard: Component mounted');
    checkAuthAndAdmin();
  }, []);

  const checkAuthAndAdmin = async () => {
    try {
      console.log('AdminDashboard: Checking authentication...');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('AdminDashboard: Session error:', sessionError);
        navigate('/auth');
        return;
      }

      if (!session?.user) {
        console.log('AdminDashboard: No user session, redirecting to auth');
        navigate('/auth');
        return;
      }

      console.log('AdminDashboard: User authenticated:', session.user.email);
      setUser(session.user);

      // Check admin role
      console.log('AdminDashboard: Checking admin role...');
      const { data: adminCheck, error: adminError } = await supabase.rpc('is_admin');
      
      console.log('AdminDashboard: Admin check result:', { adminCheck, adminError });
      
      if (adminError) {
        console.error('AdminDashboard: Admin check error:', adminError);
        // Try alternative check
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin');
        
        if (!userRoles || userRoles.length === 0) {
          toast({
            title: 'Access Denied',
            description: 'You do not have admin privileges.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }
        setIsAdmin(true);
      } else if (!adminCheck) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      } else {
        setIsAdmin(true);
      }

      console.log('AdminDashboard: Admin access granted');
    } catch (error: any) {
      console.error('AdminDashboard: Error during auth check:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify admin access',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold">Loading Admin Panel...</h2>
          <p className="text-muted-foreground">Verifying your admin privileges</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have admin privileges</p>
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
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
            <AdminOverview />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="projects">
            <AdminProjectMonitoring />
          </TabsContent>

          <TabsContent value="ai-models">
            <AdminAIModels />
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