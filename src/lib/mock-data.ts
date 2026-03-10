// ─── Mock Data for Evo Dash ──────────────────────────────────────────────────
// All API calls are replaced with these local mock objects so the app works
// fully offline without a running backend.

import type {
  AnalyticsData,
  TrafficSource,
  CampaignResponse,
  CampaignWithStats,
} from '@/types/api';

// ─── Analytics ───────────────────────────────────────────────────────────────

export const mockAnalyticsData: AnalyticsData[] = [
  { name: 'Jan', value: 4200, conversions: 320 },
  { name: 'Feb', value: 5800, conversions: 410 },
  { name: 'Mar', value: 4900, conversions: 370 },
  { name: 'Apr', value: 7100, conversions: 520 },
  { name: 'May', value: 6400, conversions: 480 },
  { name: 'Jun', value: 8300, conversions: 610 },
  { name: 'Jul', value: 7700, conversions: 570 },
  { name: 'Aug', value: 9200, conversions: 690 },
  { name: 'Sep', value: 8500, conversions: 640 },
  { name: 'Oct', value: 10100, conversions: 750 },
  { name: 'Nov', value: 9400, conversions: 710 },
  { name: 'Dec', value: 11500, conversions: 870 },
];

export const mockAnalyticsStatsCurrent = {
  totalUsers: '24,583',
  revenue: '₹18,42,500',
  conversionRate: '6.8%',
  aiScore: '87',
  totalImpressions: '3,82,000',
  totalClicks: '28,150',
  totalConversions: '1,672',
  totalCost: '₹4,21,000',
  avgCTR: '7.37%',
  avgCPC: '₹14.95',
  costPerConversion: '₹251.79',
};

export const mockAnalyticsStatsPrevious = {
  totalUsers: '21,840',
  revenue: '₹15,98,200',
  conversionRate: '6.1%',
  aiScore: '81',
  totalImpressions: '3,14,500',
  totalClicks: '22,800',
  totalConversions: '1,390',
  totalCost: '₹3,72,000',
  avgCTR: '7.25%',
  avgCPC: '₹16.32',
  costPerConversion: '₹267.63',
};

export const mockAnalyticsStatsWithComparison = {
  current: mockAnalyticsStatsCurrent,
  previous: mockAnalyticsStatsPrevious,
  comparison: {
    totalUsers: 12.55,
    revenue: 15.29,
    conversionRate: 11.48,
    totalImpressions: 21.46,
    totalClicks: 23.47,
    totalConversions: 20.29,
    totalCost: 13.17,
    avgCTR: 1.66,
    avgCPC: -8.39,
  },
};

export const mockTrafficSources: TrafficSource[] = [
  { name: 'Google Ads', value: 42, color: '#6366f1' },
  { name: 'Organic', value: 28, color: '#8b5cf6' },
  { name: 'Social', value: 18, color: '#a78bfa' },
  { name: 'Direct', value: 8, color: '#c4b5fd' },
  { name: 'Referral', value: 4, color: '#ddd6fe' },
];

// ─── Campaigns ───────────────────────────────────────────────────────────────

const now = new Date().toISOString();

