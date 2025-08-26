import { useState, useCallback, useMemo } from 'react'
import { DateRange } from 'react-day-picker'

export interface DateRangeState {
  preset: string
  customRange?: DateRange
  comparisonEnabled: boolean
}

export interface DateRangeParams {
  startDate?: string
  endDate?: string
  dateRange?: string
}

export function useDateRange(initialPreset: string = 'last_7_days') {
  const [state, setState] = useState<DateRangeState>({
    preset: initialPreset,
    customRange: undefined,
    comparisonEnabled: false,
  })

  // Calculate actual date range based on preset or custom range
  const currentRange = useMemo(() => {
    if (state.preset === 'custom' && state.customRange) {
      return {
        from: state.customRange.from,
        to: state.customRange.to || state.customRange.from,
      }
    }

    // Calculate preset dates
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (state.preset) {
      case 'today':
        return { from: today, to: today }
      
      case 'yesterday': {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return { from: yesterday, to: yesterday }
      }
      
      case 'last_7_days': {
        const last7Days = new Date(today)
        last7Days.setDate(last7Days.getDate() - 7)
        return { from: last7Days, to: today }
      }
      
      case 'last_30_days': {
        const last30Days = new Date(today)
        last30Days.setDate(last30Days.getDate() - 30)
        return { from: last30Days, to: today }
      }
      
      case 'this_month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: startOfMonth, to: today }
      }
      
      case 'last_month': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        return { from: startOfLastMonth, to: endOfLastMonth }
      }
      
      default:
        return { from: today, to: today }
    }
  }, [state.preset, state.customRange])

  // Calculate previous period for comparison
  const previousRange = useMemo(() => {
    if (!state.comparisonEnabled || !currentRange.from || !currentRange.to) {
      return null
    }

    const daysDiff = Math.ceil(
      (currentRange.to.getTime() - currentRange.from.getTime()) / (1000 * 60 * 60 * 24)
    )

    const previousEnd = new Date(currentRange.from)
    previousEnd.setDate(previousEnd.getDate() - 1)
    
    const previousStart = new Date(previousEnd)
    previousStart.setDate(previousStart.getDate() - daysDiff)

    return { from: previousStart, to: previousEnd }
  }, [currentRange, state.comparisonEnabled])

  // Generate API parameters
  const apiParams = useMemo((): DateRangeParams => {
    if (state.preset === 'custom' && currentRange.from && currentRange.to) {
      return {
        startDate: currentRange.from.toISOString().split('T')[0],
        endDate: currentRange.to.toISOString().split('T')[0],
      }
    }

    return {
      dateRange: state.preset,
    }
  }, [state.preset, currentRange])

  // Generate API parameters for previous period
  const previousApiParams = useMemo((): DateRangeParams | null => {
    if (!state.comparisonEnabled || !previousRange) {
      return null
    }

    return {
      startDate: previousRange.from.toISOString().split('T')[0],
      endDate: previousRange.to.toISOString().split('T')[0],
    }
  }, [state.comparisonEnabled, previousRange])

  const setPreset = useCallback((preset: string) => {
    setState(prev => ({ ...prev, preset, customRange: undefined }))
  }, [])

  const setCustomRange = useCallback((range: DateRange | undefined) => {
    setState(prev => ({ ...prev, customRange: range }))
  }, [])

  const setComparisonEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, comparisonEnabled: enabled }))
  }, [])

  return {
    // State
    preset: state.preset,
    customRange: state.customRange,
    comparisonEnabled: state.comparisonEnabled,
    
    // Calculated ranges
    currentRange,
    previousRange,
    
    // API parameters
    apiParams,
    previousApiParams,
    
    // Actions
    setPreset,
    setCustomRange,
    setComparisonEnabled,
  }
}
