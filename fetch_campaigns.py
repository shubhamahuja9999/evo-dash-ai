from google.ads.googleads.client import GoogleAdsClient
import pandas as pd
import yaml
import sys
from datetime import datetime, timedelta, date
import pytz
import subprocess
import json
import os
import csv

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
    "INR": {"symbol": "Rs.", "decimals": 2},
    "USD": {"symbol": "$", "decimals": 2},
    "EUR": {"symbol": "EUR", "decimals": 2},
    "JPY": {"symbol": "JPY", "decimals": 0},
}

def parse_csv_data(csv_path):
    """Parse the CSV file and return structured data"""
    print(f"Reading CSV data from {csv_path}")
    
    csv_data = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            # Read all lines to handle the header properly
            lines = f.readlines()
            
            # Find the actual header row (after title and date range)
            header_row = None
            for i, line in enumerate(lines):
                if 'Campaign' in line and 'Day' in line:
                    header_row = i
                    break
            
            if header_row is None:
                print("Could not find header row in CSV")
                return []
            
            # Create reader with the correct header
            reader = csv.DictReader(lines[header_row:])
            for row in reader:
                # Skip empty rows or header repeats
                if not row.get('Campaign') or row['Campaign'] == 'Campaign':
                    continue
                
                # Parse numeric values
                try:
                    impressions = int(row.get('Impr.', '0').replace(',', ''))
                    clicks = int(row.get('Clicks', '0'))
                    conversions = float(row.get('Conversions', '0'))
                    ctr = float(row.get('CTR', '0').rstrip('%')) / 100
                    views = int(row.get('Views', '0'))
                    avg_cpv = float(row.get('Avg. CPV', '0').replace('Rs.', '').strip() or '0')
                    cost_per_conv = float(row.get('Cost / conv.', '0').replace('Rs.', '').strip() or '0')
                except ValueError as e:
                    print(f"Warning: Error parsing numeric values in row: {row}")
                    continue

                csv_data.append({
                    'date': datetime.strptime(row['Day'], '%Y-%m-%d').date() if row.get('Day') else None,
                    'campaign_name': row['Campaign'],
                    'bid_strategy': row.get('Campaign bid strategy type', ''),
                    'conversions': conversions,
                    'currency_code': row.get('Currency code', 'INR'),
                    'cost_per_conversion': cost_per_conv,
                    'clicks': clicks,
                    'ctr': ctr,
                    'impressions': impressions,
                    'views': views,
                    'avg_cpv': avg_cpv
                })
    
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return []
    
    print(f"Successfully parsed {len(csv_data)} rows from CSV")
    return csv_data

def fetch_google_ads_data():
    """Fetch Google Ads campaign data for all child accounts"""
    print("Fetching Google Ads campaign data...")
    
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
            google_ads_service = client.get_service('GoogleAdsService')
            print(f"Using Google Ads API v13 for customer {customer_id}")
            
            response = google_ads_service.search(
                customer_id=customer_id,
                query=query,
            )
            
            data = []
            for row in response:
                date = row.segments.date
                campaign_name = row.campaign.name
                currency_code = row.customer.currency_code
                currency_info = CURRENCY_MAP.get(currency_code, {"symbol": currency_code + " ", "decimals": 2})
                
                # Parse metrics
                impressions = row.metrics.impressions
                clicks = row.metrics.clicks
                conversions = row.metrics.conversions
                ctr = clicks / impressions if impressions else 0
                cost_per_conv = row.metrics.cost_per_conversion / 1_000_000 if row.metrics.cost_per_conversion else 0
                
                data.append({
                    'date': date,
                    'campaign_name': campaign_name,
                    'bid_strategy': '',  # Not available in API response
                    'conversions': conversions,
                    'currency_code': currency_code,
                    'cost_per_conversion': cost_per_conv,
                    'clicks': clicks,
                    'ctr': ctr,
                    'impressions': impressions,
                    'views': 0,  # Not available in API response
                    'avg_cpv': 0  # Not available in API response
                })
            
            all_data.extend(data)
            print(f"Fetched {len(data)} rows for customer {customer_id}")
            
        except Exception as e:
            print(f"Error fetching data for customer {customer_id}: {e}")
    
    return all_data

