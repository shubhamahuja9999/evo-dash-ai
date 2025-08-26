import { spawn } from 'child_process';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

export class CampaignService {
  private fetchInterval: NodeJS.Timeout | null = null;
  private isFetching = false;

  constructor() {
    this.fetchInterval = null;
  }

  async startAutoFetch(intervalMinutes: number = 30) {
    // Initial fetch
    await this.fetchCampaigns();

    // Set up interval
    this.fetchInterval = setInterval(async () => {
      await this.fetchCampaigns();
    }, intervalMinutes * 60 * 1000);

    console.log(`Campaign auto-fetch started. Will refresh every ${intervalMinutes} minutes.`);
  }

  stopAutoFetch() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
      console.log('Campaign auto-fetch stopped.');
    }
  }

  private async fetchCampaigns(): Promise<void> {
    if (this.isFetching) {
      console.log('Campaign fetch already in progress, skipping...');
      return;
    }

    this.isFetching = true;
    console.log('Starting campaign fetch...');

    try {
      // Run the Python script from project root
      const pythonScript = 'fetch_campaigns.py';
      const pythonProcess = spawn('python3', [pythonScript]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('Campaign fetch output:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('Campaign fetch error:', data.toString());
      });

      await new Promise<void>((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            console.log('Campaign fetch completed successfully');
            resolve();
          } else {
            console.error(`Campaign fetch failed with code ${code}`);
            reject(new Error(`Process exited with code ${code}\n${stderr}`));
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('Campaign fetch process error:', error);
          reject(error);
        });
      });

      // Log success
      const campaignCount = await prisma.campaign.count();
      const analyticsCount = await prisma.analytics.count();
      console.log(`Campaign fetch stats - Campaigns: ${campaignCount}, Analytics: ${analyticsCount}`);

    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    } finally {
      this.isFetching = false;
    }
  }

  // Method to get the last fetch time
  async getLastFetchTime(): Promise<Date | null> {
    const latestCampaign = await prisma.campaign.findFirst({
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        updatedAt: true
      }
    });

    return latestCampaign?.updatedAt || null;
  }

  // Method to force a fetch
  async forceFetch(): Promise<void> {
    await this.fetchCampaigns();
  }
}

// Export a singleton instance
export const campaignService = new CampaignService();
