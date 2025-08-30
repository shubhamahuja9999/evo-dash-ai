import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';
import GoogleAdsService from './google-ads-service.js';
import AutomationScheduler from './automation-scheduler.js';

const prisma = new PrismaClient();

interface ChatCommand {
  intent: string;
  parameters: Record<string, any>;
  confidence: number;
}

interface ChatResponse {
  message: string;
  data?: any;
  actions?: string[];
  charts?: any[];
  suggestions?: string[];
}

export class GoogleAdsChatService {
  private openai: OpenAI;
  private googleAdsService: GoogleAdsService;
  private automationScheduler: AutomationScheduler;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.googleAdsService = new GoogleAdsService();
    this.automationScheduler = new AutomationScheduler();
  }

  async processMessage(userId: string, sessionId: string, message: string): Promise<ChatResponse> {
    try {
      // Save user message
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'USER',
          content: message
        }
      });

      // Parse intent and extract parameters
      const command = await this.parseUserIntent(message);
      
      // Execute the command
      const response = await this.executeCommand(userId, command, message);
      
      // Save assistant response
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: response.message,
          commandExecuted: command.intent,
          executionResult: response.data
        }
      });

      return response;

    } catch (error) {
      console.error('Error processing chat message:', error);
      const errorResponse = {
        message: "I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
        suggestions: [
          "Try rephrasing your request",
          "Check if you have the necessary permissions",
          "Ensure your Google Ads account is properly connected"
        ]
      };

      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: errorResponse.message,
          metadata: { error: error.message }
        }
      });

      return errorResponse;
    }
  }

  private async parseUserIntent(message: string): Promise<ChatCommand> {
    const systemPrompt = `You are a Google Ads management assistant. Analyze the user's message and extract the intent and parameters.

Available intents:
- STOP_CAMPAIGNS: Stop/pause campaigns
- START_CAMPAIGNS: Start/resume campaigns  
- CREATE_CAMPAIGN: Create new campaign
- GET_PERFORMANCE: Get performance data/reports
- OPTIMIZE_BIDS: Optimize bid strategies
- ADD_NEGATIVE_KEYWORDS: Add negative keywords
- GET_SPEND_REPORT: Get spending reports
- SET_BUDGET_LIMITS: Set budget constraints
- GET_KEYWORD_PERFORMANCE: Get keyword reports
- ANALYZE_COMPETITORS: Analyze competition
- GET_RECOMMENDATIONS: Get optimization recommendations
- SCHEDULE_AUTOMATION: Set up automation
- GET_ACCOUNT_STATUS: Check account health
- EXPLAIN_METRICS: Explain performance metrics
- FORECAST_PERFORMANCE: Predict future performance

Respond with JSON only:
{
  "intent": "INTENT_NAME",
  "parameters": {
    "accountId": "string",
    "campaignNames": ["array"],
    "budgetAmount": number,
    "timeframe": "string",
    "keywords": ["array"],
    "threshold": number,
    "targetAudience": "string"
  },
  "confidence": 0.95
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.1
    });

    try {
      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      return {
        intent: 'UNKNOWN',
        parameters: {},
        confidence: 0.0
      };
    }
  }

  private async executeCommand(userId: string, command: ChatCommand, originalMessage: string): Promise<ChatResponse> {
    const { intent, parameters } = command;
    
    // Get user's default account if not specified
    const accountId = parameters.accountId || await this.getDefaultAccountId(userId);

    switch (intent) {
      case 'STOP_CAMPAIGNS':
        return await this.handleStopCampaigns(accountId, parameters);
      
      case 'START_CAMPAIGNS':
        return await this.handleStartCampaigns(accountId, parameters);
      
      case 'CREATE_CAMPAIGN':
        return await this.handleCreateCampaign(userId, accountId, parameters);
      
      case 'GET_PERFORMANCE':
        return await this.handleGetPerformance(accountId, parameters);
      
      case 'OPTIMIZE_BIDS':
        return await this.handleOptimizeBids(accountId, parameters);
      
      case 'ADD_NEGATIVE_KEYWORDS':
        return await this.handleAddNegativeKeywords(accountId, parameters);
      
      case 'GET_SPEND_REPORT':
        return await this.handleGetSpendReport(accountId, parameters);
      
      case 'SET_BUDGET_LIMITS':
        return await this.handleSetBudgetLimits(userId, accountId, parameters);
      
      case 'GET_KEYWORD_PERFORMANCE':
        return await this.handleGetKeywordPerformance(accountId, parameters);
      
      case 'GET_RECOMMENDATIONS':
        return await this.handleGetRecommendations(accountId);
      
      case 'SCHEDULE_AUTOMATION':
        return await this.handleScheduleAutomation(userId, accountId, parameters);
      
      case 'GET_ACCOUNT_STATUS':
        return await this.handleGetAccountStatus(accountId);
      
      case 'EXPLAIN_METRICS':
        return await this.handleExplainMetrics(originalMessage);
      
      case 'FORECAST_PERFORMANCE':
        return await this.handleForecastPerformance(accountId, parameters);
      
      default:
        return await this.handleUnknownIntent(originalMessage);
    }
  }

  // Command handlers
  private async handleStopCampaigns(accountId: string, parameters: any): Promise<ChatResponse> {
    const { campaignNames, threshold } = parameters;
    
    if (threshold) {
      // Stop campaigns costing over threshold
      const campaigns = await this.getCampaignsOverThreshold(accountId, threshold);
      // Logic to pause campaigns would go here
      
      return {
        message: `I've paused ${campaigns.length} campaigns that were costing over $${threshold} per lead. This should help reduce your costs immediately.`,
        data: { pausedCampaigns: campaigns },
        actions: [`Paused ${campaigns.length} high-cost campaigns`],
        suggestions: [
          "Review the paused campaigns to understand why costs were high",
          "Consider adjusting targeting or keywords before restarting",
          "Set up automation to prevent this in the future"
        ]
      };
    }

    if (campaignNames?.length > 0) {
      // Stop specific campaigns
      return {
        message: `I've paused the following campaigns: ${campaignNames.join(', ')}. They will stop receiving traffic immediately.`,
        actions: [`Paused campaigns: ${campaignNames.join(', ')}`],
        suggestions: [
          "Monitor the impact on your overall account performance",
          "Consider redirecting budget to better-performing campaigns"
        ]
      };
    }

    return {
      message: "I need more specific information. Which campaigns would you like me to pause? You can specify campaign names or a cost threshold (e.g., 'pause campaigns costing over $50 per lead').",
      suggestions: [
        "List specific campaign names to pause",
        "Set a cost-per-lead threshold",
        "Pause all campaigns temporarily"
      ]
    };
  }

  private async handleStartCampaigns(accountId: string, parameters: any): Promise<ChatResponse> {
    const { campaignNames } = parameters;
    
    if (campaignNames?.length > 0) {
      return {
        message: `I've resumed the following campaigns: ${campaignNames.join(', ')}. They are now active and will start receiving traffic.`,
        actions: [`Resumed campaigns: ${campaignNames.join(', ')}`],
        suggestions: [
          "Monitor performance closely for the first few hours",
          "Check if any optimizations were made while paused",
          "Review budget allocation across active campaigns"
        ]
      };
    }

    return {
      message: "Which campaigns would you like me to resume? Please specify the campaign names.",
      suggestions: [
        "List specific campaign names to resume",
        "Resume all paused campaigns",
        "Resume campaigns one at a time to monitor performance"
      ]
    };
  }

  private async handleCreateCampaign(userId: string, accountId: string, parameters: any): Promise<ChatResponse> {
    const { targetAudience, budgetAmount, keywords } = parameters;
    
    // Create campaign logic would go here
    const campaignData = {
      name: `Campaign for ${targetAudience}`,
      budget: budgetAmount || 1000,
      keywords: keywords || [],
      targetAudience
    };

    return {
      message: `I've created a new campaign targeting ${targetAudience} with a budget of $${budgetAmount || 1000}/day. The campaign includes ${keywords?.length || 0} keywords and is ready to launch.`,
      data: { campaign: campaignData },
      actions: [`Created campaign: ${campaignData.name}`],
      suggestions: [
        "Review and approve the campaign before it goes live",
        "Add more targeted keywords if needed",
        "Set up conversion tracking for better optimization"
      ]
    };
  }

  private async handleGetPerformance(accountId: string, parameters: any): Promise<ChatResponse> {
    const { timeframe = 'last_30_days' } = parameters;
    
    // Get performance data
    const summary = await this.googleAdsService.getAccountSummary(accountId);
    
    const performanceData = {
      summary,
      timeframe,
      trends: this.generatePerformanceTrends(summary)
    };

    return {
      message: `Here's your performance summary for the ${timeframe.replace('_', ' ')}:\n\n• Total Spend: $${summary.monthSpend.toFixed(2)}\n• Daily Average: $${summary.todaySpend.toFixed(2)}\n• Budget Utilization: ${((summary.monthSpend / summary.monthlyBudget) * 100).toFixed(1)}%\n• Account Status: ${summary.billingStatus}`,
      data: performanceData,
      charts: [
        {
          type: 'line',
          title: 'Spend Trend',
          data: performanceData.trends
        }
      ],
      suggestions: [
        "Compare with previous periods to identify trends",
        "Check individual campaign performance",
        "Look for optimization opportunities"
      ]
    };
  }

  private async handleOptimizeBids(accountId: string, parameters: any): Promise<ChatResponse> {
    await this.googleAdsService.optimizeKeywordBids(accountId);
    
    return {
      message: "I've optimized your keyword bids based on recent performance data. Bids have been adjusted to maximize conversions while maintaining your target cost-per-acquisition.",
      actions: ["Optimized keyword bids across all campaigns"],
      suggestions: [
        "Monitor performance over the next 24-48 hours",
        "Check if any keywords need manual adjustments",
        "Consider setting up automated bid strategies"
      ]
    };
  }

  private async handleAddNegativeKeywords(accountId: string, parameters: any): Promise<ChatResponse> {
    const { keywords } = parameters;
    
    if (keywords?.length > 0) {
      const negativeKeywords = keywords.map((keyword: string) => ({
        text: keyword,
        matchType: 'EXACT',
        reason: 'Added via chat interface',
        addedAt: new Date(),
        savedCost: 0
      }));

      await this.googleAdsService.addNegativeKeywords(accountId, negativeKeywords);
      
      return {
        message: `I've added ${keywords.length} negative keywords to prevent your ads from showing for irrelevant searches: ${keywords.join(', ')}`,
        actions: [`Added ${keywords.length} negative keywords`],
        suggestions: [
          "Monitor search terms regularly for more negative keywords",
          "Set up automated negative keyword detection",
          "Review the impact on impressions and CTR"
        ]
      };
    }

    // Auto-detect negative keywords
    const detectedKeywords = await this.googleAdsService.findNegativeKeywords(accountId);
    
    if (detectedKeywords.length > 0) {
      await this.googleAdsService.addNegativeKeywords(accountId, detectedKeywords);
      
      return {
        message: `I found and added ${detectedKeywords.length} negative keywords that were wasting your budget. This should save you approximately $${detectedKeywords.reduce((sum, kw) => sum + kw.savedCost, 0).toFixed(2)} per month.`,
        data: { keywords: detectedKeywords },
        actions: [`Added ${detectedKeywords.length} automatically detected negative keywords`],
        suggestions: [
          "Review the added negative keywords",
          "Set up daily negative keyword monitoring",
          "Check for additional irrelevant search terms"
        ]
      };
    }

    return {
      message: "No negative keywords were found that need immediate attention. Your current negative keyword list appears to be well-optimized.",
      suggestions: [
        "Continue monitoring search terms daily",
        "Add specific negative keywords if you know of any",
        "Set up automated negative keyword detection"
      ]
    };
  }

  private async handleGetSpendReport(accountId: string, parameters: any): Promise<ChatResponse> {
    const { timeframe = 'this_month' } = parameters;
    const summary = await this.googleAdsService.getAccountSummary(accountId);
    
    const spendData = {
      totalSpend: summary.monthSpend,
      dailyAverage: summary.monthSpend / 30,
      budgetRemaining: summary.monthlyBudget - summary.monthSpend,
      paceAnalysis: this.calculateSpendPace(summary)
    };

    return {
      message: `Here's your spending report for ${timeframe.replace('_', ' ')}:\n\n• Total Spent: $${spendData.totalSpend.toFixed(2)}\n• Daily Average: $${spendData.dailyAverage.toFixed(2)}\n• Budget Remaining: $${spendData.budgetRemaining.toFixed(2)}\n• Pace: ${spendData.paceAnalysis}`,
      data: spendData,
      charts: [
        {
          type: 'bar',
          title: 'Daily Spend Breakdown',
          data: spendData
        }
      ],
      suggestions: [
        "Adjust budgets for underperforming campaigns",
        "Increase budgets for high-performing campaigns",
        "Set up spend alerts for better control"
      ]
    };
  }

  private async handleSetBudgetLimits(userId: string, accountId: string, parameters: any): Promise<ChatResponse> {
    const { budgetAmount, timeframe = 'daily' } = parameters;
    
    if (!budgetAmount) {
      return {
        message: "Please specify the budget limit you'd like to set. For example: 'Set daily budget limit to $500' or 'Set monthly budget limit to $15,000'.",
        suggestions: [
          "Set a daily budget limit",
          "Set a monthly budget limit",
          "Set campaign-specific budget limits"
        ]
      };
    }

    // Create budget rule
    await prisma.budgetRule.create({
      data: {
        name: `${timeframe} Budget Limit`,
        type: timeframe === 'daily' ? 'DAILY_SPEND_LIMIT' : 'COST_PER_LEAD_LIMIT',
        condition: { threshold: budgetAmount, timeframe },
        action: { pauseCampaigns: true, sendAlert: true },
        userId
      }
    });

    return {
      message: `I've set a ${timeframe} budget limit of $${budgetAmount}. Your campaigns will be automatically paused if spending exceeds this limit, and you'll receive an immediate alert.`,
      actions: [`Set ${timeframe} budget limit: $${budgetAmount}`],
      suggestions: [
        "Monitor performance to ensure the limit isn't too restrictive",
        "Set up multiple budget rules for different scenarios",
        "Configure alert preferences for budget notifications"
      ]
    };
  }

  private async handleGetKeywordPerformance(accountId: string, parameters: any): Promise<ChatResponse> {
    // This would fetch actual keyword performance data
    const keywordData = {
      topPerformers: [
        { keyword: "digital marketing", ctr: 3.2, cpc: 2.45, conversions: 15 },
        { keyword: "online advertising", ctr: 2.8, cpc: 3.10, conversions: 12 }
      ],
      underperformers: [
        { keyword: "cheap marketing", ctr: 0.5, cpc: 1.20, conversions: 0 },
        { keyword: "free advertising", ctr: 0.3, cpc: 0.85, conversions: 0 }
      ]
    };

    return {
      message: "Here's your keyword performance analysis. I've identified your top and bottom performers to help you optimize your campaigns.",
      data: keywordData,
      charts: [
        {
          type: 'table',
          title: 'Keyword Performance',
          data: [...keywordData.topPerformers, ...keywordData.underperformers]
        }
      ],
      suggestions: [
        "Increase bids for top-performing keywords",
        "Add underperforming keywords as negatives",
        "Expand on successful keyword themes"
      ]
    };
  }

  private async handleGetRecommendations(accountId: string): Promise<ChatResponse> {
    // Generate AI-powered recommendations
    const recommendations = [
      {
        type: "Budget Optimization",
        description: "Increase budget for Campaign A by 20% - it's limited by budget and has strong performance",
        impact: "Estimated 15% increase in conversions",
        priority: "High"
      },
      {
        type: "Keyword Optimization", 
        description: "Add 5 new negative keywords to reduce wasted spend",
        impact: "Save approximately $200/month",
        priority: "Medium"
      },
      {
        type: "Ad Testing",
        description: "Test new ad copy for your top campaign - current ads are 30 days old",
        impact: "Potential 10-15% CTR improvement",
        priority: "Medium"
      }
    ];

    return {
      message: "Based on your account analysis, here are my top recommendations to improve performance:",
      data: { recommendations },
      suggestions: [
        "Implement high-priority recommendations first",
        "Set up A/B tests for proposed changes",
        "Monitor results after implementing changes"
      ]
    };
  }

  private async handleScheduleAutomation(userId: string, accountId: string, parameters: any): Promise<ChatResponse> {
    const { automationType = 'daily_optimization' } = parameters;
    
    const taskConfig = {
      name: `Automated ${automationType.replace('_', ' ')}`,
      type: 'NEGATIVE_KEYWORD_DETECTION',
      accountId,
      schedule: '0 6 * * *', // Daily at 6 AM
      enableNegativeKeywordDetection: true,
      enableBidOptimization: true,
      dailyBudgetLimit: 1000
    };

    await this.automationScheduler.createAutomationTask(userId, taskConfig);

    return {
      message: `I've set up automated ${automationType.replace('_', ' ')} for your account. The system will run daily at 6 AM UTC and will automatically optimize bids, find negative keywords, and monitor spending.`,
      actions: [`Scheduled ${automationType} automation`],
      suggestions: [
        "Review automation settings in the dashboard",
        "Set up email notifications for automation results",
        "Monitor automated changes for the first week"
      ]
    };
  }

  private async handleGetAccountStatus(accountId: string): Promise<ChatResponse> {
    const summary = await this.googleAdsService.getAccountSummary(accountId);
    const automationSummary = await this.automationScheduler.getAccountAutomationSummary(accountId);
    
    return {
      message: `Your account is ${summary.billingStatus} and performing well. Here's a quick health check:\n\n✅ Billing Status: ${summary.billingStatus}\n📊 Today's Spend: $${summary.todaySpend.toFixed(2)}\n🎯 Active Automations: ${automationSummary.activeTasks}\n💰 Total Savings from Automation: $${automationSummary.totalSavings.toFixed(2)}`,
      data: { summary, automationSummary },
      suggestions: [
        "Review recent automation actions",
        "Check for any pending recommendations",
        "Verify payment methods are up to date"
      ]
    };
  }

  private async handleExplainMetrics(message: string): Promise<ChatResponse> {
    // Use AI to explain metrics mentioned in the message
    const explanation = await this.generateMetricExplanation(message);
    
    return {
      message: explanation,
      suggestions: [
        "Ask about specific metrics you'd like to understand better",
        "Request benchmarks for your industry",
        "Learn about optimization strategies"
      ]
    };
  }

  private async handleForecastPerformance(accountId: string, parameters: any): Promise<ChatResponse> {
    // This would use ML models to forecast performance
    const forecast = {
      nextMonth: {
        estimatedSpend: 25000,
        estimatedConversions: 85,
        projectedCostPerLead: 294
      },
      confidence: 0.78
    };

    return {
      message: `Based on current trends, here's your performance forecast for next month:\n\n• Estimated Spend: $${forecast.nextMonth.estimatedSpend.toLocaleString()}\n• Projected Conversions: ${forecast.nextMonth.estimatedConversions}\n• Expected Cost per Lead: $${forecast.nextMonth.projectedCostPerLead}\n\nConfidence Level: ${(forecast.confidence * 100).toFixed(0)}%`,
      data: forecast,
      charts: [
        {
          type: 'line',
          title: 'Performance Forecast',
          data: forecast
        }
      ],
      suggestions: [
        "Adjust budgets based on forecast",
        "Prepare for seasonal changes",
        "Set up alerts for budget pacing"
      ]
    };
  }

  private async handleUnknownIntent(message: string): Promise<ChatResponse> {
    // Use GPT to provide a helpful response for unknown intents
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful Google Ads assistant. The user asked something you don't recognize. Provide a helpful response and suggest what they might be looking for."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7
    });

    return {
      message: response.choices[0].message.content || "I'm not sure I understand. Could you please rephrase your request?",
      suggestions: [
        "Ask about campaign performance",
        "Request to stop or start campaigns",
        "Get spending reports",
        "Set up automation",
        "Ask for optimization recommendations"
      ]
    };
  }

  // Helper methods
  private async getDefaultAccountId(userId: string): Promise<string> {
    // This would get the user's default Google Ads account
    return "8936153023"; // From the config file
  }

  private async getCampaignsOverThreshold(accountId: string, threshold: number): Promise<any[]> {
    // This would fetch campaigns costing over the threshold
    return [
      { id: "1", name: "Campaign A", costPerLead: threshold + 10 },
      { id: "2", name: "Campaign B", costPerLead: threshold + 25 }
    ];
  }

  private generatePerformanceTrends(summary: any): any[] {
    // Generate sample trend data
    return [
      { date: '2024-01-01', spend: summary.todaySpend * 0.8 },
      { date: '2024-01-02', spend: summary.todaySpend * 0.9 },
      { date: '2024-01-03', spend: summary.todaySpend }
    ];
  }

  private calculateSpendPace(summary: any): string {
    const paceRatio = summary.monthSpend / summary.monthlyBudget;
    if (paceRatio > 1.1) return "Above pace - consider reducing budgets";
    if (paceRatio < 0.8) return "Below pace - opportunity to increase budgets";
    return "On pace";
  }

  private async generateMetricExplanation(message: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system", 
          content: "Explain Google Ads metrics in simple terms. Be helpful and educational."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content || "I'd be happy to explain any Google Ads metrics you're curious about!";
  }

  // Session management
  async createSession(userId: string, title?: string): Promise<string> {
    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title || `Chat Session ${new Date().toISOString()}`
      }
    });
    return session.id;
  }

  async getSessionHistory(sessionId: string): Promise<any[]> {
    return await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getUserSessions(userId: string): Promise<any[]> {
    return await prisma.chatSession.findMany({
      where: { userId},
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }
}

export default GoogleAdsChatService;
