const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse');
const { spawn } = require('child_process');

const prisma = new PrismaClient();

async function fetchGoogleAdsData() {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['fetch_campaigns.py']);
    
    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(data.toString()); // Log Python script output
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function getExistingMetrics() {
  // Get all existing metrics grouped by date and campaign
  const metrics = await prisma.campaignMetric.findMany();
  const metricsMap = new Map();
  
  metrics.forEach(metric => {
    const key = `${metric.campaignName}_${metric.date.toISOString().split('T')[0]}`;
    metricsMap.set(key, metric);
  });
  
  return metricsMap;
}

async function importCsvMetrics(filePath) {
  // First get all existing metrics
  console.log('Fetching existing metrics...');
  const existingMetrics = await getExistingMetrics();
  console.log(`Found ${existingMetrics.size} existing metrics`);

  const records = [];
  const parser = fs
    .createReadStream(filePath)
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      skip_lines: 3,
      delimiter: ',',
      relax_column_count: true,
      columns: ['Campaign', 'Day', 'Campaign bid strategy type', 'Conversions', 'Currency code', 'Cost / conv.', 'Clicks', 'CTR', 'Impr.', 'Views', 'Avg. CPV']
    }));

  for await (const record of parser) {
    if (record.Campaign === 'Untitled report' || record.Campaign === 'July 2, 2024 - August 29, 2025' || record.Campaign === 'Campaign') {
      continue;
    }
    records.push(record);
  }

  console.log(`Found ${records.length} records in CSV`);

  // Process records in batches
  const batchSize = 100;
  let updatedCount = 0;
  let newCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (record) => {
        try {
          const date = new Date(record.Day);
          const dateStr = date.toISOString().split('T')[0];
          const key = `${record.Campaign}_${dateStr}`;

          // Parse metrics from CSV
          const metrics = {
            conversions: parseFloat(record.Conversions || '0') || 0,
            costPerConversion: record['Cost / conv.'] === '0' ? null : parseFloat(record['Cost / conv.'] || '0'),
            clicks: parseInt(record.Clicks || '0') || 0,
            impressions: parseInt((record['Impr.'] || '0').replace(',', '')) || 0,
            views: parseInt(record.Views || '0') || 0,
            avgCpv: parseFloat(record['Avg. CPV'] || '0') || 0,
            ctr: parseFloat(record.CTR?.replace('%', '') || '0') / 100
          };

          const existingMetric = existingMetrics.get(key);

          if (existingMetric) {
            // Update existing metric only if new data has non-zero values
            const updates = {};
            
            // Only update metrics that have non-zero values in the new data
            if (metrics.conversions > 0) updates.conversions = metrics.conversions;
            if (metrics.clicks > 0) updates.clicks = metrics.clicks;
            if (metrics.impressions > 0) updates.impressions = metrics.impressions;
            if (metrics.views > 0) updates.views = metrics.views;
            if (metrics.avgCpv > 0) updates.avgCpv = metrics.avgCpv;
            if (metrics.costPerConversion) updates.costPerConversion = metrics.costPerConversion;
            
            // Only update CTR if we have both clicks and impressions
            if (metrics.clicks > 0 && metrics.impressions > 0) {
              updates.ctr = metrics.clicks / metrics.impressions;
            }

            // Only update if we have any non-zero values
            if (Object.keys(updates).length > 0) {
              await prisma.campaignMetric.update({
                where: { id: existingMetric.id },
                data: updates
              });
              updatedCount++;
            }
          } else {
            // Create new metric only if we have meaningful data
            if (metrics.impressions > 0 || metrics.clicks > 0 || metrics.conversions > 0) {
              await prisma.campaignMetric.create({
                data: {
                  date,
                  campaignName: record.Campaign,
                  bidStrategy: record['Campaign bid strategy type'],
                  conversions: metrics.conversions,
                  currencyCode: record['Currency code'],
                  costPerConversion: metrics.costPerConversion,
                  clicks: metrics.clicks,
                  ctr: metrics.ctr,
                  impressions: metrics.impressions,
                  views: metrics.views,
                  avgCpv: metrics.avgCpv
                }
              });
              newCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing record:`, record, error);
        }
      })
    );

    console.log(`Processed batch ${i / batchSize + 1}`);
  }

  console.log(`Updated ${updatedCount} existing metrics`);
  console.log(`Created ${newCount} new metrics`);
}

async function combineMetrics(csvFilePath) {
  try {
    // Clear existing metrics first
    console.log('Clearing existing metrics...');
    await prisma.campaignMetric.deleteMany();
    
    console.log('Step 1: Fetching Google Ads data...');
    await fetchGoogleAdsData();
    console.log('Google Ads data fetched successfully');

    console.log('Step 2: Importing and combining CSV data...');
    await importCsvMetrics(csvFilePath);
    console.log('CSV data imported and combined successfully');

    // Final validation
    const finalMetrics = await prisma.campaignMetric.findMany({
      orderBy: [
        { campaignName: 'asc' },
        { date: 'asc' }
      ]
    });

    console.log('\nFinal Metrics Summary:');
    console.log(`Total metrics: ${finalMetrics.length}`);
    
    // Group by campaign
    const campaignGroups = {};
    finalMetrics.forEach(metric => {
      if (!campaignGroups[metric.campaignName]) {
        campaignGroups[metric.campaignName] = [];
      }
      campaignGroups[metric.campaignName].push(metric);
    });

    console.log('\nMetrics by Campaign:');
    Object.entries(campaignGroups).forEach(([campaign, metrics]) => {
      console.log(`${campaign}: ${metrics.length} days of data`);
    });

    console.log('\nAll operations completed successfully!');
  } catch (error) {
    console.error('Error combining metrics:', error);
    throw error;
  }
}

// Get the CSV file path from command line argument
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('Please provide the CSV file path as an argument');
  process.exit(1);
}

combineMetrics(csvFilePath)
  .catch((error) => {
    console.error('Operation failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });