import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign,
  Zap,
  Target
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

const analyticsData = [
  { name: 'Jan', value: 4000, conversions: 2400 },
  { name: 'Feb', value: 3000, conversions: 1398 },
  { name: 'Mar', value: 2000, conversions: 9800 },
  { name: 'Apr', value: 2780, conversions: 3908 },
  { name: 'May', value: 1890, conversions: 4800 },
  { name: 'Jun', value: 2390, conversions: 3800 },
];

const pieData = [
  { name: 'Direct', value: 35, color: '#3B82F6' },
  { name: 'Social', value: 25, color: '#8B5CF6' },
  { name: 'Email', value: 20, color: '#06B6D4' },
  { name: 'Organic', value: 20, color: '#10B981' },
];

const Analytics = () => {
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
        <Button className="bg-gradient-primary hover:opacity-90 glow">
          <Zap className="w-4 h-4 mr-2" />
          CUA Optimization
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value="12,459"
          change="+12.5% from last month"
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Revenue"
          value="$89,432"
          change="+8.2% from last month"
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="Conversion Rate"
          value="3.24%"
          change="+0.8% from last month"
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          title="AI Score"
          value="94.2"
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
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
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
    </div>
  );
};

export default Analytics;