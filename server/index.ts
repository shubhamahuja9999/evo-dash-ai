import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { generateAIResponse } from './openai';
import { exec } from 'child_process';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// CUA Command endpoint
app.post('/api/cua/command', async (req, res) => {
  try {
    const { command, description } = req.body;
    console.log('Received CUA command:', { command, description });
    
    const commandId = 'cmd-' + Date.now();
    const timestamp = new Date();
    
    // Check if the command requires CUA
    const needsCUA = command.toLowerCase().includes('campaign') || 
                    command.toLowerCase().includes('google ads') ||
                    command.toLowerCase().includes('performance') ||
                    command.toLowerCase().includes('metrics') ||
                    command.toLowerCase().includes('audit');
    
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

// Analytics endpoints
app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await prisma.analytics.findMany({
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
    const totalUsers = await prisma.user.count();
    const totalRevenue = await prisma.analytics.aggregate({
      _sum: {
        conversionValue: true,
      },
    });
    const totalConversions = await prisma.analytics.aggregate({
      _sum: {
        conversions: true,
      },
    });
    const totalImpressions = await prisma.analytics.aggregate({
      _sum: {
        impressions: true,
      },
    });

    const stats = {
      totalUsers,
      revenue: totalRevenue._sum.conversionValue || 0,
      conversionRate: (totalImpressions._sum.impressions || 0) > 0 
        ? ((totalConversions._sum.conversions || 0) / (totalImpressions._sum.impressions || 0) * 100).toFixed(1) + '%'
        : '0%',
      aiScore: Math.floor(Math.random() * 40) + 60, // Mock AI score between 60-100
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

// Campaigns endpoints
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.get('/api/campaigns/stats', async (req, res) => {
  try {
    const activeCampaigns = await prisma.campaign.count({
      where: {
        status: 'ACTIVE',
      },
    });
    
    const totalConversions = await prisma.analytics.aggregate({
      _sum: {
        conversions: true,
      },
    });
    
    const totalImpressions = await prisma.analytics.aggregate({
      _sum: {
        impressions: true,
      },
    });
    
    const totalClicks = await prisma.analytics.aggregate({
      _sum: {
        clicks: true,
      },
    });

    const avgCTR = (totalImpressions._sum.impressions || 0) > 0 
      ? ((totalClicks._sum.clicks || 0) / (totalImpressions._sum.impressions || 0) * 100).toFixed(2) + '%'
      : '0%';

    const stats = {
      activeCampaigns,
      totalConversions: totalConversions._sum.conversions || 0,
      totalImpressions: totalImpressions._sum.impressions || 0,
      avgCTR,
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
      avgConfidence: Math.floor(Math.random() * 20) + 80, // Mock confidence between 80-100%
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching insight stats:', error);
    res.status(500).json({ error: 'Failed to fetch insight stats' });
  }
});

// CUA additional endpoints
app.get('/api/cua/commands', async (req, res) => {
  try {
    const commands = await prisma.cUACommand.findMany({
      include: {
        user: true,
      },
      orderBy: {
        executedAt: 'desc',
      },
    });
    res.json(commands);
  } catch (error) {
    console.error('Error fetching CUA commands:', error);
    res.status(500).json({ error: 'Failed to fetch CUA commands' });
  }
});

app.get('/api/cua/users', async (req, res) => {
  try {
    const users = await prisma.cUAUserAccess.findMany({
      include: {
        user: true,
        granter: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching CUA users:', error);
    res.status(500).json({ error: 'Failed to fetch CUA users' });
  }
});

app.get('/api/cua/audits', async (req, res) => {
  try {
    const audits = await prisma.cUAAudit.findMany({
      include: {
        auditor: true,
      },
      orderBy: {
        performedAt: 'desc',
      },
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
        auditor: true,
      },
      orderBy: {
        performedAt: 'desc',
      },
    });
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
    
    // Mock automation start response
    res.json({
      status: 'started',
      script,
      command,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error starting CUA automation:', error);
    res.status(500).json({ error: 'Failed to start CUA automation' });
  }
});

app.post('/api/cua/automation/stop', async (req, res) => {
  try {
    console.log('Stopping CUA automation');
    
    // Mock automation stop response
    res.json({
      status: 'stopped',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error stopping CUA automation:', error);
    res.status(500).json({ error: 'Failed to stop CUA automation' });
  }
});

app.get('/api/cua/interface', async (req, res) => {
  try {
    // Mock CUA interface data
    const interfaceData = {
      status: 'active',
      version: '1.0.0',
      features: ['automation', 'auditing', 'user_management'],
      timestamp: new Date().toISOString(),
    };
    res.json(interfaceData);
  } catch (error) {
    console.error('Error fetching CUA interface:', error);
    res.status(500).json({ error: 'Failed to fetch CUA interface' });
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});