export const mockCampaignsResponse: CampaignResponse = {
  totalCount: 6,
  pageCount: 1,
  campaigns: [
    {
      id: 'camp-001',
      name: 'Brand Awareness – Summer 2025',
      status: 'ACTIVE',
      budget: 150000,
      startDate: '2025-06-01',
      endDate: '2025-08-31',
      targetAudience: 'Tier-1 Cities, 25-45',
      campaignType: 'DISPLAY',
      optimizationScore: 0.87,
      bidStrategy: 'TARGET_CPA',
      createdAt: now,
      updatedAt: now,
      stats: {
        impressions: 182400,
        clicks: 13620,
        conversions: 812,
        cost: 98500,
        ctr: 0.0747,
        cpc: 7.23,
        conversionRate: 0.0596,
        costPerConversion: 121.3,
      },
    },
    {
      id: 'camp-002',
      name: 'Product Launch – EVO Pro',
      status: 'ACTIVE',
      budget: 220000,
      startDate: '2025-09-01',
      endDate: '2025-11-30',
      targetAudience: 'Auto Enthusiasts, 28-50',
      campaignType: 'SEARCH',
      optimizationScore: 0.79,
      bidStrategy: 'TARGET_ROAS',
      createdAt: now,
      updatedAt: now,
      stats: {
        impressions: 97300,
        clicks: 8140,
        conversions: 420,
        cost: 142000,
        ctr: 0.0836,
        cpc: 17.45,
        conversionRate: 0.0516,
        costPerConversion: 338.1,
      },
    },
    {
      id: 'camp-003',
      name: 'Retargeting – Q4 2025',
      status: 'ACTIVE',
      budget: 80000,
      startDate: '2025-10-01',
      endDate: '2025-12-31',
      targetAudience: 'Website Visitors (Past 30 days)',
      campaignType: 'DISPLAY',
      optimizationScore: 0.93,
      bidStrategy: 'MAXIMIZE_CONVERSIONS',
      createdAt: now,
      updatedAt: now,
      stats: {
        impressions: 54600,
        clicks: 4870,
        conversions: 390,
        cost: 62300,
        ctr: 0.0892,
        cpc: 12.79,
        conversionRate: 0.0801,
        costPerConversion: 159.7,
      },
    },
    {
      id: 'camp-004',
      name: 'Dealer Showroom Visits',
      status: 'PAUSED',
      budget: 60000,
      startDate: '2025-07-15',
      endDate: '2025-09-15',
      targetAudience: 'Mumbai, Pune, Bangalore',
      campaignType: 'LOCAL',
      optimizationScore: 0.64,
      bidStrategy: 'TARGET_CPA',
      createdAt: now,
      updatedAt: now,
      stats: {
        impressions: 31200,
        clicks: 2180,
        conversions: 95,
        cost: 41500,
        ctr: 0.0699,
        cpc: 19.04,
        conversionRate: 0.0436,
        costPerConversion: 436.8,
      },
    },
    {
      id: 'camp-005',
      name: 'Festival Season Offers',
      status: 'ACTIVE',
      budget: 175000,
      startDate: '2025-10-10',
      endDate: '2025-11-15',
      targetAudience: 'All India, 22-55',
      campaignType: 'SHOPPING',
      optimizationScore: 0.81,
      bidStrategy: 'TARGET_ROAS',
      createdAt: now,
      updatedAt: now,
      stats: {
        impressions: 213000,
        clicks: 18900,
        conversions: 1140,
        cost: 138000,
        ctr: 0.0887,
        cpc: 7.3,
        conversionRate: 0.0603,
        costPerConversion: 121.05,
      },
    },
    {
      id: 'camp-006',
      name: 'Year-End Clearance',
      status: 'ENDED',
      budget: 90000,
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      targetAudience: 'Existing Customers',
      campaignType: 'EMAIL',
      optimizationScore: 0.72,
      bidStrategy: 'MAXIMIZE_CLICKS',
      createdAt: now,
      updatedAt: now,
      stats: {
        impressions: 42100,
        clicks: 3760,
        conversions: 248,
        cost: 29700,
        ctr: 0.0893,
        cpc: 7.9,
        conversionRate: 0.0659,
        costPerConversion: 119.76,
      },
    },
  ],
};

// ─── Campaign Details (per-campaign analytics) ────────────────────────────────

export interface MockCampaignDetails {
  id: string;
  name: string;
  status: string;
  budget: string;
  spent: string;
  startDate: string;
  endDate: string;
  targetAudience: string;
  analytics: {
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    cpc: number;
  }[];
}

const buildDailyAnalytics = (
  days: number,
  startDate: string,
  seed: number
) => {
  const result = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const factor = 1 + 0.3 * Math.sin((i + seed) / 3);
    const impressions = Math.round(5000 * factor + seed * 10);
    const clicks = Math.round(impressions * 0.075);
    const conversions = Math.round(clicks * 0.058);
    const cost = Math.round(clicks * (8 + (seed % 5)));
    const conversionValue = Math.round(conversions * (1200 + seed * 50));
    result.push({
      date: d.toISOString().split('T')[0],
      impressions,
      clicks,
      cost,
      conversions,
      conversionValue,
      ctr: parseFloat((clicks / impressions * 100).toFixed(2)),
      cpc: parseFloat((cost / Math.max(clicks, 1)).toFixed(2)),
    });
  }
  return result;
};

