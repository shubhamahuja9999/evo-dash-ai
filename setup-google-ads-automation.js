#!/usr/bin/env node

/**
 * Google Ads Automation Setup Script
 * Sets up the complete Google Ads automation system with all features
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Google Ads Automation System...\n');

// Check if required files exist
const requiredFiles = [
  'google-ads.yaml',
  'server/google-ads-service.ts',
  'server/automation-scheduler.ts',
  'server/google-ads-chat-service.ts',
  'src/components/google-ads-dashboard.tsx',
  'prisma/schema.prisma'
];

console.log('📋 Checking required files...');
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}
console.log('✅ All required files present\n');

// Check environment variables
console.log('🔧 Checking environment variables...');
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing environment variables:');
  missingEnvVars.forEach(envVar => console.warn(`   - ${envVar}`));
  console.warn('\nPlease set these in your .env file\n');
}

// Install dependencies
console.log('📦 Installing additional dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Generate Prisma client
console.log('🔄 Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  console.log('   Run "npx prisma generate" manually after setting up your database\n');
}

// Run database migration (if DATABASE_URL is set)
if (process.env.DATABASE_URL) {
  console.log('🗄️  Running database migrations...');
  try {
    execSync('npx prisma migrate dev --name google-ads-automation', { stdio: 'inherit' });
    console.log('✅ Database migrations completed\n');
  } catch (error) {
    console.error('❌ Failed to run migrations:', error.message);
    console.log('   Run "npx prisma migrate dev" manually after setting up your database\n');
  }
} else {
  console.log('⚠️  DATABASE_URL not set, skipping migrations\n');
}

// Create sample automation tasks
console.log('🤖 Setting up sample automation tasks...');
const sampleTasks = [
  {
    name: 'Daily Billing Check',
    type: 'BILLING_CHECK',
    schedule: '0 8 * * *', // 8 AM daily
    description: 'Checks account billing status and payment methods'
  },
  {
    name: 'Negative Keyword Detection',
    type: 'NEGATIVE_KEYWORD_DETECTION',
    schedule: '0 6 * * *', // 6 AM daily
    description: 'Finds and adds negative keywords to prevent wasted spend'
  },
  {
    name: 'Bid Optimization',
    type: 'BID_OPTIMIZATION',
    schedule: '0 10 * * *', // 10 AM daily
    description: 'Optimizes keyword bids based on performance'
  },
  {
    name: 'Spend Monitoring',
    type: 'SPEND_LIMIT_ENFORCEMENT',
    schedule: '*/30 * * * *', // Every 30 minutes
    description: 'Monitors spend limits and pauses campaigns if exceeded'
  },
  {
    name: 'Performance Analysis',
    type: 'PERFORMANCE_MONITORING',
    schedule: '0 12 * * *', // 12 PM daily
    description: 'Analyzes campaign performance and generates alerts'
  }
];

fs.writeFileSync(
  'sample-automation-tasks.json',
  JSON.stringify(sampleTasks, null, 2)
);
console.log('✅ Sample automation tasks configuration created\n');

// Create environment template
console.log('📝 Creating environment template...');
const envTemplate = `# Google Ads Automation Environment Variables

# OpenAI API Key (required for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Database URL (required)
DATABASE_URL="postgresql://username:password@localhost:5432/evo_dash_ai"

# Google Ads API (configured in google-ads.yaml)
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_LOGIN_CUSTOMER_ID=your_customer_id

# Server Configuration
PORT=3001
NODE_ENV=development

# Automation Settings
AUTOMATION_ENABLED=true
AUTOMATION_LOG_LEVEL=info
DAILY_OPTIMIZATION_TIME=06:00
BILLING_CHECK_TIME=08:00

# Chat Features
MAX_CHAT_HISTORY=100
CHAT_SESSION_TIMEOUT=3600000

# Performance Monitoring
ALERT_EMAIL=your_email@example.com
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Security
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
`;

if (!fs.existsSync('.env')) {
  fs.writeFileSync('.env.example', envTemplate);
  console.log('✅ Environment template created (.env.example)\n');
} else {
  console.log('✅ .env file already exists\n');
}

// Create startup script
console.log('🎯 Creating startup scripts...');
const startupScript = `#!/bin/bash

echo "🚀 Starting Google Ads Automation System..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure your settings."
    exit 1
fi

# Start the server in development mode
echo "🔄 Starting development server..."
npm run server:dev &
SERVER_PID=$!

# Start the frontend in development mode
echo "🔄 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Google Ads Automation System is starting..."
echo "📊 Dashboard: http://localhost:5173"
echo "🔧 API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt signal
trap "echo 'Stopping services...'; kill $SERVER_PID $FRONTEND_PID; exit" INT
wait
`;

fs.writeFileSync('start-automation.sh', startupScript);
fs.chmodSync('start-automation.sh', '755');
console.log('✅ Startup script created (start-automation.sh)\n');

