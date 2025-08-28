import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Bot, Play, Square, Eye, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
}



type SearchEngine = 'bing' | 'duckduckgo' | 'google';

interface EmbeddedAutomationProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  automationType: 'cua' | 'campaign-fetch' | 'agentic';
  title: string;
  defaultEngine?: SearchEngine;
}

const SEARCH_ENGINES = {
  bing: {
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    icon: '🔍'
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    icon: '🦆'
  },
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    icon: '🔎'
  }
} as const;

export function EmbeddedAutomation({
  isOpen,
  onClose,
  onMinimize,
  isMinimized,
  automationType,
  title,
  defaultEngine = 'bing'
}: EmbeddedAutomationProps) {
  const [searchEngine, setSearchEngine] = useState<SearchEngine>(defaultEngine);
  const [searchQuery, setSearchQuery] = useState('');
  const [browserUrl, setBrowserUrl] = useState<string>(SEARCH_ENGINES[defaultEngine].url);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [userRequest, setUserRequest] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);

  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show security alert when trying to access Google Ads
    if (isOpen && automationType === 'cua') {
      setShowSecurityAlert(true);
    }
  }, [isOpen, automationType]);

  useEffect(() => {
    // Auto-scroll log to bottom
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [executionLog]);

  const startExecution = async () => {
    if (!userRequest.trim()) return;
    
    setIsRunning(true);
    setExecutionLog([]);
    setGoals([]);
    setOverallProgress(0);
    
    try {
      addLog("Initializing automation...");
      
      // Try API-based execution first
      try {
        const response = await fetch('/api/automation/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            request: userRequest,
            type: automationType
          })
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Set initial goals
        if (data.goals) {
          setGoals(data.goals);
          addLog(`Identified ${data.goals.length} goals`);
        }
        
        // Start execution monitoring
        const monitorExecution = async () => {
          const statusResponse = await fetch(`/api/automation/status?id=${data.executionId}`);
          const statusData = await statusResponse.json();
          
          if (statusData.error) {
            addLog(`Error: ${statusData.error}`);
            setIsRunning(false);
            return;
          }
          
          // Update goals and progress
          if (statusData.goals) {
            setGoals(statusData.goals);
          }
          
          if (statusData.progress !== undefined) {
            setOverallProgress(statusData.progress);
          }
          
          if (statusData.log) {
            addLog(statusData.log);
          }
          
          if (statusData.status === 'completed') {
            addLog(`\nExecution completed: ${statusData.success ? 'Success!' : 'Failed'}`);
            if (statusData.summary) {
              addLog(statusData.summary);
            }
            setIsRunning(false);
          } else if (statusData.status === 'failed') {
            addLog(`\nExecution failed: ${statusData.error || 'Unknown error'}`);
            setIsRunning(false);
          } else {
            // Continue monitoring
            setTimeout(monitorExecution, 1000);
          }
        };
        
        // Start monitoring
        monitorExecution();
        
      } catch (apiError) {
        // Fallback to WebSocket if API fails
        addLog("API execution failed, trying WebSocket connection...");
        
        // Connect to WebSocket server
        const ws = new WebSocket('ws://localhost:8765');
        
        ws.onopen = () => {
          addLog("Connected to Agentic Browser Server");
          
          // Send execution request
          ws.send(JSON.stringify({
            type: 'start_execution',
            user_request: userRequest
          }));
        };
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'goals_identified':
              setGoals(data.goals);
              addLog(`Identified ${data.goals.length} goals`);
              break;
              
            case 'goal_started':
              setGoals(prev => prev.map(g => 
                g.id === data.goal_id ? { ...g, status: 'in_progress' } : g
              ));
              addLog(`Starting: ${data.description}`);
              break;
              
            case 'action_started':
              addLog(`${data.action.type}: ${data.action.reasoning}`);
              break;
              
            case 'action_completed':
              addLog(`${data.action} ${data.success ? 'completed' : 'failed'}`);
              if (!data.success && data.error?.includes('403')) {
                addLog("Detected Google Ads 403 error - switching to API-based access");
                ws.close();
                startExecution(); // Retry with API
              }
              break;
              
            case 'goal_completed':
              setGoals(prev => prev.map(g => 
                g.id === data.goal_id ? { ...g, status: data.success ? 'completed' : 'failed', progress: 100 } : g
              ));
              setOverallProgress(data.overall_progress);
              break;
              
            case 'execution_completed':
              addLog(`\nExecution completed: ${data.success ? 'Success!' : 'Failed'} (${data.summary.completed_goals}/${data.summary.total_goals} goals completed)`);
              setIsRunning(false);
              ws.close();
              break;
              
            case 'error':
              addLog(`Error: ${data.message}`);
              if (data.message.includes('403')) {
                addLog("Detected Google Ads 403 error - switching to API-based access");
                ws.close();
                startExecution(); // Retry with API
              }
              break;
          }
        };
        
        ws.onerror = (error) => {
          addLog(`WebSocket error: ${error}`);
          addLog("Falling back to API-based execution...");
          ws.close();
          startExecution(); // Retry with API
        };
        
        ws.onclose = () => {
          addLog("WebSocket connection closed");
          setIsRunning(false);
        };
      }
      
    } catch (error) {
      addLog(`Execution failed: ${error}`);
      setIsRunning(false);
    }
  };
  
  const addLog = (message: string) => {
    setExecutionLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const stopExecution = () => {
    setIsRunning(false);
    addLog("⏹️ Execution stopped by user");
  };

  if (!isOpen) return null;

  if (showSecurityAlert && automationType === 'cua') {
    return (
      <div className={cn(
        "fixed bottom-4 right-4 w-[400px] bg-background border rounded-lg shadow-lg p-4 z-50",
        isMinimized && "h-12 overflow-hidden"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Security Notice</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMinimize}
              className="h-8 w-8"
            >
              {isMinimized ? '□' : '−'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              ×
            </Button>
          </div>
        </div>

        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Due to Google's security policies, Google Ads cannot be embedded directly.
            The automation will open in a new window.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            setShowSecurityAlert(false);
            setUserRequest("Analyze my Google Ads campaign performance");
          }}>
            Use Agentic Browser
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 w-[900px] h-[700px] bg-background border rounded-lg shadow-lg overflow-hidden z-50",
      isMinimized && "h-12"
    )}>
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{title}</h3>
          {isRunning && (
            <Badge variant="secondary" className="animate-pulse">
              <Brain className="h-3 w-3 mr-1" />
              Thinking...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="h-8 w-8"
          >
            {isMinimized ? '□' : '−'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            ×
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-60px)]">
          {/* Control Panel */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex gap-2 mb-3">
              <Textarea
                placeholder="Tell the AI what you want to accomplish (e.g., 'Check my Google Ads campaign performance and suggest optimizations')"
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                className="flex-1 min-h-[60px]"
                disabled={isRunning}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={startExecution}
                  disabled={isRunning || !userRequest.trim()}
                  className="w-20"
                >
                  {isRunning ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                {isRunning && (
                  <Button
                    variant="destructive"
                    onClick={stopExecution}
                    size="sm"
                    className="w-20"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Overall Progress */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Goals Panel */}
            <div className="w-1/3 border-r p-4 overflow-y-auto">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Goals
              </h4>
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-3 rounded-lg border bg-card text-card-foreground"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant={
                          goal.status === 'completed'
                            ? 'default'
                            : goal.status === 'in_progress'
                            ? 'secondary'
                            : goal.status === 'failed'
                            ? 'destructive'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {goal.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {goal.progress}%
                      </span>
                    </div>
                    <p className="text-sm">{goal.description}</p>
                    {goal.progress > 0 && (
                      <Progress value={goal.progress} className="h-1 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Browser and Log Panel */}
            <div className="flex-1 flex flex-col">
              {/* Browser View */}
              <div className="flex-1 border-b">
                <div className="flex items-center justify-between p-2 border-b bg-muted/10">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Browser View</span>
                    <div className="flex items-center gap-1">
                      {Object.entries(SEARCH_ENGINES).map(([key, engine]) => (
                        <Button
                          key={key}
                          variant={searchEngine === key ? "default" : "ghost"}
                          size="sm"
                          onClick={() => {
                            setSearchEngine(key as SearchEngine);
                            if (searchQuery) {
                              setBrowserUrl(engine.url + encodeURIComponent(searchQuery));
                            }
                          }}
                          className="text-xs px-2"
                        >
                          {engine.icon} {engine.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const url = SEARCH_ENGINES[searchEngine].url + encodeURIComponent(searchQuery);
                            setBrowserUrl(url);
                          }
                        }}
                        className="w-64 h-8 text-sm pr-8"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => {
                          const url = SEARCH_ENGINES[searchEngine].url + encodeURIComponent(searchQuery);
                          setBrowserUrl(url);
                        }}
                      >
                        {SEARCH_ENGINES[searchEngine].icon}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="h-[300px] w-full bg-white">
                  <iframe
                    src={browserUrl}
                    className="w-full h-full border-none"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-modals allow-pointer-lock"
                    allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen"
                  />
                </div>
              </div>
              
              {/* Execution Log */}
              <div className="flex-1 p-4 overflow-hidden flex flex-col">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Execution Log
                </h4>
                <div
                  ref={logRef}
                  className="flex-1 bg-black/5 dark:bg-white/5 rounded-lg p-3 overflow-y-auto font-mono text-xs"
                >
                  {executionLog.map((log, index) => (
                    <div key={index} className="mb-1 whitespace-pre-wrap">
                      {log}
                    </div>
                  ))}
                  {executionLog.length === 0 && (
                    <div className="text-muted-foreground italic">
                      Execution log will appear here...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}