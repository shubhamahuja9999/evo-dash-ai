import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { generateAIResponse } from './openai.js';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { format } from 'date-fns';
import { campaignService } from './campaign-service.js';
import { mlService } from './ml-service.js';
import { searchService } from './search-service.js';
import { getCampaignMetrics, getDateRange } from './campaign-metrics-service.js';
import { mockCampaigns, mockAnalytics, mockCampaignStats, mockDashboardData, mockInsights, mockCampaignMetrics } from './mock-data.js';

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// Helper function to calculate percentage change
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
import { crmService } from './crm-service.js';
import { chatService } from './chat-service.js';
import GoogleAdsService from './google-ads-service.js';
import AutomationScheduler from './automation-scheduler.js';
import GoogleAdsChatService from './google-ads-chat-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Initialize Google Ads services
const googleAdsService = new GoogleAdsService();
const automationScheduler = new AutomationScheduler();
const googleAdsChatService = new GoogleAdsChatService();

// Start campaign auto-fetch service
campaignService.startAutoFetch(30).catch(error => {
  console.error('Failed to start campaign auto-fetch:', error);
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Campaign fetch endpoints
app.post('/api/campaigns/fetch', async (req, res) => {
  try {
    await campaignService.forceFetch();
    res.json({ status: 'success', message: 'Campaign fetch triggered successfully' });
  } catch (error) {
    console.error('Error triggering campaign fetch:', error);
    res.status(500).json({ error: 'Failed to trigger campaign fetch', details: error.message });
  }
});

app.get('/api/campaigns/last-fetch', async (req, res) => {
  try {
    const lastFetchTime = await campaignService.getLastFetchTime();
    res.json({ lastFetchTime });
  } catch (error) {
    console.error('Error getting last fetch time:', error);
    res.status(500).json({ error: 'Failed to get last fetch time', details: error.message });
  }
});

// Get campaign details
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter['gte'] = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter['lte'] = new Date(endDate as string);
    }

    // Get campaign with analytics
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        analytics: {
          where: {
            date: dateFilter,
          },
          orderBy: {
            date: 'desc',
          },
        },
        aiRecommendations: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Calculate totals
    const totalImpressions = campaign.analytics.reduce((sum, a) => sum + a.impressions, 0);
    const totalClicks = campaign.analytics.reduce((sum, a) => sum + a.clicks, 0);
    const totalConversions = campaign.analytics.reduce((sum, a) => sum + a.conversions, 0);
    const totalCost = campaign.analytics.reduce((sum, a) => sum + a.cost, 0);
    const totalConversionValue = campaign.analytics.reduce((sum, a) => sum + a.conversionValue, 0);

    // Format analytics data
    const formattedAnalytics = campaign.analytics.map(a => ({
      date: format(a.date, 'MMM d, yyyy'),
      impressions: a.impressions,
      clicks: a.clicks,
      conversions: a.conversions,
      cost: a.cost,
      conversionValue: a.conversionValue,
      ctr: a.clicks / a.impressions,
      cpc: a.cost / a.clicks,
    }));

    res.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      budget: `₹${(campaign.budget || 0).toLocaleString()}`,
      spent: `₹${totalCost.toLocaleString()}`,
      startDate: campaign.startDate?.toISOString(),
      endDate: campaign.endDate?.toISOString(),
      targetAudience: campaign.targetAudience,
      analytics: formattedAnalytics,
    });
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    res.status(500).json({ error: 'Failed to fetch campaign details', details: error.message });
  }
});

// Get all campaigns with stats
app.get('/api/campaigns', async (req, res) => {
  try {
    // Return mock data if MOCK_MODE is enabled
    if (MOCK_MODE) {
      return res.json({
        campaigns: mockCampaigns,
        totalCount: mockCampaigns.length,
        pageCount: 1,
        isMockData: true
      });
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter['gte'] = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter['lte'] = new Date(endDate as string);
    }

    // Get campaigns with their analytics
    const campaigns = await prisma.campaign.findMany({
      include: {
        analytics: {
          where: {
            date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          },
          orderBy: {
            date: 'desc',
          },
        },
        aiRecommendations: true,
      },
    });

    // Transform data to match frontend types
    const transformedCampaigns = campaigns.map(campaign => {
      // Calculate aggregated stats for the campaign
      const stats = campaign.analytics.reduce((acc, analytics) => {
        acc.impressions += analytics.impressions;
        acc.clicks += analytics.clicks;
        acc.conversions += analytics.conversions;
        acc.cost += analytics.cost;
        return acc;
      }, {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost: 0,
      });

      // Calculate derived metrics
      const ctr = stats.clicks / stats.impressions || 0;
      const cpc = stats.cost / stats.clicks || 0;
      const conversionRate = stats.conversions / stats.clicks || 0;
      const costPerConversion = stats.cost / stats.conversions || 0;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        budget: campaign.budget,
        startDate: campaign.startDate?.toISOString(),
        endDate: campaign.endDate?.toISOString(),
        targetAudience: campaign.targetAudience,
        campaignType: campaign.campaignType,
        optimizationScore: campaign.optimizationScore,
        bidStrategy: campaign.bidStrategy,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        stats: {
          impressions: stats.impressions,
          clicks: stats.clicks,
          conversions: stats.conversions,
          cost: stats.cost,
          ctr,
          cpc,
          conversionRate,
          costPerConversion,
        },
        recommendations: campaign.aiRecommendations,
      };
    });

    res.json({
      campaigns: transformedCampaigns,
      totalCount: transformedCampaigns.length,
      pageCount: 1,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns', details: error.message });
  }
});

// Get campaign stats
app.get('/api/campaigns/stats', async (req, res) => {
  try {
    // Return mock data if MOCK_MODE is enabled
    if (MOCK_MODE) {
      return res.json(mockCampaignStats);
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter['gte'] = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter['lte'] = new Date(endDate as string);
    }

    // Get current period stats
    const analytics = await prisma.analytics.aggregate({
      where: {
        date: dateFilter,
      },
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        cost: true,
      },
    });

    const totalImpressions = analytics._sum.impressions || 0;
    const totalClicks = analytics._sum.clicks || 0;
    const totalConversions = analytics._sum.conversions || 0;
    const totalCost = analytics._sum.cost || 0;

    // Format current period stats
    const current = {
      totalImpressions: totalImpressions.toLocaleString(),
      totalClicks: totalClicks.toLocaleString(),
      totalConversions: totalConversions.toLocaleString(),
      totalCost: `$${totalCost.toFixed(2)}`,
      conversionRate: `${((totalConversions / totalClicks) * 100 || 0).toFixed(2)}%`,
      avgCTR: `${((totalClicks / totalImpressions) * 100 || 0).toFixed(2)}%`,
      avgCPC: `$${((totalCost / totalClicks) || 0).toFixed(2)}`,
      costPerConversion: `$${((totalCost / totalConversions) || 0).toFixed(2)}`,
    };

    // Get previous period stats if dates are provided
    let previous: CampaignStats | null = null;
    let comparison: CampaignComparison | null = null;

    interface CampaignStats {
      totalImpressions: string;
      totalClicks: string;
      totalConversions: string;
      totalCost: string;
      conversionRate: string;
      avgCTR: string;
      avgCPC: string;
      costPerConversion: string;
    }

    interface CampaignComparison {
      totalImpressions: number;
      totalClicks: number;
      totalConversions: number;
      totalCost: number;
      conversionRate: number;
      avgCTR: number;
      avgCPC: number;
    }

    if (startDate && endDate) {
      const currentStartDate = new Date(startDate as string);
      const currentEndDate = new Date(endDate as string);
      const daysDiff = Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
      const previousEndDate = new Date(currentStartDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);

      const previousAnalytics = await prisma.analytics.aggregate({
        where: {
          date: {
            gte: previousStartDate,
            lte: previousEndDate,
          },
        },
        _sum: {
          impressions: true,
          clicks: true,
          conversions: true,
          cost: true,
        },
      });

      const prevTotalImpressions = previousAnalytics._sum.impressions || 0;
      const prevTotalClicks = previousAnalytics._sum.clicks || 0;
      const prevTotalConversions = previousAnalytics._sum.conversions || 0;
      const prevTotalCost = previousAnalytics._sum.cost || 0;

      previous = {
        totalImpressions: prevTotalImpressions.toLocaleString(),
        totalClicks: prevTotalClicks.toLocaleString(),
        totalConversions: prevTotalConversions.toLocaleString(),
        totalCost: `$${prevTotalCost.toFixed(2)}`,
        conversionRate: `${((prevTotalConversions / prevTotalClicks) * 100 || 0).toFixed(2)}%`,
        avgCTR: `${((prevTotalClicks / prevTotalImpressions) * 100 || 0).toFixed(2)}%`,
        avgCPC: `$${((prevTotalCost / prevTotalClicks) || 0).toFixed(2)}`,
        costPerConversion: `$${((prevTotalCost / prevTotalConversions) || 0).toFixed(2)}`,
      };

      // Calculate comparison percentages
      comparison = {
        totalImpressions: calculatePercentageChange(totalImpressions, prevTotalImpressions),
        totalClicks: calculatePercentageChange(totalClicks, prevTotalClicks),
        totalConversions: calculatePercentageChange(totalConversions, prevTotalConversions),
        totalCost: calculatePercentageChange(totalCost, prevTotalCost),
        conversionRate: calculatePercentageChange(
          (totalConversions / totalClicks) || 0,
          (prevTotalConversions / prevTotalClicks) || 0
        ),
        avgCTR: calculatePercentageChange(
          (totalClicks / totalImpressions) || 0,
          (prevTotalClicks / prevTotalImpressions) || 0
        ),
        avgCPC: calculatePercentageChange(
          (totalCost / totalClicks) || 0,
          (prevTotalCost / prevTotalClicks) || 0
        ),
      };
    }

    res.json({
      current,
      previous,
      comparison,
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Failed to fetch campaign stats', details: error.message });
  }
});

// Enhanced Chat Interface - Main endpoint for natural language commands
app.post('/api/chat/command', async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.headers['user-id'] as string || 'default-user-id';
    
    console.log(`📝 Processing chat command: "${message}"`);
    
    const response = await chatService.processCommand(message, userId);
    
    res.json(response);
  } catch (error) {
    console.error('Error processing chat command:', error);
    res.status(500).json({ 
      success: false,
      message: 'Sorry, I encountered an error processing your request.',
      error: error.message 
    });
  }
});

