import OpenAI from 'openai';

// Try to get API key from different sources
const apiKey = import.meta.env.OPENAI_API_KEY || 
               import.meta.env.VITE_OPENAI_API_KEY;

// Check if API key is available
if (!apiKey) {
  console.warn('WARNING: OpenAI API key is missing. Set OPENAI_API_KEY environment variable.');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey || 'dummy_key_for_development',
  dangerouslyAllowBrowser: true, // Allow usage in browser environment
});

// Type definitions for CUA
export interface ComputerAction {
  type: string;
  [key: string]: any;
}

export interface ComputerCall {
  type: 'computer_call';
  id: string;
  call_id: string;
  action: ComputerAction;
  pending_safety_checks: Array<{
    id: string;
    code: string;
    message: string;
  }>;
  status: string;
}

export interface ReasoningItem {
  type: 'reasoning';
  id: string;
  summary: Array<{
    type: string;
    text: string;
  }>;
}

export interface ResponseOutput {
  type: string;
  id?: string;
  [key: string]: any;
}

/**
 * Sends a request to the CUA model with the given prompt and screenshot
 */
export async function sendCUARequest(
  prompt: string,
  screenshotBase64?: string,
  previousResponseId?: string,
  lastCallId?: string,
  acknowledgedSafetyChecks: Array<any> = []
) {
  try {
    // First try to use our server endpoint
    try {
      console.log('Sending CUA request to server endpoint...');
      const serverResponse = await fetch('/api/cua/interface', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          screenshot: screenshotBase64,
          responseId: previousResponseId,
          callId: lastCallId,
          safetyChecks: acknowledgedSafetyChecks,
        }),
      });
      
      if (!serverResponse.ok) {
        const errorData = await serverResponse.json();
        console.error('Server endpoint error:', errorData);
        throw new Error(errorData.error || 'Server endpoint error');
      }
      
      const responseData = await serverResponse.json();
      console.log('Server endpoint response:', responseData);
      return responseData;
    } catch (serverError) {
      console.error('Server endpoint failed, falling back to direct OpenAI API:', serverError);
      // Fall back to direct OpenAI API if server endpoint fails
    }
    
    // Direct OpenAI API call as fallback
    const requestOptions: any = {
      model: 'computer-use-preview',
      tools: [
        {
          type: 'computer_use_preview',
          display_width: 1024,
          display_height: 768,
          environment: 'browser',
        },
      ],
      reasoning: {
        summary: 'concise',
      },
      truncation: 'auto',
    };

    // If we have a previous response ID, use it
    if (previousResponseId) {
      requestOptions.previous_response_id = previousResponseId;
    }

    // Set up the input based on whether we're sending a new prompt or a screenshot
    if (lastCallId && screenshotBase64) {
      // We're sending a screenshot response to a previous action
      requestOptions.input = [
        {
          type: 'computer_call_output',
          call_id: lastCallId,
          acknowledged_safety_checks: acknowledgedSafetyChecks,
          output: {
            type: 'input_image',
            image_url: `data:image/png;base64,${screenshotBase64}`,
          },
        },
      ];
    } else {
      // We're sending a new prompt
      const inputContent: Array<any> = [
        {
          type: 'input_text',
          text: prompt,
        },
      ];

      // Add screenshot if available
      if (screenshotBase64) {
        inputContent.push({
          type: 'input_image',
          image_url: `data:image/png;base64,${screenshotBase64}`,
        });
      }

      requestOptions.input = [
        {
          role: 'user',
          content: inputContent,
        },
      ];
    }

    const response = await openai.responses.create(requestOptions);
    return response;
  } catch (error: any) {
    console.error('Error sending CUA request:', error);
    
    // More detailed error reporting
    let errorMessage = "Error connecting to OpenAI API";
    
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
    throw new Error(errorMessage);
  }
}

/**
 * Extracts computer calls from the response output
 */
export function extractComputerCalls(output: Array<ResponseOutput>): ComputerCall[] {
  return output.filter((item) => item.type === 'computer_call') as ComputerCall[];
}

/**
 * Extracts reasoning items from the response output
 */
export function extractReasoningItems(output: Array<ResponseOutput>): ReasoningItem[] {
  return output.filter((item) => item.type === 'reasoning') as ReasoningItem[];
}

/**
 * Gets the summary text from reasoning items
 */
export function getSummaryText(reasoningItems: ReasoningItem[]): string {
  if (reasoningItems.length === 0) return '';
  
  const summaries = reasoningItems
    .flatMap(item => item.summary)
    .filter(summary => summary.type === 'summary_text')
    .map(summary => summary.text);
  
  return summaries.join('\n');
}