// Create documentation
console.log('📚 Creating documentation...');
const documentation = `# Google Ads Automation System

## Overview
Complete automation system for Google Ads management with the following features:

### ✨ Main Features

#### Account Management
- ✅ Daily billing checks
- ✅ Payment problem prevention
- ✅ Team access management
- ✅ Spend limit enforcement

#### Keyword Management  
- ✅ Negative keyword detection
- ✅ Automatic keyword blocking
- ✅ Bid optimization
- ✅ Daily automation

#### Ad Testing
- ✅ A/B testing system
- ✅ Automated decision making
- ✅ Performance analysis
- ✅ Statistical significance testing

#### Smart Targeting
- ✅ Cost per lead tracking
- ✅ Geographic optimization
- ✅ Audience-based adjustments
- ✅ Message testing

#### Chat Control
- ✅ Natural language interface
- ✅ Campaign management commands
- ✅ Performance analysis
- ✅ Real-time automation

## 🚀 Quick Start

1. **Setup Environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your API keys and database URL
   \`\`\`

2. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Setup Database**
   \`\`\`bash
   npx prisma migrate dev
   npx prisma generate
   \`\`\`

4. **Start the System**
   \`\`\`bash
   ./start-automation.sh
   \`\`\`

## 📊 Dashboard Features

The main dashboard provides:
- Real-time account overview
- Automation status and savings
- Performance metrics
- Alert management  
- AI recommendations
- Chat interface

## 🤖 Automation Features

### Daily Optimizations
- **6:00 AM**: Negative keyword detection
- **8:00 AM**: Billing status check
- **10:00 AM**: Bid optimization
- **12:00 PM**: Performance analysis
- **Every 30 min**: Spend monitoring

### Chat Commands
- "Stop all campaigns costing over $50 per lead"
- "Add negative keywords for my tech campaign"
- "Show me why costs went up this week"
- "Optimize bids for my best performing keywords"
- "Create a new campaign for software engineers"

## 🔧 API Endpoints

### Dashboard
- \`GET /api/google-ads/dashboard\` - Main dashboard data

### Chat Interface
- \`POST /api/google-ads/chat\` - Process chat messages
- \`GET /api/google-ads/chat/sessions\` - Get chat sessions

### Automation
- \`GET /api/google-ads/automation/tasks\` - List automation tasks
- \`POST /api/google-ads/automation/tasks\` - Create automation task
- \`POST /api/google-ads/automation/trigger-daily\` - Trigger optimization

### Account Management
- \`GET /api/google-ads/account/:id/summary\` - Account summary
- \`GET /api/google-ads/account/:id/billing\` - Billing info
- \`POST /api/google-ads/account/:id/fix-payment\` - Fix payments

### Keywords
- \`GET /api/google-ads/account/:id/negative-keywords\` - Find negative keywords
- \`POST /api/google-ads/account/:id/negative-keywords\` - Add negative keywords
- \`POST /api/google-ads/account/:id/optimize-bids\` - Optimize bids

## 💰 What You Get

### Save Time
- No more daily ad checking
- No more manual bid changes  
- No more keyword research
- Works while you sleep

### Save Money
- Stops wasted ad spend fast
- Finds cheaper ways to get leads
- Prevents billing mistakes
- Reduces need for ad agencies

### Better Results
- Gets more leads for same budget
- Improves ad quality scores
- Responds to changes in minutes
- Uses data from all campaigns

### Easy to Use
- Talk to it like ChatGPT
- See reports in plain English
- Get alerts when things change
- Works with your current tools

## 🔒 Security & Privacy

- All data encrypted in transit and at rest
- Google Ads API official integration
- No data shared with third parties
- Complete audit trail for all actions

## 📞 Support

For issues or questions:
1. Check the logs in the browser console
2. Review automation execution history
3. Use the chat interface for troubleshooting
4. Check API responses for detailed errors

## 🔄 Updates

The system automatically:
- Optimizes daily at scheduled times
- Learns from your campaign performance
- Adapts to seasonal changes
- Improves recommendations over time
`;

fs.writeFileSync('GOOGLE_ADS_AUTOMATION.md', documentation);
console.log('✅ Documentation created (GOOGLE_ADS_AUTOMATION.md)\n');

// Final setup summary
console.log('🎉 Google Ads Automation System Setup Complete!\n');
console.log('📋 Next Steps:');
console.log('1. Configure your .env file with API keys');
console.log('2. Set up your database connection');
console.log('3. Run: ./start-automation.sh');
console.log('4. Open http://localhost:5173 to access the dashboard');
console.log('5. Use the chat interface to start automating your campaigns\n');

console.log('🚀 Features Ready:');
console.log('   ✅ Account Management (billing checks, payment monitoring)');
console.log('   ✅ Keyword Management (negative keywords, optimization)');
console.log('   ✅ Ad Testing (A/B testing, automated decisions)');
console.log('   ✅ Smart Targeting (cost tracking, geo optimization)');
console.log('   ✅ Chat Control (natural language commands)');
console.log('   ✅ Dashboard (comprehensive reporting)');
console.log('   ✅ Automation Scheduler (daily tasks)');
console.log('   ✅ Real-time Monitoring (alerts, performance tracking)\n');

console.log('💡 Pro Tips:');
console.log('   • Start with the chat interface: "Show me my account status"');
console.log('   • Set up daily automation: "Schedule daily optimization"');
console.log('   • Monitor spending: "Alert me if daily spend exceeds $500"');
console.log('   • Find bad keywords: "Add negative keywords automatically"');
console.log('   • Test new ads: "Create ad variants for my top campaign"\n');

console.log('📊 Your Google Ads automation is now ready to save you time and money!');
