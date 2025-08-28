import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

export interface MLFeatures {
  // Lead features
  lead_source_score?: number;
  company_size_score?: number;
  job_title_score?: number;
  industry_score?: number;
  
  // Campaign features
  campaign_performance?: number;
  keyword_relevance?: number;
  ad_quality_score?: number;
  landing_page_score?: number;
  
  // Engagement features
  time_to_conversion?: number;
  page_views?: number;
  session_duration?: number;
  bounce_rate?: number;
  
  // External features
  market_conditions?: number;
  seasonality?: number;
  competitor_activity?: number;
  
  // Prediction features
  expected_roas?: number;
  expected_ctr?: number;
  expected_cpc?: number;
}

export interface MLPredictionResult {
  prediction: number;
  confidence: number;
  features: MLFeatures;
  modelVersion: string;
}

export class MLService {
  private modelCache: Map<string, any> = new Map();

  constructor() {
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      // Load active ML models from database
      const activeModels = await prisma.mLModel.findMany({
        where: { isActive: true }
      });

      for (const model of activeModels) {
        if (model.filePath) {
          // Cache model metadata
          this.modelCache.set(model.type, {
            id: model.id,
            version: model.version,
            accuracy: model.accuracy,
            metadata: model.metadata
          });
        }
      }

      console.log(`✅ Loaded ${activeModels.length} ML models`);
    } catch (error) {
      console.error('❌ Error initializing ML models:', error);
    }
  }

  /**
   * Predict lead quality score using ML model
   */
  async predictLeadQuality(leadId: string, features: MLFeatures): Promise<MLPredictionResult> {
    try {
      // Get lead data
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          campaign: true,
          adGroup: true,
          ad: true,
          leadActivities: true
        }
      });

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Enhance features with lead data
      const enhancedFeatures = await this.enhanceLeadFeatures(lead, features);

      // Call Python ML service
      const prediction = await this.callMLModel('LEAD_QUALITY_SCORING', enhancedFeatures);

      // Store prediction in database
      const model = this.modelCache.get('LEAD_QUALITY_SCORING');
      if (model) {
        await prisma.mLPrediction.create({
          data: {
            modelId: model.id,
            entityType: 'lead',
            entityId: leadId,
            prediction: prediction.prediction,
            confidence: prediction.confidence,
            features: enhancedFeatures as any
          }
        });
      }

      return prediction;
    } catch (error) {
      console.error('Error predicting lead quality:', error);
      throw error;
    }
  }

  /**
   * Optimize campaign budget allocation using ML
   */
  async optimizeCampaignBudget(campaignId: string): Promise<{
    recommendedBudget: number;
    expectedROAS: number;
    confidence: number;
  }> {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          analytics: {
            orderBy: { date: 'desc' },
            take: 30 // Last 30 days
          },
          leads: true,
          keywords: true
        }
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      const features = await this.extractCampaignFeatures(campaign);
      const prediction = await this.callMLModel('BUDGET_OPTIMIZATION', features);

      return {
        recommendedBudget: prediction.prediction,
        expectedROAS: prediction.features.expected_roas || 0,
        confidence: prediction.confidence
      };
    } catch (error) {
      console.error('Error optimizing campaign budget:', error);
      throw error;
    }
  }

  /**
   * Predict keyword performance
   */
  async predictKeywordPerformance(keywordText: string, campaignId: string): Promise<{
    performanceScore: number;
    expectedCTR: number;
    expectedCPC: number;
    confidence: number;
  }> {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          keywords: true,
          analytics: {
            orderBy: { date: 'desc' },
            take: 7 // Last week
          }
        }
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      const features = await this.extractKeywordFeatures(keywordText, campaign);
      const prediction = await this.callMLModel('KEYWORD_PERFORMANCE', features);

      return {
        performanceScore: prediction.prediction,
        expectedCTR: prediction.features.expected_ctr || 0,
        expectedCPC: prediction.features.expected_cpc || 0,
        confidence: prediction.confidence
      };
    } catch (error) {
      console.error('Error predicting keyword performance:', error);
      throw error;
    }
  }

  /**
   * Analyze ad performance and suggest improvements
   */
  async analyzeAdPerformance(adId: string): Promise<{
    performanceScore: number;
    improvements: string[];
    confidence: number;
  }> {
    try {
      const ad = await prisma.ad.findUnique({
        where: { id: adId },
        include: {
          adGroup: {
            include: {
              campaign: {
                include: {
                  analytics: {
                    orderBy: { date: 'desc' },
                    take: 14 // Last 2 weeks
                  }
                }
              }
            }
          },
          leads: true
        }
      });

      if (!ad) {
        throw new Error(`Ad not found: ${adId}`);
      }

      const features = await this.extractAdFeatures(ad);
      const prediction = await this.callMLModel('AD_PERFORMANCE', features);

      const improvements = this.generateAdImprovements(ad, prediction.features);

      return {
        performanceScore: prediction.prediction,
        improvements,
        confidence: prediction.confidence
      };
    } catch (error) {
      console.error('Error analyzing ad performance:', error);
      throw error;
    }
  }

  /**
   * Train ML models with recent data
   */
  async trainModels(): Promise<void> {
    try {
      console.log('🔄 Starting ML model training...');

      // Get training data from the last 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const trainingData = await this.prepareTrainingData(cutoffDate);

      // Call Python training script
      await this.callPythonScript('train_models.py', trainingData);

      console.log('✅ ML model training completed');
    } catch (error) {
      console.error('❌ Error training ML models:', error);
      throw error;
    }
  }

  /**
   * Enhance lead features with additional data
   */
  private async enhanceLeadFeatures(lead: any, baseFeatures: MLFeatures): Promise<MLFeatures> {
    const enhanced = { ...baseFeatures };

    // Add lead source scoring
    enhanced.lead_source_score = this.scoreLeadSource(lead.leadSource);
    
    // Add company scoring if available
    if (lead.company) {
      enhanced.company_size_score = await this.scoreCompanySize(lead.company);
    }

    // Add job title scoring
    enhanced.job_title_score = this.scoreJobTitle(lead.jobTitle);

    // Add campaign performance
    if (lead.campaign) {
      enhanced.campaign_performance = await this.getCampaignPerformanceScore(lead.campaign.id);
    }

    // Add engagement metrics
    const engagement = await this.calculateLeadEngagement(lead.id);
    enhanced.time_to_conversion = engagement.timeToConversion;
    enhanced.page_views = engagement.pageViews;
    enhanced.session_duration = engagement.sessionDuration;

    return enhanced;
  }

  /**
   * Extract campaign features for ML models
   */
  private async extractCampaignFeatures(campaign: any): Promise<MLFeatures> {
    const features: MLFeatures = {};

    if (campaign.analytics.length > 0) {
      const recentAnalytics = campaign.analytics.slice(0, 7); // Last week
      
      features.campaign_performance = this.calculateCampaignPerformance(recentAnalytics);
      features.keyword_relevance = await this.calculateKeywordRelevance(campaign.keywords);
      features.ad_quality_score = await this.calculateCampaignAdQualityScore(campaign.id);
    }

    // Add market conditions
    features.market_conditions = await this.getMarketConditions();
    features.seasonality = this.getSeasonalityScore();

    return features;
  }

  /**
   * Extract keyword features for performance prediction
   */
  private async extractKeywordFeatures(keywordText: string, campaign: any): Promise<MLFeatures> {
    const features: MLFeatures = {};

    // Keyword relevance scoring
    features.keyword_relevance = await this.scoreKeywordRelevance(keywordText, campaign);
    
    // Campaign context
    features.campaign_performance = this.calculateCampaignPerformance(campaign.analytics);
    
    // Market factors
    features.market_conditions = await this.getMarketConditions();
    features.competitor_activity = await this.getCompetitorActivity(keywordText);

    return features;
  }

  /**
   * Extract ad features for performance analysis
   */
  private async extractAdFeatures(ad: any): Promise<MLFeatures> {
    const features: MLFeatures = {};

    // Ad quality metrics
    features.ad_quality_score = this.calculateAdQualityScoreSync(ad);
    
    // Landing page analysis
    if (ad.finalUrl) {
      features.landing_page_score = await this.scoreLandingPage(ad.finalUrl);
    }

    // Campaign context
    if (ad.adGroup?.campaign?.analytics) {
      features.campaign_performance = this.calculateCampaignPerformance(ad.adGroup.campaign.analytics);
    }

    return features;
  }

  /**
   * Call Python ML model service
   */
  private async callMLModel(modelType: string, features: MLFeatures): Promise<MLPredictionResult> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(process.cwd(), 'ml_services', 'predict.py'),
        modelType,
        JSON.stringify(features)
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse ML model output: ${stdout}`));
          }
        } else {
          reject(new Error(`ML model failed: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Call Python script with data
   */
  private async callPythonScript(scriptName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(process.cwd(), 'ml_services', scriptName),
        JSON.stringify(data)
      ]);

      let stderr = '';

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python script failed: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Prepare training data for ML models
   */
  private async prepareTrainingData(sinceDate: Date) {
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: sinceDate }
      },
      include: {
        campaign: true,
        adGroup: true,
        ad: true,
        leadActivities: true
      }
    });

    const campaigns = await prisma.campaign.findMany({
      where: {
        createdAt: { gte: sinceDate }
      },
      include: {
        analytics: true,
        keywords: true,
        leads: true
      }
    });

    return {
      leads,
      campaigns,
      timestamp: new Date().toISOString()
    };
  }

  // Helper methods for feature scoring
  private scoreLeadSource(source: string | null): number {
    const sourceScores: { [key: string]: number } = {
      'organic': 0.8,
      'paid_search': 0.7,
      'social_media': 0.6,
      'email': 0.5,
      'referral': 0.9,
      'direct': 0.4
    };
    return sourceScores[source?.toLowerCase() || ''] || 0.3;
  }

  private scoreJobTitle(title: string | null): number {
    if (!title) return 0.3;
    
    const highValueTitles = ['ceo', 'cto', 'cfo', 'director', 'manager', 'vp', 'president'];
    const titleLower = title.toLowerCase();
    
    return highValueTitles.some(hvt => titleLower.includes(hvt)) ? 0.8 : 0.4;
  }

  private async scoreCompanySize(company: string): Promise<number> {
    // This would integrate with external APIs to get company info
    // For now, return a default score
    return 0.5;
  }

  private async getCampaignPerformanceScore(campaignId: string): Promise<number> {
    const analytics = await prisma.analytics.findMany({
      where: { campaignId },
      orderBy: { date: 'desc' },
      take: 7
    });

    if (analytics.length === 0) return 0.5;

    const avgCTR = analytics.reduce((sum, a) => sum + (a.ctr || 0), 0) / analytics.length;
    const avgConversionRate = analytics.reduce((sum, a) => {
      const convRate = a.clicks > 0 ? a.conversions / a.clicks : 0;
      return sum + convRate;
    }, 0) / analytics.length;

    return Math.min((avgCTR * 10 + avgConversionRate * 100) / 2, 1.0);
  }

  private calculateCampaignPerformance(analytics: any[]): number {
    if (analytics.length === 0) return 0.5;

    const totalClicks = analytics.reduce((sum, a) => sum + a.clicks, 0);
    const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
    const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);

    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;

    return Math.min((ctr * 10 + conversionRate * 100) / 2, 1.0);
  }

  private async calculateKeywordRelevance(keywords: any[]): Promise<number> {
    if (keywords.length === 0) return 0.5;

    const avgQualityScore = keywords.reduce((sum, k) => sum + (k.qualityScore || 5), 0) / keywords.length;
    return Math.min(avgQualityScore / 10, 1.0);
  }

  private async calculateCampaignAdQualityScore(campaignId: string): Promise<number> {
    // Get all ads in the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        adGroups: {
          include: {
            ads: true
          }
        }
      }
    });

    if (!campaign) return 0.5;

    // Calculate average quality score across all ads
    let totalScore = 0;
    let adCount = 0;

    for (const adGroup of campaign.adGroups) {
      for (const ad of adGroup.ads) {
        totalScore += this.calculateAdQualityScoreSync(ad);
        adCount++;
      }
    }

    return adCount > 0 ? totalScore / adCount : 0.7;
  }

  private calculateAdQualityScoreSync(ad: any): number {
    let score = 0.5;

    // Check headline quality
    if (ad.headline1 && ad.headline1.length > 10) score += 0.1;
    if (ad.headline2 && ad.headline2.length > 10) score += 0.1;
    if (ad.headline3 && ad.headline3.length > 10) score += 0.1;

    // Check description quality
    if (ad.description && ad.description.length > 20) score += 0.2;

    return Math.min(score, 1.0);
  }

  private async scoreLandingPage(url: string): Promise<number> {
    // This would analyze landing page quality, loading speed, etc.
    return 0.6; // Default score
  }

  private async getMarketConditions(): Promise<number> {
    // This would integrate with market data APIs
    return 0.5; // Default neutral conditions
  }

  private getSeasonalityScore(): number {
    const month = new Date().getMonth();
    // Higher scores for high-activity months (Q4, back-to-school, etc.)
    const seasonalityMap = [0.4, 0.3, 0.5, 0.6, 0.7, 0.6, 0.5, 0.8, 0.9, 0.8, 0.9, 1.0];
    return seasonalityMap[month];
  }

  private async scoreKeywordRelevance(keyword: string, campaign: any): Promise<number> {
    // This would use NLP to analyze keyword relevance to campaign
    return 0.6; // Default score
  }

  private async getCompetitorActivity(keyword: string): Promise<number> {
    // This would integrate with competitive intelligence APIs
    return 0.5; // Default score
  }

  private async calculateLeadEngagement(leadId: string): Promise<{
    timeToConversion: number;
    pageViews: number;
    sessionDuration: number;
  }> {
    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { timestamp: 'asc' }
    });

    const firstActivity = activities[0];
    const lastActivity = activities[activities.length - 1];

    const timeToConversion = firstActivity && lastActivity 
      ? (lastActivity.timestamp.getTime() - firstActivity.timestamp.getTime()) / (1000 * 60 * 60) // hours
      : 0;

    const pageViews = activities.filter(a => a.activityType === 'WEBSITE_VISIT').length;

    return {
      timeToConversion,
      pageViews,
      sessionDuration: 0 // Would need additional tracking
    };
  }

  private generateAdImprovements(ad: any, features: MLFeatures): string[] {
    const improvements: string[] = [];

    if (!ad.headline2) {
      improvements.push('Add a second headline to increase ad real estate');
    }

    if (!ad.headline3) {
      improvements.push('Add a third headline for better A/B testing');
    }

    if (ad.description && ad.description.length < 50) {
      improvements.push('Expand description to better explain value proposition');
    }

    if (features.landing_page_score && features.landing_page_score < 0.6) {
      improvements.push('Improve landing page loading speed and relevance');
    }

    return improvements;
  }
}

export const mlService = new MLService();
