import OpenAI from 'openai';

// Try to get API key from different sources
const apiKey = process.env.OPENAI_API_KEY;

// Check if API key is available
if (!apiKey) {
  console.warn('WARNING: OpenAI API key is missing. Set OPENAI_API_KEY environment variable.');
}

const openai = new OpenAI({
  apiKey: apiKey || 'dummy_key_for_development',
});

export const generateAIResponse = async (
  userMessage: string,
  context: {
    campaignData?: any;
    analyticsData?: any;
    temperature?: number;
    max_tokens?: number;
  } = {}
) => {
  try {
    const systemPrompt = `You are an advanced AI Campaign Optimization Assistant powered by GPT-5 for a digital marketing dashboard.
Your role is to help users optimize their marketing campaigns by providing sophisticated data-driven insights and actionable recommendations.
You have access to campaign performance data and analytics which you should analyze thoroughly.

Key responsibilities:
- Perform deep analysis of campaign performance metrics and identify hidden patterns
- Provide precise budget optimization suggestions with projected ROI improvements
- Identify targeting improvements based on audience segmentation analysis
- Recommend advanced A/B testing strategies with statistical significance calculations
- Explain complex trends and patterns in the data with clear visualizations
- Automate campaign adjustments based on performance thresholds
- Predict future campaign performance using historical data patterns
- Generate ready-to-implement action plans for campaign optimization

When analyzing data:
1. Look for correlations between metrics that might not be immediately obvious
2. Consider seasonality and external market factors that might impact performance
3. Identify statistical anomalies that require further investigation
4. Provide confidence intervals for your predictions and recommendations

Always be specific and data-driven in your responses. If you have access to campaign data, reference it in your answers.
Present information in a structured, actionable format with clear prioritization of recommendations.
Balance technical depth with clarity - explain complex concepts in accessible terms.`;

    const contextStr = context.campaignData 
      ? `\nCurrent campaign data: ${JSON.stringify(context.campaignData, null, 2)}`
      : '';

    const analyticsStr = context.analyticsData
      ? `\nAnalytics data: ${JSON.stringify(context.analyticsData, null, 2)}`
      : '';

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt + contextStr + analyticsStr },
        { role: "user", content: userMessage }
      ],
      temperature: context.temperature !== undefined ? context.temperature : 0.7,
      max_tokens: context.max_tokens !== undefined ? context.max_tokens : 1000,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response.";
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // More detailed error reporting
    let errorMessage = "I apologize, but I'm having trouble connecting to my AI services right now. Please try again later.";
    
    if (error.status === 401) {
      errorMessage = "Authentication error: Please check your OpenAI API key.";
    } else if (error.status === 429) {
      errorMessage = "Rate limit exceeded: The system has reached its request limit. Please try again later.";
    } else if (error.status === 500) {
      errorMessage = "OpenAI server error: The AI service is currently experiencing issues. Please try again later.";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    console.error('Detailed error:', errorMessage);
    return errorMessage;
  }
};
