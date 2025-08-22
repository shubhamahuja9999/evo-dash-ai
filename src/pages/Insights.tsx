import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb,
  Target,
  Users,
  BarChart3
} from 'lucide-react';

const insights = [
  {
    id: 1,
    type: 'opportunity',
    priority: 'high',
    title: 'Increase Social Media Budget',
    description: 'Social media campaigns are performing 35% better than other channels. Consider reallocating 20% of your email budget to social platforms.',
    impact: '+$2,400 estimated monthly revenue',
    confidence: 94,
    category: 'Budget Optimization',
    icon: TrendingUp,
    color: 'text-success'
  },
  {
    id: 2,
    type: 'alert',
    priority: 'high',
    title: 'Declining Email Performance',
    description: 'Email open rates have dropped 15% over the past month. Subject line optimization and audience segmentation recommended.',
    impact: 'Potential 25% improvement in engagement',
    confidence: 87,
    category: 'Campaign Performance',
    icon: AlertTriangle,
    color: 'text-warning'
  },
  {
    id: 3,
    type: 'insight',
    priority: 'medium',
    title: 'Peak Engagement Hours Identified',
    description: 'User engagement peaks between 2-4 PM and 7-9 PM. Schedule content during these windows for maximum impact.',
    impact: '+18% average engagement rate',
    confidence: 92,
    category: 'Timing Optimization',
    icon: Clock,
    color: 'text-primary'
  },
  {
    id: 4,
    type: 'recommendation',
    priority: 'medium',
    title: 'Audience Segment Discovery',
    description: 'A new high-value audience segment (ages 25-34, tech industry) shows 3x higher conversion rates. Expand targeting to similar profiles.',
    impact: '+$1,800 estimated monthly revenue',
    confidence: 78,
    category: 'Audience Targeting',
    icon: Users,
    color: 'text-accent-purple'
  },
  {
    id: 5,
    type: 'success',
    priority: 'low',
    title: 'Campaign Goals Exceeded',
    description: 'Your "Summer Sale 2024" campaign exceeded conversion goals by 23%. Similar creative elements should be applied to future campaigns.',
    impact: 'Maintain current performance',
    confidence: 96,
    category: 'Creative Optimization',
    icon: CheckCircle,
    color: 'text-success'
  }
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-destructive text-destructive-foreground';
    case 'medium': return 'bg-warning text-white';
    case 'low': return 'bg-success text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'opportunity': return TrendingUp;
    case 'alert': return AlertTriangle;
    case 'insight': return Lightbulb;
    case 'recommendation': return Target;
    case 'success': return CheckCircle;
    default: return Brain;
  }
};

const Insights = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">
            Machine learning powered recommendations and alerts
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 glow">
          <Zap className="w-4 h-4 mr-2" />
          CUA Optimization
        </Button>
      </div>

      {/* Insights Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="dashboard-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Insights</p>
                <p className="text-2xl font-bold">24</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-secondary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opportunities</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-glow flex items-center justify-center border border-primary/20">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Confidence</p>
                <p className="text-2xl font-bold">89%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.map((insight) => {
          const IconComponent = getTypeIcon(insight.type);
          return (
            <Card key={insight.id} className="dashboard-card hover:border-primary/20 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{insight.title}</h3>
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {insight.category}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-success">{insight.impact}</p>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {insight.confidence}%
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                          Apply Recommendation
                        </Button>
                      </div>
                    </div>

                    {/* Progress bar for confidence */}
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${insight.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Learning Section */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-gradient-glow border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Model Accuracy</span>
              <span className="text-sm text-primary font-semibold">94.2%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gradient-primary h-2 rounded-full w-[94%]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">2.4M</p>
              <p className="text-sm text-muted-foreground">Data Points Analyzed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-purple">156</p>
              <p className="text-sm text-muted-foreground">Patterns Discovered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">89%</p>
              <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Insights;