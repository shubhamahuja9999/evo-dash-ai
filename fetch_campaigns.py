from google.ads.googleads.client import GoogleAdsClient
import pandas as pd
import yaml
import sys
from datetime import datetime, timedelta
import pytz
import subprocess
import json
import os

# Load the credentials from your YAML file
with open('google-ads.yaml', 'r') as f:
    config = yaml.safe_load(f)

# Get the Google Ads account time zone from config, default to 'Asia/Kolkata'
account_timezone = config.get('account_timezone', 'Asia/Kolkata')
tz = pytz.timezone(account_timezone)
now = datetime.now(tz)
report_date = (now - timedelta(days=1)).strftime('%Y-%m-%d')

child_account_ids = config.get('child_account_ids', [])

# Currency symbol and decimal mapping
CURRENCY_MAP = {
    "INR": {"symbol": "₹", "decimals": 2},
    "USD": {"symbol": "$", "decimals": 2},
    "EUR": {"symbol": "€", "decimals": 2},
    "JPY": {"symbol": "¥", "decimals": 0},
    # Add more as needed
}

def fetch_google_ads_data():
    """Fetch Google Ads campaign data for all child accounts"""
    # Load the credentials from your YAML file
    client = GoogleAdsClient.load_from_storage("google-ads.yaml")
    
    all_data = []
    for customer_id in child_account_ids:
        query = """
            SELECT
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone,
              segments.date,
              campaign.name,
              campaign_budget.amount_micros,
              metrics.cost_micros,
              metrics.impressions,
              metrics.clicks,
              metrics.average_cpc,
              metrics.ctr,
              metrics.conversions,
              metrics.cost_per_conversion
            FROM campaign
            WHERE segments.date DURING LAST_7_DAYS
            ORDER BY segments.date
        """
        
        try:
            # Try v13 first (more stable version)
            print("Trying Google Ads API v13...")
            google_ads_service = client.get_service("GoogleAdsService", version="v13")
            print("Successfully using Google Ads API v13")
        except Exception as e:
            print(f"v13 failed: {e}")
            try:
                # Fallback to v14
                print("Trying Google Ads API v14...")
                google_ads_service = client.get_service("GoogleAdsService", version="v14")
                print("Successfully using Google Ads API v14")
            except Exception as e:
                print(f"v14 failed: {e}")
                # Fallback to default version
                print("Trying default Google Ads API version...")
                google_ads_service = client.get_service("GoogleAdsService")
                print("Successfully using default Google Ads API version")
        
        response = google_ads_service.search(
            customer_id=customer_id,
            query=query,
        )
        
        data = []
        client_name = None
        currency_code = None
        currency_symbol = None
        currency_decimals = 2
        account_time_zone = None
        
        for row in response:
            if client_name is None:
                client_name = row.customer.descriptive_name
            if currency_code is None:
                currency_code = row.customer.currency_code
                currency_info = CURRENCY_MAP.get(currency_code, {"symbol": currency_code + " ", "decimals": 2})
                currency_symbol = currency_info["symbol"]
                currency_decimals = currency_info["decimals"]
            if account_time_zone is None:
                account_time_zone = row.customer.time_zone
                
            date = row.segments.date
            campaign_name = row.campaign.name
            daily_budget = f"{currency_symbol}{row.campaign_budget.amount_micros / 1_000_000:.{currency_decimals}f}" if row.campaign_budget.amount_micros else f"{currency_symbol}0"
            spent = f"{currency_symbol}{row.metrics.cost_micros / 1_000_000:.{currency_decimals}f}" if row.metrics.cost_micros else f"{currency_symbol}0"
            impressions = row.metrics.impressions
            clicks = row.metrics.clicks
            cpc = f"{currency_symbol}{row.metrics.average_cpc / 1_000_000:.{currency_decimals}f}" if row.metrics.average_cpc else f"{currency_symbol}0"
            ctr_value = (clicks / impressions * 100) if impressions else 0
            ctr = f"{ctr_value:.2f}%"
            conversions = row.metrics.conversions
            conv_rate = f"{(conversions / clicks * 100):.2f}" if clicks else "0"
            cost_per_conv = f"{currency_symbol}{row.metrics.cost_per_conversion / 1_000_000:.{currency_decimals}f}" if row.metrics.cost_per_conversion else f"{currency_symbol}0"
            
            data.append([
                date, campaign_name, daily_budget, spent, impressions, clicks, cpc, ctr, conversions, conv_rate, cost_per_conv
            ])
            
        all_data.append({
            'customer_id': customer_id,
            'client_name': client_name,
            'currency_symbol': currency_symbol,
            'currency_decimals': currency_decimals,
            'account_time_zone': account_time_zone,
            'data': data
        })
        
        print(f"DEBUG: Fetched {len(data)} rows for {client_name} ({customer_id})")
    
    return all_data

