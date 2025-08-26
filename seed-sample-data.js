import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSampleData() {
  try {
    console.log('🌱 Starting to seed sample data...');
    
    // Clear existing data
    console.log('🧹 Cleaning up existing data...');
    await prisma.analytics.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.aIRecommendation.deleteMany({});
    await prisma.user.deleteMany({});
    
    // Create sample users
    console.log('👥 Creating sample users...');
    const user1 = await prisma.user.create({
      data: {
        email: 'john@upthrust.ai',
        name: 'John Marketing',
        role: 'ADMIN'
      }
    });
    
    const user2 = await prisma.user.create({
      data: {
        email: 'sarah@upthrust.ai',
        name: 'Sarah Analytics',
        role: 'MANAGER'
      }
    });
    
    console.log(`✅ Created users: ${user1.name}, ${user2.name}`);
    
    // Create sample campaigns
    console.log('🎯 Creating sample campaigns...');
    const campaigns = [];
    
    const campaignNames = [
      'Summer Sale 2024',
      'Black Friday Mega Sale',
      'New Product Launch',
      'Brand Awareness Campaign',
      'Retargeting Campaign'
    ];
    
    for (let i = 0; i < campaignNames.length; i++) {
      const campaign = await prisma.campaign.create({
        data: {
          name: campaignNames[i],
          status: i < 3 ? 'ACTIVE' : 'PAUSED',
          budget: Math.floor(Math.random() * 50000) + 10000, // 10k to 60k
          startDate: new Date(Date.now() - (90 - i * 10) * 24 * 60 * 60 * 1000), // Staggered start dates
          endDate: i === 4 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null, // Only last one has end date
          googleAdsId: `ga_${1000000 + i}`,
          campaignType: ['SEARCH', 'DISPLAY', 'VIDEO', 'SHOPPING', 'SEARCH'][i],
          userId: i % 2 === 0 ? user1.id : user2.id
        }
      });
      campaigns.push(campaign);
    }
    
    console.log(`✅ Created ${campaigns.length} campaigns`);
    
    // Create analytics data for the last 90 days
    console.log('📊 Creating analytics data for the last 90 days...');
    let totalAnalytics = 0;
    
    for (const campaign of campaigns) {
      // Create daily analytics for last 90 days
      for (let day = 89; day >= 0; day--) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);
        
        // Skip weekends for some campaigns (simulate real behavior)
        if (campaign.name.includes('Business') && (date.getDay() === 0 || date.getDay() === 6)) {
          continue;
        }
        
        // Generate realistic daily metrics
        const baseImpressions = Math.floor(Math.random() * 5000) + 1000; // 1k-6k impressions
        const ctr = 0.02 + Math.random() * 0.08; // 2-10% CTR
        const clicks = Math.floor(baseImpressions * ctr);
        const cpc = 0.5 + Math.random() * 3; // $0.5-$3.5 CPC
        const cost = clicks * cpc;
        const conversionRate = 0.01 + Math.random() * 0.05; // 1-6% conversion rate
        const conversions = Math.floor(clicks * conversionRate);
        const avgOrderValue = 50 + Math.random() * 200; // $50-$250 AOV
        const conversionValue = conversions * avgOrderValue;
        
        // Add some seasonality (higher performance on certain days)
        const dayMultiplier = date.getDay() === 1 || date.getDay() === 2 ? 1.2 : 1; // Monday/Tuesday boost
        const monthMultiplier = date.getMonth() === 10 || date.getMonth() === 11 ? 1.5 : 1; // Nov/Dec boost
        
        const finalImpressions = Math.floor(baseImpressions * dayMultiplier * monthMultiplier);
        const finalClicks = Math.floor(finalImpressions * ctr);
        const finalCost = finalClicks * cpc;
        const finalConversions = Math.floor(finalClicks * conversionRate);
        const finalConversionValue = finalConversions * avgOrderValue;
        
        await prisma.analytics.create({
          data: {
            date: date,
            impressions: finalImpressions,
            activeViewImpressions: Math.floor(finalImpressions * 0.8),
            clicks: finalClicks,
            interactions: finalClicks + Math.floor(finalClicks * 0.1),
            cost: Math.round(finalCost * 100) / 100, // Round to 2 decimals
            conversions: finalConversions,
            allConversions: finalConversions + Math.floor(finalConversions * 0.1),
            conversionValue: Math.round(finalConversionValue * 100) / 100,
            allConversionValue: Math.round(finalConversionValue * 1.1 * 100) / 100,
            ctr: Math.round(ctr * 10000) / 10000, // Store as decimal
            activeViewCtr: Math.round(ctr * 0.9 * 10000) / 10000,
            interactionRate: Math.round((ctr * 1.1) * 10000) / 10000,
            cpc: Math.round(cpc * 100) / 100,
            cpm: Math.round((finalCost / finalImpressions * 1000) * 100) / 100,
            costPerConversion: finalConversions > 0 ? Math.round((finalCost / finalConversions) * 100) / 100 : 0,
            costPerAllConversion: (finalConversions + Math.floor(finalConversions * 0.1)) > 0 ? 
              Math.round((finalCost / (finalConversions + Math.floor(finalConversions * 0.1))) * 100) / 100 : 0,
            campaignId: campaign.id,
            userId: campaign.userId
          }
        });
        
        totalAnalytics++;
      }
    }
    
    console.log(`✅ Created ${totalAnalytics} analytics records`);
    
    // Create some AI recommendations
    console.log('🤖 Creating AI recommendations...');
    const recommendations = [
      {
        type: 'BUDGET_OPTIMIZATION',
        title: 'Increase Budget for High-Performing Campaign',
        description: 'Summer Sale 2024 campaign shows 15% higher ROAS than average. Consider increasing daily budget by 25%.',
        priority: 'HIGH',
        campaignId: campaigns[0].id,
        userId: user1.id
      },
      {
        type: 'KEYWORD_OPTIMIZATION',
        title: 'Add Negative Keywords',
        description: 'Detected high-cost, low-converting keywords in Brand Awareness Campaign. Add negative keywords to improve efficiency.',
        priority: 'MEDIUM',
        campaignId: campaigns[3].id,
        userId: user2.id
      },
      {
        type: 'AD_COPY_IMPROVEMENT',
        title: 'Test New Ad Headlines',
        description: 'Current ad headlines show declining CTR. A/B test new emotional triggers and value propositions.',
        priority: 'MEDIUM',
        campaignId: campaigns[1].id,
        userId: user1.id
      },
      {
        type: 'TARGETING_REFINEMENT',
        title: 'Narrow Age Demographics',
        description: 'Analytics show 25-34 age group converts 40% better. Consider adjusting targeting to focus on this segment.',
        priority: 'LOW',
        campaignId: campaigns[2].id,
        userId: user2.id
      },
      {
        type: 'PERFORMANCE_ANALYSIS',
        title: 'Mobile Performance Optimization',
        description: 'Mobile traffic shows 20% lower conversion rate. Optimize landing pages for mobile experience.',
        priority: 'HIGH',
        userId: user1.id
      }
    ];
    
    for (const rec of recommendations) {
      await prisma.aIRecommendation.create({
        data: rec
      });
    }
    
    console.log(`✅ Created ${recommendations.length} AI recommendations`);
    
    // Verify final counts
    const finalCounts = {
      users: await prisma.user.count(),
      campaigns: await prisma.campaign.count(),
      analytics: await prisma.analytics.count(),
      recommendations: await prisma.aIRecommendation.count()
    };
    
    console.log('\n📈 Final Database Summary:');
    console.log(`👥 Users: ${finalCounts.users}`);
    console.log(`🎯 Campaigns: ${finalCounts.campaigns}`);
    console.log(`📊 Analytics Records: ${finalCounts.analytics}`);
    console.log(`🤖 AI Recommendations: ${finalCounts.recommendations}`);
    
    console.log('\n🎉 Sample data seeding completed successfully!');
    console.log('\n📅 Data spans the last 90 days with realistic daily metrics');
    console.log('🔍 You can now test date filtering in your frontend');
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSampleData()
  .then(() => {
    console.log('\n✨ Seeding process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding process failed:', error);
    process.exit(1);
  });
