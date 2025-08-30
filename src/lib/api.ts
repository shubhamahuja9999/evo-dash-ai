import axios from 'axios';
import { format } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Campaign Metrics API
export const campaignMetricsApi = {
  getCampaignMetrics: async (dateParams?: DateRangeParams) => {
    const queryString = dateParams ? buildQueryString(dateParams) : ''
    const response = await api.get(`/api/campaign-metrics${queryString}`);
    return response.data;
  },

  getCampaignNames: async () => {
    const response = await api.get('/api/campaign-metrics/campaigns');
    return response.data;
  },

  getDateRange: async () => {
    const response = await api.get('/api/campaign-metrics/date-range');
    return response.data;
  }
};

// Analytics API
export const analyticsApi = {
  getAnalytics: async (dateParams?: DateRangeParams) => {
    const queryString = dateParams ? buildQueryString(dateParams) : ''
    const response = await api.get(`/api/analytics${queryString}`);
    return response.data;
  },

  getStats: async (dateParams?: DateRangeParams) => {
    const queryString = dateParams ? buildQueryString(dateParams) : ''
    const response = await api.get(`/api/analytics/stats${queryString}`);
    return response.data;
  },

  // Method to fetch both current and previous period data for comparison
  getStatsWithComparison: async (currentParams: DateRangeParams, previousParams?: DateRangeParams) => {
    const currentPromise = analyticsApi.getStats(currentParams)
    const previousPromise = previousParams ? analyticsApi.getStats(previousParams) : Promise.resolve(null)
    
    const [current, previous] = await Promise.all([currentPromise, previousPromise])
    
    return {
      current,
      previous,
      comparison: previous ? {
        totalUsers: calculatePercentageChange(
          parseInt(current.totalUsers.replace(/,/g, '')), 
          parseInt(previous.totalUsers.replace(/,/g, ''))
        ),
        revenue: calculatePercentageChange(
          parseFloat(current.revenue.replace(/[₹,]/g, '')),
          parseFloat(previous.revenue.replace(/[₹,]/g, ''))
        ),
        conversionRate: calculatePercentageChange(
          parseFloat(current.conversionRate.replace('%', '')),
          parseFloat(previous.conversionRate.replace('%', ''))
        ),
      } : null
    }
  },

  getTrafficSources: async () => {
    const response = await api.get('/api/traffic-sources');
    return response.data;
  },
};

// Campaigns API
export const campaignsApi = {
  getCampaigns: async (dateParams?: DateRangeParams) => {
    const queryString = dateParams ? buildQueryString(dateParams) : ''
    const response = await api.get(`/api/campaigns${queryString}`);
    return response.data;
  },
  
  // Force a campaign fetch
  forceFetch: async () => {
    const response = await api.post('/api/campaigns/fetch');
    return response.data;
  },
  
  // Get last fetch time
  getLastFetchTime: async () => {
    const response = await api.get('/api/campaigns/last-fetch');
    return response.data;
  },

  getStats: async (dateParams?: DateRangeParams) => {
    const queryString = dateParams ? buildQueryString(dateParams) : ''
    const response = await api.get(`/api/campaigns/stats${queryString}`);
    return response.data;
  },

  // Method to fetch both current and previous period data for comparison
  getStatsWithComparison: async (currentParams: DateRangeParams, previousParams?: DateRangeParams) => {
    const currentPromise = campaignsApi.getStats(currentParams)
    const previousPromise = previousParams ? campaignsApi.getStats(previousParams) : Promise.resolve(null)
    
    const [current, previous] = await Promise.all([currentPromise, previousPromise])
    
    return {
      current,
      previous,
      comparison: previous ? {
        totalConversions: calculatePercentageChange(
          parseInt(current.totalConversions.replace(/,/g, '')), 
          parseInt(previous.totalConversions.replace(/,/g, ''))
        ),
        totalImpressions: calculatePercentageChange(
          parseInt(current.totalImpressions.replace(/,/g, '')),
          parseInt(previous.totalImpressions.replace(/,/g, ''))
        ),
        avgCTR: calculatePercentageChange(
          parseFloat(current.avgCTR.replace('%', '')),
          parseFloat(previous.avgCTR.replace('%', ''))
        ),
      } : null
    }
  },
};

// Insights API
export const insightsApi = {
  getInsights: async () => {
    const response = await api.get('/api/insights');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/insights/stats');
    return response.data;
  },
  
  // Get AI-generated insights from essays
  getEssayInsights: async () => {
    const response = await api.get('/api/insights/essays');
    return response.data;
  },
  
  // Get AI-generated insights stats from essays
  getEssayInsightStats: async () => {
    const response = await api.get('/api/insights/essays/stats');
    return response.data;
  },
  
  // Generate insights from essays based on type
  generateInsightFromEssays: async (insightType: string, campaignData?: any, analyticsData?: any) => {
    console.log(`Generating ${insightType} insights from essays`, { campaignData, analyticsData });
    
    try {
      const response = await api.post('/api/insights/generate', {
        insightType,
        campaignData,
        analyticsData
      });
      
      console.log(`Generated ${insightType} insights:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  },
};

// Health check
export const healthApi = {
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

// CUA (Command User Access) API
export const cuaApi = {
  getCommands: async () => {
    const response = await api.get('/api/cua/commands');
    return response.data;
  },

  executeCommand: async (command: string, description?: string, metadata?: any) => {
    const response = await api.post('/api/cua/command', {
      command,
      description,
      metadata,
      userId: 'current-user-id', // This should come from auth context
    });
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get('/api/cua/users');
    return response.data;
  },

  getAudits: async () => {
    const response = await api.get('/api/cua/audits');
    return response.data;
  },

  getLatestAudit: async () => {
    const response = await api.get('/api/cua/audit/latest');
    return response.data;
  },
  
  // Python Automation
  startAutomation: async (script: 'cua_automation.py' | 'fetch_campaigns.py', command?: string) => {
    return api.post('/api/cua/automation', {
      script,
      command
    });
  },
  
  stopAutomation: async () => {
    const response = await api.post('/api/cua/automation/stop');
    return response.data;
  },
};