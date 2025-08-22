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
      role: 'USER',
    },
  });

  // Create sample campaigns (amounts in Indian Rupees)
  const campaigns = [
    {
      name: "Summer Sale 2024",
      status: "ACTIVE" as const,
      budget: 415000, // ₹4,15,000 (approx $5000)
      startDate: new Date("2024-06-01"),
      endDate: new Date("2024-08-31"),
      targetAudience: "E-commerce shoppers",
      userId: user.id,
    },
    {
      name: "Product Launch Campaign",
      status: "PAUSED" as const,
      budget: 207500, // ₹2,07,500 (approx $2500)
      startDate: new Date("2024-07-15"),
      endDate: new Date("2024-09-15"),
      targetAudience: "Tech enthusiasts",
      userId: user.id,
    },
    {
      name: "Brand Awareness Drive",
      status: "ENDED" as const,
      budget: 83000, // ₹83,000 (approx $1000)
      startDate: new Date("2024-05-01"),
      endDate: new Date("2024-06-30"),
      targetAudience: "General audience",
      userId: user.id,
    },
    {
      name: "Holiday Promotion",
      status: "DRAFT" as const,
      budget: 664000, // ₹6,64,000 (approx $8000)
      startDate: new Date("2024-12-01"),
      endDate: new Date("2024-12-31"),
      targetAudience: "Holiday shoppers",
      userId: user.id,
    }
  ];

  const createdCampaigns: any[] = [];
  for (const campaignData of campaigns) {
    const campaign = await prisma.campaign.upsert({
      where: { id: campaignData.name.replace(/\s+/g, '-').toLowerCase() + "-" + user.id },
      update: {},
      create: {
        ...campaignData,
        id: campaignData.name.replace(/\s+/g, '-').toLowerCase() + "-" + user.id,
      },
    });
    createdCampaigns.push(campaign);
  }

  // Create sample analytics data (amounts in Indian Rupees)
  const analyticsData = [
    { month: 'Jan', impressions: 125000, clicks: 8200, cost: 265600, conversions: 234, conversionValue: 996000 }, // ₹2,65,600 cost, ₹9,96,000 revenue
    { month: 'Feb', impressions: 87000, clicks: 5100, cost: 149400, conversions: 156, conversionValue: 705500 }, // ₹1,49,400 cost, ₹7,05,500 revenue
    { month: 'Mar', impressions: 245000, clicks: 12300, cost: 373500, conversions: 389, conversionValue: 2075000 }, // ₹3,73,500 cost, ₹20,75,000 revenue
    { month: 'Apr', impressions: 156000, clicks: 9200, cost: 315400, conversions: 278, conversionValue: 1294800 }, // ₹3,15,400 cost, ₹12,94,800 revenue
    { month: 'May', impressions: 189000, clicks: 11400, cost: 348600, conversions: 342, conversionValue: 1567500 }, // ₹3,48,600 cost, ₹15,67,500 revenue
    { month: 'Jun', impressions: 142000, clicks: 8900, cost: 298800, conversions: 251, conversionValue: 1178600 }, // ₹2,98,800 cost, ₹11,78,600 revenue
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
        impressions: data.impressions,
        clicks: data.clicks,
        cost: data.cost,
        conversions: data.conversions,
        conversionValue: data.conversionValue,
        ctr: data.clicks / data.impressions,
        cpc: data.cost / data.clicks,
        cpm: (data.cost / data.impressions) * 1000,
        userId: user.id,
        campaignId: createdCampaigns[i % createdCampaigns.length]?.id,
      },
    });
  }

  // Create sample AI recommendations
  const recommendations = [
    {
      type: "BUDGET_OPTIMIZATION" as const,
      priority: "HIGH" as const,
      title: "Increase Social Media Budget",
      description: "Social media campaigns are performing 35% better than other channels. Consider reallocating 20% of your email budget to social platforms.",
      campaignId: createdCampaigns[0]?.id,
      userId: user.id,
    },
    {
      type: "PERFORMANCE_ANALYSIS" as const,
      priority: "HIGH" as const,
      title: "Declining Email Performance",
      description: "Email open rates have dropped 15% over the past month. Subject line optimization and audience segmentation recommended.",
      campaignId: createdCampaigns[1]?.id,
      userId: user.id,
    },
    {
      type: "TARGETING_REFINEMENT" as const,
      priority: "MEDIUM" as const,
      title: "Peak Engagement Hours Identified",
      description: "User engagement peaks between 2-4 PM and 7-9 PM. Schedule content during these windows for maximum impact.",
      campaignId: createdCampaigns[2]?.id,
      userId: user.id,
    },
    {
      type: "KEYWORD_OPTIMIZATION" as const,
      priority: "MEDIUM" as const,
      title: "Audience Segment Discovery",
      description: "A new high-value audience segment (ages 25-34, tech industry) shows 3x higher conversion rates. Expand targeting to similar profiles.",
      campaignId: createdCampaigns[0]?.id,
      userId: user.id,
    },
    {
      type: "AD_COPY_IMPROVEMENT" as const,
      priority: "LOW" as const,
      title: "Campaign Goals Exceeded",
      description: "Your 'Summer Sale 2024' campaign exceeded conversion goals by 23%. Similar creative elements should be applied to future campaigns.",
      campaignId: createdCampaigns[0]?.id,
      userId: user.id,
    }
  ];

  for (let i = 0; i < recommendations.length; i++) {
    const recommendation = recommendations[i];
    await prisma.aIRecommendation.upsert({
      where: { id: `recommendation-${i}` },
      update: {},
      create: {
        ...recommendation,
        id: `recommendation-${i}`,
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
