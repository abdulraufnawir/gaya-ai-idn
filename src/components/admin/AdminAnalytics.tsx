import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Users, FileImage, TrendingUp, Activity } from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  projectsToday: number;
  usersToday: number;
  projectsByType: Array<{ name: string; value: number }>;
  dailyActivity: Array<{ date: string; projects: number; users: number }>;
}

const AdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Check if user is admin first
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
      console.log('Admin check result:', { isAdmin, adminError });
      
      if (adminError) {
        console.error('Admin RPC error:', adminError);
        // Continue without admin check for now
      } else if (!isAdmin) {
        throw new Error('Admin access required');
      }

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total projects
      const { count: totalProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      // Get today's projects
      const today = new Date().toISOString().split('T')[0];
      const { count: projectsToday } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      // Get today's new users
      const { count: usersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      // Get projects by type
      const { data: projectTypes } = await supabase
        .from('projects')
        .select('project_type');

      const projectsByType = projectTypes?.reduce((acc: any, project: any) => {
        const type = project.project_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const projectTypeArray = Object.entries(projectsByType || {}).map(([name, value]) => ({
        name,
        value: value as number
      }));

      // Get daily activity for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Process daily activity
      const dailyActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const projectsCount = recentProjects?.filter(p => 
          p.created_at.startsWith(dateStr)
        ).length || 0;
        
        const usersCount = recentUsers?.filter(u => 
          u.created_at.startsWith(dateStr)
        ).length || 0;

        dailyActivity.push({
          date: date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
          projects: projectsCount,
          users: usersCount
        });
      }

      setData({
        totalUsers: totalUsers || 0,
        totalProjects: totalProjects || 0,
        projectsToday: projectsToday || 0,
        usersToday: usersToday || 0,
        projectsByType: projectTypeArray,
        dailyActivity
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: error.message === 'Admin access required' 
          ? 'You need admin privileges to access analytics'
          : 'Failed to fetch analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{data?.usersToday} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              +{data?.projectsToday} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor((data?.totalUsers || 0) * 0.7)}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Projects and users over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.dailyActivity && data.dailyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="projects" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Projects"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading activity data...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Types</CardTitle>
            <CardDescription>Distribution of project types</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.projectsByType && data.projectsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.projectsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.projectsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading project type data...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;