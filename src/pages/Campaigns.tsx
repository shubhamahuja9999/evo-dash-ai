import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap,
  Target,
  TrendingUp,
  Calendar,
  Users,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const campaigns = [
  {
    id: 1,
    name: "Summer Sale 2024",
    status: "active",
    budget: "$5,000",
    spent: "$3,200",
    impressions: "125K",
    clicks: "8.2K",
    ctr: "6.56%",
    conversions: 234,
    startDate: "2024-06-01",
    endDate: "2024-08-31"
  },
  {
    id: 2,
    name: "Product Launch Campaign",
    status: "paused",
    budget: "$2,500",
    spent: "$1,800",
    impressions: "87K",
    clicks: "5.1K",
    ctr: "5.86%",
    conversions: 156,
    startDate: "2024-07-15",
    endDate: "2024-09-15"
  },
  {
    id: 3,
    name: "Brand Awareness Drive",
    status: "completed",
    budget: "$1,000",
    spent: "$1,000",
    impressions: "245K",
    clicks: "12.3K",
    ctr: "5.02%",
    conversions: 389,
    startDate: "2024-05-01",
    endDate: "2024-06-30"
  },
  {
    id: 4,
    name: "Holiday Promotion",
    status: "draft",
    budget: "$8,000",
    spent: "$0",
    impressions: "0",
    clicks: "0",
    ctr: "0%",
    conversions: 0,
    startDate: "2024-12-01",
    endDate: "2024-12-31"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-success text-white';
    case 'paused': return 'bg-warning text-white';
    case 'completed': return 'bg-primary text-white';
    case 'draft': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const Campaigns = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage and optimize your marketing campaigns
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 glow">
          <Zap className="w-4 h-4 mr-2" />
          CUA Optimization
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="dashboard-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Conversions</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-secondary flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold">2.4M</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-glow flex items-center justify-center border border-primary/20">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. CTR</p>
                <p className="text-2xl font-bold">5.84%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="p-6 rounded-xl border border-border hover:border-primary/20 transition-all duration-300 bg-gradient-secondary"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {campaign.startDate} - {campaign.endDate}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete Campaign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Budget</p>
                    <p className="font-semibold">{campaign.budget}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Spent</p>
                    <p className="font-semibold">{campaign.spent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Impressions</p>
                    <p className="font-semibold">{campaign.impressions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Clicks</p>
                    <p className="font-semibold">{campaign.clicks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">CTR</p>
                    <p className="font-semibold">{campaign.ctr}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Conversions</p>
                    <p className="font-semibold">{campaign.conversions}</p>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Campaigns;