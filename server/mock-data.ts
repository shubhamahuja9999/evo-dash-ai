import { subDays, format } from 'date-fns';

const generateDailyData = (startDate: Date, endDate: Date) => {
  const days: Array<{
    date: Date;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    conversionValue: number;
  }> = [];
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;
    const randomVariation = 0.7 + Math.random() * 0.6;
    
    const impressions = Math.floor(15000 * weekendMultiplier * randomVariation);
    const clicks = Math.floor(impressions * (0.02 + Math.random() * 0.03));
    const conversions = Math.floor(clicks * (0.03 + Math.random() * 0.05));
    const cost = clicks * (0.5 + Math.random() * 1.5);
    const conversionValue = conversions * (50 + Math.random() * 150);
    
    days.push({
      date: new Date(currentDate),
      impressions,
      clicks,
      conversions,
      cost: parseFloat(cost.toFixed(2)),
      conversionValue: parseFloat(conversionValue.toFixed(2))
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
};

export const mockCampaigns = [
  {
    id: 'mock-campaign-1',
    name: 'Brand Awareness Q1',
    status: 'ACTIVE',
    budget: 5000,
    startDate: subDays(new Date(), 90).toISOString(),
    endDate: subDays(new Date(), 30).toISOString(),
    targetAudience: 'US, CA, UK - Age 25-54',
    campaignType: 'DISPLAY',
    optimizationScore: 85,
    bidStrategy: 'TARGET_CPA',
    createdAt: subDays(new Date(), 90).toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      impressions: 2450000,
      clicks: 52000,
      conversions: 1850,
      cost: 28500,
      ctr: 0.0212,
      cpc: 0.55,
      conversionRate: 0.0356,
      costPerConversion: 15.41
    },
    recommendations: []
  },
  {
    id: 'mock-campaign-2',
    name: 'Product Launch - Spring Collection',
    status: 'ACTIVE',
    budget: 15000,
    startDate: subDays(new Date(), 60).toISOString(),
    endDate: new Date().toISOString(),
    targetAudience: 'US - Age 18-45 - Interest in Fashion',
    campaignType: 'SEARCH',
    optimizationScore: 92,
    bidStrategy: 'MAXIMIZE_CONVERSIONS',
    createdAt: subDays(new Date(), 60).toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      impressions: 1850000,
      clicks: 125000,
      conversions: 5200,
      cost: 42000,
      ctr: 0.0676,
      cpc: 0.34,
      conversionRate: 0.0416,
      costPerConversion: 8.08
    },
    recommendations: []
  },
  {
    id: 'mock-campaign-3',
    name: 'Retargeting - Cart Abandoners',
    status: 'ACTIVE',
    budget: 3000,
    startDate: subDays(new Date(), 45).toISOString(),
    endDate: new Date().toISOString(),
    targetAudience: 'Website Visitors - Cart Abandoners',
    campaignType: 'DISPLAY',
    optimizationScore: 78,
    bidStrategy: 'TARGET_ROAS',
    createdAt: subDays(new Date(), 45).toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      impressions: 890000,
      clicks: 28000,
      conversions: 1450,
      cost: 12500,
      ctr: 0.0315,
      cpc: 0.45,
      conversionRate: 0.0518,
      costPerConversion: 8.62
    },
    recommendations: []
  },
  {
    id: 'mock-campaign-4',
    name: 'Holiday Special 2024',
    status: 'PAUSED',
    budget: 8000,
    startDate: subDays(new Date(), 120).toISOString(),
    endDate: subDays(new Date(), 90).toISOString(),
    targetAudience: 'US - All Ages',
    campaignType: 'SHOPPING',
    optimizationScore: 88,
    bidStrategy: 'SMART_BIDDING',
    createdAt: subDays(new Date(), 120).toISOString(),
    updatedAt: subDays(new Date(), 90).toISOString(),
    stats: {
      impressions: 3200000,
      clicks: 95000,
      conversions: 3800,
      cost: 35000,
      ctr: 0.0297,
      cpc: 0.37,
      conversionRate: 0.04,
      costPerConversion: 9.21
    },
    recommendations: []
  },
  {
    id: 'mock-campaign-5',
    name: 'Video - Brand Story',
    status: 'ACTIVE',
    budget: 4000,
    startDate: subDays(new Date(), 30).toISOString(),
    endDate: new Date().toISOString(),
    targetAudience: 'US, UK - Age 25-55',
    campaignType: 'VIDEO',
    optimizationScore: 72,
    bidStrategy: 'TARGET_CPM',
    createdAt: subDays(new Date(), 30).toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      impressions: 1800000,
      clicks: 42000,
      conversions: 890,
      cost: 18000,
      ctr: 0.0233,
      cpc: 0.43,
      conversionRate: 0.0212,
      costPerConversion: 20.22
    },
    recommendations: []
  }
];

