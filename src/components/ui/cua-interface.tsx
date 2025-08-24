import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Textarea } from './textarea';
import { Badge } from './badge';
import { Terminal, Play, RefreshCw, Pause, X, Maximize2, Minimize2, MonitorSmartphone } from 'lucide-react';
import { sendCUARequest, extractComputerCalls, extractReasoningItems, getSummaryText, ComputerCall } from '../../lib/cua';
import { executeAction, takeScreenshot, navigateTo, initBrowser, closeBrowser } from '../../lib/browser-automation';

interface CUAInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  title?: string;
}

export function CUAInterface({
  isOpen,
  onClose,
  onMinimize,
  isMinimized,
  title = 'Computer-Using Agent'
}: CUAInterfaceProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [output, setOutput] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [lastCallId, setLastCallId] = useState<string | null>(null);
  const [pendingSafetyChecks, setPendingSafetyChecks] = useState<any[]>([]);
  const [acknowledgedSafetyChecks, setAcknowledgedSafetyChecks] = useState<any[]>([]);
  
  const outputRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of output when new lines are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);
  
  // Clean up browser on unmount
  useEffect(() => {
    return () => {
      closeBrowser().catch(console.error);
    };
  }, []);
  
  // Function to start the CUA process
  const startCUA = async () => {
    if (!prompt.trim()) {
      setOutput(prev => [...prev, '⚠️ Please enter a prompt to start the CUA.']);
      return;
    }
    
    setStatus('running');
    setOutput(prev => [...prev, '🚀 Starting Computer-Using Agent...']);
    setOutput(prev => [...prev, '👤 Note: You will need to login to your Google account when prompted']);
    setOutput(prev => [...prev, '🔒 Complete any 2FA verification if required']);
    setOutput(prev => [...prev, '⏳ The automation will continue after login is complete']);
    setOutput(prev => [...prev, '⚠️ IMPORTANT: DO NOT CLOSE THE BROWSER WINDOW MANUALLY']);
    setIsProcessing(true);
    
    try {
      // Initialize browser
      setOutput(prev => [...prev, '🌐 Initializing browser...']);
      await initBrowser();
      
      // Take initial screenshot
      const screenshotBuffer = await takeScreenshot();
      const screenshotBase64 = screenshotBuffer?.toString('base64');
      
      if (!screenshotBase64) {
        throw new Error('Failed to take initial screenshot');
      }
      
      // Send initial request to CUA
      setOutput(prev => [...prev, '📤 Sending request to Computer-Using Agent...']);
      const response = await sendCUARequest(prompt, screenshotBase64);
      
      // Store response ID for future requests
      setPreviousResponseId(response.id);
      
      // Process the response
      await processCUAResponse(response);
      
    } catch (error) {
      console.error('CUA error:', error);
      setStatus('error');
      setOutput(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to process CUA response
  const processCUAResponse = async (response: any) => {
    // Extract computer calls and reasoning items
    const computerCalls = extractComputerCalls(response.output);
    const reasoningItems = extractReasoningItems(response.output);
    
    // Get summary text from reasoning items
    const summaryText = getSummaryText(reasoningItems);
    if (summaryText) {
      setOutput(prev => [...prev, `💭 ${summaryText}`]);
    }
    
    // If there are no computer calls, we're done
    if (computerCalls.length === 0) {
      // Check if there's a text response
      const textResponses = response.output.filter(item => item.type === 'text');
      if (textResponses.length > 0) {
        setOutput(prev => [...prev, `🤖 ${textResponses[0].text}`]);
      }
      
      setStatus('completed');
      setOutput(prev => [...prev, '✅ CUA task completed.']);
      return;
    }
    
    // Process the first computer call
    const computerCall = computerCalls[0];
    setLastCallId(computerCall.call_id);
    
    // Check for safety checks
    if (computerCall.pending_safety_checks && computerCall.pending_safety_checks.length > 0) {
      setPendingSafetyChecks(computerCall.pending_safety_checks);
      setOutput(prev => [...prev, '⚠️ Safety check required. Please review and acknowledge.']);
      
      // Display safety check messages
      computerCall.pending_safety_checks.forEach(check => {
        setOutput(prev => [...prev, `🔒 ${check.code}: ${check.message}`]);
      });
      
      return;
    }
    
    // Execute the action
    const action = computerCall.action;
    setOutput(prev => [...prev, `🖱️ Executing action: ${action.type}`]);
    
    try {
      await executeAction(action);
      
      // Take a screenshot after the action
      const screenshotBuffer = await takeScreenshot();
      const screenshotBase64 = screenshotBuffer?.toString('base64');
      
      if (!screenshotBase64) {
        throw new Error('Failed to take screenshot after action');
      }
      
      // Send the screenshot back to CUA
      setOutput(prev => [...prev, '📤 Sending screenshot to Computer-Using Agent...']);
      const nextResponse = await sendCUARequest(
        '',
        screenshotBase64,
        response.id,
        computerCall.call_id,
        acknowledgedSafetyChecks
      );
      
      // Store response ID for future requests
      setPreviousResponseId(nextResponse.id);
      
      // Clear acknowledged safety checks
      setAcknowledgedSafetyChecks([]);
      
      // Process the next response
      await processCUAResponse(nextResponse);
      
    } catch (error) {
      console.error('Error executing action:', error);
      setStatus('error');
      setOutput(prev => [...prev, `❌ Error executing action: ${error.message}`]);
    }
  };
  
  // Function to acknowledge safety checks
  const acknowledgeSafetyChecks = () => {
    setAcknowledgedSafetyChecks(pendingSafetyChecks);
    setPendingSafetyChecks([]);
    setOutput(prev => [...prev, '✅ Safety checks acknowledged. Continuing...']);
    
    // Continue processing with the acknowledged safety checks
    if (previousResponseId && lastCallId) {
      takeScreenshot()
        .then(screenshotBuffer => {
          if (!screenshotBuffer) {
            throw new Error('Failed to take screenshot');
          }
          
          const screenshotBase64 = screenshotBuffer.toString('base64');
          
          return sendCUARequest(
            '',
            screenshotBase64,
            previousResponseId,
            lastCallId,
            pendingSafetyChecks
          );
        })
        .then(response => {
          setPreviousResponseId(response.id);
          return processCUAResponse(response);
        })
        .catch(error => {
          console.error('Error after acknowledging safety checks:', error);
          setStatus('error');
          setOutput(prev => [...prev, `❌ Error: ${error.message}`]);
        });
    }
  };
  
  // Function to stop CUA
  const stopCUA = async () => {
    setStatus('idle');
    setOutput(prev => [...prev, '⏹️ CUA stopped by user.']);
  };
  
  // Function to clear output
  const clearOutput = () => {
    setOutput([]);
  };
  
  // Function to navigate to a URL
  const navigateToUrl = async () => {
    if (!currentUrl) {
      setOutput(prev => [...prev, '⚠️ Please enter a URL.']);
      return;
    }
    
    try {
      setOutput(prev => [...prev, `🌐 Navigating to ${currentUrl}...`]);
      await navigateTo(currentUrl);
      setOutput(prev => [...prev, `✅ Navigated to ${currentUrl}.`]);
    } catch (error) {
      console.error('Navigation error:', error);
      setOutput(prev => [...prev, `❌ Error navigating to ${currentUrl}: ${error.message}`]);
    }
  };
  
  if (!isOpen) return null;
  
  const cardClasses = isFullscreen 
    ? 'fixed inset-0 z-50 m-0 rounded-none overflow-auto' 
    : isMinimized 
      ? 'fixed bottom-4 right-4 w-64 h-12 z-50 overflow-hidden cursor-pointer'
      : 'fixed bottom-4 right-4 w-[600px] h-[600px] z-50 overflow-auto';
  
  // Minimized view
  if (isMinimized) {
    return (
      <Card className={cardClasses} onClick={onMinimize}>
        <div className="flex items-center justify-between p-2 bg-primary/10">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4" />
            <span className="text-sm font-medium truncate">
              Computer-Using Agent
              {status === 'running' && ' - Running...'}
            </span>
          </div>
          <Badge variant={status === 'running' ? 'default' : status === 'completed' ? 'default' : status === 'error' ? 'destructive' : 'outline'}>
            {status}
          </Badge>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={cardClasses}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>
            OpenAI Computer-Using Agent
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMinimize}
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Textarea 
            placeholder="Enter URL to navigate to..."
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            className="h-10 min-h-0 py-2"
          />
          <Button 
            onClick={navigateToUrl}
            disabled={isProcessing || !currentUrl}
            className="shrink-0"
          >
            Go
          </Button>
        </div>
        
        <div 
          ref={outputRef}
          className="bg-black text-green-400 font-mono text-xs p-3 rounded overflow-auto"
          style={{ height: isFullscreen ? 'calc(100vh - 280px)' : '200px' }}
        >
          {output.length === 0 ? (
            <div className="text-gray-500">
              <p className="mb-2 italic">No output yet. Start the Computer-Using Agent to see results here.</p>
              <p className="mb-1">⚠️ Important Notes:</p>
              <ul className="list-disc pl-4">
                <li className="mb-1">The agent opens a fresh Chrome instance that requires login</li>
                <li className="mb-1">You will need to login to Google Ads when prompted</li>
                <li className="mb-1">Complete any 2FA verification if required</li>
                <li className="mb-1">The automation will continue after login is complete</li>
              </ul>
            </div>
          ) : (
            output.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap mb-1">
                {line}
              </div>
            ))
          )}
        </div>
        
        <Textarea 
          placeholder="Enter instructions for the Computer-Using Agent..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isProcessing}
          className="h-16 min-h-0"
        />
      </CardContent>
      
      {/* Quick Test Buttons */}
      <div className="px-4 pb-2 border-t border-gray-200 dark:border-gray-800 mt-2 pt-3">
        <p className="text-sm font-medium mb-3 text-primary">Quick Tests:</p>
        <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1">
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start text-left h-auto py-2"
            onClick={() => {
              setPrompt("Login to Google Ads and wait for the dashboard to load");
              setCurrentUrl("https://ads.google.com");
            }}
            disabled={isProcessing}
          >
            Login to Google Ads
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start text-left h-auto py-2"
            onClick={() => {
              setPrompt("Navigate to Google Ads dashboard and then to the User Access section");
              setCurrentUrl("https://ads.google.com");
            }}
            disabled={isProcessing}
          >
            Test Google Ads
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start text-left h-auto py-2"
            onClick={() => {
              setPrompt("Navigate to Google Ads account settings and access management");
              setCurrentUrl("https://ads.google.com/aw/settings/account/access");
            }}
            disabled={isProcessing}
          >
            Test Account Access
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start text-left h-auto py-2"
            onClick={() => {
              setPrompt("Navigate to Google and search for 'digital marketing automation'");
              setCurrentUrl("https://www.google.com");
            }}
            disabled={isProcessing}
          >
            Test Google Search
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start text-left h-auto py-2"
            onClick={() => {
              setPrompt("Check if the OpenAI API key is working correctly");
            }}
            disabled={isProcessing}
          >
            Test API Key
          </Button>
        </div>
      </div>
      
      <CardFooter className="p-4 pt-0 flex justify-between">
        <div className="flex gap-2">
          {status === 'running' ? (
            <Button 
              variant="destructive" 
              onClick={stopCUA}
              disabled={isProcessing}
              className="gap-1"
            >
              <Pause className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button 
              variant="default" 
              onClick={startCUA}
              disabled={isProcessing || !prompt.trim()}
              className="gap-1"
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
          )}
          
          {pendingSafetyChecks.length > 0 && (
            <Button 
              variant="outline" 
              onClick={acknowledgeSafetyChecks}
              className="gap-1"
            >
              Acknowledge Safety Checks
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={clearOutput}
            disabled={output.length === 0 || isProcessing}
            className="gap-1"
          >
            Clear
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
