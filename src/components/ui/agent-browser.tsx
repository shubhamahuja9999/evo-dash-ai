import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Input } from './input';
import { Badge } from './badge';
import { Loader2, Play, Square, RefreshCw, Maximize2, Minimize2, X, ChevronDown, ChevronUp, MonitorPlay, Bot, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  type: 'user' | 'assistant' | 'action' | 'browser';
  content: string;
  status?: 'thinking' | 'complete' | 'error';
  timestamp: number;
}

export function AgentBrowser() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBrowser, setShowBrowser] = useState(true);
  const [browserUrl, setBrowserUrl] = useState("https://ads.google.com");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Function to connect to Chrome DevTools Protocol
  const connectToChrome = async () => {
    try {
      // First check if the debugging port is available
      const response = await fetch("http://localhost:9222/json/version");
      const data = await response.json();
      
      if (data.webSocketDebuggerUrl) {
        // Close existing connection if any
        if (wsRef.current) {
          wsRef.current.close();
        }

        // Connect to Chrome DevTools Protocol
        const ws = new WebSocket(data.webSocketDebuggerUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          addMessage('browser', "Connected to Chrome DevTools", 'complete');
          
          // Get the list of targets (tabs)
          ws.send(JSON.stringify({
            id: 1,
            method: "Target.getTargets"
          }));
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          // Handle target list response
          if (message.result?.targetInfos) {
            const target = message.result.targetInfos.find(
              (t: any) => t.title === "cua_automation" || t.url.includes("ads.google.com")
            );
            
            if (target) {
              setBrowserUrl(`http://localhost:9222/devtools/page/${target.id}`);
              addMessage('browser', "Found automation browser target", 'complete');
            }
          }
        };

        ws.onerror = (error) => {
          addMessage('browser', `WebSocket error: ${error.type}`, 'error');
        };

        ws.onclose = () => {
          addMessage('browser', "Disconnected from Chrome DevTools", 'complete');
          setBrowserUrl("about:blank");
        };
      }
    } catch (error) {
      addMessage('browser', `Failed to connect to Chrome debugger: ${error}`, 'error');
    }
  };

  const addMessage = (type: Message['type'], content: string, status?: Message['status']) => {
    const newMessage: Message = {
      type,
      content,
      status,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to Chrome when browser action is needed
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'browser' && lastMessage.status === 'thinking') {
      const timer = setTimeout(() => {
        connectToChrome();
      }, 2000);
      return () => clearTimeout(timer);
    } else if (lastMessage?.type === 'browser' && lastMessage.status === 'complete') {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setBrowserUrl("about:blank");
    }
  }, [messages]);

  const handleBrowserAction = async (action: string, details: string) => {
    console.log('🌐 Browser Action:', { action, details });
    addMessage('browser', `I'll ${action} ${details}`, 'thinking');
    
    try {
      switch (action) {
        case 'search':
          console.log('🔍 Performing search:', details);
          setBrowserUrl(`https://www.google.com/search?q=${encodeURIComponent(details)}`);
          addMessage('browser', `Searching for "${details}"`, 'complete');
          break;
          
        case 'navigate':
          console.log('🚀 Navigating to:', details);
          setBrowserUrl(details.startsWith('http') ? details : `https://${details}`);
          addMessage('browser', `Navigating to ${details}`, 'complete');
          break;
          
        default:
          console.log('🤖 Sending to CUA:', { action, details });
          const response = await fetch('/api/cua/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: `${action} ${details}`,
              mode: 'browser'
            })
          });

          if (!response.ok) throw new Error(`Failed to ${action}`);
          
          const result = await response.json();
          console.log('✅ CUA Response:', result);
          addMessage('browser', `Successfully ${action}ed ${details}`, 'complete');
          return result;
      }
    } catch (error) {
      console.error('❌ Browser Action Error:', error);
      addMessage('browser', `Failed to ${action}: ${error}`, 'error');
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    console.log('💬 User Input:', input);

    // Add user message
    addMessage('user', input);
    setInput('');
    setIsThinking(true);

    try {
      console.log('🚀 Starting command processing...');
      
      // First, analyze if this needs browser mode
      console.log('📊 Analyzing mode for command:', input);
      const modeResponse = await fetch('/api/cua/analyze-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input.trim() })
      });

      const { mode, actions = [] } = await modeResponse.json();
      console.log('🔄 Mode analysis result:', { mode, actions });

      // Add thinking message
      addMessage('assistant', 'Let me help you with that...', 'thinking');

      if (mode === 'browser') {
        // Add browser intent message
        addMessage('assistant', "I'll need to use the browser for this task. Let me break it down into steps:");
        
        // Execute browser actions
        for (const action of actions) {
          await handleBrowserAction(action.type, JSON.stringify(action.params));
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between actions
        }

        // Add completion message
        addMessage('assistant', "I've completed the browser actions. Let me analyze the results...");
        
        // Get final analysis
        const analysisResponse = await fetch('/api/cua/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actions })
        });

        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();
          addMessage('assistant', analysis.result);
        }

      } else {
        // Normal mode response
        const response = await fetch('/api/cua/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: input.trim(),
            mode: 'normal'
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to get response`);
        }

        const result = await response.json();
        addMessage('assistant', result.result?.message || "I've completed the task.");
      }

    } catch (error) {
      console.error('❌ Error processing command:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        addMessage('assistant', 'I cannot connect to the server. Please make sure the server is running.', 'error');
      } else {
        addMessage('assistant', `I encountered an error: ${error}`, 'error');
      }
    } finally {
      console.log('✅ Command processing complete');
      setIsThinking(false);
    }
  };

  const renderMessage = (message: Message) => {
    const icon = message.type === 'user' ? null :
                message.type === 'assistant' ? <Bot className="h-5 w-5" /> :
                message.type === 'browser' ? <MonitorPlay className="h-5 w-5" /> :
                message.type === 'action' ? <ArrowRight className="h-5 w-5" /> : null;

    return (
      <div className={cn(
        "flex gap-3 p-4",
        message.type === 'user' ? "bg-muted/50" : "bg-background",
        message.type === 'browser' && "border-l-4 border-blue-500"
      )}>
        {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
        <div className="flex-1 space-y-2">
          <div className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            message.status === 'thinking' && "text-muted-foreground"
          )}>
            {message.content}
            {message.status === 'thinking' && (
              <Loader2 className="h-4 w-4 animate-spin inline ml-2" />
            )}
          </div>
        </div>
      </div>
    );
  };

  const cardClasses = isFullscreen
    ? 'fixed inset-0 z-50 m-0 rounded-none'
    : 'w-full min-h-[600px]';

  return (
    <Card className={cardClasses}>
      <CardContent className="p-0 grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
        {/* Left Panel - Chat Interface */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">GPT-4o Agent</Badge>
              <span className="text-sm text-muted-foreground">Computer-Using Agent</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto">
            <div className="divide-y">
              {messages.map((message, index) => (
                <div key={index}>{renderMessage(message)}</div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Send a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isThinking}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={isThinking || !input.trim()}
              >
                {isThinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Browser Preview */}
        <div className={cn(
          "border-l transition-all duration-300 bg-zinc-950",
          showBrowser ? "block" : "hidden lg:block"
        )}>
          <div className="flex items-center justify-between p-2 border-b">
            <span className="text-sm font-medium">Browser View</span>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowBrowser(!showBrowser)}
            >
              {showBrowser ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          <div ref={browserRef} className="h-[calc(100%-37px)] w-full bg-white">
            <iframe
              src={browserUrl}
              className="w-full h-full border-none"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-downloads allow-modals allow-orientation-lock allow-pointer-lock"
              allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
