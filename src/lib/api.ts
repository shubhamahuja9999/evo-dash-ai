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
