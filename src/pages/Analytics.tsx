import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useDateRange } from '@/hooks/use-date-range';
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
  RefreshCw,
  TrendingDown,
  ArrowUp,
  ArrowDown
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi, campaignsApi } from '@/lib/api';
import type { AnalyticsData, AnalyticsStats, TrafficSource } from '@/types/api';
import { CUADashboard } from '../components/cua-dashboard';
import { EmbeddedAutomation } from '../components/ui/embedded-automation';
import { DateRangeTester } from '../components/ui/date-range-tester';

const Analytics = () => {
  const queryClient = useQueryClient();
  const [isCUAOpen, setIsCUAOpen] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [automationType, setAutomationType] = useState<'cua' | 'campaign-fetch'>('cua');
  const [isAutomationMinimized, setIsAutomationMinimized] = useState(false);

  // Date range management
  const {
    preset,
    customRange,
    comparisonEnabled,
    apiParams,
    previousApiParams,
    setPreset,
    setCustomRange,
    setComparisonEnabled,
  } = useDateRange('last_7_days');

  // Fetch analytics data with date filtering
  const { data: analyticsData = [], isLoading: analyticsLoading, error: analyticsError } = useQuery<AnalyticsData[]>({
    queryKey: ['analytics', apiParams],
    queryFn: () => analyticsApi.getAnalytics(apiParams),
  });

  // Fetch campaign data and last fetch time
  const { data: lastFetchTime, isLoading: lastFetchLoading } = useQuery({
    queryKey: ['campaigns-last-fetch'],
    queryFn: () => campaignsApi.getLastFetchTime(),
    refetchInterval: 60000, // Refetch every minute
  });

  // Function to trigger manual campaign fetch
  const { mutate: refreshCampaigns, isPending: isRefreshing } = useMutation({
    mutationFn: () => campaignsApi.forceFetch(),
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-last-fetch'] });
    },
  });

  // Fetch analytics stats with comparison
  const { data: statsWithComparison, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics-stats', apiParams, previousApiParams, comparisonEnabled],
    queryFn: () => comparisonEnabled && previousApiParams 
      ? analyticsApi.getStatsWithComparison(apiParams, previousApiParams)
      : analyticsApi.getStats(apiParams).then(current => ({ current, previous: null, comparison: null })),
  });

  const analyticsStats = statsWithComparison?.current;
  const previousStats = statsWithComparison?.previous;
  const comparison = statsWithComparison?.comparison;

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
  // Helper function to format comparison as string
  const formatComparison = (value: number) => {
    const isPositive = value >= 0;
    const sign = isPositive ? '+' : '-';
    return `${sign}${Math.abs(value).toFixed(1)}% vs previous period`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Analytics</h1>
          <p className="text-muted-foreground">
            Advanced insights powered by machine learning
          </p>
        </div>
        
        {/* Date Range Picker and Refresh */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <DateRangePicker
              value={customRange}
              onChange={setCustomRange}
              onPresetChange={setPreset}
              currentPreset={preset}
              comparisonEnabled={comparisonEnabled}
              onComparisonToggle={setComparisonEnabled}
              className="lg:w-auto"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => refreshCampaigns()}
              disabled={isRefreshing}
              className="relative"
            >
              <RefreshCw className={cn(
                "h-4 w-4",
                isRefreshing && "animate-spin"
              )} />
            </Button>
          </div>
          {lastFetchTime?.lastFetchTime && (
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date(lastFetchTime.lastFetchTime).toLocaleString()}
            </div>
          )}
        </div>
      </div>


      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={analyticsStats?.totalUsers || "0"}
          change={comparisonEnabled && comparison?.totalUsers 
            ? formatComparison(comparison.totalUsers) 
            : "+12.5% from last month"
          }
          trend={comparisonEnabled && comparison?.totalUsers 
            ? (comparison.totalUsers >= 0 ? "up" : "down")
            : "up"
          }
          icon={Users}
        />
        <StatCard
          title="Revenue"
          value={analyticsStats?.revenue || "₹0"}
          change={comparisonEnabled && comparison?.revenue 
            ? formatComparison(comparison.revenue)
            : "+8.2% from last month"
          }
          trend={comparisonEnabled && comparison?.revenue 
            ? (comparison.revenue >= 0 ? "up" : "down")
            : "up"
          }
          icon={DollarSign}
        />
        <StatCard
          title="Conversion Rate"
          value={analyticsStats?.conversionRate || "0%"}
          change={comparisonEnabled && comparison?.conversionRate 
            ? formatComparison(comparison.conversionRate)
            : "+0.8% from last month"
          }
          trend={comparisonEnabled && comparison?.conversionRate 
            ? (comparison.conversionRate >= 0 ? "up" : "down")
            : "up"
          }
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

      {/* API Tester for Date Ranges */}
      <DateRangeTester />

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