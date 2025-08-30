const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');

const prisma = new PrismaClient();

interface CampaignMetricRow {
  Campaign: string;
  Day: string;
  'Campaign bid strategy type': string;
  Conversions: string;
  'Currency code': string;
  'Cost / conv.': string;
  Clicks: string;
  CTR: string;
  'Impr.': string;
  Views: string;
  'Avg. CPV': string;
}

async function importCampaignMetrics(filePath: string) {
  const records: CampaignMetricRow[] = [];
  
  // Read and parse CSV
  const parser = fs
    .createReadStream(filePath)
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    }));

  for await (const record of parser) {
    records.push(record);
  }

  console.log(`Found ${records.length} records to import`);

  // Process records in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (record) => {
        try {
          // Convert CTR from percentage string to float
          const ctr = parseFloat(record.CTR.replace('%', '')) / 100;
          
          // Convert date string to Date object
          const date = new Date(record.Day);
          
          // Clean up numeric values
          const conversions = parseFloat(record.Conversions) || 0;
          const costPerConversion = record['Cost / conv.'] === '0' ? null : parseFloat(record['Cost / conv.']);
          const clicks = parseInt(record.Clicks) || 0;
          const impressions = parseInt(record['Impr.'].replace(',', '')) || 0;
          const views = parseInt(record.Views) || 0;
          const avgCpv = parseFloat(record['Avg. CPV']) || 0;

          await prisma.campaignMetric.create({
            data: {
              date,
              campaignName: record.Campaign,
              bidStrategy: record['Campaign bid strategy type'],
              conversions,
              currencyCode: record['Currency code'],
              costPerConversion,
              clicks,
              ctr,
              impressions,
              views,
              avgCpv
            }
          });
        } catch (error) {
          console.error(`Error importing record:`, record, error);
        }
      })
    );

    console.log(`Imported batch ${i / batchSize + 1}`);
  }

  console.log('Import completed');
}

// Get the CSV file path from command line argument
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('Please provide the CSV file path as an argument');
  process.exit(1);
}

importCampaignMetrics(csvFilePath)
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
