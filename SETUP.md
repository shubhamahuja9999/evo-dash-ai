# Evo Dash AI - Database Setup Guide

This guide will help you set up your Prisma database and connect it to your frontend dashboard.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (recommended) or SQLite for local development

## Quick Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with your database configuration:

**For PostgreSQL (Recommended):**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/evo_dash_ai"
VITE_API_BASE_URL="http://localhost:3001"
```

**For SQLite (Quick Local Testing):**
```env
DATABASE_URL="file:./dev.db"
VITE_API_BASE_URL="http://localhost:3001"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Create and run migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

### 4. Start the Application

**Terminal 1 - Start the API server:**
```bash
npm run server:dev
```

**Terminal 2 - Start the React frontend:**
```bash
npm run dev
```

### 5. Verify Setup

1. Frontend should be available at: http://localhost:8080
2. API should be available at: http://localhost:3001
3. Health check: http://localhost:3001/health

## Database Schema Overview

The database includes the following main models:

- **User**: User management with roles
- **Campaign**: Marketing campaigns with Google Ads integration support
- **Analytics**: Performance data (impressions, clicks, conversions, cost)
- **AIRecommendation**: AI-powered insights and recommendations
- **AdGroup & Ad**: Detailed ad structure for Google Ads
- **AuditLog**: Track all system changes

## API Endpoints

- `GET /api/analytics` - Analytics chart data
- `GET /api/analytics/stats` - Analytics summary stats
- `GET /api/traffic-sources` - Traffic source data
- `GET /api/campaigns` - Campaign list
- `GET /api/campaigns/stats` - Campaign summary stats
- `GET /api/insights` - AI recommendations/insights
- `GET /api/insights/stats` - Insights summary stats

## Troubleshooting

### Database Connection Issues
1. Verify your DATABASE_URL is correct
2. Ensure PostgreSQL is running (if using PostgreSQL)
3. Check database credentials and permissions

### Missing Data on Frontend
1. Ensure the API server is running on port 3001
2. Check browser console for API errors
3. Verify the database has been seeded with sample data

### Development Tools

```bash
# View database in Prisma Studio
npm run db:studio

# Reset database (caution: deletes all data)
npx prisma migrate reset

# View real-time server logs
npm run server:dev
```

## Next Steps

1. **Connect to Google Ads API**: Use the `googleAdsId` fields to integrate with real Google Ads data
2. **Add Authentication**: Implement user login/registration
3. **Real AI Integration**: Replace mock AI recommendations with actual ML models
4. **Production Deployment**: Set up production database and environment

## Support

If you encounter any issues:
1. Check the terminal output for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Try restarting both the frontend and backend servers