def combine_and_store_data(google_ads_data, csv_data):
    """Combine Google Ads and CSV data and store in database"""
    print("Combining and storing data...")
    
    # Create a map to track unique campaign-date combinations
    combined_data = {}
    
    # Process Google Ads data first
    for item in google_ads_data:
        key = (item['campaign_name'], item['date'])
        combined_data[key] = item
    
    # Process CSV data, updating or adding as needed
    for item in csv_data:
        key = (item['campaign_name'], item['date'])
        if key in combined_data:
            # Update existing data with non-zero values from CSV
            existing = combined_data[key]
            for metric in ['impressions', 'clicks', 'conversions', 'views', 'avg_cpv']:
                if item[metric] > 0:
                    existing[metric] = item[metric]
            # Update CTR if we have both clicks and impressions
            if item['clicks'] > 0 and item['impressions'] > 0:
                existing['ctr'] = item['clicks'] / item['impressions']
            # Update cost per conversion if available
            if item['cost_per_conversion'] > 0:
                existing['cost_per_conversion'] = item['cost_per_conversion']
        else:
            # Add new data point
            combined_data[key] = item
    
    # Convert to list and sort by date and campaign name
    final_data = list(combined_data.values())
    # Convert string dates to datetime.date objects for sorting
    for item in final_data:
        if isinstance(item['date'], str):
            item['date'] = datetime.strptime(item['date'], '%Y-%m-%d').date()
    final_data.sort(key=lambda x: (x['date'], x['campaign_name']))
    
    # Create Node.js script for database operations
    db_script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function storeData(data) {
    try {
        // Clear existing metrics
        await prisma.campaignMetric.deleteMany();
        console.log('Cleared existing metrics');
        
        // Store new metrics
        const metrics = await Promise.all(data.map(async (item) => {
            return prisma.campaignMetric.create({
                data: {
                    date: new Date(item.date),
                    campaignName: item.campaign_name,
                    bidStrategy: item.bid_strategy,
                    conversions: item.conversions,
                    currencyCode: item.currency_code,
                    costPerConversion: item.cost_per_conversion,
                    clicks: item.clicks,
                    ctr: item.ctr,
                    impressions: item.impressions,
                    views: item.views,
                    avgCpv: item.avg_cpv
                }
            });
        }));
        
        console.log(`Stored ${metrics.length} metrics in database`);
        return metrics;
    } catch (error) {
        console.error('Error storing data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

const fs = require('fs');
const dataPath = process.argv[2];
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
storeData(data)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
"""
    
    try:
        # Convert data to JSON, handling date serialization
        def serialize_data(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")
        
        data_json = json.dumps(final_data, default=serialize_data)
        
        # Write script to a temporary file in the current directory
        script_path = os.path.join(os.getcwd(), 'import_script.js')
        with open(script_path, 'w') as f:
            f.write(db_script)
    
        # Write data to a file
        data_path = os.path.join(os.getcwd(), 'import_data.json')
        with open(data_path, 'w') as f:
            f.write(data_json)
        
        # Run Node.js script
        result = subprocess.run(
            ['node', script_path, data_path],
            capture_output=True,
            text=True,
            check=True
        )
        
        print("Data stored successfully!")
        print(result.stdout)
        
    except subprocess.CalledProcessError as e:
        print(f"Error storing data: {e}")
        print(f"Error output: {e.stderr}")
        raise
    finally:
        # Clean up temporary files
        for temp_file in ['import_script.js', 'import_data.json']:
            if os.path.exists(temp_file):
                os.remove(temp_file)

def main():
    """Main function to orchestrate data fetching and storage"""
    print("Starting data fetch and storage process...")
    
    try:
        # Step 1: Fetch Google Ads data
        google_ads_data = fetch_google_ads_data()
        print(f"Fetched {len(google_ads_data)} records from Google Ads")
        
        # Step 2: Parse CSV data if available
        csv_paths = [
            os.path.join(os.getcwd(), "Untitled report.csv"),  # Current directory
            os.path.expanduser("~/Downloads/Untitled report.csv"),  # Downloads folder
            "c:\\Users\\Shubham Ahuja\\Downloads\\Untitled report.csv"  # Specific path
        ]
        
        csv_data = []
        for csv_path in csv_paths:
            if os.path.exists(csv_path):
                print(f"Found CSV file at {csv_path}")
                csv_data = parse_csv_data(csv_path)
                print(f"Parsed {len(csv_data)} records from CSV")
                break
        else:
            print("CSV file not found in any of the expected locations")
        
        # Step 3: Combine and store data
        combine_and_store_data(google_ads_data, csv_data)
        print("All operations completed successfully!")
        
    except Exception as e:
        print(f"Error in main process: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()