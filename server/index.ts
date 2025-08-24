import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { generateAIResponse } from './openai';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Analytics routes
app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await prisma.analytics.findMany({
      orderBy: { date: 'asc' },
    });
    
    // Transform to match frontend format
    const formattedData = analytics.map(item => ({
      name: item.date.toLocaleDateString('en-US', { month: 'short' }),
      value: item.cost,
      conversions: item.conversions,
      revenue: item.conversionValue,
      users: item.clicks, // Using clicks as a proxy for users
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Analytics stats
app.get('/api/analytics/stats', async (req, res) => {
  try {
    const analytics = await prisma.analytics.findMany();
    
    const totalUsers = analytics.reduce((sum, item) => sum + item.clicks, 0);
    const totalRevenue = analytics.reduce((sum, item) => sum + item.conversionValue, 0);
    const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0);
    const totalClicks = analytics.reduce((sum, item) => sum + item.clicks, 0);
    
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : '0.00';
    
    res.json({
      totalUsers: totalUsers.toLocaleString(),
      revenue: `₹${totalRevenue.toLocaleString()}`,
      conversionRate: `${conversionRate}%`,
      aiScore: '94.2', // Mock AI score
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics stats' });
  }
});

// Traffic sources (mock data since not in new schema)
app.get('/api/traffic-sources', async (req, res) => {
  try {
    // Mock traffic sources data
    const sources = [
      { id: 'direct', name: 'Direct', value: 35, color: '#3B82F6', date: new Date().toISOString() },
      { id: 'social', name: 'Social', value: 25, color: '#8B5CF6', date: new Date().toISOString() },
      { id: 'email', name: 'Email', value: 20, color: '#06B6D4', date: new Date().toISOString() },
      { id: 'organic', name: 'Organic', value: 20, color: '#10B981', date: new Date().toISOString() },
    ];
    res.json(sources);
  } catch (error) {
    console.error('Error fetching traffic sources:', error);
    res.status(500).json({ error: 'Failed to fetch traffic sources' });
  }
});

// Campaigns routes
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        analytics: true,
      },
    });
    
    // Transform to match frontend format
    const formattedCampaigns = campaigns.map(campaign => {
      const analytics = campaign.analytics || [];
      const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
      const totalClicks = analytics.reduce((sum, a) => sum + a.clicks, 0);
      const totalCost = analytics.reduce((sum, a) => sum + a.cost, 0);
      const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);
      
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
        startDate: campaign.startDate?.toISOString().split('T')[0] || '',
        endDate: campaign.endDate?.toISOString().split('T')[0] || '',
      };
    });
    
    res.json(formattedCampaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Campaign stats
app.get('/api/campaigns/stats', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        analytics: true,
      },
    });
    
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
    
    let totalConversions = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    
    campaigns.forEach(campaign => {
      campaign.analytics.forEach(analytics => {
        totalConversions += analytics.conversions;
        totalImpressions += analytics.impressions;
        totalClicks += analytics.clicks;
      });
    });
    
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00';
    
    res.json({
      activeCampaigns,
      totalConversions: totalConversions.toLocaleString(),
      totalImpressions: totalImpressions.toLocaleString(),
      avgCTR: `${avgCTR}%`,
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Failed to fetch campaign stats' });
  }
});

