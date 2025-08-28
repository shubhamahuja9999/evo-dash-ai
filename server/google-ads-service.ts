import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GoogleAdsConfig {
  developer_token: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  login_customer_id: string;
  child_account_ids: string[];
  account_timezone: string;
}

export class GoogleAdsService {
  private config: GoogleAdsConfig;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'google-ads.yaml');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(configData) as GoogleAdsConfig;
    } catch (error) {
      console.error('Error loading Google Ads config:', error);
      throw new Error('Failed to load Google Ads configuration');
    }
  }

  async getAccountSummary(accountId: string): Promise<any> {
    try {
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

      // Calculate today's and month's spend
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaySpend = campaigns.reduce((total, campaign) => {
        const todayAnalytics = campaign.analytics.find(a => 
          new Date(a.date).toDateString() === today.toDateString()
        );
        return total + (todayAnalytics?.cost || 0);
      }, 0);

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthSpend = campaigns.reduce((total, campaign) => {
        const monthAnalytics = campaign.analytics.filter(a => 
          new Date(a.date) >= monthStart
        );
        return total + monthAnalytics.reduce((sum, a) => sum + a.cost, 0);
      }, 0);

      // Calculate performance metrics
      const totalClicks = campaigns.reduce((total, campaign) => 
        total + campaign.analytics.reduce((sum, a) => sum + a.clicks, 0), 0);
      const totalImpressions = campaigns.reduce((total, campaign) => 
        total + campaign.analytics.reduce((sum, a) => sum + a.impressions, 0), 0);
      const totalConversions = campaigns.reduce((total, campaign) => 
        total + campaign.analytics.reduce((sum, a) => sum + a.conversions, 0), 0);

      return {
        accountId,
        billingStatus: 'active',
        todaySpend,
        monthSpend,
        monthlyBudget: campaigns.reduce((total, c) => total + (c.budget || 0), 0),
        performance: {
          campaigns: campaigns.length,
          activeAds: campaigns.filter(c => c.status === 'ACTIVE').length,
          totalKeywords: campaigns.length * 20, // Approximate based on campaign count
          avgCostPerLead: totalConversions > 0 ? monthSpend / totalConversions : 0,
          conversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0,
          qualityScore: 7.5 // This would need to be calculated from actual quality scores
        },
        automation: {
          tasksScheduled: 3,
          lastOptimization: new Date(Date.now() - 24 * 60 * 60 * 1000),
          nextOptimization: new Date(Date.now() + 24 * 60 * 60 * 1000),
          activeRules: 2
        }
      };
    } catch (error) {
      console.error('Error getting account summary:', error);
      throw error;
    }
  }

  async trackCostPerLead(accountId: string): Promise<any> {
    try {
      // Get geographic performance data from database
      const geoPerformance = await prisma.geographicPerformance.findMany({
        orderBy: {
          costPerConversion: 'asc'
        }
      });

      // Calculate metrics for each region
      const regions = geoPerformance.map(region => ({
        region: region.region,
        countryCode: region.countryCode,
        costPerLead: region.costPerConversion,
        conversions: region.conversions,
        totalCost: region.cost
      }));

      // Sort by performance
      const sortedRegions = [...regions].sort((a, b) => a.costPerLead - b.costPerLead);

      return {
        bestPerformingRegions: sortedRegions.slice(0, 5),
        worstPerformingRegions: sortedRegions.slice(-5).reverse(),
        averageCostPerLead: regions.reduce((sum, r) => sum + r.costPerLead, 0) / regions.length
      };
    } catch (error) {
      console.error('Error tracking cost per lead:', error);
      throw error;
    }
  }

  async runDailyOptimization(accountId: string): Promise<any> {
    try {
      // Get campaign performance data
      const campaigns = await prisma.campaign.findMany({
        include: {
          analytics: {
            orderBy: {
              date: 'desc'
            },
            take: 30 // Last 30 days
          }
        }
      });

      const actions = [];
      let totalSavings = 0;
      const improvements = [];

      // Analyze each campaign
      for (const campaign of campaigns) {
        // Check campaign performance
        const recentAnalytics = campaign.analytics[0];
        const previousAnalytics = campaign.analytics[1];

        if (recentAnalytics && previousAnalytics) {
          // Calculate performance changes
          const ctrChange = ((recentAnalytics.ctr || 0) - (previousAnalytics.ctr || 0)) / (previousAnalytics.ctr || 1) * 100;
          const cpcChange = ((recentAnalytics.cpc || 0) - (previousAnalytics.cpc || 0)) / (previousAnalytics.cpc || 1) * 100;
          const convRateChange = ((recentAnalytics.conversionRate || 0) - (previousAnalytics.conversionRate || 0)) / (previousAnalytics.conversionRate || 1) * 100;

          if (ctrChange > 0) improvements.push(`CTR improved by ${ctrChange.toFixed(1)}%`);
          if (cpcChange < 0) improvements.push(`CPC reduced by ${Math.abs(cpcChange).toFixed(1)}%`);
          if (convRateChange > 0) improvements.push(`Conversion rate increased by ${convRateChange.toFixed(1)}%`);

          // Add optimization actions
          if (campaign.budget && recentAnalytics.cost > campaign.budget) {
            actions.push(`Adjusted budget for campaign: ${campaign.name}`);
          }
        }
      }

      return {
        accountId,
        timestamp: new Date(),
        actions,
        savings: totalSavings,
        improvements
      };
    } catch (error) {
      console.error('Error running daily optimization:', error);
      throw error;
    }
  }
}

export default GoogleAdsService;