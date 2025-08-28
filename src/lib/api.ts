// API service for fetching data from the backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface DateRangeParams {
  startDate?: string
  endDate?: string
  dateRange?: string
}

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Helper function to format date for API
const formatDateForAPI = (date: Date): string => {
  return date.toISOString();
}

// Helper function to build query string
const buildQueryString = (params: DateRangeParams): string => {
  const searchParams = new URLSearchParams()
  
  if (params.startDate) searchParams.append('startDate', formatDateForAPI(new Date(params.startDate)))
  if (params.endDate) searchParams.append('endDate', formatDateForAPI(new Date(params.endDate)))
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

// Analytics API
export const analyticsApi = {
  getAnalytics: async (dateParams?: DateRangeParams) => {
    const queryString = dateParams ? buildQueryString(dateParams) : ''
    const response = await fetch(`${API_BASE_URL}/api/analytics${queryString}`);
    if (!response.ok) {
      throw new Error('Failed to fetch analytics data');
    }
    return response.json();
  },

  getStats: async (dateParams?: DateRangeParams) => {
    const queryString = dateParams ? buildQueryString(dateParams) : ''
    const response = await fetch(`${API_BASE_URL}/api/analytics/stats${queryString}`);
    if (!response.ok) {
      throw new Error('Failed to fetch analytics stats');
    }
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/traffic-sources`);
    if (!response.ok) {
      throw new Error('Failed to fetch traffic sources');
    }
    return response.json();
  },
};

// Campaigns API
export const campaignsApi = {
  getCampaigns: async (dateParams?: DateRangeParams) => {
    // If dateRange is provided, convert it to start/end dates
    let queryParams = { ...dateParams };
    if (dateParams?.dateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateParams.dateRange) {
        case 'today':
          queryParams = {
            startDate: today.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
          };
          break;
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          queryParams = {
            startDate: yesterday.toISOString().split('T')[0],
            endDate: yesterday.toISOString().split('T')[0],
          };
          break;
        }
        case 'last_7_days': {
          const last7Days = new Date(today);
          last7Days.setDate(last7Days.getDate() - 7);
          queryParams = {
            startDate: last7Days.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
          };
          break;
        }
        case 'last_30_days': {
          const last30Days = new Date(today);
          last30Days.setDate(last30Days.getDate() - 30);
          queryParams = {
            startDate: last30Days.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
          };
          break;
        }
        case 'this_month': {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          queryParams = {
            startDate: startOfMonth.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
          };
          break;
        }
        case 'last_month': {
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          queryParams = {
            startDate: startOfLastMonth.toISOString().split('T')[0],
            endDate: endOfLastMonth.toISOString().split('T')[0],
          };
          break;
        }
      }
    }

    const queryString = buildQueryString(queryParams);
    const response = await fetch(`${API_BASE_URL}/api/campaigns${queryString}`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaigns');
    }
    return response.json();
  },
  
  // Force a campaign fetch
  forceFetch: async () => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/fetch`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to trigger campaign fetch');
    }
    return response.json();
  },
  
  // Get last fetch time
  getLastFetchTime: async () => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/last-fetch`);
    if (!response.ok) {
      throw new Error('Failed to get last fetch time');
    }
    return response.json();
  },

  getStats: async (dateParams?: DateRangeParams) => {
    const queryString = dateParams ? buildQueryString(dateParams) : ''
    const response = await fetch(`${API_BASE_URL}/api/campaigns/stats${queryString}`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaign stats');
    }
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/insights`);
    if (!response.ok) {
      throw new Error('Failed to fetch insights');
    }
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/insights/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch insight stats');
    }
    return response.json();
  },
  
  // Get AI-generated insights from essays
  getEssayInsights: async () => {
    const response = await fetch(`${API_BASE_URL}/api/insights/essays`);
    if (!response.ok) {
      throw new Error('Failed to fetch essay insights');
    }
    return response.json();
  },
  
  // Get AI-generated insights stats from essays
  getEssayInsightStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/insights/essays/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch essay insight stats');
    }
    return response.json();
  },
  
  // Generate insights from essays based on type
  generateInsightFromEssays: async (insightType: string, campaignData?: any, analyticsData?: any) => {
    console.log(`Generating ${insightType} insights from essays`, { campaignData, analyticsData });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/insights/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insightType,
          campaignData,
          analyticsData
        }),
      });
      
      if (!response.ok) {
        let errorInfo;
        try {
          // Try to parse error as JSON
          errorInfo = await response.json();
          console.error(`Failed to generate insights:`, errorInfo);
        } catch (e) {
          // If not JSON, get as text
          const errorText = await response.text();
          console.error(`Failed to generate insights: ${errorText}`);
          errorInfo = { message: errorText };
        }
        
        const error = new Error(`Failed to generate insights: ${response.status}`);
        // @ts-ignore - Add response to error object for more details
        error.response = response;
        // @ts-ignore - Add error info to error object
        error.errorInfo = errorInfo;
        throw error;
      }
      
      const data = await response.json();
      console.log(`Generated ${insightType} insights:`, data);
      return data;
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  },
};

// Health check
export const healthApi = {
  checkHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  },
};

// CUA (Command User Access) API
export const cuaApi = {
  getCommands: async () => {
    const response = await fetch(`${API_BASE_URL}/api/cua/commands`);
    if (!response.ok) {
      throw new Error('Failed to fetch CUA commands');
    }
    return response.json();
  },

  executeCommand: async (command: string, description?: string, metadata?: any) => {
    const response = await fetch(`${API_BASE_URL}/api/cua/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command,
        description,
        metadata,
        userId: 'current-user-id', // This should come from auth context
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to execute CUA command');
    }
    return response.json();
  },

  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/api/cua/users`);
    if (!response.ok) {
      throw new Error('Failed to fetch CUA users');
    }
    return response.json();
  },

  getAudits: async () => {
    const response = await fetch(`${API_BASE_URL}/api/cua/audits`);
    if (!response.ok) {
      throw new Error('Failed to fetch CUA audits');
    }
    return response.json();
  },

  getLatestAudit: async () => {
    const response = await fetch(`${API_BASE_URL}/api/cua/audit/latest`);
    if (!response.ok) {
      throw new Error('Failed to fetch latest CUA audit');
    }
    return response.json();
  },
  
  // Python Automation
  startAutomation: async (script: 'cua_automation.py' | 'fetch_campaigns.py', command?: string) => {
    return fetch(`${API_BASE_URL}/api/cua/automation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script,
        command
      }),
    });
  },
  
  stopAutomation: async () => {
    const response = await fetch(`${API_BASE_URL}/api/cua/automation/stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to stop automation');
    }
    return response.json();
  },
};
