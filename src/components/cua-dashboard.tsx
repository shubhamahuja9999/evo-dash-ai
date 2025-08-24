import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cuaApi } from '../lib/api';
import { Terminal, Users, Shield, History, Play, AlertCircle } from 'lucide-react';

interface CUACommand {
  id: string;
  command: string;
  description?: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result?: any;
  error?: string;
  executedBy?: string;
  executedAt: string;
  completedAt?: string;
  user?: { name?: string; email?: string };
}

interface CUAUserAccess {
  id: string;
  userId: string;
  accessLevel: 'READ' | 'WRITE' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: string[];
  isActive: boolean;
  grantedAt: string;
  expiresAt?: string;
  lastAccess?: string;
  user?: { name?: string; email?: string };
  granter?: { name?: string; email?: string };
}

interface CUAAudit {
  id: string;
  auditType: 'SECURITY' | 'COMPLIANCE' | 'ACCESS_CONTROL' | 'COMMAND_EXECUTION' | 'USER_PERMISSIONS';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REQUIRES_ATTENTION';
  findings?: any;
  riskScore?: number;
  recommendations?: any;
  performedAt: string;
  completedAt?: string;
  auditor?: { name?: string; email?: string };
}

export function CUADashboard() {
  const [commands, setCommands] = useState<CUACommand[]>([]);
  const [users, setUsers] = useState<CUAUserAccess[]>([]);
  const [audits, setAudits] = useState<CUAAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCommand, setNewCommand] = useState('');
  const [commandDescription, setCommandDescription] = useState('');
  const [showPredefinedCommands, setShowPredefinedCommands] = useState(false);
  
  // Predefined commands for Python automation
  const predefinedCommands = [
    { 
      command: "run security audit", 
      description: "Perform a comprehensive security audit of user access" 
    },
    { 
      command: "optimize user access", 
      description: "Analyze and optimize user access permissions" 
    },
    { 
      command: "run cua automation", 
      description: "Execute full CUA automation with AI agent" 
    },
    { 
      command: "check inactive users", 
      description: "Identify and manage inactive user accounts" 
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [commandsData, usersData, auditsData] = await Promise.all([
        cuaApi.getCommands(),
        cuaApi.getUsers(),
        cuaApi.getAudits(),
      ]);
      setCommands(commandsData);
      setUsers(usersData);
      setAudits(auditsData);
    } catch (error) {
      console.error('Failed to load CUA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async () => {
    if (!newCommand.trim()) return;
    
    try {
      setLoading(true);
      const result = await cuaApi.executeCommand(newCommand, commandDescription);
      console.log('Command executed:', result);
      
      // Reload data to show new command
      await loadData();
      
      // Clear form
      setNewCommand('');
      setCommandDescription('');
    } catch (error) {
      console.error('Failed to execute command:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'EXECUTING': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800';
      case 'ADMIN': return 'bg-orange-100 text-orange-800';
      case 'WRITE': return 'bg-blue-100 text-blue-800';
      case 'READ': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    if (score <= 25) return 'bg-green-100 text-green-800';
    if (score <= 50) return 'bg-yellow-100 text-yellow-800';
    if (score <= 75) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CUA Dashboard</h1>
          <p className="text-muted-foreground">
            Command User Access Control and Security Management
          </p>
        </div>
      </div>

      {/* Command Execution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Execute Command
          </CardTitle>
          <CardDescription>
            Execute CUA commands to interact with the Google Ads dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Command</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g., get campaigns, get analytics, audit security"
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowPredefinedCommands(!showPredefinedCommands)}
                  title="Show predefined automation commands"
                >
                  <Terminal className="h-4 w-4" />
                </Button>
              </div>
              {showPredefinedCommands && (
                <div className="mt-2 border rounded-md p-2 bg-muted/50 space-y-1">
                  <p className="text-xs font-medium mb-1">Python CUA Automation Commands:</p>
                  {predefinedCommands.map((cmd, index) => (
                    <div 
                      key={index}
                      className="text-sm p-1 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer"
                      onClick={() => {
                        setNewCommand(cmd.command);
                        setCommandDescription(cmd.description);
                        setShowPredefinedCommands(false);
                      }}
                    >
                      <span className="font-mono">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                placeholder="What this command does..."
                value={commandDescription}
                onChange={(e) => setCommandDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button 
              onClick={executeCommand} 
              disabled={loading || !newCommand.trim()}
              className="w-full md:w-auto"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Command
                </>
              )}
            </Button>
            
            {newCommand.toLowerCase().includes('automation') || 
             newCommand.toLowerCase().includes('audit') || 
             newCommand.toLowerCase().includes('security') ? (
              <span className="text-xs text-muted-foreground hidden md:inline-block">
                This command will execute Python-based CUA automation
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="commands" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commands" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Command History
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Access
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Audits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commands" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Commands</CardTitle>
              <CardDescription>
                History of all executed CUA commands
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading commands...</div>
              ) : commands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No commands executed yet
                </div>
              ) : (
                <div className="space-y-3">
                  {commands.map((cmd) => (
                    <div key={cmd.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {cmd.command}
                        </div>
                        <Badge className={getStatusColor(cmd.status)}>
                          {cmd.status}
                        </Badge>
                      </div>
                      {cmd.description && (
                        <p className="text-sm text-muted-foreground">
                          {cmd.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Executed by: {cmd.user?.name || cmd.user?.email || 'Unknown'}</span>
                        <span>{new Date(cmd.executedAt).toLocaleString()}</span>
                      </div>
                      {cmd.error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {cmd.error}
                        </div>
                      )}
                      {cmd.result && (
                        <details className="text-sm">
                          <summary className="cursor-pointer">View Result</summary>
                          <div className="mt-2">
                            {cmd.result.type === 'python_automation' ? (
                              <div className="space-y-2">
                                <div className="bg-black text-green-400 font-mono text-xs p-3 rounded overflow-auto max-h-64">
                                  <div className="mb-2 text-white">Python CUA Automation Output:</div>
                                  {cmd.result.pythonOutput?.stdout && (
                                    <pre className="whitespace-pre-wrap">{cmd.result.pythonOutput.stdout}</pre>
                                  )}
                                  {cmd.result.pythonOutput?.stderr && (
                                    <pre className="text-red-400 whitespace-pre-wrap">{cmd.result.pythonOutput.stderr}</pre>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Executed at: {new Date(cmd.result.timestamp).toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <pre className="bg-gray-100 p-2 rounded overflow-auto">
                                {JSON.stringify(cmd.result, null, 2)}
                              </pre>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Access Control</CardTitle>
              <CardDescription>
                Current user permissions and access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No user access records found
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {user.user?.name || user.user?.email || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Granted by: {user.granter?.name || user.granter?.email || 'System'}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getAccessLevelColor(user.accessLevel)}>
                            {user.accessLevel}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Granted: {new Date(user.grantedAt).toLocaleDateString()}
                        {user.expiresAt && ` • Expires: ${new Date(user.expiresAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Audits</CardTitle>
              <CardDescription>
                Security and compliance audit results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading audits...</div>
              ) : audits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No audit records found
                </div>
              ) : (
                <div className="space-y-3">
                  {audits.map((audit) => (
                    <div key={audit.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{audit.auditType.replace('_', ' ')}</div>
                          <div className="text-sm text-muted-foreground">
                            Performed by: {audit.auditor?.name || audit.auditor?.email || 'System'}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(audit.status)}>
                            {audit.status}
                          </Badge>
                          {audit.riskScore && (
                            <Badge className={`ml-2 ${getRiskScoreColor(audit.riskScore)}`}>
                              Risk: {audit.riskScore}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(audit.performedAt).toLocaleDateString()}
                      </div>
                      {audit.findings && (
                        <details className="text-sm">
                          <summary className="cursor-pointer">View Findings</summary>
                          <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto">
                            {JSON.stringify(audit.findings, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
