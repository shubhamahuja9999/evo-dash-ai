import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Terminal, Play, RefreshCw, Pause, X, Maximize2, Minimize2 } from 'lucide-react';

interface EmbeddedAutomationProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  automationType: 'cua' | 'campaign-fetch';
  title?: string;
}

export function EmbeddedAutomation({
  isOpen,
  onClose,
  onMinimize,
  isMinimized,
  automationType,
  title = 'Automation Window'
}: EmbeddedAutomationProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [output, setOutput] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of output when new lines are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);
  
  // Function to start automation
  const startAutomation = async () => {
    setStatus('running');
    setOutput(prev => [...prev, '🚀 Starting automation...']);
    
    try {
      const scriptName = automationType === 'cua' ? 'cua_automation.py' : 'fetch_campaigns.py';
      const response = await fetch(`/api/cua/automation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          script: scriptName,
          command: automationType === 'cua' ? 'run_automation' : 'fetch_data'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      // Handle Server-Sent Events for real-time output
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body reader not available');
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Process all complete lines
        if (lines.length > 1) {
          buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.type === 'output') {
                  setOutput(prev => [...prev, data.content]);
                } else if (data.type === 'status') {
                  setStatus(data.content as any);
                }
              } catch (e) {
                // If it's not JSON, just add as plain text
                setOutput(prev => [...prev, line]);
              }
            }
          }
        }
      }
      
      setStatus('completed');
      setOutput(prev => [...prev, '✅ Automation completed successfully!']);
      
    } catch (error) {
      console.error('Automation error:', error);
      setStatus('error');
      setOutput(prev => [...prev, `❌ Error: ${error.message}`]);
    }
  };
  
  // Function to stop automation
  const stopAutomation = async () => {
    try {
      await fetch(`/api/cua/automation/stop`, {
        method: 'POST',
      });
      setStatus('idle');
      setOutput(prev => [...prev, '⏹️ Automation stopped by user']);
    } catch (error) {
      console.error('Error stopping automation:', error);
    }
  };
  
  // Function to clear output
  const clearOutput = () => {
    setOutput([]);
  };
  
  if (!isOpen) return null;
  
  const cardClasses = isFullscreen 
    ? 'fixed inset-0 z-50 m-0 rounded-none overflow-hidden' 
    : isMinimized 
      ? 'fixed bottom-4 right-4 w-64 h-12 z-50 overflow-hidden cursor-pointer'
      : 'fixed bottom-4 right-4 w-[500px] h-[400px] z-50 overflow-hidden';
  
  // Minimized view
  if (isMinimized) {
    return (
      <Card className={cardClasses} onClick={onMinimize}>
        <div className="flex items-center justify-between p-2 bg-primary/10">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span className="text-sm font-medium truncate">
              {automationType === 'cua' ? 'CUA Automation' : 'Campaign Fetch'} 
              {status === 'running' && ' - Running...'}
            </span>
          </div>
          <Badge variant={status === 'running' ? 'default' : status === 'completed' ? 'success' : status === 'error' ? 'destructive' : 'outline'}>
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
            <Terminal className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>
            {automationType === 'cua' 
              ? 'Command User Access Automation' 
              : 'Google Ads Campaign Data Fetch'}
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
      
      <CardContent className="p-4 pt-0">
        <Tabs defaultValue="output" className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
          </TabsList>
          
          <TabsContent value="output" className="mt-0">
            <div 
              ref={outputRef}
              className="bg-black text-green-400 font-mono text-xs p-3 rounded overflow-auto"
              style={{ height: isFullscreen ? 'calc(100vh - 180px)' : '250px' }}
            >
              {output.length === 0 ? (
                <div className="text-gray-500 italic">No output yet. Start automation to see results here.</div>
              ) : (
                output.map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="controls" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Script</h4>
                  <div className="text-sm bg-muted p-2 rounded">
                    {automationType === 'cua' ? 'cua_automation.py' : 'fetch_campaigns.py'}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <Badge variant={
                    status === 'running' ? 'default' : 
                    status === 'completed' ? 'success' : 
                    status === 'error' ? 'destructive' : 
                    'outline'
                  }>
                    {status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {automationType === 'cua' 
                    ? 'This automation will open a browser window to manage Google Ads user access permissions and perform security audits.'
                    : 'This script will fetch campaign data from Google Ads API and update the dashboard with the latest information.'}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between">
        <div>
          {status === 'running' ? (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={stopAutomation}
              className="gap-1"
            >
              <Pause className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              onClick={startAutomation}
              disabled={status === 'running'}
              className="gap-1"
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearOutput}
            disabled={output.length === 0}
            className="gap-1"
          >
            Clear
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setOutput(prev => [...prev, '🔄 Refreshing...'])}
            disabled={status === 'running'}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
