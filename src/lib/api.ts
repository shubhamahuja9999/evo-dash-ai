// API service for fetching data from the backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Analytics API
export const analyticsApi = {
  getAnalytics: async () => {
    const response = await fetch(`${API_BASE_URL}/api/analytics`);
    if (!response.ok) {
      throw new Error('Failed to fetch analytics data');
    }
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/analytics/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch analytics stats');
    }
    return response.json();
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
  getCampaigns: async () => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaigns');
    }
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaign stats');
    }
    return response.json();
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