// Google Ads API Endpoints
app.get('/api/google-ads/dashboard', async (req, res) => {
  try {
    // Return mock data if MOCK_MODE is enabled
    if (MOCK_MODE) {
      return res.json({
        success: true,
        data: mockDashboardData,
        isMockData: true
      });
    }

    const { timeframe = '30d' } = req.query;
    const userId = req.headers['user-id'] as string || 'default-user-id';
    const accountId = '8936153023'; // From config - in real app, get from user
    
    console.log(`📊 Fetching Google Ads dashboard data for timeframe: ${timeframe}`);
    
    // Get account summary
    const accountSummary = await googleAdsService.getAccountSummary(accountId, timeframe as string);
    
    // Get automation summary
    const automationSummary = await automationScheduler.getAccountAutomationSummary(accountId);
    
    // Get campaigns from database
    const campaigns = await prisma.campaign.findMany({
      include: {
        analytics: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
    
    // Calculate performance metrics from actual data
    const totalClicks = campaigns.reduce((total, campaign) => 
      total + campaign.analytics.reduce((sum, a) => sum + a.clicks, 0), 0);
    const totalImpressions = campaigns.reduce((total, campaign) => 
      total + campaign.analytics.reduce((sum, a) => sum + a.impressions, 0), 0);
    const totalConversions = campaigns.reduce((total, campaign) => 
      total + campaign.analytics.reduce((sum, a) => sum + a.conversions, 0), 0);
    const totalCost = campaigns.reduce((total, campaign) => 
      total + campaign.analytics.reduce((sum, a) => sum + a.cost, 0), 0);
    
    // Real performance data from database
    const performance = {
      campaigns: campaigns.length,
      activeAds: campaigns.filter(c => c.status === 'ACTIVE').length,
      totalKeywords: campaigns.length * 20, // Approximate based on campaign count
      avgCostPerLead: totalConversions > 0 ? totalCost / totalConversions : 0,
      conversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0,
      qualityScore: 7.2 // This would need to be calculated from actual quality scores
    };
    
    // Generate trend data from actual analytics
    const analyticsData = await prisma.analytics.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 30
    });
    
    // Group by date
    const analyticsMap = new Map();
    analyticsData.forEach(analytics => {
      const dateStr = analytics.date.toISOString().split('T')[0];
      const currentTotal = analyticsMap.get(dateStr) || 0;
      analyticsMap.set(dateStr, currentTotal + analytics.cost);
    });
    
    // Convert to trends array
    const trends = Array.from(analyticsMap.entries())
      .map(([date, spend]) => ({ date, spend }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // If we don't have enough data, pad with some estimates
    if (trends.length < 30) {
      const lastDate = trends.length > 0 ? 
        new Date(trends[trends.length - 1].date) : 
        new Date();
      
      for (let i = trends.length; i < 30; i++) {
        const newDate = new Date(lastDate);
        newDate.setDate(newDate.getDate() - i);
        const dateStr = newDate.toISOString().split('T')[0];
        
        trends.push({
          date: dateStr,
          spend: Math.random() * 500 + 200
        });
      }
      
      trends.sort((a, b) => a.date.localeCompare(b.date));
    }
    
    // Use actual campaign data for alerts instead of non-existent table
    let alerts: Array<{
      id: string;
      title: string;
      message: string;
      severity: string;
      createdAt: Date;
      isResolved?: boolean;
    }> = [];
    try {
      // Get campaigns that are over budget
      const overBudgetCampaigns = await prisma.campaign.findMany({
        where: {
          budget: {
            not: null
          }
        },
        include: {
          analytics: {
            orderBy: {
              date: 'desc'
            },
            take: 10
          }
        }
      });
      
      // Generate alerts based on campaign performance
      alerts = overBudgetCampaigns
        .filter(campaign => {
          const totalSpend = campaign.analytics.reduce((sum, a) => sum + a.cost, 0);
          return campaign.budget && totalSpend > campaign.budget * 0.9;
        })
        .map(campaign => {
          const totalSpend = campaign.analytics.reduce((sum, a) => sum + a.cost, 0);
          return {
            id: `alert-${campaign.id}`,
            title: `Budget Alert: ${campaign.name}`,
            message: `Campaign is at ${((totalSpend / (campaign.budget || 1)) * 100).toFixed(0)}% of budget`,
            severity: totalSpend > (campaign.budget || 0) ? 'CRITICAL' : 'WARNING',
            createdAt: new Date()
          };
        });
    } catch (e) {
      console.log('Error generating alerts, using empty alerts array', e);
    }
    
    // Generate recommendations based on campaign data
    interface Recommendation {
      id: string;
      type: string;
      title: string;
      description: string;
      priority: string;
    }
    
    let recommendations: Recommendation[] = [];
    try {
      // Get campaigns with analytics
      const campaignsWithAnalytics = await prisma.campaign.findMany({
        include: {
          analytics: {
            orderBy: {
              date: 'desc'
            },
            take: 30
          }
        }
      });
      
      // Generate recommendations based on campaign performance
      const highCtrCampaigns = campaignsWithAnalytics.filter(campaign => {
        if (campaign.analytics.length === 0) return false;
        const totalImpressions = campaign.analytics.reduce((sum, a) => sum + a.impressions, 0);
        const totalClicks = campaign.analytics.reduce((sum, a) => sum + a.clicks, 0);
        return totalImpressions > 0 && (totalClicks / totalImpressions) > 0.05; // CTR > 5%
      });
      
      const lowConversionCampaigns = campaignsWithAnalytics.filter(campaign => {
        if (campaign.analytics.length === 0) return false;
        const totalClicks = campaign.analytics.reduce((sum, a) => sum + a.clicks, 0);
        const totalConversions = campaign.analytics.reduce((sum, a) => sum + a.conversions, 0);
        return totalClicks > 50 && (totalConversions / totalClicks) < 0.01; // Conv rate < 1%
      });
      
      // Create recommendations
      recommendations = [
        {
          id: 'rec-1',
          type: 'BUDGET_OPTIMIZATION',
          title: 'Increase budget for high-performing campaigns',
          description: `${highCtrCampaigns.length} campaigns have high CTR. Consider increasing budgets to capture more conversions.`,
          priority: 'HIGH'
        },
        {
          id: 'rec-2',
          type: 'KEYWORD_OPTIMIZATION',
          title: 'Add negative keywords to reduce wasted spend',
          description: `${lowConversionCampaigns.length} campaigns have low conversion rates. Adding negative keywords could improve ROI.`,
          priority: 'MEDIUM'
        }
      ];
    } catch (e) {
      console.log('Error generating recommendations', e);
      // Fallback recommendations
      recommendations = [
        {
          id: 'rec-1',
          type: 'BUDGET_OPTIMIZATION',
          title: 'Increase budget for high-performing campaigns',
          description: 'Your top campaigns are hitting their budget limits. Consider increasing budgets to capture more conversions.',
          priority: 'HIGH'
        },
        {
          id: 'rec-2',
          type: 'KEYWORD_OPTIMIZATION',
          title: 'Add negative keywords to reduce wasted spend',
          description: 'Some keywords are generating clicks but no conversions. Adding negative keywords could improve ROI.',
          priority: 'MEDIUM'
        }
      ];
    }
    
    const dashboardData = {
      accountSummary,
      automation: automationSummary,
      performance,
      alerts,
      trends,
      recommendations
    };
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching Google Ads dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message 
    });
  }
});

// Google Ads Chat Interface
app.post('/api/google-ads/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.headers['user-id'] as string || 'default-user-id';
    
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = await googleAdsChatService.createSession(userId);
    }
    
    const response = await googleAdsChatService.processMessage(userId, activeSessionId, message);
    
    res.json({
      success: true,
      sessionId: activeSessionId,
      ...response
    });
  } catch (error) {
    console.error('Error processing Google Ads chat message:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

app.get('/api/google-ads/chat/sessions', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user-id';
    const sessions = await googleAdsChatService.getUserSessions(userId);
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch chat sessions',
      details: error.message 
    });
  }
});

app.get('/api/google-ads/chat/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await googleAdsChatService.getSessionHistory(sessionId);
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch chat history',
      details: error.message 
    });
  }
});

// Automation Management
app.post('/api/google-ads/automation/tasks', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user-id';
    const taskConfig = req.body;
    
    const task = await automationScheduler.createAutomationTask(userId, taskConfig);
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error creating automation task:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create automation task',
      details: error.message 
    });
  }
});

