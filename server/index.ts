import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { generateAIResponse } from './openai';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { campaignService } from './campaign-service';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

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

// CUA Command endpoint
app.post('/api/cua/command', async (req, res) => {
  try {
    const { command, description } = req.body;
    console.log('Received CUA command:', { command, description });
    
    const commandId = 'cmd-' + Date.now();
    const timestamp = new Date();
    
    // Always use CUA for all commands - fully agentic mode
    const needsCUA = true;
    
    // Execute Python automation if needed
    if (needsCUA) {
      console.log('Executing Python CUA automation');
      return await executePythonAutomation(command, description, commandId, timestamp, res);
    } else {
      // Otherwise, just use AI to answer
      console.log('Using AI to answer without CUA automation');
      
      const aiResponse = await generateAIResponse(
        `${command}${description ? '\n\n' + description : ''}`,
        {}
      );
      
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
  description: string | undefined, 
  commandId: string, 
  timestamp: Date,
  res: any
) {
  try {
    // Escape command and description for shell safety
    const escapedCommand = command.replace(/"/g, '\\"');
    const escapedDescription = description ? description.replace(/"/g, '\\"') : '';
    
        // Create a promise to handle the async execution
        const pythonResult = await new Promise((resolve, reject) => {
      const pythonCmd = `python3 cua_automation.py "${escapedCommand}" "${escapedDescription}"`;
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
    const { startDate, endDate, dateRange } = req.query;
    
    // Build date filter like Google Ads
    let dateFilter = {};
    
    if (startDate && endDate) {
      // Custom date range
      dateFilter = {
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      };
    } else if (dateRange) {
      // Predefined date ranges (like Google Ads) - use UTC to match database
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateRange) {
        case 'today':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dateFilter = { 
            date: { 
              gte: today,
              lt: tomorrow 
            } 
          };
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          dateFilter = { 
            date: { 
              gte: yesterday, 
              lt: today 
            } 
          };
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
          dateFilter = { 
            date: { 
              gte: startOfLastMonth, 
              lte: endOfLastMonth 
            } 
          };
          break;
      }
    }
    
    const analytics = await prisma.analytics.findMany({
      where: dateFilter,
      include: {
        campaign: true,
        user: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

app.get('/api/analytics/stats', async (req, res) => {
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
    
    const totalUsers = await prisma.user.count();
    const totalRevenue = await prisma.analytics.aggregate({
      where: dateFilter,
      _sum: {
        conversionValue: true,
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

    const stats = {
      totalUsers: totalUsers.toLocaleString(),
      revenue: `₹${(totalRevenue._sum.conversionValue || 0).toLocaleString()}`,
      conversionRate: (totalImpressions._sum.impressions || 0) > 0 
        ? ((totalConversions._sum.conversions || 0) / (totalImpressions._sum.impressions || 0) * 100).toFixed(1) + '%'
        : '0%',
      aiScore: '94.2',
      // Add date range info
      dateRange: dateRange || 'all_time',
      startDate: startDate || null,
      endDate: endDate || null,
    };

    res.json(stats);
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
        const insights = await prisma.aIRecommendation.findMany({
      include: {
        campaign: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

app.get('/api/insights/stats', async (req, res) => {
  try {
    const totalInsights = await prisma.aIRecommendation.count();
    const highPriority = await prisma.aIRecommendation.count({
      where: {
        priority: 'HIGH',
      },
    });
    const opportunities = await prisma.aIRecommendation.count({
      where: {
        type: 'PERFORMANCE_ANALYSIS',
      },
    });

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
    // Return insights specifically from essays
    const insights = await prisma.aIRecommendation.findMany({
      where: {
        metadata: {
          path: ['category'],
          equals: 'Essay Analysis'
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10
    });
    
    // If no essay insights yet, return mock data
    if (insights.length === 0) {
      res.json([
        {
          id: "essay-insight-1",
          type: "insight",
          priority: "high",
          title: "LinkedIn Ads Attribution Challenge",
          description: "LinkedIn ads attribution is difficult because people don't always click. They lurk, screenshot, and consume content without direct interaction, making traditional click-based attribution models inadequate.",
          impact: "Potential revenue impact: Significant missed attribution",
          confidence: 92,
          category: "Advertising"
        }
      ]);
      return;
    }
    
    res.json(insights);
  } catch (error) {
    console.error('Error fetching essay insights:', error);
    res.status(500).json({ error: 'Failed to fetch essay insights' });
  }
});

app.get('/api/insights/essays/stats', async (req, res) => {
  try {
    const totalInsights = await prisma.aIRecommendation.count({
      where: {
        metadata: {
          path: ['category'],
          equals: 'Essay Analysis'
        }
      }
    });
    
    const highPriority = await prisma.aIRecommendation.count({
      where: {
        metadata: {
          path: ['category'],
          equals: 'Essay Analysis'
        },
        priority: 'HIGH',
      },
    });
    
    const stats = {
      totalInsights: totalInsights || 5,
      highPriority: highPriority || 2,
      opportunities: Math.floor(totalInsights * 0.6) || 3,
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
    
    // Read all essay files
    const essaysDir = path.join(__dirname, '..', 'essays');
    console.log('Looking for essays in:', essaysDir);
    
    // Check if directory exists
    if (!fs.existsSync(essaysDir)) {
      console.error(`Essays directory not found: ${essaysDir}`);
      throw new Error(`Essays directory not found: ${essaysDir}`);
    }
    
    const essayFiles = fs.readdirSync(essaysDir).filter(file => file.endsWith('.txt'));
    console.log('Found essay files:', essayFiles);
    
    // Read content from essay files
    let essayContents: Array<{author: string, content: string}> = [];
    for (const file of essayFiles) {
      const content = fs.readFileSync(path.join(essaysDir, file), 'utf-8');
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
    
    // Create a prompt based on the insight type
    let prompt = '';
    
    switch (insightType) {
      case 'opportunity':
        prompt = `You are an expert marketing consultant analyzing a collection of essays by marketing experts. 
        Based on these essays, identify 3-5 specific marketing OPPORTUNITIES that could be leveraged.
        
        Focus on actionable opportunities that are:
        1. Backed by specific insights from the essays
        2. Relevant to modern B2B marketing
        3. Practical to implement
        
        For each opportunity:
        - Provide a clear, concise title
        - Explain the opportunity in 2-3 sentences
        - Include a specific quote or reference from the essays
        - Estimate the potential impact (high/medium/low)
        - Suggest how to measure success
        
        Format your response as JSON with the structure:
        {
          "opportunities": [
            {
              "title": "Opportunity title",
              "description": "Description of the opportunity",
              "source": "Author name and specific reference",
              "impact": "high|medium|low",
              "measurement": "How to measure success"
            }
          ]
        }`;
        break;
        
      case 'alert':
        prompt = `You are an expert marketing consultant analyzing a collection of essays by marketing experts.
        Based on these essays, identify 3-5 specific WARNINGS or RISKS that marketers should be aware of.
        
        Focus on critical warnings that are:
        1. Backed by specific insights from the essays
        2. Relevant to modern B2B marketing
        3. Potentially damaging if ignored
        
        For each warning:
        - Provide a clear, alarming title
        - Explain the risk in 2-3 sentences
        - Include a specific quote or reference from the essays
        - Estimate the potential severity (high/medium/low)
        - Suggest how to mitigate the risk
        
        Format your response as JSON with the structure:
        {
          "warnings": [
            {
              "title": "Warning title",
              "description": "Description of the risk",
              "source": "Author name and specific reference",
              "severity": "high|medium|low",
              "mitigation": "How to mitigate this risk"
            }
          ]
        }`;
        break;
        
      case 'insight':
        prompt = `You are an expert marketing consultant analyzing a collection of essays by marketing experts.
        Based on these essays, extract 3-5 key INSIGHTS about modern marketing practices.
        
        Focus on valuable insights that are:
        1. Backed by specific points from the essays
        2. Relevant to modern B2B marketing
        3. Not obvious to the average marketer
        
        For each insight:
        - Provide a clear, insightful title
        - Explain the insight in 2-3 sentences
        - Include a specific quote or reference from the essays
        - Estimate the relevance (high/medium/low)
        - Explain why this insight matters
        
        Format your response as JSON with the structure:
        {
          "insights": [
            {
              "title": "Insight title",
              "description": "Description of the insight",
              "source": "Author name and specific reference",
              "relevance": "high|medium|low",
              "importance": "Why this insight matters"
            }
          ]
        }`;
        break;
        
      case 'recommendation':
        prompt = `You are an expert marketing consultant analyzing a collection of essays by marketing experts.
        Based on these essays, provide 3-5 specific RECOMMENDATIONS for marketing strategies.
        
        Focus on actionable recommendations that are:
        1. Backed by specific insights from the essays
        2. Relevant to modern B2B marketing
        3. Practical to implement
        
        For each recommendation:
        - Provide a clear, directive title
        - Explain the recommendation in 2-3 sentences
        - Include a specific quote or reference from the essays
        - Estimate the priority (high/medium/low)
        - Outline the first steps to implement
        
        Format your response as JSON with the structure:
        {
          "recommendations": [
            {
              "title": "Recommendation title",
              "description": "Description of the recommendation",
              "source": "Author name and specific reference",
              "priority": "high|medium|low",
              "implementation": "First steps to implement"
            }
          ]
        }`;
        break;
        
      case 'success':
        prompt = `You are an expert marketing consultant analyzing a collection of essays by marketing experts.
        Based on these essays, extract 3-5 SUCCESS STORIES or case studies mentioned.
        
        Focus on success stories that are:
        1. Backed by specific examples from the essays
        2. Relevant to modern B2B marketing
        3. Contain clear cause-and-effect relationships
        
        For each success story:
        - Provide a clear, compelling title
        - Summarize the success story in 2-3 sentences
        - Include a specific quote or reference from the essays
        - Identify the key factors that led to success
        - Extract the main lesson learned
        
        Format your response as JSON with the structure:
        {
          "successStories": [
            {
              "title": "Success story title",
              "description": "Description of the success story",
              "source": "Author name and specific reference",
              "keyFactors": "Factors that led to success",
              "lesson": "Main lesson learned"
            }
          ]
        }`;
        break;
        
      case 'analysis':
        prompt = `You are an expert marketing consultant analyzing a collection of essays by marketing experts.
        Based on these essays, provide a TREND ANALYSIS of current and emerging marketing trends.
        
        Focus on significant trends that are:
        1. Backed by specific mentions in the essays
        2. Relevant to modern B2B marketing
        3. Likely to impact marketing strategies
        
        For each trend:
        - Provide a clear, descriptive title
        - Explain the trend in 2-3 sentences
        - Include a specific quote or reference from the essays
        - Predict the future trajectory (growing/stable/declining)
        - Suggest how marketers should respond
        
        Format your response as JSON with the structure:
        {
          "trends": [
            {
              "title": "Trend title",
              "description": "Description of the trend",
              "source": "Author name and specific reference",
              "trajectory": "growing|stable|declining",
              "response": "How marketers should respond"
            }
          ]
        }`;
        break;
        
      default:
        prompt = `You are an expert marketing consultant analyzing a collection of essays by marketing experts.
        Based on these essays, provide 3-5 valuable insights that would help a marketing team improve their strategy.
        
        Format your response as JSON with insights that include a title, description, source reference, and importance rating.`;
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
    
    // Store the insight in the database
    const insight = await prisma.aIRecommendation.create({
      data: {
        type: insightType.toUpperCase(),
        title: `${insightType.charAt(0).toUpperCase() + insightType.slice(1)} Analysis`,
        description: `AI-generated ${insightType} analysis based on marketing expert essays`,
        content: JSON.stringify(parsedResponse),
        confidence: 85,
        priority: 'HIGH',
        metadata: {
          category: 'Essay Analysis',
          source: 'Marketing Essays'
        }
      }
    });
    
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

// Seed data endpoint
app.post('/api/seed-data', async (req, res) => {
  try {
    console.log('Starting sample data seeding...');
    
    const { exec } = require('child_process');
    
    // Execute the seeding script
    exec('node seed-sample-data.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Seed error: ${error}`);
        return res.status(500).send(`Seeding failed: ${error.message}`);
      }
      if (stderr) {
        console.error(`Seed stderr: ${stderr}`);
      }
      
      console.log('Sample data seeded successfully!');
      res.send(`Sample data seeded successfully!\n\n${stdout}`);
    });
    
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).send(`Error seeding data: ${error.message}`);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});