export const mockAnalytics = generateDailyData(subDays(new Date(), 90), new Date());

export const mockCampaignStats = {
  current: {
    totalImpressions: mockCampaigns.reduce((sum, c) => sum + c.stats.impressions, 0).toLocaleString(),
    totalClicks: mockCampaigns.reduce((sum, c) => sum + c.stats.clicks, 0).toLocaleString(),
    totalConversions: mockCampaigns.reduce((sum, c) => sum + c.stats.conversions, 0).toLocaleString(),
    totalCost: `$${mockCampaigns.reduce((sum, c) => sum + c.stats.cost, 0).toLocaleString()}`,
    conversionRate: `${((mockCampaigns.reduce((sum, c) => sum + c.stats.conversions, 0) / mockCampaigns.reduce((sum, c) => sum + c.stats.clicks, 0)) * 100).toFixed(2)}%`,
    avgCTR: `${((mockCampaigns.reduce((sum, c) => sum + c.stats.clicks, 0) / mockCampaigns.reduce((sum, c) => sum + c.stats.impressions, 0)) * 100).toFixed(2)}%`,
    avgCPC: `$${(mockCampaigns.reduce((sum, c) => sum + c.stats.cost, 0) / mockCampaigns.reduce((sum, c) => sum + c.stats.clicks, 0)).toFixed(2)}`,
    costPerConversion: `$${(mockCampaigns.reduce((sum, c) => sum + c.stats.cost, 0) / mockCampaigns.reduce((sum, c) => sum + c.stats.conversions, 0)).toFixed(2)}`
  },
  previous: {
    totalImpressions: '8,200,000',
    totalClicks: '280,000',
    totalConversions: '10,500',
    totalCost: '$98,000',
    conversionRate: '3.75%',
    avgCTR: '3.42%',
    avgCPC: '$0.35',
    costPerConversion: '$9.33'
  },
  comparison: {
    totalImpressions: 28.5,
    totalClicks: 15.2,
    totalConversions: 22.8,
    totalCost: 18.5,
    conversionRate: 8.5,
    avgCTR: 12.3,
    avgCPC: -5.2
  }
};