app.get('/api/google-ads/automation/tasks', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user-id';
    
    // Generate mock automation tasks based on campaigns
    const campaigns = await prisma.campaign.findMany({
      take: 3,
      include: {
        analytics: {
          orderBy: {
            date: 'desc'
          },
          take: 1
        }
      }
    });
    
    // Create mock tasks
    const tasks = campaigns.map((campaign, index) => {
      const taskTypes = ['OPTIMIZATION', 'BILLING_CHECK', 'SPEND_LIMIT_ENFORCEMENT'];
      const schedules = ['0 6 * * *', '0 */3 * * *', '*/15 * * * *'];
      
      return {
        id: `task-${index + 1}`,
        name: `${taskTypes[index % 3]} for ${campaign.name}`,
        type: taskTypes[index % 3],
        schedule: schedules[index % 3],
        status: 'ACTIVE',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        executions: [
          {
            id: `exec-${index + 1}-1`,
            taskId: `task-${index + 1}`,
            startedAt: new Date(Date.now() - 86400000), // 1 day ago
            completedAt: new Date(Date.now() - 86390000), // 10 minutes later
            status: 'COMPLETED',
            result: JSON.stringify({ success: true })
          }
        ]
      };
    });
    
    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error fetching automation tasks:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch automation tasks',
      details: error.message 
    });
  }
});

app.post('/api/google-ads/automation/tasks/:taskId/pause', async (req, res) => {
  try {
    const { taskId } = req.params;
    await automationScheduler.pauseAutomationTask(taskId);
    
    res.json({
      success: true,
      message: 'Task paused successfully'
    });
  } catch (error) {
    console.error('Error pausing automation task:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to pause automation task',
      details: error.message 
    });
  }
});

app.post('/api/google-ads/automation/tasks/:taskId/resume', async (req, res) => {
  try {
    const { taskId } = req.params;
    await automationScheduler.resumeAutomationTask(taskId);
    
    res.json({
      success: true,
      message: 'Task resumed successfully'
    });
  } catch (error) {
    console.error('Error resuming automation task:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to resume automation task',
      details: error.message 
    });
  }
});

app.post('/api/google-ads/automation/trigger-daily', async (req, res) => {
  try {
    const { accountId } = req.body;
    const result = await automationScheduler.triggerDailyOptimization(accountId);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error triggering daily optimization:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to trigger daily optimization',
      details: error.message 
    });
  }
});

app.get('/api/google-ads/automation/status', async (req, res) => {
  try {
    const status = automationScheduler.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting automation status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get automation status',
      details: error.message 
    });
  }
});

// Account Management
app.get('/api/google-ads/account/:accountId/summary', async (req, res) => {
  try {
    const { accountId } = req.params;
    const summary = await googleAdsService.getAccountSummary(accountId);
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching account summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch account summary',
      details: error.message 
    });
  }
});

app.get('/api/google-ads/account/:accountId/billing', async (req, res) => {
  try {
    const { accountId } = req.params;
    const billingInfo = await googleAdsService.checkAccountBilling(accountId);
    
    res.json({
      success: true,
      billingInfo
    });
  } catch (error) {
    console.error('Error checking account billing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check account billing',
      details: error.message 
    });
  }
});

app.post('/api/google-ads/account/:accountId/fix-payment', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await googleAdsService.fixPaymentProblems(accountId);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error fixing payment problems:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fix payment problems',
      details: error.message 
    });
  }
});

// Keyword Management
app.get('/api/google-ads/account/:accountId/negative-keywords', async (req, res) => {
  try {
    const { accountId } = req.params;
    const negativeKeywords = await googleAdsService.findNegativeKeywords(accountId);
    
    res.json({
      success: true,
      negativeKeywords
    });
  } catch (error) {
    console.error('Error finding negative keywords:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to find negative keywords',
      details: error.message 
    });
  }
});

app.post('/api/google-ads/account/:accountId/negative-keywords', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { negativeKeywords } = req.body;
    
    await googleAdsService.addNegativeKeywords(accountId, negativeKeywords);
    
    res.json({
      success: true,
      message: `Added ${negativeKeywords.length} negative keywords`
    });
  } catch (error) {
    console.error('Error adding negative keywords:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add negative keywords',
      details: error.message 
    });
  }
});

app.post('/api/google-ads/account/:accountId/optimize-bids', async (req, res) => {
  try {
    const { accountId } = req.params;
    await googleAdsService.optimizeKeywordBids(accountId);
    
    res.json({
      success: true,
      message: 'Keyword bids optimized successfully'
    });
  } catch (error) {
    console.error('Error optimizing bids:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to optimize bids',
      details: error.message 
    });
  }
});

// Ad Testing
app.post('/api/google-ads/account/:accountId/ad-tests', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { adGroupId, baseAd } = req.body;
    
    const adIds = await googleAdsService.createAdVariants(accountId, adGroupId, baseAd);
    
    res.json({
      success: true,
      adIds,
      message: `Created ${adIds.length} ad variants for testing`
    });
  } catch (error) {
    console.error('Error creating ad test:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create ad test',
      details: error.message 
    });
  }
});

app.get('/api/google-ads/account/:accountId/ad-performance', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { adIds } = req.query;
    
    const adIdArray = typeof adIds === 'string' ? adIds.split(',') : [];
    const performance = await googleAdsService.evaluateAdPerformance(accountId, adIdArray);
    
    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('Error evaluating ad performance:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to evaluate ad performance',
      details: error.message 
    });
  }
});

// Smart Targeting
app.get('/api/google-ads/account/:accountId/geographic-performance', async (req, res) => {
  try {
    const { accountId } = req.params;
    const geoPerformance = await googleAdsService.trackCostPerLead(accountId);
    
    res.json({
      success: true,
      geoPerformance
    });
  } catch (error) {
    console.error('Error tracking cost per lead:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to track cost per lead',
      details: error.message 
    });
  }
});

app.post('/api/google-ads/account/:accountId/adjust-bids-location', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { adjustments } = req.body;
    
    await googleAdsService.adjustBidsByLocation(accountId, adjustments);
    
    res.json({
      success: true,
      message: `Applied ${adjustments.length} bid adjustments by location`
    });
  } catch (error) {
    console.error('Error adjusting bids by location:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to adjust bids by location',
      details: error.message 
    });
  }
});

// Run daily optimization for account
app.post('/api/google-ads/account/:accountId/daily-optimization', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await googleAdsService.runDailyOptimization(accountId);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error running daily optimization:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to run daily optimization',
      details: error.message 
    });
  }
});

// ML Services endpoints
app.post('/api/ml/predict-lead-quality', async (req, res) => {
  try {
    const { leadId, features } = req.body;
    
    const prediction = await mlService.predictLeadQuality(leadId, features);
    
    res.json({
      success: true,
      prediction,
      leadId
    });
  } catch (error) {
    console.error('Error predicting lead quality:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to predict lead quality',
      details: error.message 
    });
  }
});

app.post('/api/ml/optimize-budget', async (req, res) => {
  try {
    const { campaignId } = req.body;
    
    const optimization = await mlService.optimizeCampaignBudget(campaignId);
    
    res.json({
      success: true,
      optimization,
      campaignId
    });
  } catch (error) {
    console.error('Error optimizing budget:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to optimize budget',
      details: error.message 
    });
  }
});

app.post('/api/ml/predict-keyword-performance', async (req, res) => {
  try {
    const { keyword, campaignId } = req.body;
    
    const prediction = await mlService.predictKeywordPerformance(keyword, campaignId);
    
    res.json({
      success: true,
      prediction,
      keyword,
      campaignId
    });
  } catch (error) {
    console.error('Error predicting keyword performance:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to predict keyword performance',
      details: error.message 
    });
  }
});

app.post('/api/ml/analyze-ad-performance', async (req, res) => {
  try {
    const { adId } = req.body;
    
    const analysis = await mlService.analyzeAdPerformance(adId);
    
    res.json({
      success: true,
      analysis,
      adId
    });
  } catch (error) {
    console.error('Error analyzing ad performance:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze ad performance',
      details: error.message 
    });
  }
});

app.post('/api/ml/train-models', async (req, res) => {
  try {
    console.log('🔄 Starting ML model training...');
    
    await mlService.trainModels();
    
    res.json({
      success: true,
      message: 'ML model training completed successfully'
    });
  } catch (error) {
    console.error('Error training ML models:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to train ML models',
      details: error.message 
    });
  }
});

// CRM Integration endpoints
app.post('/api/crm/sync', async (req, res) => {
  try {
    const { integrationId } = req.body;
    
    if (integrationId) {
      const result = await crmService.syncIntegration(integrationId);
      res.json({
        success: true,
        result,
        integrationId
      });
    } else {
      const results = await crmService.syncAllIntegrations();
      res.json({
        success: true,
        results,
        totalSynced: results.length
      });
    }
  } catch (error) {
    console.error('Error syncing CRM:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync CRM data',
      details: error.message 
    });
  }
});

app.get('/api/crm/lead-quality-analysis/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const analysis = await crmService.analyzeLeadQualityForCampaign(campaignId);
    
    res.json({
      success: true,
      analysis,
      campaignId
    });
  } catch (error) {
    console.error('Error analyzing lead quality:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze lead quality',
      details: error.message 
    });
  }
});

