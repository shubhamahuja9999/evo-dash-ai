// API Response Types
export interface AnalyticsData {
  name: string;
  value: number;
  conversions: number;
}

export interface TrafficSource {
  name: string;
  value: number;
  color: string;
}
export interface AnalyticsStats {
  totalImpressions: string;
  totalClicks: string;
  totalConversions: string;
  totalCost: string;
  revenue: string;
  conversionRate: string;
  avgCTR: string;
  avgCPC: string;
  costPerConversion: string;
}

export interface AnalyticsComparison {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalCost: number;
  revenue: number;
  conversionRate: number;
  avgCTR: number;
  avgCPC: number;
}

export interface AnalyticsStatsResponse {
  current: AnalyticsStats;
  previous?: AnalyticsStats;
  comparison?: AnalyticsComparison;
}

export interface DailyStat {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  costPerConversion: number | null;
}

export interface AnalyticsResponse {
  dailyStats: DailyStat[];
  totalStats: AnalyticsStats;
}

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED' | 'DRAFT';
  budget: number;
  startDate?: string;
  endDate?: string;
  targetAudience?: string;
  campaignType?: string;
  optimizationScore?: number;
  bidStrategy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  totalImpressions: string;
  totalClicks: string;
  totalConversions: string;
  totalCost: string;
  conversionRate: string;
  avgCTR: string;
  avgCPC: string;
  costPerConversion: string;
}

export interface CampaignComparison {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalCost: number;
  conversionRate: number;
  avgCTR: number;
  avgCPC: number;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  costPerConversion: number;
}

export interface CampaignStatsResponse {
  current: CampaignStats;
  previous?: CampaignStats;
  comparison?: CampaignComparison;
}

export interface CampaignWithStats extends Campaign {
  stats: CampaignMetrics;
  recommendations?: MLRecommendation[];
}

export interface MLRecommendation {
  id: string;
  type: 'BUDGET_OPTIMIZATION' | 'KEYWORD_OPTIMIZATION' | 'AD_COPY_IMPROVEMENT' | 'TARGETING_REFINEMENT' | 'PERFORMANCE_ANALYSIS';
  title: string;
  description: string;
  content?: string;
  confidence: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isApplied: boolean;
}

export interface CampaignResponse {
  campaigns: CampaignWithStats[];
  totalCount: number;
  pageCount: number;
}