def store_campaigns_to_database(all_data):
    """Store the fetched campaign data to PostgreSQL database using Prisma"""
    
    # Create a Node.js script to handle the database operations
    db_script = """
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function storeCampaigns(campaignData) {
    try {
        console.log('Starting to store campaign data...');
        console.log('Total accounts to process:', campaignData.length);
        
        // Clear existing data first
        console.log('Clearing existing campaign and analytics data...');
        await prisma.analytics.deleteMany({});
        await prisma.campaign.deleteMany({});
        console.log('Existing data cleared successfully');
        
        // Create a default user if it doesn't exist
        let defaultUser = await prisma.user.findFirst({
            where: { email: 'default@upthrust.ai' }
        });
        
        if (!defaultUser) {
            defaultUser = await prisma.user.create({
                data: {
                    email: 'default@upthrust.ai',
                    name: 'Default User',
                    role: 'ADMIN'
                }
            });
            console.log('Created default user');
        }
        
        console.log(`Using user ID: ${defaultUser.id}`);
        
        let totalCampaignsCreated = 0;
        let totalAnalyticsCreated = 0;
        const processedCampaigns = new Map(); // Track processed campaigns
        
        for (const account of campaignData) {
            const customerId = account.customer_id;
            const clientName = account.client_name;
            const currencySymbol = account.currency_symbol;
            const data = account.data;
            
            console.log(`Processing account: ${clientName} (${customerId})`);
            console.log(`Data points to process: ${data.length}`);
            
            // Group data by campaign for better organization
            const campaignGroups = new Map();
            data.forEach(row => {
                const [date, campaignName, dailyBudget, spent, impressions, clicks, cpc, ctr, conversions, convRate, costPerConv] = row;
                if (!campaignGroups.has(campaignName)) {
                    campaignGroups.set(campaignName, []);
                }
                campaignGroups.get(campaignName).push(row);
            });
            
            console.log(`Found ${campaignGroups.size} unique campaigns`);
            
            // Process each campaign
            for (const [campaignName, campaignData] of campaignGroups) {
                const campaignUniqueId = `${customerId}_${campaignName}`;
                
                console.log(`Processing campaign: ${campaignName} with ${campaignData.length} data points`);
                
                // Get the latest row for campaign metadata
                const latestRow = campaignData[campaignData.length - 1];
                const [, , dailyBudget] = latestRow;
                const budgetNumeric = parseFloat(dailyBudget.replace(/[^0-9.-]/g, '')) || 0;
                
                try {
                    // Create campaign only once
                    const campaign = await prisma.campaign.create({
                        data: {
                            name: campaignName,
                            status: 'ACTIVE',
                            budget: budgetNumeric,
                            startDate: new Date(campaignData[0][0]), // First date
                            endDate: new Date(latestRow[0]), // Last date
                            googleAdsId: campaignUniqueId,
                            userId: defaultUser.id
                        }
                    });
                    console.log(`Created campaign: ${campaignName} (ID: ${campaign.id})`);
                    totalCampaignsCreated++;
                    processedCampaigns.set(campaignUniqueId, campaign.id);
                    
                    // Store analytics data for each date
                    for (const row of campaignData) {
                        const [date, , , spent, impressions, clicks, cpc, ctr, conversions, convRate, costPerConv] = row;
                        
                        // Parse numeric values
                        const spentNumeric = parseFloat(spent.replace(/[^0-9.-]/g, '')) || 0;
                        const impressionsNum = parseInt(impressions) || 0;
                        const clicksNum = parseInt(clicks) || 0;
                        const conversionsNum = parseFloat(conversions) || 0;
                        const ctrValue = parseFloat(ctr.replace('%', '')) / 100 || 0; // Store as decimal
                        const cpcValue = parseFloat(cpc.replace(/[^0-9.-]/g, '')) || 0;
                        const costPerConvValue = parseFloat(costPerConv.replace(/[^0-9.-]/g, '')) || 0;
                        
                        // Calculate conversion value (estimate)
                        const conversionValue = conversionsNum * (costPerConvValue * 2); // Assume 2x ROI
                        
                        const analytics = await prisma.analytics.create({
                            data: {
                                date: new Date(date),
                                impressions: impressionsNum,
                                clicks: clicksNum,
                                cost: spentNumeric,
                                conversions: Math.round(conversionsNum),
                                conversionValue: conversionValue,
                                ctr: ctrValue,
                                cpc: cpcValue,
                                costPerConversion: costPerConvValue,
                                campaignId: campaign.id,
                                userId: defaultUser.id
                            }
                        });
                        totalAnalyticsCreated++;
                    }
                    
                    console.log(`Created ${campaignData.length} analytics records for ${campaignName}`);
                    
                } catch (error) {
                    console.error(`Error processing campaign ${campaignName}:`, error.message);
                }
            }
        }
        
        // Verify the data was stored
        const finalCampaignCount = await prisma.campaign.count();
        const finalAnalyticsCount = await prisma.analytics.count();
        console.log(`Final counts - Campaigns: ${finalCampaignCount}, Analytics: ${finalAnalyticsCount}`);
        console.log(`Total created in this session - Campaigns: ${totalCampaignsCreated}, Analytics: ${totalAnalyticsCreated}`);
        
        console.log('Campaign data stored successfully!');
        
    } catch (error) {
        console.error('Error storing campaign data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Get campaign data from command line arguments
const campaignData = JSON.parse(process.argv[2]);
storeCampaigns(campaignData)
    .then(() => {
        console.log('Database operation completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Database operation failed:', error);
        process.exit(1);
    });
"""
    
    # Write the script to a temporary file
    with open('temp_db_script.js', 'w') as f:
        f.write(db_script)
    
    try:
        # Convert the data to JSON string for passing to Node.js
        campaign_data_json = json.dumps(all_data)
        
        # Run the Node.js script with .mjs extension for ES module support
        # First rename the file to .mjs
        os.rename('temp_db_script.js', 'temp_db_script.mjs')
        
        # Run the script
        result = subprocess.run(
            ['node', 'temp_db_script.mjs', campaign_data_json],
            capture_output=True,
            text=True,
            check=True
        )
        
        print("✅ Campaign data stored to database successfully!")
        print(result.stdout)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error storing data to database: {e}")
        print(f"Error output: {e.stderr}")
        raise
    finally:
        # Clean up temporary files
        if os.path.exists('temp_db_script.js'):
            os.remove('temp_db_script.js')
        if os.path.exists('temp_db_script.mjs'):
            os.remove('temp_db_script.mjs')

if __name__ == "__main__":
    print("🔄 Starting Google Ads data fetch and database storage...")
    
    try:
        # Step 1: Fetch Google Ads data
        print("📊 Fetching Google Ads campaign data...")
        all_data = fetch_google_ads_data()
        
        if not all_data:
            print("❌ No data fetched from Google Ads")
            sys.exit(1)
        
        print(f"✅ Successfully fetched data for {len(all_data)} accounts")
        
        # Step 2: Store data to database
        print("💾 Storing campaign data to PostgreSQL database...")
        store_campaigns_to_database(all_data)
        
        print("🎉 All operations completed successfully!")
        
    except Exception as e:
        print(f"❌ Error in main process: {e}")
        sys.exit(1)