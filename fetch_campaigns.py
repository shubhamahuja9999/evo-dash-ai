import os
import json
import yaml
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from datetime import datetime, timedelta
import subprocess

def load_google_ads_config():
    """Load Google Ads configuration from yaml file."""
    try:
        with open('google-ads.yaml', 'r') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"❌ Error loading Google Ads config: {e}")
        raise

def get_google_ads_client(version='v14'):
    """Initialize Google Ads API client with specified version."""
    try:
        config = load_google_ads_config()
        return GoogleAdsClient.load_from_dict(config, version=version)
    except Exception as e:
        print(f"❌ Error initializing Google Ads client: {e}")
        raise

def fetch_campaign_data(client, customer_id):
    """Fetch campaign performance data from Google Ads API."""
    ga_service = client.get_service("GoogleAdsService")
    
    query = """
        SELECT
            segments.date,
            campaign.name,
            campaign.status,
            campaign.id,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions,
            metrics.average_cpc,
            metrics.ctr,
            metrics.conversions_value
        FROM campaign
        WHERE segments.date DURING LAST_7_DAYS
        ORDER BY segments.date DESC
    """
    
    try:
        response = ga_service.search_stream(customer_id=customer_id, query=query)
        campaign_data = []
        
        for batch in response:
            for row in batch.results:
                campaign_data.append([
                    row.segments.date.strftime("%Y-%m-%d"),
                    row.campaign.name,
                    float(row.campaign.id),  # budget
                    float(row.metrics.cost_micros) / 1000000,  # cost
                    row.metrics.impressions,
                    row.metrics.clicks,
                    float(row.metrics.average_cpc) / 1000000,  # cpc
                    float(row.metrics.ctr) * 100,  # ctr
                    float(row.metrics.conversions),
                    float(row.metrics.conversions) * 100 / row.metrics.clicks if row.metrics.clicks > 0 else 0,  # conv_rate
                    float(row.metrics.conversions_value)  # conv_value
                ])
        
        return campaign_data
    except GoogleAdsException as ex:
        print(f"❌ Request with ID '{ex.request_id}' failed with status '{ex.error.code().name}'")
        for error in ex.failure.errors:
            print(f"\tError with message '{error.message}'.")
            if error.location:
                for field_path_element in error.location.field_path_elements:
                    print(f"\t\tOn field: {field_path_element.field_name}")
        raise

def store_campaign_data(data):
    """Store campaign data in PostgreSQL database using Node.js script."""
    try:
        # Create a temporary Node.js script to store data
        script_content = """
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function storeCampaigns(campaignData) {
    try {
        // Create default user if not exists
        const user = await prisma.user.upsert({
            where: { email: 'default@upthrust.ai' },
            update: {},
            create: {
                email: 'default@upthrust.ai',
                name: 'Default User'
            }
        });

        // Process each campaign
        for (const [date, name, budget, cost, impressions, clicks, cpc, ctr, conversions, convRate, convValue] of campaignData) {
            // Create or update campaign
            const existingCampaign = await prisma.campaign.upsert({
                where: {
                    name_userId: {
                        name: name,
                        userId: user.id
                    }
                },
                update: {
                    budget: budget,
                    status: 'ACTIVE'
                },
                create: {
                    name: name,
                    budget: budget,
                    status: 'ACTIVE',
                    userId: user.id
                }
            });

            // Create analytics entry
            await prisma.analytics.create({
                data: {
                    date: new Date(date),
                    impressions: impressions,
                    clicks: clicks,
                    cost: cost,
                    conversions: conversions,
                    conversionValue: convValue,
                    ctr: ctr / 100,
                    cpc: cpc,
                    conversionRate: convRate / 100,
                    campaignId: existingCampaign.id
                }
            });
        }

        console.log('✅ Campaign data stored successfully!');
    } catch (error) {
        console.error('❌ Error storing campaign data:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Get data from command line argument
const campaignData = JSON.parse(process.argv[2]);
storeCampaigns(campaignData);
"""

        # Write the temporary script
        with open('temp_db_script.mjs', 'w') as f:
            f.write(script_content)

        # Execute the Node.js script with campaign data
        process = subprocess.run(
            ['node', 'temp_db_script.mjs', json.dumps(data)],
            capture_output=True,
            text=True
        )

        if process.returncode != 0:
            print(f"❌ Error storing data to database: {process.stderr}")
            raise Exception(f"Database operation failed: {process.stderr}")

        print("✅ Campaign data stored to database successfully!")

    except Exception as e:
        print(f"❌ Error storing campaign data: {e}")
        raise
    finally:
        # Clean up temporary script
        if os.path.exists('temp_db_script.mjs'):
            os.remove('temp_db_script.mjs')

def main():
    """Main function to fetch and store Google Ads data."""
    print("🔄 Starting Google Ads data fetch and database storage...")
    
    try:
        print("📊 Fetching Google Ads campaign data...")
        config = load_google_ads_config()
        
        # Try different API versions
        api_versions = ['v13', 'v14', None]  # None will use default version
        client = None
        
        for version in api_versions:
            try:
                if version:
                    print(f"Trying Google Ads API {version}...")
                else:
                    print("Trying default Google Ads API version...")
                client = get_google_ads_client(version)
                if not version:
                    print("Successfully using default Google Ads API version")
                break
            except Exception as e:
                print(f"{version if version else 'default'} failed: {str(e)}")
                continue
        
        if not client:
            raise Exception("Failed to initialize Google Ads client with any version")

        all_campaign_data = []
        accounts_processed = 0
        
        # Process each child account
        for customer_id in config.get('child_account_ids', []):
            try:
                campaign_data = fetch_campaign_data(client, customer_id)
                print(f"DEBUG: Fetched {len(campaign_data)} rows for {config.get('client_name', 'Unknown')} ({customer_id})")
                all_campaign_data.extend(campaign_data)
                accounts_processed += 1
            except Exception as e:
                print(f"❌ Error processing account {customer_id}: {e}")
                continue

        print(f"✅ Successfully fetched data for {accounts_processed} accounts")
        
        print("💾 Storing campaign data to PostgreSQL database...")
        store_campaign_data(all_campaign_data)
        
        print("🎉 All operations completed successfully!")

    except Exception as e:
        print(f"❌ Error in main process: {e}")
        raise

if __name__ == "__main__":
    main()