// Account Management endpoints
app.get('/api/account/alerts', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user-id';
    
    // Generate alerts from campaign data
    const campaigns = await prisma.campaign.findMany({
      where: {
        budget: {
          not: null
        }
      },
      include: {
        analytics: {
          orderBy: {
            date: 'desc'
          },
          take: 10
        }
      }
    });
    
    // Generate alerts based on campaign performance
    const alerts = campaigns
      .filter(campaign => {
        const totalSpend = campaign.analytics.reduce((sum, a) => sum + a.cost, 0);
        return campaign.budget && totalSpend > campaign.budget * 0.9;
      })
      .map(campaign => {
        const totalSpend = campaign.analytics.reduce((sum, a) => sum + a.cost, 0);
        return {
          id: `alert-${campaign.id}`,
          title: `Budget Alert: ${campaign.name}`,
          message: `Campaign is at ${((totalSpend / (campaign.budget || 1)) * 100).toFixed(0)}% of budget`,
          severity: totalSpend > (campaign.budget || 0) ? 'CRITICAL' : 'WARNING',
          createdAt: new Date(),
          isResolved: false
        };
      });
    
    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch alerts',
      details: error.message 
    });
  }
});

app.post('/api/account/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    // Since we don't have an actual alerts table, just return success
    // In a real implementation, we would update the alert in the database
    const alert = {
      id: alertId,
      isResolved: true,
      resolvedAt: new Date()
    };
    
    res.json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to resolve alert',
      details: error.message 
    });
  }
});

// Budget Rules endpoints
app.get('/api/budget/rules', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string || 'default-user-id';
    
    // Generate sample budget rules based on campaigns
    const campaigns = await prisma.campaign.findMany({
      where: {
        budget: {
          not: null
        }
      },
      take: 3
    });
    
    // Create sample budget rules
    const rules = campaigns.map((campaign, index) => ({
      id: `rule-${index + 1}`,
      name: `Budget rule for ${campaign.name}`,
      type: index === 0 ? 'DAILY_SPEND_LIMIT' : index === 1 ? 'COST_PER_LEAD_LIMIT' : 'PERFORMANCE_BASED',
      condition: JSON.stringify({ threshold: campaign.budget ? campaign.budget * 0.9 : 1000 }),
      action: JSON.stringify({ action: 'NOTIFY', params: { email: true } }),
      isActive: true,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    res.json({
      success: true,
      rules,
      count: rules.length
    });
  } catch (error) {
    console.error('Error fetching budget rules:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch budget rules',
      details: error.message 
    });
  }
});

app.post('/api/budget/rules', async (req, res) => {
  try {
    const { name, type, condition, action } = req.body;
    const userId = req.headers['user-id'] as string || 'default-user-id';
    
    // Since we don't have a budgetRule table, create a mock rule
    const rule = {
      id: `rule-${Date.now()}`,
      name,
      type,
      condition,
      action,
      isActive: true,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    res.json({
      success: true,
      rule
    });
  } catch (error) {
    console.error('Error creating budget rule:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create budget rule',
      details: error.message 
    });
  }
});

// CUA Command endpoint
// Analyze if command needs browser mode
// Analyze browser actions and provide insights
app.post('/api/cua/analyze', async (req, res) => {
  try {
    const { actions } = req.body;
    
    // Process the actions and generate insights
    const insights = await Promise.all(actions.map(async (action: any) => {
      switch (action.type) {
        case 'search':
          return `Found results for "${action.params.query}"`;
        case 'click':
          return `Clicked on "${action.params.selector}"`;
        case 'extract':
          return `Extracted data from "${action.params.selector}"`;
        default:
          return `Performed ${action.type} action`;
      }
    }));

    // Generate a summary
    const summary = insights.join('\n');
    
    res.json({
      result: summary,
      insights
    });
  } catch (error) {
    console.error('Error analyzing actions:', error);
    res.status(500).json({ error: 'Failed to analyze actions' });
  }
});

app.post('/api/cua/analyze-mode', async (req, res) => {
  try {
    console.log('📥 Received analyze-mode request');
    const { command } = req.body;
    console.log('🔍 Analyzing command:', command);

    // Use GPT to analyze the command
    const prompt = `Analyze this user command and determine what browser actions are needed. The command is: "${command}"

    Return your response in this JSON format:
    {
      "mode": "browser" or "normal",
      "actions": [
        {
          "type": "navigate" | "search" | "click" | "googleads",
          "params": { specific parameters for the action }
        }
      ],
      "explanation": "Brief explanation of what needs to be done"
    }

    For Google Ads commands, use type: "googleads" with appropriate params.
    Example response for "add a new campaign to google ads":
    {
      "mode": "browser",
      "actions": [
        {
          "type": "navigate",
          "params": { "url": "https://ads.google.com" }
        },
        {
          "type": "googleads",
          "params": { 
            "action": "create_campaign",
            "shouldPause": false
          }
        }
      ],
      "explanation": "Need to navigate to Google Ads and create a new campaign"
    }`;

    console.log('🤖 Asking GPT to analyze command...');
    const gptResponse = await generateAIResponse(prompt, {
      temperature: 0.2,
      max_tokens: 500
    });
    
    // Parse GPT response
    let parsedResponse;
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = gptResponse.match(/```json\n([\s\S]*?)\n```/) || 
                       gptResponse.match(/```\n([\s\S]*?)\n```/) ||
                       gptResponse.match(/\{[\s\S]*\}/);
                       
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : gptResponse;
      parsedResponse = JSON.parse(jsonString);
      console.log('✅ GPT Analysis:', parsedResponse);
    } catch (error) {
      console.error('❌ Failed to parse GPT response:', error);
      // Fallback to basic response
      parsedResponse = {
        mode: 'browser',
        actions: [
          { type: 'navigate', params: { url: 'https://ads.google.com' } }
        ],
        explanation: 'Falling back to basic navigation'
      };
    }

    const response = {
      mode: parsedResponse.mode,
      actions: parsedResponse.actions,
      explanation: parsedResponse.explanation
    };
    console.log('📤 Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error analyzing command mode:', error);
    res.status(500).json({ error: 'Failed to analyze command mode' });
  }
});

