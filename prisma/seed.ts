import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  // Create sample campaigns
  const campaigns = [
    {
      name: "Summer Sale 2024",
      status: "ACTIVE" as const,
      budget: 5000,
      spent: 3200,
      impressions: 125000,
      clicks: 8200,
      conversions: 234,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2024-08-31"),
      userId: user.id,
    },
    {
      name: "Product Launch Campaign",
      status: "PAUSED" as const,
      budget: 2500,
      spent: 1800,
      impressions: 87000,
      clicks: 5100,
      conversions: 156,
      startDate: new Date("2024-07-15"),
      endDate: new Date("2024-09-15"),
      userId: user.id,
    },
    {
      name: "Brand Awareness Drive",
      status: "COMPLETED" as const,
      budget: 1000,
      spent: 1000,
      impressions: 245000,
      clicks: 12300,
      conversions: 389,
      startDate: new Date("2024-05-01"),
      endDate: new Date("2024-06-30"),
      userId: user.id,
    },
    {
      name: "Holiday Promotion",
      status: "DRAFT" as const,
      budget: 8000,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      startDate: new Date("2024-12-01"),
      endDate: new Date("2024-12-31"),
      userId: user.id,
    }
  ];

  for (const campaign of campaigns) {
    await prisma.campaign.upsert({
      where: { id: campaign.name + "-" + user.id },
      update: {},
      create: {
        ...campaign,
        id: campaign.name + "-" + user.id,
      },
    });
  }

  // Create sample analytics data
  const analyticsData = [
    { name: 'Jan', value: 4000, conversions: 2400, revenue: 12000, users: 1200 },
    { name: 'Feb', value: 3000, conversions: 1398, revenue: 8500, users: 980 },
    { name: 'Mar', value: 2000, conversions: 9800, revenue: 25000, users: 2100 },
    { name: 'Apr', value: 2780, conversions: 3908, revenue: 15600, users: 1650 },
    { name: 'May', value: 1890, conversions: 4800, revenue: 18900, users: 1800 },
    { name: 'Jun', value: 2390, conversions: 3800, revenue: 14200, users: 1420 },
  ];

  for (let i = 0; i < analyticsData.length; i++) {
    const data = analyticsData[i];
    const date = new Date(2024, i, 1); // 2024, month index, day
    
    await prisma.analytics.upsert({
      where: { id: `analytics-${i}-${user.id}` },
      update: {},
      create: {
        id: `analytics-${i}-${user.id}`,
        date,
        value: data.value,
        conversions: data.conversions,
        revenue: data.revenue,
        users: data.users,
        userId: user.id,
      },
    });
  }

  // Create sample insights
  const insights = [
    {
      type: "OPPORTUNITY" as const,
      priority: "HIGH" as const,
      title: "Increase Social Media Budget",
      description: "Social media campaigns are performing 35% better than other channels. Consider reallocating 20% of your email budget to social platforms.",
      impact: "+$2,400 estimated monthly revenue",
      confidence: 94,
      category: "Budget Optimization",
    },
    {
      type: "ALERT" as const,
      priority: "HIGH" as const,
      title: "Declining Email Performance",
      description: "Email open rates have dropped 15% over the past month. Subject line optimization and audience segmentation recommended.",
      impact: "Potential 25% improvement in engagement",
      confidence: 87,
      category: "Campaign Performance",
    },
    {
      type: "INSIGHT" as const,
      priority: "MEDIUM" as const,
      title: "Peak Engagement Hours Identified",
      description: "User engagement peaks between 2-4 PM and 7-9 PM. Schedule content during these windows for maximum impact.",
      impact: "+18% average engagement rate",
      confidence: 92,
      category: "Timing Optimization",
    },
    {
      type: "RECOMMENDATION" as const,
      priority: "MEDIUM" as const,
      title: "Audience Segment Discovery",
      description: "A new high-value audience segment (ages 25-34, tech industry) shows 3x higher conversion rates. Expand targeting to similar profiles.",
      impact: "+$1,800 estimated monthly revenue",
      confidence: 78,
      category: "Audience Targeting",
    },
    {
      type: "SUCCESS" as const,
      priority: "LOW" as const,
      title: "Campaign Goals Exceeded",
      description: "Your 'Summer Sale 2024' campaign exceeded conversion goals by 23%. Similar creative elements should be applied to future campaigns.",
      impact: "Maintain current performance",
      confidence: 96,
      category: "Creative Optimization",
    }
  ];

  for (let i = 0; i < insights.length; i++) {
    const insight = insights[i];
    await prisma.insight.upsert({
      where: { id: `insight-${i}` },
      update: {},
      create: {
        ...insight,
        id: `insight-${i}`,
      },
    });
  }

  // Create sample traffic sources
  const trafficSources = [
    { name: 'Direct', value: 35, color: '#3B82F6' },
    { name: 'Social', value: 25, color: '#8B5CF6' },
    { name: 'Email', value: 20, color: '#06B6D4' },
    { name: 'Organic', value: 20, color: '#10B981' },
  ];

  for (let i = 0; i < trafficSources.length; i++) {
    const source = trafficSources[i];
    await prisma.trafficSource.upsert({
      where: { id: `traffic-${i}` },
      update: {},
      create: {
        ...source,
        id: `traffic-${i}`,
        date: new Date(),
      },
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
