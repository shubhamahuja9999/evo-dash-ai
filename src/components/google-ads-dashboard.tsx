import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Users, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  PlayCircle,
  PauseCircle,
  Settings,
  MessageSquare,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Shield,
  Lightbulb,
  Calendar,
  Send,
  Loader2,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import GoogleAdsAPI from '../lib/google-ads-api';

interface KeywordPerformance {
  keyword: string;
  ctr: number;
  conversions: number;
  cost: number;
  impressions: number;
  clicks: number;
}

interface DashboardData {
  accountSummary: {
    accountId: string;
    billingStatus: string;
    todaySpend: number;
    monthSpend: number;
    monthlyBudget: number;
    paymentMethods: number;
    lastChecked: string;
  };
  automation: {
    activeTasks: number;
    totalTasks: number;
    totalSavings: number;
    recentExecutions: any[];
  };
  performance: {
    campaigns: number;
    activeAds: number;
    totalKeywords: number;
    avgCostPerLead: number;
    conversionRate: number;
    qualityScore: number;
  };
  alerts: any[];
  trends: any[];
  recommendations: any[];
  keywordPerformance?: {
    topPerformers: KeywordPerformance[];
    needsAttention: KeywordPerformance[];
  };
}

const GoogleAdsDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Automation states
  const [automationTasks, setAutomationTasks] = useState<any[]>([]);
  const [newTaskDialog, setNewTaskDialog] = useState(false);
  const [newTaskType, setNewTaskType] = useState('');
  const [newTaskSchedule, setNewTaskSchedule] = useState('');

  useEffect(() => {
    fetchDashboardData();
    fetchAutomationTasks();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResult, keywordResult] = await Promise.all([
        GoogleAdsAPI.getDashboardData(selectedTimeframe),
        GoogleAdsAPI.getKeywordPerformance('8936153023', selectedTimeframe)
      ]);

      if (dashboardResult.success && dashboardResult.data) {
        const dashboardData = dashboardResult.data as DashboardData;
        
        // Merge keyword performance data if available
        if (keywordResult.success && keywordResult.data) {
          dashboardData.keywordPerformance = keywordResult.data as {
            topPerformers: KeywordPerformance[];
            needsAttention: KeywordPerformance[];
          };
        }
        
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutomationTasks = async () => {
    try {
      const result = await GoogleAdsAPI.getAutomationTasks();
      if (result.success && result.data) {
        setAutomationTasks((result.data as any).tasks || []);
      }
    } catch (error) {
      console.error('Error fetching automation tasks:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    setChatLoading(true);
    const userMessage = { role: 'user', content: chatMessage, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    const currentMessage = chatMessage;
    setChatMessage('');

    try {
      const result = await GoogleAdsAPI.sendChatMessage(currentMessage);
      if (result.success) {
        const assistantMessage = { 
          role: 'assistant', 
          content: result.message || 'Command executed successfully', 
          data: result.data,
          actions: result.actions || [],
          suggestions: result.suggestions || [],
          timestamp: new Date() 
        };
        setChatHistory(prev => [...prev, assistantMessage]);
        
        // Refresh dashboard if actions were taken
        if (result.actions && result.actions.length > 0) {
          fetchDashboardData();
        }
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const triggerAction = async (action: string, params?: any) => {
    setActionLoading(action);
    const accountId = '8936153023'; // From config
    
    try {
      let result;
      
      switch (action) {
        case 'optimize-bids':
          result = await GoogleAdsAPI.optimizeBids(accountId);
          break;
        case 'find-negative-keywords':
          result = await GoogleAdsAPI.findNegativeKeywords(accountId);
          break;
        case 'add-negative-keywords':
          result = await GoogleAdsAPI.addNegativeKeywords(accountId, params?.keywords || []);
          break;
        case 'daily-optimization':
          result = await GoogleAdsAPI.runDailyOptimization(accountId);
          break;
        case 'check-billing':
          result = await GoogleAdsAPI.getAccountBilling(accountId);
          break;
        case 'fix-payment':
          result = await GoogleAdsAPI.fixPaymentProblems(accountId);
          break;
        default:
          throw new Error('Unknown action');
      }
      
      if (result.success) {
        // Show success message
        const successMessage = { 
          role: 'assistant', 
          content: result.message || `${action} completed successfully!`,
          timestamp: new Date() 
        };
        setChatHistory(prev => [...prev, successMessage]);
        
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        throw new Error(result.error || 'Action failed');
      }
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      const errorMessage = { 
        role: 'assistant', 
        content: `Failed to execute ${action}. Please try again.`,
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setActionLoading(null);
    }
  };

  const createAutomationTask = async () => {
    if (!newTaskType || !newTaskSchedule) return;

    try {
      const result = await GoogleAdsAPI.createAutomationTask({
        name: `${newTaskType.replace(/_/g, ' ')} Task`,
        type: newTaskType,
        accountId: '8936153023',
        schedule: newTaskSchedule,
        isActive: true
      });

      if (result.success) {
        setNewTaskDialog(false);
        setNewTaskType('');
        setNewTaskSchedule('');
        fetchAutomationTasks();
      }
    } catch (error) {
      console.error('Error creating automation task:', error);
    }
  };

  const toggleAutomationTask = async (taskId: string, action: 'pause' | 'resume') => {
    try {
      const result = action === 'pause' 
        ? await GoogleAdsAPI.pauseAutomationTask(taskId)
        : await GoogleAdsAPI.resumeAutomationTask(taskId);

      if (result.success) {
        fetchAutomationTasks();
      }
    } catch (error) {
      console.error(`Error ${action}ing automation task:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            Unable to load dashboard data. Please check your Google Ads connection.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const budgetUtilization = (data.accountSummary.monthSpend / data.accountSummary.monthlyBudget) * 100;
  const dailyBudgetPace = (data.accountSummary.todaySpend / (data.accountSummary.monthlyBudget / 30)) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Google Ads Dashboard</h1>
            <p className="text-gray-600">Complete automation and performance overview</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              AI Assistant
            </Button>
            <Button onClick={fetchDashboardData} className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Account Status Bar */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-3 w-3 rounded-full ${
                  data.accountSummary.billingStatus === 'active' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="font-medium">
                  Account Status: {data.accountSummary.billingStatus.toUpperCase()}
                </span>
                <Badge variant={data.automation.activeTasks > 0 ? "default" : "secondary"}>
                  {data.automation.activeTasks} Active Automations
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Last updated: {new Date(data.accountSummary.lastChecked).toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.accountSummary.todaySpend.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Badge variant={dailyBudgetPace > 120 ? "destructive" : dailyBudgetPace > 80 ? "default" : "secondary"}>
                {dailyBudgetPace.toFixed(0)}% of daily target
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Spend</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.accountSummary.monthSpend.toLocaleString()}</div>
            <Progress value={budgetUtilization} className="mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              ${(data.accountSummary.monthlyBudget - data.accountSummary.monthSpend).toLocaleString()} remaining
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Lead</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.performance.avgCostPerLead.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              12% vs last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Savings</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.automation.totalSavings.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">
              From {data.automation.activeTasks} active automations
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts ({data.alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.alerts.slice(0, 3).map((alert, index) => (
                  <Alert key={index} className={
                    alert.severity === 'CRITICAL' ? 'border-red-500' :
                    alert.severity === 'WARNING' ? 'border-yellow-500' : 'border-blue-500'
                  }>
                    <AlertTitle>{alert.title}</AlertTitle>
                    <AlertDescription>{alert.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spend Trend</CardTitle>
                <CardDescription>Daily spending over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="spend" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Conversion Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress value={data.performance.conversionRate * 100} className="w-20" />
                      <span className="text-sm">{(data.performance.conversionRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Quality Score</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(data.performance.qualityScore / 10) * 100} className="w-20" />
                      <span className="text-sm">{data.performance.qualityScore}/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Active Campaigns</span>
                    <Badge>{data.performance.campaigns}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Keywords</span>
                    <Badge variant="outline">{data.performance.totalKeywords}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Automation Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Active Tasks</span>
                    <Badge>{data.automation.activeTasks}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Savings</span>
                    <span className="font-semibold text-green-600">
                      ${data.automation.totalSavings.toFixed(0)}
                    </span>
                  </div>
                  <Dialog open={newTaskDialog} onOpenChange={setNewTaskDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Automation Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Automation Task</DialogTitle>
                        <DialogDescription>
                          Set up automated optimization for your Google Ads account
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Task Type</label>
                          <Select value={newTaskType} onValueChange={setNewTaskType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select task type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BILLING_CHECK">Daily Billing Check</SelectItem>
                              <SelectItem value="NEGATIVE_KEYWORD_DETECTION">Negative Keyword Detection</SelectItem>
                              <SelectItem value="BID_OPTIMIZATION">Bid Optimization</SelectItem>
                              <SelectItem value="AD_TESTING">Ad Testing</SelectItem>
                              <SelectItem value="SPEND_LIMIT_ENFORCEMENT">Spend Limit Enforcement</SelectItem>
                              <SelectItem value="PERFORMANCE_MONITORING">Performance Monitoring</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Schedule</label>
                          <Select value={newTaskSchedule} onValueChange={setNewTaskSchedule}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select schedule" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0 6 * * *">Daily at 6:00 AM</SelectItem>
                              <SelectItem value="0 8 * * *">Daily at 8:00 AM</SelectItem>
                              <SelectItem value="0 12 * * *">Daily at 12:00 PM</SelectItem>
                              <SelectItem value="*/30 * * * *">Every 30 minutes</SelectItem>
                              <SelectItem value="0 */4 * * *">Every 4 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={createAutomationTask} className="w-full">
                          Create Task
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Automation Tasks</CardTitle>
                <CardDescription>Manage your automated optimization tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {automationTasks.length > 0 ? automationTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          task.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <div>
                          <div className="font-medium text-sm">{task.name}</div>
                          <div className="text-xs text-gray-600">
                            {task.schedule} • {task.type}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAutomationTask(task.id, task.isActive ? 'pause' : 'resume')}
                        >
                          {task.isActive ? (
                            <PauseCircle className="h-4 w-4" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500">No automation tasks yet</p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => setNewTaskDialog(true)}
                      >
                        Create Your First Task
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Keyword Performance</CardTitle>
                <CardDescription>Top and bottom performing keywords</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Top Performers</h4>
                    <div className="space-y-2">
                      {loading ? (
                        // Loading skeleton for top performers
                        Array(3).fill(0).map((_, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded animate-pulse">
                            <div className="space-y-2">
                              <div className="h-4 w-32 bg-gray-200 rounded"></div>
                              <div className="h-3 w-24 bg-gray-200 rounded"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-16 bg-gray-200 rounded"></div>
                              <div className="h-3 w-20 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        ))
                      ) : data.keywordPerformance?.topPerformers.map((keyword, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <div>
                            <span className="text-sm font-medium">{keyword.keyword}</span>
                            <div className="text-xs text-gray-600">
                              {keyword.clicks} clicks • {keyword.conversions} conv.
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{(keyword.ctr * 100).toFixed(1)}% CTR</Badge>
                            <div className="text-xs text-gray-600 mt-1">
                              ${keyword.cost.toFixed(2)} spent
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Needs Attention</h4>
                    <div className="space-y-2">
                      {loading ? (
                        // Loading skeleton for needs attention
                        Array(3).fill(0).map((_, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded animate-pulse">
                            <div className="space-y-2">
                              <div className="h-4 w-32 bg-gray-200 rounded"></div>
                              <div className="h-3 w-24 bg-gray-200 rounded"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-16 bg-gray-200 rounded"></div>
                              <div className="h-3 w-20 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        ))
                      ) : data.keywordPerformance?.needsAttention.map((keyword, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <div>
                            <span className="text-sm font-medium">{keyword.keyword}</span>
                            <div className="text-xs text-gray-600">
                              {keyword.clicks} clicks • {keyword.conversions} conv.
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">{(keyword.ctr * 100).toFixed(1)}% CTR</Badge>
                            <div className="text-xs text-gray-600 mt-1">
                              ${keyword.cost.toFixed(2)} spent
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Negative Keywords</CardTitle>
                <CardDescription>Recently added negative keywords</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { keyword: 'free', reason: 'No budget searchers', savings: 150 },
                    { keyword: 'jobs', reason: 'Career seekers', savings: 89 },
                    { keyword: 'cheap', reason: 'Low-quality leads', savings: 203 }
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{item.keyword}</div>
                        <div className="text-xs text-gray-600">{item.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          ${item.savings} saved
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Negative Keywords
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Overview</CardTitle>
              <CardDescription>Performance across all active campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Brand Campaign', spend: 1250, conversions: 15, status: 'active' },
                  { name: 'Product Demo Campaign', spend: 890, conversions: 8, status: 'active' },
                  { name: 'Competitor Campaign', spend: 650, conversions: 4, status: 'paused' }
                ].map((campaign, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${
                        campaign.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-gray-600">
                          ${campaign.spend} spent • {campaign.conversions} conversions
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        {campaign.status === 'active' ? (
                          <PauseCircle className="h-4 w-4" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Recommendations
                </CardTitle>
                <CardDescription>Personalized optimization suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{rec.type}</h4>
                        <Badge variant={rec.priority === 'High' ? 'destructive' : 'default'}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      <div className="text-xs text-green-600 font-medium">{rec.impact}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common optimization tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => triggerAction('optimize-bids')}
                    disabled={actionLoading === 'optimize-bids'}
                  >
                    {actionLoading === 'optimize-bids' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4 mr-2" />
                    )}
                    Optimize Bids
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => triggerAction('find-negative-keywords')}
                    disabled={actionLoading === 'find-negative-keywords'}
                  >
                    {actionLoading === 'find-negative-keywords' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Find Negative Keywords
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => triggerAction('daily-optimization')}
                    disabled={actionLoading === 'daily-optimization'}
                  >
                    {actionLoading === 'daily-optimization' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4 mr-2" />
                    )}
                    Run Daily Optimization
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => triggerAction('check-billing')}
                    disabled={actionLoading === 'check-billing'}
                  >
                    {actionLoading === 'check-billing' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Calendar className="h-4 w-4 mr-2" />
                    )}
                    Check Account Billing
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setNewTaskDialog(true)}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Setup Automation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Chat Interface Modal */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl h-3/4 flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Google Ads AI Assistant</h3>
              <Button variant="ghost" onClick={() => setChatOpen(false)}>×</Button>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p className="text-center">
                    Welcome! I can help you manage your Google Ads campaigns.<br />
                    Try asking: "Show me account status" or "Optimize my bids"
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3/4 p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p>{message.content}</p>
                        {message.suggestions && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs opacity-75">Suggestions:</p>
                            {message.suggestions.map((suggestion: string, idx: number) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="text-xs mr-2 mb-1"
                                onClick={() => setChatMessage(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask me anything about your Google Ads..."
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  disabled={chatLoading}
                />
                <Button 
                  onClick={sendChatMessage} 
                  disabled={chatLoading || !chatMessage.trim()}
                >
                  {chatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAdsDashboard;
