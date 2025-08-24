import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign,
  Zap,
  Target,
  Terminal,
  Shield,
  Activity,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import type { AnalyticsData, AnalyticsStats, TrafficSource } from '@/types/api';
import { CUADashboard } from '../components/cua-dashboard';
import { EmbeddedAutomation } from '../components/ui/embedded-automation';

const Analytics = () => {
  const [isCUAOpen, setIsCUAOpen] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [automationType, setAutomationType] = useState<'cua' | 'campaign-fetch'>('cua');
  const [isAutomationMinimized, setIsAutomationMinimized] = useState(false);

  // Fetch analytics data
  const { data: analyticsData = [], isLoading: analyticsLoading, error: analyticsError } = useQuery<AnalyticsData[]>({
    queryKey: ['analytics'],
    queryFn: analyticsApi.getAnalytics,
  });

  // Fetch analytics stats
  const { data: analyticsStats, isLoading: statsLoading } = useQuery<AnalyticsStats>({
    queryKey: ['analytics-stats'],
    queryFn: analyticsApi.getStats,
  });

  // Fetch traffic sources
  const { data: trafficSources = [], isLoading: trafficLoading } = useQuery<TrafficSource[]>({
    queryKey: ['traffic-sources'],
    queryFn: analyticsApi.getTrafficSources,
  });

  // Loading state
  if (analyticsLoading || statsLoading || trafficLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (analyticsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive">Error loading analytics data</p>
            <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Analytics</h1>
          <p className="text-muted-foreground">
            Advanced insights powered by machine learning
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setAutomationType('campaign-fetch');
              setShowAutomation(true);
              setIsAutomationMinimized(false);
            }}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Fetch Campaigns
          </Button>
          
          <Dialog open={isCUAOpen} onOpenChange={setIsCUAOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 glow">
                <Zap className="w-4 h-4 mr-2" />
                CUA Optimization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  CUA Dashboard - Command User Access Control
                </DialogTitle>
                <DialogDescription>
                  Execute commands, manage user access, and monitor security audits for the Google Ads dashboard
                </DialogDescription>
              </DialogHeader>
              <CUADashboard />
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setAutomationType('cua');
              setShowAutomation(true);
              setIsAutomationMinimized(false);
            }}
            className="flex items-center gap-1"
          >
            <Terminal className="w-4 h-4" />
            Live Automation
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={analyticsStats?.totalUsers || "0"}
          change="+12.5% from last month"
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Revenue"
          value={analyticsStats?.revenue || "$0"}
          change="+8.2% from last month"
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="Conversion Rate"
          value={analyticsStats?.conversionRate || "0%"}
          change="+0.8% from last month"
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          title="AI Score"
          value={analyticsStats?.aiScore || "0"}
          change="+2.1 from last week"
          trend="up"
          icon={Target}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="hsl(var(--accent-purple))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--accent-purple))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Monthly Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="conversions" 
                  fill="url(#gradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent-purple))" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <Card className="dashboard-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={trafficSources}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {trafficSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="dashboard-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-glow border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-success mt-2"></div>
                <div>
                  <h4 className="font-medium text-success">High Performance Detected</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your conversion rate has increased by 15% this week. The AI model suggests focusing on social media campaigns.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-glow border border-warning/20">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-warning mt-2"></div>
                <div>
                  <h4 className="font-medium text-warning">Optimization Opportunity</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Email campaigns show lower engagement. Consider A/B testing subject lines for better performance.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Embedded Automation Window */}
      <EmbeddedAutomation
        isOpen={showAutomation}
        onClose={() => setShowAutomation(false)}
        onMinimize={() => setIsAutomationMinimized(!isAutomationMinimized)}
        isMinimized={isAutomationMinimized}
        automationType={automationType}
        title={automationType === 'cua' ? 'Google Ads CUA Automation' : 'Campaign Data Fetch'}
      />
    </div>
  );
};

export default Analytics;