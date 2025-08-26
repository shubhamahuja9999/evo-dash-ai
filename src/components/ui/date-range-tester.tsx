import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { analyticsApi } from '@/lib/api'
import { PlayCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface TestResult {
  endpoint: string
  params: any
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: any
  error?: string
}

export function DateRangeTester() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const testCases = [
    {
      name: 'Today Data',
      params: { dateRange: 'today' },
      endpoint: 'analytics'
    },
    {
      name: 'Last 7 Days',
      params: { dateRange: 'last_7_days' },
      endpoint: 'analytics'
    },
    {
      name: 'Last 30 Days',
      params: { dateRange: 'last_30_days' },
      endpoint: 'analytics'
    },
    {
      name: 'This Month',
      params: { dateRange: 'this_month' },
      endpoint: 'analytics'
    },
    {
      name: 'Custom Range',
      params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      endpoint: 'analytics'
    },
    {
      name: 'Stats - Today',
      params: { dateRange: 'today' },
      endpoint: 'stats'
    },
    {
      name: 'Stats - Last 7 Days',
      params: { dateRange: 'last_7_days' },
      endpoint: 'stats'
    },
  ]

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])

    for (const testCase of testCases) {
      const result: TestResult = {
        endpoint: `${testCase.endpoint} - ${testCase.name}`,
        params: testCase.params,
        status: 'loading'
      }

      setTestResults(prev => [...prev, result])

      try {
        let data
        if (testCase.endpoint === 'analytics') {
          data = await analyticsApi.getAnalytics(testCase.params)
        } else if (testCase.endpoint === 'stats') {
          data = await analyticsApi.getStats(testCase.params)
        }

        setTestResults(prev => prev.map(r => 
          r === result ? { ...r, status: 'success', data } : r
        ))
      } catch (error) {
        setTestResults(prev => prev.map(r => 
          r === result ? { 
            ...r, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error'
          } : r
        ))
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const testComparison = async () => {
    setIsRunning(true)
    
    const currentParams = { dateRange: 'last_7_days' }
    const previousParams = { dateRange: 'last_30_days' }

    const result: TestResult = {
      endpoint: 'Comparison Mode Test',
      params: { current: currentParams, previous: previousParams },
      status: 'loading'
    }

    setTestResults([result])

    try {
      const data = await analyticsApi.getStatsWithComparison(currentParams, previousParams)
      
      setTestResults([{ ...result, status: 'success', data }])
    } catch (error) {
      setTestResults([{ 
        ...result, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error'
      }])
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      idle: 'secondary',
      loading: 'default',
      success: 'success',
      error: 'destructive'
    } as const

    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5" />
          Date Range API Tester
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Run All Tests
          </Button>
          <Button 
            onClick={testComparison} 
            disabled={isRunning}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Test Comparison
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{result.endpoint}</span>
                </div>
                {getStatusBadge(result.status)}
              </div>
              
              <div className="text-sm text-muted-foreground mb-2">
                <strong>Params:</strong> {JSON.stringify(result.params, null, 2)}
              </div>

              {result.status === 'success' && result.data && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-sm">
                    <strong>Response:</strong>
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {result.status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-sm text-red-600">
                    <strong>Error:</strong> {result.error}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
