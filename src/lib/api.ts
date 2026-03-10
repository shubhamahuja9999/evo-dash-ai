import { format } from 'date-fns';
import {
  mockAnalyticsData,
  mockAnalyticsStatsCurrent,
  mockAnalyticsStatsWithComparison,
  mockTrafficSources,
  mockCampaignsResponse,
  mockInsightsByType,
} from './mock-data';

// ─── Helpers (kept for any consumers that import them) ─────────────────────

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Helper function to format date for API
const formatDateForAPI = (date: Date): string => {
  return format(new Date(date), 'yyyy-MM-dd');
}

// Helper function to build query string
const buildQueryString = (params: DateRangeParams): string => {
  const searchParams = new URLSearchParams()

  if (params.startDate) searchParams.append('startDate', params.startDate)
  if (params.endDate) searchParams.append('endDate', params.endDate)
  if (params.dateRange) searchParams.append('dateRange', params.dateRange)

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export interface DateRangeParams {
  startDate?: string
  endDate?: string
  dateRange?: string
}

// ─── Campaign Metrics API ─────────────────────────────────────────────────────

export const campaignMetricsApi = {
  getCampaignMetrics: async (_dateParams?: DateRangeParams) => {
    return Promise.resolve(mockCampaignsResponse.campaigns);
  },

  getCampaignNames: async () => {
    return Promise.resolve(
      mockCampaignsResponse.campaigns.map((c) => ({ id: c.id, name: c.name }))
    );
  },

  getDateRange: async () => {
    return Promise.resolve({ startDate: '2025-01-01', endDate: '2025-12-31' });
  },
};

// ─── Analytics API ────────────────────────────────────────────────────────────

export const analyticsApi = {
  getAnalytics: async (_dateParams?: DateRangeParams) => {
    return Promise.resolve(mockAnalyticsData);
  },

  getStats: async (_dateParams?: DateRangeParams) => {
    return Promise.resolve(mockAnalyticsStatsCurrent);
  },

  // Method to fetch both current and previous period data for comparison
  getStatsWithComparison: async (
    _currentParams: DateRangeParams,
    _previousParams?: DateRangeParams
  ) => {
    return Promise.resolve(mockAnalyticsStatsWithComparison);
  },

  getTrafficSources: async () => {
    return Promise.resolve(mockTrafficSources);
  },
};

// ─── Campaigns API ────────────────────────────────────────────────────────────

export const campaignsApi = {
  getCampaigns: async (_dateParams?: DateRangeParams) => {
    return Promise.resolve(mockCampaignsResponse);
  },

  // Force a campaign fetch (no-op in mock mode)
  forceFetch: async () => {
    return Promise.resolve({ success: true, message: 'Mock fetch completed' });
  },

  // Get last fetch time
  getLastFetchTime: async () => {
    return Promise.resolve({ lastFetchTime: new Date().toISOString() });
  },

  getStats: async (_dateParams?: DateRangeParams) => {
    return Promise.resolve({
      totalConversions: '3,105',
      totalImpressions: '6,20,600',
      avgCTR: '7.87%',
      avgCPC: '₹12.29',
      totalCost: '₹5,13,000',
      conversionRate: '5.00%',
      costPerConversion: '₹165.23',
      totalClicks: '51,470',
    });
  },

  // Method to fetch both current and previous period data for comparison
  getStatsWithComparison: async (
    _currentParams: DateRangeParams,
    _previousParams?: DateRangeParams
  ) => {
    const current = await campaignsApi.getStats(_currentParams);
    return Promise.resolve({
      current,
      previous: null,
      comparison: null,
    });
  },
};

// ─── Insights API ─────────────────────────────────────────────────────────────

export const insightsApi = {
  getInsights: async () => {
    return Promise.resolve(Object.values(mockInsightsByType));
  },

  getStats: async () => {
    return Promise.resolve({
      totalInsights: 6,
      lastGenerated: new Date().toISOString(),
    });
  },

  // Get AI-generated insights from essays
  getEssayInsights: async () => {
    return Promise.resolve(Object.entries(mockInsightsByType).map(([type, data]) => ({
      type,
      data,
    })));
  },

  // Get AI-generated insights stats from essays
  getEssayInsightStats: async () => {
    return Promise.resolve({
      totalEssays: 6,
      insightsGenerated: Object.keys(mockInsightsByType).length,
    });
  },

  // Generate insights from essays based on type (returns mock data for the type)
  generateInsightFromEssays: async (
    insightType: string,
    _campaignData?: any,
    _analyticsData?: any
  ) => {
    // Simulate a small async delay for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 600));
    const mockResponse = mockInsightsByType[insightType] ?? {
      message: 'No mock data for this insight type',
    };
    return { response: mockResponse };
  },
};

// ─── Health check ─────────────────────────────────────────────────────────────

export const healthApi = {
  checkHealth: async () => {
    return Promise.resolve({ status: 'ok', mode: 'mock' });
  },
};

// ─── CUA API (no-op stubs) ────────────────────────────────────────────────────

export const cuaApi = {
  getCommands: async () => Promise.resolve([]),
  executeCommand: async (_command: string, _description?: string, _metadata?: any) =>
    Promise.resolve({ success: true }),
  getUsers: async () => Promise.resolve([]),
  getAudits: async () => Promise.resolve([]),
  getLatestAudit: async () => Promise.resolve(null),
  startAutomation: async (_script: 'cua_automation.py' | 'fetch_campaigns.py', _command?: string) =>
    Promise.resolve({ success: true }),
  stopAutomation: async () => Promise.resolve({ success: true }),
};

// Keep the axios instance export for any components that import it directly
// (it is no longer used internally but external components may reference it)
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});