app.post('/api/cua/command', async (req, res) => {
  try {
    const { command, mode } = req.body;
    console.log('Received CUA command:', { command, mode });
    
    const commandId = 'cmd-' + Date.now();
    const timestamp = new Date();
    
    // Always use CUA for all commands - fully agentic mode
    const needsCUA = true;
    
    if (mode === 'browser') {
      console.log('Executing browser automation');
      return await executePythonAutomation(command, commandId, timestamp, res);
    } else {
      // Normal mode - use AI to answer
      console.log('Using AI to answer in normal mode');
      
      const aiResponse = await generateAIResponse(command, {
        temperature: 0.7,
        max_tokens: 500
      });
      
      return res.json({
        id: commandId,
        status: 'COMPLETED',
        result: {
          type: 'ai_response',
          command: command,
          message: aiResponse,
          timestamp: timestamp.toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error executing CUA command:', error);
    res.status(500).json({ error: 'Failed to execute CUA command', details: error.message });
  }
});

// Helper function to execute Python automation
async function executePythonAutomation(
  command: string, 
  commandId: string, 
  timestamp: Date,
  res: any
) {
  try {
    // Escape command for shell safety
    const escapedCommand = command.replace(/"/g, '\\"');
    
        // Create a promise to handle the async execution
        const pythonResult = await new Promise((resolve, reject) => {
      const pythonCmd = `python3 cua_automation.py "${escapedCommand}"`;
      exec(pythonCmd, (error, stdout, stderr) => {
            if (error) {
              console.error(`Python execution error: ${error}`);
              return reject(error);
            }
            if (stderr) {
              console.error(`Python stderr: ${stderr}`);
            }
            console.log(`Python stdout: ${stdout}`);
            resolve({ stdout, stderr });
          });
        });
        
        return res.json({
          id: commandId,
          status: 'COMPLETED',
          result: {
            type: 'python_automation',
            command: command,
            pythonOutput: pythonResult,
            message: 'CUA automation executed successfully',
            timestamp: timestamp.toISOString()
          }
        });
  } catch (pythonError: any) {
        console.error('Python execution failed:', pythonError);
        return res.json({
          id: commandId,
          status: 'FAILED',
          error: `Python automation failed: ${pythonError.message}`,
          timestamp: timestamp.toISOString()
        });
      }
    }
    
// Analytics endpoints with date filtering (like Google Ads)
app.get('/api/analytics', async (req, res) => {
  try {
    // Return mock data if MOCK_MODE is enabled
    if (MOCK_MODE) {
      const dailyStats = mockAnalytics.map(a => ({
        date: a.date.toISOString(),
        impressions: a.impressions,
        clicks: a.clicks,
        conversions: a.conversions,
        cost: a.cost,
        conversionValue: a.conversionValue,
        ctr: a.clicks / a.impressions || 0,
        cpc: a.cost / a.clicks || 0,
        costPerConversion: a.conversions > 0 ? a.cost / a.conversions : null,
      }));

      const totalImpressions = mockAnalytics.reduce((sum, a) => sum + a.impressions, 0);
      const totalClicks = mockAnalytics.reduce((sum, a) => sum + a.clicks, 0);
      const totalConversions = mockAnalytics.reduce((sum, a) => sum + a.conversions, 0);
      const totalCost = mockAnalytics.reduce((sum, a) => sum + a.cost, 0);
      const totalValue = mockAnalytics.reduce((sum, a) => sum + a.conversionValue, 0);

      return res.json({
        dailyStats,
        totalStats: {
          totalImpressions: totalImpressions.toLocaleString(),
          totalClicks: totalClicks.toLocaleString(),
          totalConversions: totalConversions.toLocaleString(),
          totalCost: `$${totalCost.toFixed(2)}`,
          revenue: `$${totalValue.toFixed(2)}`,
          conversionRate: `${((totalConversions / totalClicks) * 100 || 0).toFixed(2)}%`,
          avgCTR: `${((totalClicks / totalImpressions) * 100 || 0).toFixed(2)}%`,
          avgCPC: `$${((totalCost / totalClicks) || 0).toFixed(2)}`,
          costPerConversion: totalConversions > 0 ? `$${(totalCost / totalConversions).toFixed(2)}` : '-',
        },
        isMockData: true
      });
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      dateFilter = {
        date: {
          gte: start,
          lte: end,
        },
      };
    }
    
    // Get analytics data grouped by date
    const analytics = await prisma.analytics.groupBy({
      by: ['date'],
      where: dateFilter,
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        cost: true,
        conversionValue: true,
      },
      orderBy: {
        date: 'asc', // Order by date ascending for charts
      },
    });

    // Transform analytics data to match frontend types
    const dailyStats = analytics.map(a => {
      const impressions = a._sum.impressions || 0;
      const clicks = a._sum.clicks || 0;
      const conversions = a._sum.conversions || 0;
      const cost = a._sum.cost || 0;
      const conversionValue = a._sum.conversionValue || 0;

      return {
        date: a.date.toISOString(),
        impressions,
        clicks,
        conversions,
        cost,
        conversionValue,
        ctr: clicks / impressions || 0,
        cpc: cost / clicks || 0,
        costPerConversion: conversions > 0 ? cost / conversions : null,
      };
    });

    // Calculate totals for the period
    const totalImpressions = dailyStats.reduce((sum, a) => sum + a.impressions, 0);
    const totalClicks = dailyStats.reduce((sum, a) => sum + a.clicks, 0);
    const totalConversions = dailyStats.reduce((sum, a) => sum + a.conversions, 0);
    const totalCost = dailyStats.reduce((sum, a) => sum + a.cost, 0);
    const totalValue = dailyStats.reduce((sum, a) => sum + a.conversionValue, 0);

    const totalStats = {
      totalImpressions: totalImpressions.toLocaleString(),
      totalClicks: totalClicks.toLocaleString(),
      totalConversions: totalConversions.toLocaleString(),
      totalCost: `$${totalCost.toFixed(2)}`,
      revenue: `$${totalValue.toFixed(2)}`,
      conversionRate: `${((totalConversions / totalClicks) * 100 || 0).toFixed(2)}%`,
      avgCTR: `${((totalClicks / totalImpressions) * 100 || 0).toFixed(2)}%`,
      avgCPC: `$${((totalCost / totalClicks) || 0).toFixed(2)}`,
      costPerConversion: totalConversions > 0 ? `$${(totalCost / totalConversions).toFixed(2)}` : '-',
    };
    
    res.json({
      dailyStats,
      totalStats,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

app.get('/api/analytics/stats', async (req, res) => {
  try {
    // Return mock data if MOCK_MODE is enabled
    if (MOCK_MODE) {
      const totalImpressions = mockAnalytics.reduce((sum, a) => sum + a.impressions, 0);
      const totalClicks = mockAnalytics.reduce((sum, a) => sum + a.clicks, 0);
      const totalConversions = mockAnalytics.reduce((sum, a) => sum + a.conversions, 0);
      const totalCost = mockAnalytics.reduce((sum, a) => sum + a.cost, 0);
      const totalValue = mockAnalytics.reduce((sum, a) => sum + a.conversionValue, 0);

      const current = {
        totalImpressions: totalImpressions.toLocaleString(),
        totalClicks: totalClicks.toLocaleString(),
        totalConversions: totalConversions.toLocaleString(),
        totalCost: `$${totalCost.toFixed(2)}`,
        conversionRate: `${((totalConversions / totalClicks) * 100 || 0).toFixed(2)}%`,
        avgCTR: `${((totalClicks / totalImpressions) * 100 || 0).toFixed(2)}%`,
        avgCPC: `$${((totalCost / totalClicks) || 0).toFixed(2)}`,
        costPerConversion: totalConversions > 0 ? `$${(totalCost / totalConversions).toFixed(2)}` : '-',
        revenue: `$${totalValue.toFixed(2)}`,
      };

      return res.json({
        current,
        previous: mockCampaignStats.previous,
        comparison: mockCampaignStats.comparison,
        isMockData: true
      });
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      dateFilter = {
        date: {
          gte: start,
          lte: end,
        },
      };
    }

    // Get current period stats
    const currentStats = await prisma.analytics.aggregate({
      where: dateFilter,
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        cost: true,
        conversionValue: true,
      },
    });

    const totalImpressions = currentStats._sum.impressions || 0;
    const totalClicks = currentStats._sum.clicks || 0;
    const totalConversions = currentStats._sum.conversions || 0;
    const totalCost = currentStats._sum.cost || 0;
    const totalValue = currentStats._sum.conversionValue || 0;

    // Format current period stats
    const current = {
      totalImpressions: totalImpressions.toLocaleString(),
      totalClicks: totalClicks.toLocaleString(),
      totalConversions: totalConversions.toLocaleString(),
      totalCost: `$${totalCost.toFixed(2)}`,
      conversionRate: `${((totalConversions / totalClicks) * 100 || 0).toFixed(2)}%`,
      avgCTR: `${((totalClicks / totalImpressions) * 100 || 0).toFixed(2)}%`,
      avgCPC: `$${((totalCost / totalClicks) || 0).toFixed(2)}`,
      costPerConversion: totalConversions > 0 ? `$${(totalCost / totalConversions).toFixed(2)}` : '-',
      revenue: `$${totalValue.toFixed(2)}`,
    };

    // Get previous period stats if dates are provided
    let previous: any = null;
    let comparison: any = null;

    if (startDate && endDate) {
      const currentStartDate = new Date(startDate as string);
      const currentEndDate = new Date(endDate as string);
      const daysDiff = Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
      const previousEndDate = new Date(currentStartDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);

      const previousStats = await prisma.analytics.aggregate({
        where: {
          date: {
            gte: previousStartDate,
            lte: previousEndDate,
          },
        },
        _sum: {
          impressions: true,
          clicks: true,
          conversions: true,
          cost: true,
          conversionValue: true,
        },
      });

      const prevImpressions = previousStats._sum.impressions || 0;
      const prevClicks = previousStats._sum.clicks || 0;
      const prevConversions = previousStats._sum.conversions || 0;
      const prevCost = previousStats._sum.cost || 0;
      const prevValue = previousStats._sum.conversionValue || 0;

      previous = {
        totalImpressions: prevImpressions.toLocaleString(),
        totalClicks: prevClicks.toLocaleString(),
        totalConversions: prevConversions.toLocaleString(),
        totalCost: `$${prevCost.toFixed(2)}`,
        conversionRate: `${((prevConversions / prevClicks) * 100 || 0).toFixed(2)}%`,
        avgCTR: `${((prevClicks / prevImpressions) * 100 || 0).toFixed(2)}%`,
        avgCPC: `$${((prevCost / prevClicks) || 0).toFixed(2)}`,
        costPerConversion: prevConversions > 0 ? `$${(prevCost / prevConversions).toFixed(2)}` : '-',
        revenue: `$${prevValue.toFixed(2)}`,
      };

      // Calculate comparison percentages
      comparison = {
        totalImpressions: calculatePercentageChange(totalImpressions, prevImpressions),
        totalClicks: calculatePercentageChange(totalClicks, prevClicks),
        totalConversions: calculatePercentageChange(totalConversions, prevConversions),
        totalCost: calculatePercentageChange(totalCost, prevCost),
        conversionRate: calculatePercentageChange(
          (totalConversions / totalClicks) || 0,
          (prevConversions / prevClicks) || 0
        ),
        avgCTR: calculatePercentageChange(
          (totalClicks / totalImpressions) || 0,
          (prevClicks / prevImpressions) || 0
        ),
        avgCPC: calculatePercentageChange(
          (totalCost / totalClicks) || 0,
          (prevCost / prevClicks) || 0
        ),
        revenue: calculatePercentageChange(totalValue, prevValue),
      };
    }

    res.json({
      current,
      previous,
      comparison,
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics stats' });
  }
});

app.get('/api/traffic-sources', async (req, res) => {
  try {
    // Mock traffic sources data since it's not in the schema
    const trafficSources = [
      { source: 'Google Ads', percentage: 45, users: 1250 },
      { source: 'Organic Search', percentage: 30, users: 833 },
      { source: 'Direct', percentage: 15, users: 417 },
      { source: 'Social Media', percentage: 10, users: 278 },
    ];
    res.json(trafficSources);
  } catch (error) {
    console.error('Error fetching traffic sources:', error);
    res.status(500).json({ error: 'Failed to fetch traffic sources' });
  }
});

// Campaigns endpoints with date filtering
app.get('/api/campaigns', async (req, res) => {
  try {
    const { startDate, endDate, dateRange } = req.query;
    
    // Build date filter for analytics
    let analyticsDateFilter = {};
    
    if (startDate && endDate) {
      const endDatePlusOne = new Date(endDate as string);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      analyticsDateFilter = {
        date: {
          gte: new Date(startDate as string),
          lt: endDatePlusOne,
        },
      };
    } else if (dateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateRange) {
        case 'today':
          const tomorrowCampaign = new Date(today);
          tomorrowCampaign.setDate(tomorrowCampaign.getDate() + 1);
          analyticsDateFilter = { 
            date: { 
              gte: today,
              lt: tomorrowCampaign 
            } 
          };
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          analyticsDateFilter = { date: { gte: yesterday, lt: today } };
          break;
        case 'last_7_days':
          const last7Days = new Date(today);
          last7Days.setDate(last7Days.getDate() - 7);
          analyticsDateFilter = { date: { gte: last7Days } };
          break;
        case 'last_30_days':
          const last30Days = new Date(today);
          last30Days.setDate(last30Days.getDate() - 30);
          analyticsDateFilter = { date: { gte: last30Days } };
          break;
        case 'this_month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          analyticsDateFilter = { date: { gte: startOfMonth } };
          break;
        case 'last_month':
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          analyticsDateFilter = { date: { gte: startOfLastMonth, lte: endOfLastMonth } };
          break;
      }
    }

    const campaigns = await prisma.campaign.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        },
        adGroups: {
          include: {
            ads: true,
          },
        },
        analytics: {
          where: analyticsDateFilter,
          orderBy: {
            date: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Transform to match frontend format with date-filtered analytics
    const formattedCampaigns = campaigns.map(campaign => {
      const analytics = campaign.analytics || [];
      const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
      const totalClicks = analytics.reduce((sum, a) => sum + a.clicks, 0);
      const totalCost = analytics.reduce((sum, a) => sum + a.cost, 0);
      const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);
      const totalConversionValue = analytics.reduce((sum, a) => sum + a.conversionValue, 0);
      
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status.toLowerCase(),
        budget: `₹${campaign.budget?.toLocaleString() || '0'}`,
        spent: `₹${totalCost.toLocaleString()}`,
        impressions: totalImpressions.toLocaleString(),
        clicks: totalClicks.toLocaleString(),
        ctr: totalImpressions > 0 ? `${(totalClicks / totalImpressions * 100).toFixed(2)}%` : '0%',
        conversions: totalConversions,
        conversionValue: `₹${totalConversionValue.toLocaleString()}`,
        startDate: campaign.startDate?.toISOString().split('T')[0] || '',
        endDate: campaign.endDate?.toISOString().split('T')[0] || '',
        googleAdsId: campaign.googleAdsId,
        user: campaign.user,
        analytics: analytics.map(a => ({
          date: a.date.toISOString().split('T')[0],
          impressions: a.impressions,
          clicks: a.clicks,
          cost: a.cost,
          conversions: a.conversions,
          conversionValue: a.conversionValue,
          ctr: a.ctr,
          cpc: a.cpc
        })),
        // Add date range info
        dateRange: dateRange || 'all_time',
        startDateFilter: startDate || null,
        endDateFilter: endDate || null,
      };
    });
    
    res.json(formattedCampaigns);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.get('/api/campaigns/stats', async (req, res) => {
  try {
    const { startDate, endDate, dateRange } = req.query;
    
    // Build same date filter for stats
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      };
    } else if (dateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateRange) {
        case 'today':
          const tomorrowTemp = new Date(today);
          tomorrowTemp.setDate(tomorrowTemp.getDate() + 1);
          dateFilter = { 
            date: { 
              gte: today,
              lt: tomorrowTemp 
            } 
          };
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateFilter = { date: { gte: yesterday, lt: today } };
          break;
        case 'last_7_days':
          const last7Days = new Date(today);
          last7Days.setDate(last7Days.getDate() - 7);
          dateFilter = { date: { gte: last7Days } };
          break;
        case 'last_30_days':
          const last30Days = new Date(today);
          last30Days.setDate(last30Days.getDate() - 30);
          dateFilter = { date: { gte: last30Days } };
          break;
        case 'this_month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = { date: { gte: startOfMonth } };
          break;
        case 'last_month':
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          dateFilter = { date: { gte: startOfLastMonth, lte: endOfLastMonth } };
          break;
      }
    }

    const activeCampaigns = await prisma.campaign.count({
      where: {
        status: 'ACTIVE',
      },
    });
    
    const totalConversions = await prisma.analytics.aggregate({
      where: dateFilter,
      _sum: {
        conversions: true,
      },
    });
    
    const totalImpressions = await prisma.analytics.aggregate({
      where: dateFilter,
      _sum: {
        impressions: true,
      },
    });
    
    const totalClicks = await prisma.analytics.aggregate({
      where: dateFilter,
      _sum: {
        clicks: true,
      },
    });

    const avgCTR = (totalImpressions._sum.impressions || 0) > 0 
      ? ((totalClicks._sum.clicks || 0) / (totalImpressions._sum.impressions || 0) * 100).toFixed(2) + '%'
      : '0%';

    const stats = {
      activeCampaigns,
      totalConversions: (totalConversions._sum.conversions || 0).toLocaleString(),
      totalImpressions: (totalImpressions._sum.impressions || 0).toLocaleString(),
      avgCTR,
      // Add date range info
      dateRange: dateRange || 'all_time',
      startDate: startDate || null,
      endDate: endDate || null,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Failed to fetch campaign stats' });
  }
});

// Individual campaign endpoint
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        user: true,
        adGroups: {
          include: {
            ads: true,
          },
        },
        analytics: {
          orderBy: {
            date: 'desc',
          },
        },
      },
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Insights endpoints
app.get('/api/insights', async (req, res) => {
  try {
    // Return mock data if MOCK_MODE is enabled
    if (MOCK_MODE) {
      const insights = mockCampaigns.slice(0, 5).map((campaign, index) => ({
        id: `insight-${index + 1}`,
        type: index % 2 === 0 ? 'PERFORMANCE_ANALYSIS' : 'BUDGET_OPTIMIZATION',
        title: `Insight for ${campaign.name}`,
        description: `Campaign has ${campaign.stats.ctr > 0.05 ? 'high' : 'low'} CTR (${(campaign.stats.ctr * 100).toFixed(2)}%) and ${campaign.stats.conversionRate > 0.02 ? 'good' : 'poor'} conversion rate (${(campaign.stats.conversionRate * 100).toFixed(2)}%).`,
        priority: campaign.stats.ctr < 0.02 || campaign.stats.conversionRate < 0.01 ? 'HIGH' : 'MEDIUM',
        campaignId: campaign.id,
        campaign: { name: campaign.name },
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      return res.json(insights);
    }

    // Generate insights based on campaign data
    const campaigns = await prisma.campaign.findMany({
      include: {
        analytics: {
          orderBy: {
            date: 'desc'
          },
          take: 30
        }
      }
    });
    
    // Generate insights
    const insights = campaigns.slice(0, 5).map((campaign, index) => {
      const totalImpressions = campaign.analytics.reduce((sum, a) => sum + a.impressions, 0);
      const totalClicks = campaign.analytics.reduce((sum, a) => sum + a.clicks, 0);
      const totalConversions = campaign.analytics.reduce((sum, a) => sum + a.conversions, 0);
      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const convRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
      
      return {
        id: `insight-${index + 1}`,
        type: index % 2 === 0 ? 'PERFORMANCE_ANALYSIS' : 'BUDGET_OPTIMIZATION',
        title: `Insight for ${campaign.name}`,
        description: `Campaign has ${ctr > 0.05 ? 'high' : 'low'} CTR (${(ctr * 100).toFixed(2)}%) and ${convRate > 0.02 ? 'good' : 'poor'} conversion rate (${(convRate * 100).toFixed(2)}%).`,
        priority: ctr < 0.02 || convRate < 0.01 ? 'HIGH' : 'MEDIUM',
        campaignId: campaign.id,
        campaign: {
          name: campaign.name
        },
        user: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
    
    res.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

app.get('/api/insights/stats', async (req, res) => {
  try {
    // Return mock data if MOCK_MODE is enabled
    if (MOCK_MODE) {
      return res.json({
        totalInsights: mockInsights.totalCampaigns * 3,
        highPriority: Math.round(mockInsights.totalCampaigns * 1.2),
        opportunities: Math.round(mockInsights.totalCampaigns * 1.8),
        avgConfidence: 87,
        isMockData: true
      });
    }

    // Get campaign count to generate insight stats
    const campaignCount = await prisma.campaign.count();
    
    // Generate stats based on campaign count
    const totalInsights = Math.min(campaignCount * 3, 15); // Approx 3 insights per campaign, max 15
    const highPriority = Math.round(totalInsights * 0.4); // About 40% are high priority
    const opportunities = Math.round(totalInsights * 0.6); // About 60% are opportunities
    
    const stats = {
      totalInsights,
      highPriority,
      opportunities,
      avgConfidence: totalInsights > 0 ? Math.round(85 + (highPriority / totalInsights) * 15) : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching insight stats:', error);
    res.status(500).json({ error: 'Failed to fetch insight stats' });
  }
});

// Essay insights endpoints
app.get('/api/insights/essays', async (req, res) => {
  try {
    // Return mock essay insights
    const essayInsights = [
      {
        id: "essay-insight-1",
        type: "insight",
        priority: "high",
        title: "LinkedIn Ads Attribution Challenge",
        description: "LinkedIn ads attribution is difficult because people don't always click. They lurk, screenshot, and consume content without direct interaction, making traditional click-based attribution models inadequate.",
        impact: "Potential revenue impact: Significant missed attribution",
        confidence: 92,
        category: "Advertising"
      },
      {
        id: "essay-insight-2",
        type: "insight",
        priority: "medium",
        title: "Content Marketing ROI Timeline",
        description: "Content marketing typically shows ROI after 6-9 months of consistent publishing. Early metrics like engagement and traffic growth are leading indicators before conversion metrics improve.",
        impact: "Long-term revenue growth potential",
        confidence: 87,
        category: "Content Strategy"
      }
    ];
    
    res.json(essayInsights);
  } catch (error) {
    console.error('Error fetching essay insights:', error);
    res.status(500).json({ error: 'Failed to fetch essay insights' });
  }
});

app.get('/api/insights/essays/stats', async (req, res) => {
  try {
    // Return mock essay insight stats
    const stats = {
      totalInsights: 5,
      highPriority: 2,
      opportunities: 3,
      avgConfidence: 88
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching essay insight stats:', error);
    res.status(500).json({ error: 'Failed to fetch essay insight stats' });
  }
});

// Generate insights from essays
app.post('/api/insights/generate', async (req, res) => {
  try {
    const { insightType, campaignData, analyticsData } = req.body;
    console.log(`Generating ${insightType} insights from essays`, { campaignData, analyticsData });
    
    // Read all essay files from project root
    const essayFiles = fs.readdirSync('essays').filter(file => file.endsWith('.txt'));
    console.log('Found essay files:', essayFiles);
    
    // Read content from essay files
    let essayContents: Array<{author: string, content: string}> = [];
    for (const file of essayFiles) {
      const content = fs.readFileSync(`essays/${file}`, 'utf-8');
      essayContents.push({
        author: file.replace('.txt', ''),
        content
      });
    }
    
    // Get campaign data if not provided
    let campaigns = campaignData;
    if (!campaigns) {
      campaigns = await prisma.campaign.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5
      });
    }
    
    // Create a prompt based on the insight type and campaign data
    let prompt = `You are an expert marketing consultant analyzing campaign performance and expert essays.

Current Campaign Performance Summary:
${campaigns?.campaigns?.map(c => `
- ${c.name}:
  Budget: ${c.budget}
  Spent: ${c.spent}
  Impressions: ${c.impressions}
  Clicks: ${c.clicks}
  CTR: ${c.ctr}
  Conversions: ${c.conversions}
  Conv. Value: ${c.conversionValue}`).join('\n') || 'No campaign data available.'}

Overall Analytics:
- Total Revenue: ${analyticsData?.current?.revenue || 'Not available'}
- Conversion Rate: ${analyticsData?.current?.conversionRate || 'Not available'}
- Total Impressions: ${analyticsData?.current?.totalImpressions || 'Not available'}
- Total Clicks: ${analyticsData?.current?.totalClicks || 'Not available'}
- Average CTR: ${analyticsData?.current?.avgCTR || 'Not available'}

Based on this performance data and the marketing expert essays, `;

    switch (insightType) {
      case 'opportunity':
        prompt += `identify 3-5 specific OPPORTUNITIES to improve campaign performance.

Focus on actionable opportunities that:
1. Address current performance gaps or underutilized potential
2. Leverage insights from both data and expert essays
3. Have clear implementation paths

For each opportunity:
- Title: Clear, action-oriented title
- Description: Explain the opportunity and why it matters
- Data Evidence: Specific metrics/trends from the campaigns that support this
- Expert Support: Relevant quote/insight from the essays
- Impact Estimate: high/medium/low with projected metrics
- Success Metrics: How to measure the impact

Format as JSON:
{
  "opportunities": [
    {
      "title": "Opportunity title",
      "description": "Description and importance",
      "dataEvidence": "Supporting campaign metrics",
      "expertSupport": "Quote from essays",
      "impact": "high|medium|low",
      "projectedMetrics": "Expected improvements",
      "successMetrics": "How to measure"
    }
  ]
}`;
        break;
        
      case 'alert':
        prompt += `identify 3-5 critical WARNINGS based on current performance issues.

Focus on risks that:
1. Are evident in current campaign metrics
2. Match patterns discussed in expert essays
3. Need immediate attention

For each warning:
- Title: Clear, attention-grabbing title
- Description: Explain the risk and potential impact
- Data Evidence: Metrics showing the problem
- Expert Warning: Related cautions from essays
- Severity: high/medium/low with potential impact
- Mitigation: Specific steps to address

Format as JSON:
{
  "warnings": [
    {
      "title": "Warning title",
      "description": "Risk description",
      "dataEvidence": "Problem metrics",
      "expertWarning": "Quote from essays",
      "severity": "high|medium|low",
      "potentialImpact": "What could happen",
      "mitigation": "How to fix"
    }
  ]
}`;
        break;
        
      case 'insight':
        prompt += `extract 3-5 key INSIGHTS by combining campaign data with expert knowledge.

Focus on insights that:
1. Explain current performance patterns
2. Connect campaign data with expert observations
3. Reveal non-obvious opportunities

For each insight:
- Title: Clear, descriptive title
- Description: Explain the insight
- Data Pattern: Supporting metrics/trends
- Expert Context: Related insights from essays
- Relevance: high/medium/low with explanation
- Action Items: How to use this insight

Format as JSON:
{
  "insights": [
    {
      "title": "Insight title",
      "description": "Main insight",
      "dataPattern": "Supporting metrics",
      "expertContext": "Quote from essays",
      "relevance": "high|medium|low",
      "actionItems": "How to apply"
    }
  ]
}`;
        break;
        
      case 'recommendation':
        prompt += `provide 3-5 specific RECOMMENDATIONS to optimize campaign performance.

Focus on recommendations that:
1. Address current performance challenges
2. Apply expert best practices to real data
3. Have clear implementation steps

For each recommendation:
- Title: Clear, actionable title
- Description: What to do and why
- Current State: Relevant metrics
- Expert Backing: Supporting insights from essays
- Priority: high/medium/low with reasoning
- Implementation: Step-by-step plan

Format as JSON:
{
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "What and why",
      "currentState": "Relevant metrics",
      "expertBacking": "Quote from essays",
      "priority": "high|medium|low",
      "implementation": "How to execute"
    }
  ]
}`;
        break;
        
      case 'success':
        prompt += `identify successful patterns in current campaigns and relate them to expert insights.

Focus on successes that:
1. Show in current campaign metrics
2. Match patterns described in essays
3. Can be replicated or expanded

For each success:
- Title: Clear, descriptive title
- Description: What's working well
- Performance Data: Supporting metrics
- Expert Validation: Related success stories
- Key Factors: Why it's working
- Next Steps: How to build on success

Format as JSON:
{
  "successStories": [
    {
      "title": "Success story title",
      "description": "What's working",
      "performanceData": "Supporting metrics",
      "expertValidation": "Quote from essays",
      "keyFactors": "Why it works",
      "nextSteps": "How to expand"
    }
  ]
}`;
        break;
        
      case 'analysis':
        prompt += `analyze current campaign trends and compare with expert predictions.

Focus on trends that:
1. Are visible in campaign data
2. Align with expert observations
3. Have strategic implications

For each trend:
- Title: Clear, descriptive title
- Description: What's happening
- Data Evidence: Supporting metrics
- Expert Context: Related trends from essays
- Trajectory: growing/stable/declining with evidence
- Strategy: Recommended response

Format as JSON:
{
  "trends": [
    {
      "title": "Trend title",
      "description": "What's happening",
      "dataEvidence": "Supporting metrics",
      "expertContext": "Quote from essays",
      "trajectory": "growing|stable|declining",
      "strategy": "How to respond"
    }
  ]
}`;
        break;
        
      default:
        prompt += `provide 3-5 valuable insights that combine campaign performance data with expert knowledge.

Format your response as JSON with insights that include:
- Title and description
- Supporting campaign metrics
- Expert quotes/references
- Importance rating
- Recommended actions`;
    }
    
    // Add campaign and analytics context if available
    if (campaigns && campaigns.length > 0) {
      prompt += `\n\nConsider the following campaign data in your analysis:\n${JSON.stringify(campaigns, null, 2)}`;
    }
    
    if (analyticsData) {
      prompt += `\n\nConsider the following analytics data in your analysis:\n${JSON.stringify(analyticsData, null, 2)}`;
    }
    
    // Add essay content
    prompt += `\n\nEssays to analyze:\n`;
    essayContents.forEach(essay => {
      prompt += `\n--- ${essay.author} ---\n${essay.content.substring(0, 1000)}...\n`;
    });
    
    console.log('Generated prompt:', prompt.substring(0, 200) + '...');
    
    // Generate AI response
    let aiResponse;
    try {
      console.log('Calling OpenAI API with prompt...');
      aiResponse = await generateAIResponse(prompt, {
        campaignData,
        analyticsData,
        temperature: 0.7,
        max_tokens: 1500
      });
      console.log('AI Response received:', aiResponse.substring(0, 200) + '...');
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw new Error(`OpenAI API error: ${openaiError.message}`);
    }
    
    // Try to parse the response as JSON
    let parsedResponse;
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                        aiResponse.match(/\{[\s\S]*\}/);
                        
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse;
      parsedResponse = JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      // Fall back to sending the raw response
      parsedResponse = { 
        rawResponse: aiResponse,
        error: 'Failed to parse as JSON'
      };
    }
    
    // Map insight type to RecommendationType
    let recommendationType: 'BUDGET_OPTIMIZATION' | 'KEYWORD_OPTIMIZATION' | 'AD_COPY_IMPROVEMENT' | 'TARGETING_REFINEMENT' | 'PERFORMANCE_ANALYSIS';
    
    switch (insightType.toLowerCase()) {
      case 'opportunity':
        recommendationType = 'BUDGET_OPTIMIZATION';
        break;
      case 'recommendation':
        recommendationType = 'AD_COPY_IMPROVEMENT';
        break;
      case 'analysis':
        recommendationType = 'TARGETING_REFINEMENT';
        break;
      case 'alert':
      case 'insight':
      case 'success':
      default:
        recommendationType = 'PERFORMANCE_ANALYSIS';
    }

    // Create an insight object (not stored in database)
    const insight = {
      id: `insight-${Date.now()}`,
      type: recommendationType,
      title: `${insightType.charAt(0).toUpperCase() + insightType.slice(1)} Analysis`,
      description: `AI-generated ${insightType} analysis based on marketing expert essays`,
      priority: 'HIGH',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: 'Essay Analysis',
      source: 'Marketing Essays',
      originalType: insightType,
      confidence: 85
    };
    
    res.json({
      insight,
      response: parsedResponse
    });
    
  } catch (error) {
    console.error('Error generating insights:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate insights', 
      details: error.message,
      stack: error.stack
    });
  }
});

// CUA additional endpoints
app.get('/api/cua/commands', async (req, res) => {
  try {
    const commands = await prisma.cUACommand.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(commands);
  } catch (error) {
    console.error('Error fetching CUA commands:', error);
    res.status(500).json({ error: 'Failed to fetch CUA commands' });
  }
});

app.get('/api/cua/users', async (req, res) => {
  try {
    const userAccess = await prisma.cUAUserAccess.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(userAccess);
  } catch (error) {
    console.error('Error fetching CUA user access:', error);
    res.status(500).json({ error: 'Failed to fetch CUA user access' });
  }
});

app.get('/api/cua/audits', async (req, res) => {
  try {
    const audits = await prisma.cUAAudit.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(audits);
  } catch (error) {
    console.error('Error fetching CUA audits:', error);
    res.status(500).json({ error: 'Failed to fetch CUA audits' });
  }
});

app.get('/api/cua/audit/latest', async (req, res) => {
  try {
    const latestAudit = await prisma.cUAAudit.findFirst({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (!latestAudit) {
      return res.status(404).json({ error: 'No audits found' });
    }
    
    res.json(latestAudit);
  } catch (error) {
    console.error('Error fetching latest CUA audit:', error);
    res.status(500).json({ error: 'Failed to fetch latest CUA audit' });
  }
});

app.post('/api/cua/automation', async (req, res) => {
  try {
    const { script, command } = req.body;
    console.log('Starting CUA automation:', { script, command });
    
    // Execute the actual automation script
    const { exec } = require('child_process');
    exec(script, (error, stdout, stderr) => {
      if (error) {
        console.error(`Automation error: ${error}`);
        return res.status(500).json({ 
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
    res.json({
        status: 'completed',
              script, 
              command,
        output: stdout,
      timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error('Error starting CUA automation:', error);
    res.status(500).json({ error: 'Failed to start CUA automation' });
  }
});

app.post('/api/cua/automation/stop', async (req, res) => {
  try {
    console.log('Stopping CUA automation');
    
    // Kill any running automation processes
    const { exec } = require('child_process');
    exec('pkill -f "cua_automation"', (error, stdout, stderr) => {
    res.json({
      status: 'stopped',
      timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error('Error stopping CUA automation:', error);
    res.status(500).json({ error: 'Failed to stop CUA automation' });
  }
});

app.get('/api/cua/interface', async (req, res) => {
  try {
    // Get real CUA interface status from database
    const totalCommands = await prisma.cUACommand.count();
    const totalUsers = await prisma.cUAUserAccess.count();
    const totalAudits = await prisma.cUAAudit.count();
    
    const interfaceData = {
      status: totalCommands > 0 ? 'active' : 'inactive',
      version: '1.0.0',
      features: ['automation', 'auditing', 'user_management'],
      stats: {
        totalCommands,
        totalUsers,
        totalAudits
      },
      timestamp: new Date().toISOString(),
    };
    res.json(interfaceData);
  } catch (error) {
    console.error('Error fetching CUA interface:', error);
    res.status(500).json({ error: 'Failed to fetch CUA interface' });
  }
});

// CUA interface POST endpoint for agentic mode
app.post('/api/cua/interface', async (req, res) => {
  try {
    const { prompt, screenshot, responseId, callId, safetyChecks } = req.body;
    console.log('CUA interface request:', { prompt: prompt?.substring(0, 100) + '...', hasScreenshot: !!screenshot, responseId, callId });
    
    // Generate a unique ID for this response
    const id = 'resp-' + Date.now();
    
    if (prompt) {
      // This is a new prompt - execute Python automation
      const commandId = 'cmd-' + Date.now();
      const timestamp = new Date();
      
      try {
        // Escape prompt for shell safety
        const escapedPrompt = prompt.replace(/"/g, '\\"');
        
        // Execute Python automation
        console.log('Executing Python CUA automation for prompt');
        const pythonCmd = `python3 cua_automation.py "${escapedPrompt}" "Agentic CUA request"`;
        
        exec(pythonCmd, (error, stdout, stderr) => {
          if (error) {
            console.error(`Python execution error: ${error}`);
          }
          if (stderr) {
            console.error(`Python stderr: ${stderr}`);
          }
          console.log(`Python stdout: ${stdout}`);
        });
        
        // Return immediate response with reasoning
        return res.json({
          id,
          output: [
            {
              type: 'reasoning',
              id: 'reasoning-' + Date.now(),
              summary: [
                {
                  type: 'summary_text',
                  text: `Processing request: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`
                }
              ]
            },
            {
              type: 'text',
              text: `I'll help you with that request. Processing your command: "${prompt}"`
            }
          ]
        });
        
      } catch (pythonError: any) {
        console.error('Python execution failed:', pythonError);
        return res.json({
          id,
          output: [
            {
              type: 'text',
              text: `I encountered an error processing your request: ${pythonError.message}`
            }
          ]
        });
      }
    } else if (screenshot && callId) {
      // This is a screenshot response to a previous action
      console.log('Received screenshot response for call:', callId);
      
      // Process the screenshot and continue the conversation
      return res.json({
        id,
        output: [
          {
            type: 'text',
            text: 'I can see the current state of your screen. What would you like me to do next?'
          }
        ]
      });
    } else {
      // Invalid request
      return res.status(400).json({ 
        error: 'Invalid request. Please provide either a prompt or a screenshot with callId.' 
      });
    }
    
  } catch (error: any) {
    console.error('Error in CUA interface:', error);
    res.status(500).json({ error: 'Failed to process CUA request', details: error.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    console.log('Chat request:', { message, context });
    
    const aiResponse = await generateAIResponse(message, context);
    
    res.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Server-side search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { query, maxResults, siteRestrict, freshness, forceRefresh } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log('Search request:', { query, maxResults, siteRestrict, freshness, forceRefresh });
    
    const options: any = {};
    
    if (maxResults) options.maxResults = parseInt(maxResults as string);
    if (siteRestrict) options.siteRestrict = siteRestrict as string;
    if (freshness && ['day', 'week', 'month', 'year'].includes(freshness as string)) {
      options.freshness = freshness as 'day' | 'week' | 'month' | 'year';
    }
    if (forceRefresh === 'true') options.forceRefresh = true;
    
    const results = await searchService.search(query, options);
    
    res.json(results);
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ 
      error: 'Failed to perform search',
      message: error instanceof Error ? error.message : 'Unknown error',
      query: req.query.query
    });
  }
});



// Campaign Metrics endpoints
app.get('/api/campaign-metrics', async (req, res) => {
  try {
    // Return mock data if MOCK_MODE is enabled
    if (MOCK_MODE) {
      return res.json({
        metrics: mockCampaignMetrics.metrics,
        summary: mockCampaignMetrics.summary,
        dateRange: {
          start: mockAnalytics[0]?.date.toISOString() || new Date().toISOString(),
          end: mockAnalytics[mockAnalytics.length - 1]?.date.toISOString() || new Date().toISOString(),
          availableRange: {
            start: mockAnalytics[0]?.date.toISOString() || new Date().toISOString(),
            end: mockAnalytics[mockAnalytics.length - 1]?.date.toISOString() || new Date().toISOString()
          }
        },
        isMockData: true
      });
    }

    const { startDate, endDate, campaignName } = req.query;
    
    // Get the available date range
    const dateRange = await getDateRange();
    
    // Parse and validate dates
    let queryStartDate = startDate ? new Date(startDate as string) : dateRange.startDate;
    let queryEndDate = endDate ? new Date(endDate as string) : dateRange.endDate;
    
    // Ensure dates are within the available range
    if (queryStartDate < dateRange.startDate) queryStartDate = dateRange.startDate;
    if (queryEndDate > dateRange.endDate) queryEndDate = dateRange.endDate;
    
    // Get metrics
    const result = await getCampaignMetrics({
      startDate: queryStartDate,
      endDate: queryEndDate,
      campaignName: campaignName as string | undefined
    });

    res.json({
      metrics: result.metrics,
      summary: result.summary,
      dateRange: {
        start: queryStartDate,
        end: queryEndDate,
        availableRange: {
          start: dateRange.startDate,
          end: dateRange.endDate
        }
      }
    });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    res.status(500).json({ error: 'Failed to fetch campaign metrics' });
  }
});

app.get('/api/campaign-metrics/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaignMetric.findMany({
      select: {
        campaignName: true
      },
      distinct: ['campaignName']
    });

    res.json(campaigns.map(c => c.campaignName));
  } catch (error) {
    console.error('Error fetching campaign names:', error);
    res.status(500).json({ error: 'Failed to fetch campaign names' });
  }
});

app.get('/api/campaign-metrics/date-range', async (req, res) => {
  try {
    const dateRange = await getDateRange();
    
    res.json({
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      availableDates: {
        start: dateRange.startDate.toISOString(),
        end: dateRange.endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching date range:', error);
    res.status(500).json({ error: 'Failed to fetch date range' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});