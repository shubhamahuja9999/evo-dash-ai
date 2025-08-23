import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateAIResponse = async (
  userMessage: string,
  context: {
    campaignData?: any;
    analyticsData?: any;
  } = {}
) => {
  try {
    const systemPrompt = `You are an AI Campaign Optimization Assistant for a digital marketing dashboard.
Your role is to help users optimize their marketing campaigns by providing data-driven insights and recommendations.
You have access to campaign performance data and analytics.

Key responsibilities:
- Analyze campaign performance metrics
- Provide budget optimization suggestions
- Identify targeting improvements
- Recommend A/B testing strategies
- Explain trends and patterns in the data

Always be specific and data-driven in your responses. If you have access to campaign data, reference it in your answers.
Keep responses concise but informative.`;

    const contextStr = context.campaignData 
      ? `\nCurrent campaign data: ${JSON.stringify(context.campaignData, null, 2)}`
      : '';

    const analyticsStr = context.analyticsData
      ? `\nAnalytics data: ${JSON.stringify(context.analyticsData, null, 2)}`
      : '';

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt + contextStr + analyticsStr },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response.";
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return "I apologize, but I'm having trouble connecting to my AI services right now. Please try again later.";
  }
};
