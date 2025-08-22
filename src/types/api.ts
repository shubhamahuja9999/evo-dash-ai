// TypeScript types for API data

export interface AnalyticsData {
  name: string;
  value: number;
  conversions: number;
  revenue?: number;
  users?: number;
}

export interface AnalyticsStats {
  totalUsers: string;
  revenue: string;
  conversionRate: string;
  aiScore: string;
}

export interface TrafficSource {
  id: string;
  name: string;
  value: number;
  color: string;
  date: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  budget: string;
  spent: string;
  impressions: string;
  clicks: string;
  ctr: string;
  conversions: number;
  startDate: string;
  endDate: string;
}

export interface CampaignStats {
  activeCampaigns: number;
  totalConversions: string;
  totalImpressions: string;
  avgCTR: string;
}

export interface Insight {
  id: string;
  type: 'opportunity' | 'alert' | 'insight' | 'recommendation' | 'success';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  category: string;
  isApplied?: boolean;
}

export interface InsightStats {
  totalInsights: number;
  highPriority: number;
  opportunities: number;
  avgConfidence: number;
}

export interface HealthCheck {
  status: string;
  message: string;
}
