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
      value: item.value,
      conversions: item.conversions,
      revenue: item.revenue,
      users: item.users,
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
    const campaigns = await prisma.campaign.findMany();
    
    const totalUsers = analytics.reduce((sum, item) => sum + (item.users || 0), 0);
    const totalRevenue = analytics.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0);
    const totalClicks = campaigns.reduce((sum, item) => sum + item.clicks, 0);
    
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : '0.00';
    
    res.json({
      totalUsers: totalUsers.toLocaleString(),
      revenue: `$${totalRevenue.toLocaleString()}`,
      conversionRate: `${conversionRate}%`,
      aiScore: '94.2', // Mock AI score
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics stats' });
  }
});

// Traffic sources
app.get('/api/traffic-sources', async (req, res) => {
  try {
    const sources = await prisma.trafficSource.findMany({
      orderBy: { value: 'desc' },
    });
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
    });
    
    // Transform to match frontend format
    const formattedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status.toLowerCase(),
      budget: `$${campaign.budget.toLocaleString()}`,
      spent: `$${campaign.spent.toLocaleString()}`,
      impressions: `${(campaign.impressions / 1000).toFixed(0)}K`,
      clicks: `${(campaign.clicks / 1000).toFixed(1)}K`,
      ctr: campaign.impressions > 0 ? `${(campaign.clicks / campaign.impressions * 100).toFixed(2)}%` : '0%',
      conversions: campaign.conversions,
      startDate: campaign.startDate.toISOString().split('T')[0],
      endDate: campaign.endDate.toISOString().split('T')[0],
    }));
    
    res.json(formattedCampaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Campaign stats
app.get('/api/campaigns/stats', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany();
    
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00';
    
    res.json({
      activeCampaigns,
      totalConversions: totalConversions.toLocaleString(),
      totalImpressions: `${(totalImpressions / 1000000).toFixed(1)}M`,
      avgCTR: `${avgCTR}%`,
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Failed to fetch campaign stats' });
  }
});

// Insights routes
app.get('/api/insights', async (req, res) => {
  try {
    const insights = await prisma.insight.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    // Transform to match frontend format
    const formattedInsights = insights.map(insight => ({
      id: insight.id,
      type: insight.type.toLowerCase(),
      priority: insight.priority.toLowerCase(),
      title: insight.title,
      description: insight.description,
      impact: insight.impact,
      confidence: insight.confidence,
      category: insight.category,
      isApplied: insight.isApplied,
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
    const insights = await prisma.insight.findMany();
    
    const totalInsights = insights.length;
    const highPriority = insights.filter(i => i.priority === 'HIGH').length;
    const opportunities = insights.filter(i => i.type === 'OPPORTUNITY').length;
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    
    res.json({
      totalInsights,
      highPriority,
      opportunities,
      avgConfidence: Math.round(avgConfidence),
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