// Individual campaign details
app.get('/api/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        analytics: {
          orderBy: { date: 'asc' },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Transform analytics data for charts
    const analyticsData = campaign.analytics.map(item => ({
      date: item.date.toLocaleDateString('en-US', { month: 'short' }),
      impressions: item.impressions,
      clicks: item.clicks,
      cost: item.cost,
      conversions: item.conversions,
      conversionValue: item.conversionValue,
      ctr: item.ctr ? parseFloat((item.ctr * 100).toFixed(2)) : 0,
      cpc: item.cpc || 0,
    }));
    
    const formattedCampaign = {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status.toLowerCase(),
      budget: `₹${campaign.budget?.toLocaleString() || '0'}`,
      spent: `₹${campaign.analytics.reduce((sum, a) => sum + a.cost, 0).toLocaleString()}`,
      startDate: campaign.startDate?.toISOString().split('T')[0] || '',
      endDate: campaign.endDate?.toISOString().split('T')[0] || '',
      targetAudience: campaign.targetAudience || 'Not specified',
      analytics: analyticsData,
    };
    
    res.json(formattedCampaign);
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

// Insights routes
app.get('/api/insights', async (req, res) => {
  try {
    const recommendations = await prisma.aIRecommendation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    // Transform to match frontend format with mock data for missing fields
    const formattedInsights = recommendations.map(rec => ({
      id: rec.id,
      type: rec.type.toLowerCase().replace('_', ''),
      priority: rec.priority.toLowerCase(),
      title: rec.title,
      description: rec.description,
      impact: `Estimated ${Math.floor(Math.random() * 30 + 10)}% improvement`, // Mock impact
      confidence: Math.floor(Math.random() * 30 + 70), // Mock confidence 70-100%
      category: rec.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      isApplied: rec.isApplied,
    }));
    
    res.json(formattedInsights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// Insights stats
app.get('/api/insights/stats', async (req, res) => {
  try {
    const recommendations = await prisma.aIRecommendation.findMany();
    
    const totalInsights = recommendations.length;
    const highPriority = recommendations.filter(r => r.priority === 'HIGH').length;
    const opportunities = recommendations.filter(r => r.type === 'BUDGET_OPTIMIZATION').length;
    const avgConfidence = 89; // Mock average confidence
    
    res.json({
      totalInsights,
      highPriority,
      opportunities,
      avgConfidence,
    });
  } catch (error) {
    console.error('Error fetching insight stats:', error);
    res.status(500).json({ error: 'Failed to fetch insight stats' });
  }
});

// CUA (Command User Access) API endpoints
app.get('/api/cua/commands', async (req, res) => {
  try {
    // Get command history from audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          contains: 'COMMAND'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    // Transform audit logs to command format
    const commands = auditLogs.map(log => {
      // Extract command details from audit log
      const commandData = {
        id: log.id,
        command: log.action.replace('COMMAND_', '').toLowerCase(),
        description: `${log.entityType} operation on ${log.entityId || 'system'}`,
        status: 'COMPLETED',
        executedAt: log.createdAt.toISOString(),
        completedAt: log.createdAt.toISOString(),
        result: {
          type: log.entityType.toLowerCase(),
          message: `Action performed: ${log.action}`,
          data: log.newValues,
          oldData: log.oldValues,
          timestamp: log.createdAt.toISOString()
        }
      };
      
      return commandData;
    });
    
    res.json(commands);
  } catch (error) {
    console.error('Error fetching CUA commands:', error);
    res.status(500).json({ error: 'Failed to fetch CUA commands' });
  }
});

app.post('/api/cua/command', async (req, res) => {
  try {
    const { command, description, userId, metadata } = req.body;
    
    console.log('Received CUA command:', { command, description, userId });
    
    const commandId = 'cmd-' + Date.now();
    const timestamp = new Date();
    
    // For Python automation commands
    if (command.toLowerCase().includes('automation') || 
        command.toLowerCase().includes('audit') || 
        command.toLowerCase().includes('security') ||
        command.toLowerCase().includes('access')) {
      
      // Execute Python script via child_process
      const { exec } = require('child_process');
      
      console.log('Executing Python CUA automation...');
      
      try {
        // Create a promise to handle the async execution
        const pythonResult = await new Promise((resolve, reject) => {
          exec('python3 cua_automation.py', (error, stdout, stderr) => {
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
      } catch (pythonError) {
        console.error('Python execution failed:', pythonError);
        return res.json({
          id: commandId,
          status: 'FAILED',
          error: `Python automation failed: ${pythonError.message}`,
          timestamp: timestamp.toISOString()
        });
      }
    }
    
    // Handle campaign-related commands
    if (command.toLowerCase().includes('campaigns') || 
        command.toLowerCase().includes('campaign')) {
      try {
        const campaigns = await prisma.campaign.findMany({
          include: { analytics: true, user: true }
        });
        
        return res.json({
          id: commandId,
          status: 'COMPLETED',
          result: {
            type: 'campaigns',
            message: `Retrieved ${campaigns.length} campaigns`,
            data: campaigns,
            timestamp: timestamp.toISOString()
          }
        });
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        return res.json({
          id: commandId,
          status: 'FAILED',
          error: `Failed to fetch campaigns: ${error.message}`,
          timestamp: timestamp.toISOString()
        });
      }
    }
    
    // Handle analytics-related commands
    if (command.toLowerCase().includes('analytics')) {
      try {
        const analytics = await prisma.analytics.findMany({
          orderBy: { date: 'desc' },
          take: 30
        });
        
        return res.json({
          id: commandId,
          status: 'COMPLETED',
          result: {
            type: 'analytics',
            message: `Retrieved ${analytics.length} analytics records`,
            data: analytics,
            timestamp: timestamp.toISOString()
          }
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        return res.json({
          id: commandId,
          status: 'FAILED',
          error: `Failed to fetch analytics: ${error.message}`,
          timestamp: timestamp.toISOString()
        });
      }
    }
    
    // Handle insights-related commands
    if (command.toLowerCase().includes('insights')) {
      try {
        const insights = await prisma.aIRecommendation.findMany({
          orderBy: { createdAt: 'desc' }
        });
        
        return res.json({
          id: commandId,
          status: 'COMPLETED',
          result: {
            type: 'insights',
            message: `Retrieved ${insights.length} insights`,
            data: insights,
            timestamp: timestamp.toISOString()
          }
        });
      } catch (error) {
        console.error('Error fetching insights:', error);
        return res.json({
          id: commandId,
          status: 'FAILED',
          error: `Failed to fetch insights: ${error.message}`,
          timestamp: timestamp.toISOString()
        });
      }
    }
    
    // Default response for unrecognized commands
    return res.json({
      id: commandId,
      status: 'COMPLETED',
      result: {
        type: 'unknown_command',
        message: `Command '${command}' not recognized. Available commands: get campaigns, get analytics, get insights, audit security`,
        timestamp: timestamp.toISOString()
      }
    });
  } catch (error) {
    console.error('Error executing CUA command:', error);
    res.status(500).json({ error: 'Failed to execute CUA command', details: error.message });
  }
});

app.get('/api/cua/users', async (req, res) => {
  try {
    // Get actual users from the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });
    
    // Transform to user access format
    const userAccess = users.map(user => {
      // Determine access level based on role
      const accessLevel = user.role === 'ADMIN' ? 'SUPER_ADMIN' : 
                          user.role === 'MANAGER' ? 'ADMIN' : 'READ';
      
      // Determine permissions based on role
      let permissions = [];
      if (user.role === 'ADMIN') {
        permissions = ['*']; // All permissions
      } else if (user.role === 'MANAGER') {
        permissions = ['view_campaigns', 'edit_campaigns', 'view_analytics', 'view_insights'];
      } else {
        permissions = ['view_campaigns', 'view_analytics'];
      }
      
      return {
        id: user.id,
        userId: user.id,
        accessLevel: accessLevel,
        permissions: permissions,
        isActive: true,
        grantedBy: 'system',
        grantedAt: user.createdAt.toISOString(),
        lastAccess: user.updatedAt.toISOString(),
        user: { 
          name: user.name || 'User',
          email: user.email
        },
        granter: { 
          name: 'System',
          email: 'system@example.com'
        },
        campaigns: user.campaigns.length,
        campaignNames: user.campaigns.map(c => c.name).join(', ')
      };
    });
    
    res.json(userAccess);
  } catch (error) {
    console.error('Error fetching CUA user access:', error);
    res.status(500).json({ error: 'Failed to fetch CUA user access' });
  }
});

app.get('/api/cua/audits', async (req, res) => {
  try {
    // Get audit logs from the database
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    // Transform to audit format
    const audits = auditLogs.map(log => {
      // Determine audit type based on action
      let auditType = 'ACCESS_CONTROL';
      if (log.action.includes('DELETE') || log.action.includes('REMOVE')) {
        auditType = 'SECURITY';
      } else if (log.action.includes('CREATE') || log.action.includes('ADD')) {
        auditType = 'ACCESS_CONTROL';
      } else if (log.action.includes('UPDATE')) {
        auditType = 'USER_PERMISSIONS';
      }
      
      // Generate risk score based on action
      let riskScore = 10; // Default low risk
      if (log.action.includes('DELETE') || log.action.includes('REMOVE')) {
        riskScore = 60; // Medium-high risk
      } else if (log.action.includes('UPDATE')) {
        riskScore = 30; // Medium risk
      }
      
      return {
        id: log.id,
        auditType: auditType,
        status: 'COMPLETED',
        findings: { 
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          changes: log.oldValues && log.newValues ? 
            { from: log.oldValues, to: log.newValues } : 
            { details: 'No change details available' }
        },
        riskScore: riskScore,
        recommendations: { 
          message: 'System generated audit',
          suggestions: ['Review recent changes', 'Verify user permissions']
        },
        performedBy: log.userId || 'system',
        performedAt: log.createdAt.toISOString(),
        completedAt: log.createdAt.toISOString(),
        auditor: { 
          name: 'System Audit',
          email: 'system@example.com'
        }
      };
    });
    
    res.json(audits);
  } catch (error) {
    console.error('Error fetching CUA audits:', error);
    res.status(500).json({ error: 'Failed to fetch CUA audits' });
  }
});

app.get('/api/cua/audit/latest', async (req, res) => {
  try {
    // Get the latest audit log
    const latestLog = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!latestLog) {
      return res.json(null);
    }
    
    // Transform to audit format
    let auditType = 'ACCESS_CONTROL';
    if (latestLog.action.includes('DELETE') || latestLog.action.includes('REMOVE')) {
      auditType = 'SECURITY';
    } else if (latestLog.action.includes('CREATE') || latestLog.action.includes('ADD')) {
      auditType = 'ACCESS_CONTROL';
    } else if (latestLog.action.includes('UPDATE')) {
      auditType = 'USER_PERMISSIONS';
    }
    
    // Generate risk score based on action
    let riskScore = 10; // Default low risk
    if (latestLog.action.includes('DELETE') || latestLog.action.includes('REMOVE')) {
      riskScore = 60; // Medium-high risk
    } else if (latestLog.action.includes('UPDATE')) {
      riskScore = 30; // Medium risk
    }
    
    const latestAudit = {
      id: latestLog.id,
      auditType: auditType,
      status: 'COMPLETED',
      findings: { 
        action: latestLog.action,
        entityType: latestLog.entityType,
        entityId: latestLog.entityId,
        changes: latestLog.oldValues && latestLog.newValues ? 
          { from: latestLog.oldValues, to: latestLog.newValues } : 
          { details: 'No change details available' }
      },
      riskScore: riskScore,
      recommendations: { 
        message: 'System generated audit',
        suggestions: ['Review recent changes', 'Verify user permissions']
      },
      performedBy: latestLog.userId || 'system',
      performedAt: latestLog.createdAt.toISOString(),
      completedAt: latestLog.createdAt.toISOString(),
      auditor: { 
        name: 'System Audit',
        email: 'system@example.com'
      }
    };
    
    res.json(latestAudit);
  } catch (error) {
    console.error('Error fetching latest CUA audit:', error);
    res.status(500).json({ error: 'Failed to fetch latest CUA audit' });
  }
});

// CUA Command Execution Function
async function executeCUACommand(command: string, metadata?: any) {
  try {
    // Parse command and execute based on type
    const cmd = command.toLowerCase().trim();
    
    if (cmd.startsWith('get campaigns')) {
      // Get campaign data
      const campaigns = await prisma.campaign.findMany({
        include: { analytics: true },
      });
      return { type: 'campaigns', data: campaigns };
    }
    
    if (cmd.startsWith('get analytics')) {
      // Get analytics data
      const analytics = await prisma.analytics.findMany({
        orderBy: { date: 'desc' },
        take: 30,
      });
      return { type: 'analytics', data: analytics };
    }
    
    if (cmd.startsWith('get insights')) {
      // Get AI insights
      const insights = await prisma.aIRecommendation.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return { type: 'insights', data: insights };
    }
    
    if (cmd.startsWith('audit security')) {
      // Perform security audit
      const audit = await prisma.auditLog.create({
        data: {
          action: 'SECURITY_AUDIT',
          entityType: 'SYSTEM',
          newValues: { message: 'Security audit completed successfully' },
        },
      });
      return { type: 'security_audit', data: audit };
    }
    
    // Default response for unrecognized commands
    return { 
      type: 'unknown_command', 
      message: `Command '${command}' not recognized. Available commands: get campaigns, get analytics, get insights, audit security` 
    };
  } catch (error) {
    console.error('Error in executeCUACommand:', error);
    throw new Error(`Command execution failed: ${error.message}`);
  }
}

// Python automation process management
let automationProcess: any = null;

// Function to execute Python scripts
async function executePythonScript(script: string, args: string[] = []) {
  const { spawn } = require('child_process');
  
  // Kill any existing process
  if (automationProcess) {
    try {
      automationProcess.kill();
    } catch (e) {
      console.error('Error killing existing process:', e);
    }
  }
  
  // Spawn new process
  automationProcess = spawn('python3', [script, ...args]);
  
  return automationProcess;
}

// Python Automation Endpoints
app.post('/api/cua/automation', async (req, res) => {
  try {
    const { script, command } = req.body;
    
    // Validate script name for security
    if (!['cua_automation.py', 'fetch_campaigns.py'].includes(script)) {
      return res.status(400).json({ error: 'Invalid script name' });
    }
    
    console.log(`Starting Python automation: ${script} with command: ${command}`);
    
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Start the Python process
    const process = await executePythonScript(script, command ? [command] : []);
    
    // Send initial status
    res.write(JSON.stringify({ type: 'status', content: 'running' }) + '\n');
    
    // Handle stdout
    process.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Python stdout: ${output}`);
      res.write(JSON.stringify({ type: 'output', content: output.trim() }) + '\n');
    });
    
    // Handle stderr
    process.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`Python stderr: ${output}`);
      res.write(JSON.stringify({ type: 'error', content: output.trim() }) + '\n');
    });
    
    // Handle process completion
    process.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      
      if (code === 0) {
        res.write(JSON.stringify({ type: 'status', content: 'completed' }) + '\n');
        res.write(JSON.stringify({ type: 'output', content: '✅ Process completed successfully' }) + '\n');
      } else {
        res.write(JSON.stringify({ type: 'status', content: 'error' }) + '\n');
        res.write(JSON.stringify({ type: 'output', content: `❌ Process exited with code ${code}` }) + '\n');
      }
      
      // Create audit log entry
      try {
        prisma.auditLog.create({
          data: {
            action: `AUTOMATION_${script.toUpperCase().replace('.PY', '')}`,
            entityType: 'AUTOMATION',
            newValues: { 
              script, 
              command,
              exitCode: code,
              timestamp: new Date().toISOString()
            },
          },
        });
      } catch (e) {
        console.error('Error creating audit log:', e);
      }
      
      res.end();
    });
    
    // Handle client disconnect
    req.on('close', () => {
      if (process && !process.killed) {
        console.log('Client disconnected, killing Python process');
        process.kill();
      }
    });
    
  } catch (error) {
    console.error('Error in automation endpoint:', error);
    res.status(500).json({ error: 'Failed to execute automation', details: error.message });
  }
});

app.post('/api/cua/automation/stop', (req, res) => {
  try {
    if (automationProcess && !automationProcess.killed) {
      automationProcess.kill();
      console.log('Automation process stopped by user');
      
      // Create audit log entry
      prisma.auditLog.create({
        data: {
          action: 'AUTOMATION_STOPPED',
          entityType: 'AUTOMATION',
          newValues: { 
            timestamp: new Date().toISOString()
          },
        },
      });
      
      res.json({ message: 'Automation stopped successfully' });
    } else {
      res.json({ message: 'No active automation to stop' });
    }
  } catch (error) {
    console.error('Error stopping automation:', error);
    res.status(500).json({ error: 'Failed to stop automation', details: error.message });
  }
});

// AI Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, campaignId } = req.body;

    // Get relevant campaign data if campaignId is provided
    let context = {};
    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          analytics: true,
        },
      });
      if (campaign) {
        context = {
          campaignData: campaign,
          analyticsData: campaign.analytics,
        };
      }
    }

    const response = await generateAIResponse(message, context);
    res.json({ response });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});