export const mockCampaignDetailsMap: Record<string, MockCampaignDetails> = {
  'camp-001': {
    id: 'camp-001',
    name: 'Brand Awareness – Summer 2025',
    status: 'active',
    budget: '₹1,50,000',
    spent: '₹98,500',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    targetAudience: 'Tier-1 Cities, 25-45',
    analytics: buildDailyAnalytics(14, '2025-06-01', 3),
  },
  'camp-002': {
    id: 'camp-002',
    name: 'Product Launch – EVO Pro',
    status: 'active',
    budget: '₹2,20,000',
    spent: '₹1,42,000',
    startDate: '2025-09-01',
    endDate: '2025-11-30',
    targetAudience: 'Auto Enthusiasts, 28-50',
    analytics: buildDailyAnalytics(14, '2025-09-01', 7),
  },
  'camp-003': {
    id: 'camp-003',
    name: 'Retargeting – Q4 2025',
    status: 'active',
    budget: '₹80,000',
    spent: '₹62,300',
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    targetAudience: 'Website Visitors (Past 30 days)',
    analytics: buildDailyAnalytics(14, '2025-10-01', 5),
  },
  'camp-004': {
    id: 'camp-004',
    name: 'Dealer Showroom Visits',
    status: 'paused',
    budget: '₹60,000',
    spent: '₹41,500',
    startDate: '2025-07-15',
    endDate: '2025-09-15',
    targetAudience: 'Mumbai, Pune, Bangalore',
    analytics: buildDailyAnalytics(14, '2025-07-15', 2),
  },
  'camp-005': {
    id: 'camp-005',
    name: 'Festival Season Offers',
    status: 'active',
    budget: '₹1,75,000',
    spent: '₹1,38,000',
    startDate: '2025-10-10',
    endDate: '2025-11-15',
    targetAudience: 'All India, 22-55',
    analytics: buildDailyAnalytics(14, '2025-10-10', 9),
  },
  'camp-006': {
    id: 'camp-006',
    name: 'Year-End Clearance',
    status: 'completed',
    budget: '₹90,000',
    spent: '₹29,700',
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    targetAudience: 'Existing Customers',
    analytics: buildDailyAnalytics(14, '2025-12-01', 4),
  },
};

// Default fallback campaign details for unknown IDs
export const mockDefaultCampaignDetails: MockCampaignDetails = {
  id: 'default',
  name: 'Sample Campaign',
  status: 'active',
  budget: '₹1,00,000',
  spent: '₹45,000',
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  targetAudience: 'General Audience',
  analytics: buildDailyAnalytics(14, '2025-01-01', 1),
};

// ─── Insights ─────────────────────────────────────────────────────────────────