export const mockDashboardData = {
  accountSummary: {
    accountId: '8936153023',
    accountName: 'Upthrust AI Ads',
    currencyCode: 'USD',
    timeZone: 'America/New_York',
    customerId: '8936153023',
    descriptiveName: 'Upthrust AI',
    canManageClients: false,
    currencyCode: 'USD',
    dateTimeZone: 'America/New_York'
  },
  automation: {
    activeTasks: 5,
    totalExecutions: 127,
    successRate: 94.5,
    lastRun: new Date().toISOString()
  },
  performance: {
    campaigns: mockCampaigns.length,
    activeAds: mockCampaigns.filter(c => c.status === 'ACTIVE').length,
    totalKeywords: 85,
    avgCostPerLead: 12.45,
    conversionRate: 3.85,
    qualityScore: 7.8
  },
  alerts: [
    {
      id: 'alert-1',
      title: 'Budget Alert: Product Launch - Spring Collection',
      message: 'Campaign is at 92% of budget',
      severity: 'WARNING',
      createdAt: new Date().toISOString()
    },
    {
      id: 'alert-2',
      title: 'Performance Drop: Video - Brand Story',
      message: 'CTR dropped by 15% this week',
      severity: 'INFO',
      createdAt: new Date().toISOString()
    },
    {
      id: 'alert-3',
      title: 'High CPA: Retargeting - Cart Abandoners',
      message: 'CPA increased by 25% - review targeting',
      severity: 'WARNING',
      createdAt: new Date().toISOString()
    }
  ],
  trends: mockAnalytics.map(a => ({
    date: format(a.date, 'yyyy-MM-dd'),
    spend: a.cost,
    impressions: a.impressions,
    clicks: a.clicks,
    conversions: a.conversions
  })),
  recommendations: [
    {
      id: 'rec-1',
      type: 'BUDGET_OPTIMIZATION',
      title: 'Increase budget for high-performing campaigns',
      description: 'Product Launch campaign has high conversion rate. Consider increasing budget to capture more conversions.',
      priority: 'HIGH'
    },
    {
      id: 'rec-2',
      type: 'KEYWORD_OPTIMIZATION',
      title: 'Add negative keywords',
      description: 'Found 15 keywords with high impressions but no conversions. Adding negative keywords could improve ROI.',
      priority: 'MEDIUM'
    },
    {
      id: 'rec-3',
      type: 'AD_COPY',
      title: 'A/B test new ad copy',
      description: 'Brand Awareness campaign CTR is below target. Consider testing new headlines.',
      priority: 'LOW'
    }
  ]
};

export const mockInsights = {
  totalCampaigns: mockCampaigns.length,
  activeCampaigns: mockCampaigns.filter(c => c.status === 'ACTIVE').length,
  totalSpend: mockCampaigns.reduce((sum, c) => sum + c.stats.cost, 0),
  totalConversions: mockCampaigns.reduce((sum, c) => sum + c.stats.conversions, 0),
  avgCTR: (mockCampaigns.reduce((sum, c) => sum + c.stats.ctr, 0) / mockCampaigns.length) * 100,
  avgConversionRate: (mockCampaigns.reduce((sum, c) => sum + c.stats.conversionRate, 0) / mockCampaigns.length) * 100,
  topPerformingCampaign: mockCampaigns.reduce((top, c) => 
    c.stats.conversions > top.stats.conversions ? c : top
  ),
  needsAttention: mockCampaigns.filter(c => c.status === 'PAUSED' || c.optimizationScore < 80)
};

export const mockCampaignMetrics = {
  metrics: mockAnalytics.map(a => ({
    date: a.date,
    campaignName: 'All Campaigns',
    bidStrategy: 'Mixed',
    conversions: a.conversions,
    currencyCode: 'USD',
    costPerConversion: a.conversions > 0 ? parseFloat((a.cost / a.conversions).toFixed(2)) : 0,
    clicks: a.clicks,
    ctr: parseFloat(((a.clicks / a.impressions) * 100).toFixed(2)),
    impressions: a.impressions,
    views: Math.floor(a.impressions * 0.3),
    avgCpv: 0.02
  })),
  summary: {
    totalImpressions: mockAnalytics.reduce((sum, a) => sum + a.impressions, 0),
    totalClicks: mockAnalytics.reduce((sum, a) => sum + a.clicks, 0),
    totalConversions: mockAnalytics.reduce((sum, a) => sum + a.conversions, 0),
    totalViews: mockAnalytics.reduce((sum, a) => sum + Math.floor(a.impressions * 0.3), 0),
    weightedCTR: (mockAnalytics.reduce((sum, a) => sum + ((a.clicks / a.impressions) * a.impressions), 0) / 
                  mockAnalytics.reduce((sum, a) => sum + a.impressions, 0)) * 100
  }
};
