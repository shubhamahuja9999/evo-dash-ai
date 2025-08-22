import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

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
