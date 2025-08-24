import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Textarea } from './textarea';
import { Badge } from './badge';
import { Loader2, Play, Square, RefreshCw, Maximize2, Minimize2, X } from 'lucide-react';

interface EmbeddedBrowserProps {
  onClose?: () => void;
}

export function EmbeddedBrowser({ onClose }: EmbeddedBrowserProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const addOutput = (message: string) => {
    setOutput(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const scrollToBottom = () => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [output]);

  const executeCommand = async () => {
    if (!command.trim()) return;

    setIsRunning(true);
    setStatus('running');
    setOutput([]);
    addOutput('🚀 Starting CUA automation...');

    try {
      const response = await fetch('/api/cua/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command.trim(),
          description: description.trim(),
          userId: 'current-user-id',
          metadata: {}
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      addOutput(`✅ Command executed successfully`);
      
      if (result && result.result) {
        addOutput(`📊 Result: ${result.result.message || 'Command completed'}`);
        
        if (result.result.type === 'python_automation') {
          addOutput(`🐍 Python output: ${result.result.pythonOutput?.stdout || 'No output'}`);
          if (result.result.pythonOutput?.stderr) {
            addOutput(`⚠️ Python errors: ${result.result.pythonOutput.stderr}`);
          }
        }
      } else {
        addOutput(`📊 Result: ${JSON.stringify(result)}`);
      }

      setStatus('completed');
    } catch (error) {
      addOutput(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  const stopExecution = () => {
    setIsRunning(false);
    setStatus('idle');
    addOutput('⏹️ Execution stopped by user');
  };

  const clearOutput = () => {
    setOutput([]);
    setStatus('idle');
  };

  const quickCommands = [
    { label: 'Audit Campaign', command: 'Audit my B2B Lead Gen campaign performance', description: 'Check campaign metrics and provide insights' },
    { label: 'Check Performance', command: 'Show me the current conversion rates and budget utilization', description: 'Get real-time performance data' },
    { label: 'Campaign Overview', command: 'Navigate to campaigns overview and show me all active campaigns', description: 'Display campaign summary' },
  ];

  const cardClasses = isFullscreen
    ? 'fixed inset-0 z-50 m-0 rounded-none'
    : 'w-full h-[600px]';

  return (
    <Card className={cardClasses}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary">CUA Agent</Badge>
            Embedded Browser Automation
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Command Input */}
        <div className="space-y-2">
          <Input
            placeholder="Enter your command (e.g., 'Audit my campaign performance')"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isRunning}
            className="font-mono"
          />
          <Textarea
            placeholder="Additional description or context (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isRunning}
            className="h-16"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={executeCommand}
            disabled={isRunning || !command.trim()}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Execute
              </>
            )}
          </Button>
          
          {isRunning && (
            <Button variant="outline" onClick={stopExecution}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
          
          <Button variant="outline" onClick={clearOutput}>
            <RefreshCw className="h-4 w-4" />
            Clear
          </Button>
        </div>

        {/* Quick Commands */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Quick Commands:</p>
          <div className="grid grid-cols-1 gap-2">
            {quickCommands.map((qc, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setCommand(qc.command);
                  setDescription(qc.description);
                }}
                disabled={isRunning}
                className="justify-start text-left h-auto p-3"
              >
                <div>
                  <div className="font-medium">{qc.label}</div>
                  <div className="text-xs text-muted-foreground">{qc.command}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Status and Output */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={
              status === 'idle' ? 'secondary' :
              status === 'running' ? 'default' :
              status === 'completed' ? 'default' :
              'destructive'
            }>
              {status.toUpperCase()}
            </Badge>
            {output.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {output.length} messages
              </span>
            )}
          </div>
          
          <div
            ref={outputRef}
            className="bg-black text-green-400 font-mono text-xs p-3 rounded h-48 overflow-auto border"
          >
            {output.length === 0 ? (
              <div className="text-muted-foreground">
                Ready to execute commands. The browser automation will run here and show real-time output.
              </div>
            ) : (
              output.map((message, index) => (
                <div key={index} className="mb-1">
                  {message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How it works:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Enter a command describing what you want to do with Google Ads</li>
            <li>The system will automatically open a browser and navigate to Google Ads</li>
            <li>You'll need to login to your Google Ads account when prompted</li>
            <li>The automation will execute your command and show results in real-time</li>
            <li>DO NOT close the browser window manually - it will close automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
