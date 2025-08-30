// Google Ads API utility functions for frontend

const API_BASE = '/api';

export interface GoogleAdsApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
  actions?: string[];
  suggestions?: string[];
  sessionId?: string;
}

class GoogleAdsAPI {
  private static getUserId(): string {
    return 'default-user-id'; // In a real app, get from auth context
  }

  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<GoogleAdsApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.getUserId(),
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Dashboard
  static async getDashboardData(timeframe: string = '30d') {
    return this.request(`/google-ads/dashboard?timeframe=${timeframe}`);
  }

  // Chat
  static async sendChatMessage(message: string, sessionId?: string) {
    return this.request('/google-ads/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }

  static async getChatSessions() {
    return this.request('/google-ads/chat/sessions');
  }

  static async getChatHistory(sessionId: string) {
    return this.request(`/google-ads/chat/sessions/${sessionId}/history`);
  }

  // Automation Tasks
  static async getAutomationTasks() {
    return this.request('/google-ads/automation/tasks');
  }

  static async createAutomationTask(task: {
    name: string;
    type: string;
    accountId: string;
    schedule: string;
    isActive?: boolean;
  }) {
    return this.request('/google-ads/automation/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  static async pauseAutomationTask(taskId: string) {
    return this.request(`/google-ads/automation/tasks/${taskId}/pause`, {
      method: 'POST',
    });
  }

  static async resumeAutomationTask(taskId: string) {
    return this.request(`/google-ads/automation/tasks/${taskId}/resume`, {
      method: 'POST',
    });
  }

  static async triggerDailyOptimization(accountId: string) {
    return this.request('/google-ads/automation/trigger-daily', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
  }

  static async getAutomationStatus() {
    return this.request('/google-ads/automation/status');
  }

  // Account Management
  static async getAccountSummary(accountId: string) {
    return this.request(`/google-ads/account/${accountId}/summary`);
  }

  static async getAccountBilling(accountId: string) {
    return this.request(`/google-ads/account/${accountId}/billing`);
  }

  static async fixPaymentProblems(accountId: string) {
    return this.request(`/google-ads/account/${accountId}/fix-payment`, {
      method: 'POST',
    });
  }

  // Keyword Management
  static async findNegativeKeywords(accountId: string) {
    return this.request(`/google-ads/account/${accountId}/negative-keywords`);
  }

  static async addNegativeKeywords(accountId: string, keywords: any[]) {
    return this.request(`/google-ads/account/${accountId}/negative-keywords`, {
      method: 'POST',
      body: JSON.stringify({ negativeKeywords: keywords }),
    });
  }

  static async getKeywordPerformance(accountId: string, timeframe: string = '30d') {
    return this.request(`/google-ads/account/${accountId}/keyword-performance?timeframe=${timeframe}`);
  }

  static async optimizeBids(accountId: string) {
    return this.request(`/google-ads/account/${accountId}/optimize-bids`, {
      method: 'POST',
    });
  }

  // Ad Testing
  static async createAdTest(accountId: string, adGroupId: string, baseAd: any) {
    return this.request(`/google-ads/account/${accountId}/ad-tests`, {
      method: 'POST',
      body: JSON.stringify({ adGroupId, baseAd }),
    });
  }

  static async getAdPerformance(accountId: string, adIds: string[]) {
    return this.request(`/google-ads/account/${accountId}/ad-performance?adIds=${adIds.join(',')}`);
  }

  // Smart Targeting
  static async getGeographicPerformance(accountId: string) {
    return this.request(`/google-ads/account/${accountId}/geographic-performance`);
  }

  static async adjustBidsByLocation(accountId: string, adjustments: any[]) {
    return this.request(`/google-ads/account/${accountId}/adjust-bids-location`, {
      method: 'POST',
      body: JSON.stringify({ adjustments }),
    });
  }

  // Daily Optimization
  static async runDailyOptimization(accountId: string) {
    return this.request(`/google-ads/account/${accountId}/daily-optimization`, {
      method: 'POST',
    });
  }
}

export default GoogleAdsAPI;