export const mockInsightsByType: Record<string, any> = {
  opportunity: {
    opportunities: [
      {
        title: 'Expand in Tier-2 Cities',
        impact: 'high',
        description:
          'Search volume for EVO vehicles has grown 34% YoY in Tier-2 cities like Jaipur, Lucknow, and Coimbatore. Targeting these markets with geo-specific creatives could unlock 20,000+ new prospects.',
        source: 'Search trend analysis + competitor spend data',
        measurement: 'Track impressions and conversion rate split by city tier',
      },
      {
        title: 'Video Pre-Roll on YouTube',
        impact: 'medium',
        description:
          'Competitor brands are seeing 3x engagement rates on YouTube pre-roll when pairing lifestyle creative with auto-intent keywords. Our current video budget is under-allocated by ~40%.',
        source: 'Industry benchmark reports',
        measurement: 'View-through conversion rate and brand recall lift',
      },
      {
        title: 'Seasonal Festive Campaign Amplification',
        impact: 'high',
        description:
          'Festival season campaigns show 2.4x ROAS vs off-peak. Increasing budget during Diwali, Onam, and Pongal windows historically beats the annual average significantly.',
        source: 'Internal campaign performance history',
        measurement: 'ROAS uplift compared to non-festival periods',
      },
    ],
  },

  alert: {
    warnings: [
      {
        title: 'Rising CPC on Branded Keywords',
        severity: 'high',
        description:
          'CPC for branded search terms has increased 28% over the past 60 days, likely driven by competitor bidding. Without active negatives and bid adjustments, budget efficiency will drop.',
        source: 'Google Ads auction insights',
        mitigation: 'Add competitor exclusions, implement IS-based bid floors',
      },
      {
        title: 'Ad Fatigue on Display Network',
        severity: 'medium',
        description:
          'Creative frequency has exceeded 8x per user for display ads in metro India. CTR has dropped 18% over the last 3 weeks — a sign of audience saturation.',
        source: 'Display campaign frequency reports',
        mitigation: 'Refresh creatives, implement frequency caps at 4/week',
      },
      {
        title: 'Low Quality Score on Dealership Pages',
        severity: 'medium',
        description:
          'Several landing pages for dealer-specific campaigns have Quality Scores below 5/10, increasing effective CPC by 30-50% compared to the industry average.',
        source: 'Google Ads Quality Score dashboard',
        mitigation: 'Optimise page speed, improve ad-to-page relevance',
      },
    ],
  },

  insight: {
    insights: [
      {
        title: 'Weekday Morning is Peak Conversion Window',
        relevance: 'high',
        description:
          'Conversion rates peak between 9–11 AM on weekdays (Monday–Thursday). Scheduling higher bids during this window could improve overall ROAS by an estimated 15%.',
        source: 'Hour-of-day conversion analysis',
        importance:
          'Allows precision budget allocation instead of flat 24/7 spend',
      },
      {
        title: 'Mobile vs Desktop Split Shifting',
        relevance: 'medium',
        description:
          'Mobile now drives 68% of clicks but only 44% of conversions, indicating the mobile experience needs optimisation or a shorter sales funnel for handheld users.',
        source: 'Device segmentation reports',
        importance:
          'Highlights a CRO opportunity that can lift total conversions without extra spend',
      },
      {
        title: 'Long-tail Keywords Outperform Head Terms',
        relevance: 'high',
        description:
          'Keywords with 3+ words drive 42% lower CPC but 19% higher CVR compared to broad head terms. Shifting 20% of search budget to long-tail would improve ROI.',
        source: 'Search terms report, keyword performance data',
        importance: 'Direct path to better ROAS without increasing total spend',
      },
    ],
  },

  recommendation: {
    recommendations: [
      {
        title: 'Upgrade to Smart Bidding for All Active Campaigns',
        priority: 'high',
        description:
          'Campaigns still using Manual CPC are leaving 20-30% efficiency on the table. Switching to Target CPA or Target ROAS with at least 30 days of conversion data will improve automated optimisation.',
        source: 'Google best practices + internal A/B test results',
        implementation:
          'Migrate one campaign at a time, monitor for 2 weeks before expanding',
      },
      {
        title: 'Build a Remarketing Audience Ladder',
        priority: 'high',
        description:
          'Current retargeting is flat (all visitors pooled). Segmenting by intent depth (page visited, time on site, form abandonment) enables personalised messaging that improves CVR by 22-35%.',
        source: 'CRO research and remarketing playbooks',
        implementation: 'Create 4 audience tiers in Google Ads and serve matching ad creative',
      },
      {
        title: 'Enable Conversion Value Rules',
        priority: 'medium',
        description:
          'Not all conversions are created equal. High-margin models and showroom visits should carry higher conversion values to help Smart Bidding optimise for profit, not just volume.',
        source: 'Revenue-weighted attribution analysis',
        implementation: 'Define value rules per product line; review quarterly',
      },
    ],
  },

  success: {
    successStories: [
      {
        title: 'Festival Retargeting Drove 3.2x ROAS',
        description:
          'A targeted retargeting campaign running October–November achieved 3.2x ROAS by combining dynamic display ads with high-intent remarketing lists built during the test-drive inquiry spike.',
        source: 'Q4 2024 campaign wrap-up report',
        keyFactors:
          'Dynamic creatives, audience recency segmentation, bid boosts during festival windows',
        lesson:
          'Warm audiences during high-intent seasons convert far better than prospecting; invest in list quality year-round.',
      },
      {
        title: 'YouTube Pre-Roll Cut Brand Recall by Avg. 2.8x',
        description:
          'A 6-second bumper ad series paired with a 30-second brand story improved spontaneous brand recall by 2.8x among 25-40 year olds in metro India versus a display-only control group.',
        source: 'Brand lift study via Google Ads',
        keyFactors: 'Sequence strategy, emotion-led creative, precise audience targeting',
        lesson:
          'Short bumpers prime the audience; longer storytelling ads close the gap – use both in sequence.',
      },
    ],
  },

  analysis: {
    trends: [
      {
        title: 'Electric Vehicle Interest Growing Rapidly',
        trajectory: 'growing',
        description:
          'Search interest for EV-related terms has grown 58% YoY in India. Competitors are increasing their EV ad spend by 40%, creating urgency for our EV campaign line-up.',
        source: 'Google Trends, competitor intelligence',
        response:
          'Increase EV campaign budget by 25% in Q1 and create dedicated landing pages per model',
      },
      {
        title: 'Rising Privacy Restrictions Limiting Targeting',
        trajectory: 'declining',
        description:
          'Cookie-based audience targeting is eroding across browsers. Signal loss is estimated at 20-30% for third-party audience segments, reducing match rates and increasing CPAs.',
        source: 'Google Ads signal health reports, industry surveys',
        response:
          'Accelerate first-party data collection, invest in enhanced conversions and Customer Match',
      },
      {
        title: 'Stable Performance on Google Search Core',
        trajectory: 'stable',
        description:
          'Brand and model-specific keyword campaigns have maintained steady CTR and CVR over 6 months, confirming a healthy account structure and relevant ad copy.',
        source: 'Internal account performance data',
        response:
          'Maintain current approach, run creative refresh every 90 days to avoid fatigue',
      },
    ],
  },
};
