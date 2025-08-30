import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

export interface CampaignMetricsQuery {
  startDate?: Date;
  endDate?: Date;
  campaignName?: string;
}

export async function getCampaignMetrics(query: CampaignMetricsQuery) {
  const { startDate, endDate, campaignName } = query;

  // Build where clause based on query parameters
  const where: any = {};
  
  if (startDate && endDate) {
    where.date = {
      gte: startOfDay(startDate),
      lte: endOfDay(endDate)
    };
  } else if (startDate) {
    where.date = {
      gte: startOfDay(startDate)
    };
  } else if (endDate) {
    where.date = {
      lte: endOfDay(endDate)
    };
  }

  if (campaignName) {
    where.campaignName = campaignName;
  }

  // Get metrics
  const metrics = await prisma.campaignMetric.findMany({
    where,
    orderBy: {
      date: 'asc'
    }
  });

  // Calculate totals and averages
  const summary = metrics.reduce((acc, metric) => {
    return {
      totalImpressions: (acc.totalImpressions || 0) + metric.impressions,
      totalClicks: (acc.totalClicks || 0) + metric.clicks,
      totalConversions: (acc.totalConversions || 0) + metric.conversions,
      totalViews: (acc.totalViews || 0) + metric.views,
      // Calculate weighted CTR
      weightedCTR: metrics.reduce((sum, m) => sum + (m.ctr * m.impressions), 0) / 
                  metrics.reduce((sum, m) => sum + m.impressions, 0)
    };
  }, {});

  return {
    metrics,
    summary
  };
}

export async function getCampaignNames() {
  const campaigns = await prisma.campaignMetric.findMany({
    select: {
      campaignName: true
    },
    distinct: ['campaignName']
  });

  return campaigns.map(c => c.campaignName);
}

export async function getDateRange() {
  // Get the actual date range from the data
  const result = await prisma.campaignMetric.aggregate({
    _min: {
      date: true
    },
    _max: {
      date: true
    }
  });

  // Ensure we have valid dates
  const startDate = result._min.date ? startOfDay(result._min.date) : new Date();
  const endDate = result._max.date ? endOfDay(result._max.date) : new Date();

  // Return the date range
  return {
    startDate,
    endDate
  };
}

// Helper function to get metrics for a specific date range
export async function getMetricsForDateRange(startDate: Date, endDate: Date) {
  const metrics = await prisma.campaignMetric.findMany({
    where: {
      date: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate)
      }
    },
    orderBy: {
      date: 'asc'
    }
  });

  return metrics;
}

// Helper function to get metrics for a specific campaign
export async function getMetricsForCampaign(campaignName: string, startDate?: Date, endDate?: Date) {
  const where: any = {
    campaignName
  };

  if (startDate && endDate) {
    where.date = {
      gte: startOfDay(startDate),
      lte: endOfDay(endDate)
    };
  }

  const metrics = await prisma.campaignMetric.findMany({
    where,
    orderBy: {
      date: 'asc'
    }
  });

  return metrics;
}

// Helper function to get daily metrics
export async function getDailyMetrics(date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const metrics = await prisma.campaignMetric.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd
      }
    },
    orderBy: {
      campaignName: 'asc'
    }
  });

  return metrics;
}