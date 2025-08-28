import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '@/lib/api';
import { useDateRangeContext } from '@/contexts/date-range-context';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { StatCard } from '@/components/ui/stat-card';
import { Chart } from '@/components/ui/chart';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { Campaign, CampaignResponse, CampaignWithStats, CampaignStatsResponse } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';

// Column definitions for the campaigns table
const columns: ColumnDef<CampaignWithStats>[] = [
  {
    accessorKey: 'name',
    header: 'Campaign Name',
    cell: ({ row }) => {
      const campaign = row.original;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{campaign.name}</span>
          <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {campaign.status}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'stats.impressions',
    header: 'Impressions',
    cell: ({ row }) => {
      const impressions = row.original.stats.impressions;
      return impressions !== null ? impressions.toLocaleString() : '0';
    },
  },
  {
    accessorKey: 'stats.clicks',
    header: 'Clicks',
    cell: ({ row }) => {
      const clicks = row.original.stats.clicks;
      return clicks !== null ? clicks.toLocaleString() : '0';
    },
  },
  {
    accessorKey: 'stats.ctr',
    header: 'CTR',
    cell: ({ row }) => {
      const ctr = row.original.stats.ctr;
      return ctr !== null ? `${(ctr * 100).toFixed(2)}%` : '0%';
    },
  },
  {
    accessorKey: 'stats.conversions',
    header: 'Conversions',
    cell: ({ row }) => {
      const conversions = row.original.stats.conversions;
      return conversions !== null ? conversions.toLocaleString() : '0';
    },
  },
  {
    accessorKey: 'stats.cost',
    header: 'Cost',
    cell: ({ row }) => {
      const cost = row.original.stats.cost;
      return cost !== null ? `$${cost.toFixed(2)}` : '$0.00';
    },
  },
  {
    accessorKey: 'stats.costPerConversion',
    header: 'Cost/Conv.',
    cell: ({ row }) => {
      const costPerConv = row.original.stats.costPerConversion;
      return costPerConv !== null ? `$${costPerConv.toFixed(2)}` : '-';
    },
  },
  {
    accessorKey: 'optimizationScore',
    header: 'Opt. Score',
    cell: ({ row }) => {
      const score = row.original.optimizationScore || 0;
      return (
        <div className="flex items-center gap-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${score * 100}%` }}
            />
          </div>
          <span className="text-sm">{(score * 100).toFixed(0)}%</span>
        </div>
      );
    },
  },
];

export default function Campaigns() {
  const navigate = useNavigate();
  const { apiParams } = useDateRangeContext();

  // Fetch campaigns data
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useQuery<CampaignResponse>({
    queryKey: ['campaigns', apiParams],
    queryFn: () => campaignsApi.getCampaigns(apiParams),
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <div className="flex items-center gap-4">
          <DateRangePicker />
          <Button onClick={() => navigate('/campaigns/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Campaigns Table */}
      <DataTable
        columns={columns}
        data={campaignsData?.campaigns || []}
        loading={isLoadingCampaigns}
        searchKey="name"
        onRowClick={(row) => navigate(`/campaigns/${row.id}`)}
      />
    </div>
  );
}