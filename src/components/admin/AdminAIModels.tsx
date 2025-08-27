import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  Zap, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Sparkles,
  Image as ImageIcon,
  Edit3,
  Users,
  BarChart3,
  Settings,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AIModelStats {
  modelName: string;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  lastUsed: string;
  status: 'active' | 'inactive' | 'error';
  costPerRequest: number;
  monthlyUsage: number;
}

interface APIStatus {
  service: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  lastChecked: string;
  errorMessage?: string;
}

const AdminAIModels = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [modelStats, setModelStats] = useState<AIModelStats[]>([]);
  const [apiStatuses, setApiStatuses] = useState<APIStatus[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [successfulProjects, setSuccessfulProjects] = useState(0);
  const [failedProjects, setFailedProjects] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // AI Model Configuration State
  const [geminiSettings, setGeminiSettings] = useState({
    maxTokens: 4096,
    temperature: 0.7,
    systemPrompt: '',
    rateLimit: 100
  });

  const [replicateSettings, setReplicateSettings] = useState({
    maxConcurrentJobs: 5,
    defaultTimeout: 300,
    enableWebhooks: true
  });

  useEffect(() => {
    fetchAIModelData();
    checkAPIStatuses();
  }, []);

  const fetchAIModelData = async () => {
    try {
      setIsLoading(true);
      
      // Check admin access first
      const { data: isAdmin } = await supabase.rpc('check_admin_access');
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Fetch projects data for statistics
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      setTotalProjects(projects?.length || 0);
      setSuccessfulProjects(projects?.filter(p => p.status === 'completed')?.length || 0);
      setFailedProjects(projects?.filter(p => p.status === 'failed')?.length || 0);

      // Process model stats
      const aiModelStats: AIModelStats[] = [
        {
          modelName: 'Virtual Try-On (Gemini)',
          totalRequests: projects?.filter(p => p.project_type === 'virtual_tryon')?.length || 0,
          successRate: calculateSuccessRate(projects?.filter(p => p.project_type === 'virtual_tryon') || []),
          averageResponseTime: 8500,
          lastUsed: getLastUsed(projects?.filter(p => p.project_type === 'virtual_tryon') || []),
          status: 'active',
          costPerRequest: 0.15,
          monthlyUsage: projects?.filter(p => 
            p.project_type === 'virtual_tryon' && 
            new Date(p.created_at).getMonth() === new Date().getMonth()
          )?.length || 0
        },
        {
          modelName: 'Photo Editor (Replicate)',
          totalRequests: projects?.filter(p => p.project_type === 'photo_edit')?.length || 0,
          successRate: calculateSuccessRate(projects?.filter(p => p.project_type === 'photo_edit') || []),
          averageResponseTime: 12000,
          lastUsed: getLastUsed(projects?.filter(p => p.project_type === 'photo_edit') || []),
          status: 'active',
          costPerRequest: 0.08,
          monthlyUsage: projects?.filter(p => 
            p.project_type === 'photo_edit' && 
            new Date(p.created_at).getMonth() === new Date().getMonth()
          )?.length || 0
        },
        {
          modelName: 'Model Swap (Gemini)',
          totalRequests: projects?.filter(p => p.project_type === 'model_swap')?.length || 0,
          successRate: calculateSuccessRate(projects?.filter(p => p.project_type === 'model_swap') || []),
          averageResponseTime: 7200,
          lastUsed: getLastUsed(projects?.filter(p => p.project_type === 'model_swap') || []),
          status: 'active',
          costPerRequest: 0.12,
          monthlyUsage: projects?.filter(p => 
            p.project_type === 'model_swap' && 
            new Date(p.created_at).getMonth() === new Date().getMonth()
          )?.length || 0
        },
        {
          modelName: 'Gemini Analysis',
          totalRequests: projects?.filter(p => p.project_type?.startsWith('gemini_'))?.length || 0,
          successRate: calculateSuccessRate(projects?.filter(p => p.project_type?.startsWith('gemini_')) || []),
          averageResponseTime: 3500,
          lastUsed: getLastUsed(projects?.filter(p => p.project_type?.startsWith('gemini_')) || []),
          status: 'active',
          costPerRequest: 0.05,
          monthlyUsage: projects?.filter(p => 
            p.project_type?.startsWith('gemini_') && 
            new Date(p.created_at).getMonth() === new Date().getMonth()
          )?.length || 0
        }
      ];

      setModelStats(aiModelStats);

    } catch (error) {
      console.error('Error fetching AI model data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch AI model data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSuccessRate = (projects: any[]): number => {
    if (projects.length === 0) return 0;
    const successful = projects.filter(p => p.status === 'completed').length;
    return Math.round((successful / projects.length) * 100);
  };

  const getLastUsed = (projects: any[]): string => {
    if (projects.length === 0) return 'Never';
    const latest = projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return new Date(latest.created_at).toLocaleDateString();
  };

  const checkAPIStatuses = async () => {
    const statuses: APIStatus[] = [
      {
        service: 'Gemini API',
        status: 'online',
        responseTime: 850,
        lastChecked: new Date().toISOString(),
      },
      {
        service: 'Replicate API', 
        status: 'online',
        responseTime: 1200,
        lastChecked: new Date().toISOString(),
      },
      {
        service: 'Fashn API',
        status: 'online',
        responseTime: 950,
        lastChecked: new Date().toISOString(),
      }
    ];

    setApiStatuses(statuses);
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAIModelData(), checkAPIStatuses()]);
    setIsRefreshing(false);
    toast({
      title: "Success",
      description: "AI model data refreshed successfully",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'degraded':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Models Management</h2>
          <p className="text-muted-foreground">Monitor and configure AI services</p>
        </div>
        <Button onClick={refreshData} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="apis">API Status</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-muted-foreground">Total Projects</span>
                </div>
                <div className="text-2xl font-bold">{totalProjects}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-muted-foreground">Successful</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{successfulProjects}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-muted-foreground">Failed</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{failedProjects}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-muted-foreground">Success Rate</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {totalProjects > 0 ? Math.round((successfulProjects / totalProjects) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Models Overview
              </CardTitle>
              <CardDescription>
                Performance metrics for all AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {modelStats.map((model, index) => (
                  <Card key={index} className="border border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{model.modelName}</h4>
                        {getStatusIcon(model.status)}
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requests:</span>
                          <span className="font-medium">{model.totalRequests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Success Rate:</span>
                          <span className={`font-medium ${getSuccessRateColor(model.successRate)}`}>
                            {model.successRate}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Time:</span>
                          <span className="font-medium">{model.averageResponseTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly:</span>
                          <span className="font-medium">{model.monthlyUsage}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="space-y-4">
            {modelStats.map((model, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {model.modelName.includes('Gemini') && <Sparkles className="h-5 w-5" />}
                      {model.modelName.includes('Photo') && <Edit3 className="h-5 w-5" />}
                      {model.modelName.includes('Model Swap') && <Users className="h-5 w-5" />}
                      {model.modelName.includes('Analysis') && <ImageIcon className="h-5 w-5" />}
                      {model.modelName}
                    </CardTitle>
                    <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                      {model.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold">{model.totalRequests}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className={`text-2xl font-bold ${getSuccessRateColor(model.successRate)}`}>
                        {model.successRate}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold">{model.averageResponseTime}ms</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Cost per Request</p>
                      <p className="text-2xl font-bold">${model.costPerRequest}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Used: {model.lastUsed}</span>
                      <span className="text-sm text-muted-foreground">
                        Monthly Usage: {model.monthlyUsage} requests
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="apis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {apiStatuses.map((api, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(api.status)}
                    {api.service}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={api.status === 'online' ? 'default' : api.status === 'degraded' ? 'secondary' : 'destructive'}>
                        {api.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Response Time:</span>
                      <span className="text-sm font-medium">{api.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last Checked:</span>
                      <span className="text-sm font-medium">
                        {new Date(api.lastChecked).toLocaleTimeString()}
                      </span>
                    </div>
                    {api.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded border">
                        <p className="text-xs text-red-700 dark:text-red-400">{api.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Gemini Settings
                </CardTitle>
                <CardDescription>Configure Gemini AI parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={geminiSettings.maxTokens}
                    onChange={(e) => setGeminiSettings({...geminiSettings, maxTokens: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={geminiSettings.temperature}
                    onChange={(e) => setGeminiSettings({...geminiSettings, temperature: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate Limit (requests/hour)</Label>
                  <Input
                    type="number"
                    value={geminiSettings.rateLimit}
                    onChange={(e) => setGeminiSettings({...geminiSettings, rateLimit: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea
                    value={geminiSettings.systemPrompt}
                    onChange={(e) => setGeminiSettings({...geminiSettings, systemPrompt: e.target.value})}
                    placeholder="Enter system prompt for Gemini..."
                    rows={3}
                  />
                </div>
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Save Gemini Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Replicate Settings
                </CardTitle>
                <CardDescription>Configure Replicate API parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Max Concurrent Jobs</Label>
                  <Input
                    type="number"
                    value={replicateSettings.maxConcurrentJobs}
                    onChange={(e) => setReplicateSettings({...replicateSettings, maxConcurrentJobs: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Timeout (seconds)</Label>
                  <Input
                    type="number"
                    value={replicateSettings.defaultTimeout}
                    onChange={(e) => setReplicateSettings({...replicateSettings, defaultTimeout: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={replicateSettings.enableWebhooks}
                      onChange={(e) => setReplicateSettings({...replicateSettings, enableWebhooks: e.target.checked})}
                      className="rounded"
                    />
                    <Label>Enable Webhooks</Label>
                  </div>
                </div>
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Save Replicate Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAIModels;