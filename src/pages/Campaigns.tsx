import CUAChat from '@/components/ui/cua-chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useDateRange } from '@/hooks/use-date-range';
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
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '@/lib/api';
import type { Campaign, CampaignStats } from '@/types/api';



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
  const navigate = useNavigate();
  
  // Date range management
  const {
    preset,
    customRange,
    comparisonEnabled,
    currentRange,
    previousRange,
    apiParams,
    previousApiParams,
    setPreset,
    setCustomRange,
    setComparisonEnabled,
  } = useDateRange();

  // Helper function to format date without timezone issues
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format display date based on filter
  const getDisplayDateRange = () => {
    if (preset === 'custom' && currentRange.from && currentRange.to) {
      const from = formatLocalDate(currentRange.from);
      const to = formatLocalDate(currentRange.to);
      return from === to ? from : `${from} - ${to}`;
    }
    
    const today = new Date();
    const todayStr = formatLocalDate(today);
    
    switch (preset) {
      case 'today':
        return todayStr;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return formatLocalDate(yesterday);
      case 'last_7_days':
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        return `${formatLocalDate(last7Days)} - ${todayStr}`;
      case 'last_30_days':
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);
        return `${formatLocalDate(last30Days)} - ${todayStr}`;
      case 'this_month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return `${formatLocalDate(startOfMonth)} - ${todayStr}`;
      case 'last_month':
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return `${formatLocalDate(startOfLastMonth)} - ${formatLocalDate(endOfLastMonth)}`;
      default:
        return 'All time';
    }
  };

  // Fetch campaigns data with date filtering
  const { data: campaigns = [], isLoading: campaignsLoading, error: campaignsError } = useQuery<Campaign[]>({
    queryKey: ['campaigns', apiParams],
    queryFn: () => campaignsApi.getCampaigns(apiParams),
  });

  // Fetch campaign stats with date filtering
  const { data: campaignStats, isLoading: statsLoading } = useQuery<CampaignStats>({
    queryKey: ['campaign-stats', apiParams],
    queryFn: () => campaignsApi.getStats(apiParams),
  });

  // Loading state
  if (campaignsLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading campaigns...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (campaignsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive">Error loading campaigns data</p>
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
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage and optimize your marketing campaigns
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker
            currentPreset={preset}
            onPresetChange={setPreset}
            value={customRange}
            onChange={setCustomRange}
            comparisonEnabled={comparisonEnabled}
            onComparisonToggle={setComparisonEnabled}
          />
          <CUAChat />
        </div>
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
                <p className="text-2xl font-bold">{campaignStats?.activeCampaigns || 0}</p>
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
                <p className="text-2xl font-bold">{campaignStats?.totalConversions || "0"}</p>
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
                <p className="text-2xl font-bold">{campaignStats?.totalImpressions || "0"}</p>
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
                <p className="text-2xl font-bold">{campaignStats?.avgCTR || "0%"}</p>
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
                        {getDisplayDateRange()}
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
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="hover:bg-primary hover:text-primary-foreground"
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    >
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