import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bot, Monitor, Zap } from 'lucide-react';
import { EmbeddedBrowser } from './ui/embedded-browser';

export function CUADashboard() {
  const [showEmbeddedBrowser, setShowEmbeddedBrowser] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Computer-Using Agent</h1>
          <p className="text-muted-foreground">
            AI-powered browser automation for Google Ads management
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          GPT-4o Powered
        </Badge>
      </div>

      {/* Main Content */}
      {!showEmbeddedBrowser ? (
        <div className="grid gap-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                CUA Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The Computer-Using Agent (CUA) allows you to control Google Ads through natural language commands. 
                It can navigate the interface, extract data, and perform audits automatically.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Monitor className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-semibold">Browser Control</h3>
                  <p className="text-sm text-muted-foreground">
                    Navigate and interact with Google Ads interface
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-semibold">AI Automation</h3>
                  <p className="text-sm text-muted-foreground">
                    Execute complex tasks with natural language
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <h3 className="font-semibold">Smart Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Get insights and recommendations automatically
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowEmbeddedBrowser(true)}
                className="w-full"
                size="lg"
              >
                <Bot className="h-4 w-4 mr-2" />
                Launch Computer-Using Agent
              </Button>
            </CardContent>
          </Card>

          {/* Example Commands */}
          <Card>
            <CardHeader>
              <CardTitle>Example Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border rounded-lg">
                <p className="font-medium">"Audit my B2B Lead Gen campaign performance"</p>
                <p className="text-sm text-muted-foreground">
                  Navigate to the campaign and analyze metrics, then provide insights
                </p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <p className="font-medium">"Show me the current conversion rates and budget utilization"</p>
                <p className="text-sm text-muted-foreground">
                  Extract real-time performance data from the dashboard
                </p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <p className="font-medium">"Navigate to campaigns overview and show me all active campaigns"</p>
                <p className="text-sm text-muted-foreground">
                  Get a comprehensive view of all running campaigns
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">CUA Agent Interface</h2>
            <Button 
              variant="outline" 
              onClick={() => setShowEmbeddedBrowser(false)}
            >
              Back to Dashboard
            </Button>
          </div>
          
          <EmbeddedBrowser onClose={() => setShowEmbeddedBrowser(false)} />
        </div>
      )}
    </div>
  );
}
