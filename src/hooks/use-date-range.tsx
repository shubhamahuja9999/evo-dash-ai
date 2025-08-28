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

  // Helper function to get start of day
  const getStartOfDay = (date: Date): Date => {
    const newDate = new Date(date)
    newDate.setHours(0, 0, 0, 0)
    return newDate
  }

  // Helper function to get end of day
  const getEndOfDay = (date: Date): Date => {
    const newDate = new Date(date)
    newDate.setHours(23, 59, 59, 999)
    return newDate
  }

  // Calculate actual date range based on preset or custom range
  const currentRange = useMemo(() => {
    const now = new Date()
    const today = getStartOfDay(now)

    if (state.preset === 'custom' && state.customRange?.from) {
      return {
        from: getStartOfDay(state.customRange.from),
        to: getEndOfDay(state.customRange.to || state.customRange.from),
      }
    }

    switch (state.preset) {
      case 'today':
        return { from: today, to: getEndOfDay(today) }
      
      case 'yesterday': {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return { from: getStartOfDay(yesterday), to: getEndOfDay(yesterday) }
      }
      
      case 'last_7_days': {
        const last7Days = new Date(today)
        last7Days.setDate(last7Days.getDate() - 6) // -6 because we want last 7 days including today
        return { from: getStartOfDay(last7Days), to: getEndOfDay(today) }
      }
      
      case 'last_30_days': {
        const last30Days = new Date(today)
        last30Days.setDate(last30Days.getDate() - 29) // -29 because we want last 30 days including today
        return { from: getStartOfDay(last30Days), to: getEndOfDay(today) }
      }
      
      case 'this_month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: getStartOfDay(startOfMonth), to: getEndOfDay(today) }
      }
      
      case 'last_month': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        return { from: getStartOfDay(startOfLastMonth), to: getEndOfDay(endOfLastMonth) }
      }
      
      default:
        return { from: today, to: getEndOfDay(today) }
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

  // Helper function to format date without timezone issues
  const formatLocalDate = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Generate API parameters
  const apiParams = useMemo((): DateRangeParams => {
    if (state.preset === 'custom' && currentRange.from && currentRange.to) {
      return {
        startDate: formatLocalDate(currentRange.from),
        endDate: formatLocalDate(currentRange.to),
      }
    }

    return {
      dateRange: state.preset,
    }
  }, [state.preset, currentRange, formatLocalDate])

  // Generate API parameters for previous period
  const previousApiParams = useMemo((): DateRangeParams | null => {
    if (!state.comparisonEnabled || !previousRange) {
      return null
    }

    return {
      startDate: formatLocalDate(previousRange.from),
      endDate: formatLocalDate(previousRange.to),
    }
  }, [state.comparisonEnabled, previousRange, formatLocalDate])

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
