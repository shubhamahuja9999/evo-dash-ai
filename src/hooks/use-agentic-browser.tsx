import { useState, useEffect, useCallback, useRef } from 'react';

interface Goal {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
}

interface ExecutionStep {
  id: string;
  action: string;
  reasoning: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  timestamp: number;
  result?: any;
}

interface AgenticBrowserState {
  isConnected: boolean;
  isRunning: boolean;
  goals: Goal[];
  executionSteps: ExecutionStep[];
  executionLog: string[];
  overallProgress: number;
  error: string | null;
}

interface AgenticBrowserActions {
  connect: () => void;
  disconnect: () => void;
  startExecution: (userRequest: string, openaiApiKey?: string) => void;
  stopExecution: () => void;
  clearLog: () => void;
}

export function useAgenticBrowser(): AgenticBrowserState & AgenticBrowserActions {
  const [state, setState] = useState<AgenticBrowserState>({
    isConnected: false,
    isRunning: false,
    goals: [],
    executionSteps: [],
    executionLog: [],
    overallProgress: 0,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState(prev => ({
      ...prev,
      executionLog: [...prev.executionLog, `${timestamp}: ${message}`]
    }));
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connection':
          setState(prev => ({ ...prev, isConnected: true, error: null }));
          addLog('🤖 Connected to Agentic Browser Server');
          reconnectAttempts.current = 0;
          break;

        case 'execution_started':
          setState(prev => ({ 
            ...prev, 
            isRunning: true, 
            goals: [], 
            executionSteps: [], 
            overallProgress: 0 
          }));
          addLog('🚀 Execution started');
          break;

        case 'goals_identified':
          setState(prev => ({ ...prev, goals: data.goals }));
          addLog(`🎯 Identified ${data.goals.length} goals`);
          break;

        case 'goal_started':
          setState(prev => ({
            ...prev,
            goals: prev.goals.map(goal =>
              goal.id === data.goal_id
                ? { ...goal, status: 'in_progress' }
                : goal
            )
          }));
          addLog(`🎯 Starting: ${data.description}`);
          break;

        case 'action_started':
          const newStep: ExecutionStep = {
            id: `step_${Date.now()}`,
            action: data.action.type,
            reasoning: data.action.reasoning,
            status: 'executing',
            timestamp: Date.now()
          };
          setState(prev => ({
            ...prev,
            executionSteps: [...prev.executionSteps, newStep]
          }));
          addLog(`🔄 ${data.action.type}: ${data.action.reasoning}`);
          break;

        case 'action_completed':
          setState(prev => ({
            ...prev,
            executionSteps: prev.executionSteps.map(step =>
              step.action === data.action && step.status === 'executing'
                ? { ...step, status: data.success ? 'completed' : 'failed', result: data.data }
                : step
            )
          }));
          
          if (data.success) {
            addLog(`✅ ${data.action} completed`);
          } else {
            addLog(`❌ ${data.action} failed: ${data.error}`);
          }
          break;

        case 'goal_completed':
          setState(prev => ({
            ...prev,
            goals: prev.goals.map(goal =>
              goal.id === data.goal_id
                ? { ...goal, status: data.success ? 'completed' : 'failed', progress: 100 }
                : goal
            ),
            overallProgress: data.overall_progress
          }));
          
          if (data.success) {
            addLog(`✅ Goal completed`);
          } else {
            addLog(`❌ Goal failed`);
          }
          break;

        case 'execution_completed':
          setState(prev => ({ ...prev, isRunning: false }));
          if (data.success) {
            addLog('🎉 All goals completed successfully!');
          } else {
            addLog(`⚠️ Execution completed with ${data.summary.failed_goals} failed goals`);
          }
          break;

        case 'execution_failed':
          setState(prev => ({ ...prev, isRunning: false, error: data.error }));
          addLog(`❌ Execution failed: ${data.error}`);
          break;

        case 'execution_stopped':
          setState(prev => ({ ...prev, isRunning: false }));
          addLog('⏹️ Execution stopped by user');
          break;

        case 'log':
          addLog(data.message);
          break;

        case 'error':
          setState(prev => ({ ...prev, error: data.message }));
          addLog(`❌ Error: ${data.message}`);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [addLog]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false }));
        
        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            addLog(`🔄 Reconnecting... (attempt ${reconnectAttempts.current})`);
            connect();
          }, delay);
        } else {
          addLog('❌ Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ ...prev, error: 'Failed to connect to server' }));
    }
  }, [handleMessage, addLog]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  const startExecution = useCallback((userRequest: string, openaiApiKey?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'Not connected to server' }));
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'start_execution',
      user_request: userRequest,
      openai_api_key: openaiApiKey
    }));
  }, []);

  const stopExecution = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'stop_execution'
    }));
  }, []);

  const clearLog = useCallback(() => {
    setState(prev => ({
      ...prev,
      executionLog: [],
      goals: [],
      executionSteps: [],
      overallProgress: 0,
      error: null
    }));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    startExecution,
    stopExecution,
    clearLog,
  };
}
