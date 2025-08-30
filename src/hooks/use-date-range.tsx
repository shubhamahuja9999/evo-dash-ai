import { useState, useCallback, useMemo, useEffect } from 'react'
import { DateRange } from 'react-day-picker'
import { api } from '@/lib/api'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'

export interface DateRangeState {
  preset: string
  customRange?: DateRange
  comparisonEnabled: boolean
  dataDateRange?: { startDate: Date; endDate: Date }
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
    dataDateRange: undefined
  })

  // Fetch available date range from API
  useEffect(() => {
    api.get('/api/campaign-metrics/date-range')
      .then(response => {
        const startDate = parseISO(response.data.startDate)
        const endDate = parseISO(response.data.endDate)
        setState(prev => ({
          ...prev,
          dataDateRange: { startDate, endDate }
        }))
      })
      .catch(error => {
        console.error('Error fetching date range:', error)
      })
  }, [])

  // Helper function to get start of day in local timezone
  const getStartOfDay = useCallback((date: Date): Date => {
    return startOfDay(new Date(date))
  }, [])

  // Helper function to get end of day in local timezone
  const getEndOfDay = useCallback((date: Date): Date => {
    return endOfDay(new Date(date))
  }, [])

  // Helper function to ensure date is within data range
  const constrainToDataRange = useCallback((date: Date): Date => {
    if (!state.dataDateRange) return date

    const { startDate, endDate } = state.dataDateRange
    const localDate = new Date(date)
    
    if (localDate < startDate) return startDate
    if (localDate > endDate) return endDate
    return localDate
  }, [state.dataDateRange])

  // Calculate actual date range based on preset or custom range
  const currentRange = useMemo(() => {
    // If we don't have the data range yet, return null
    if (!state.dataDateRange) {
      return {
        from: new Date(),
        to: new Date()
      }
    }

    const { startDate, endDate } = state.dataDateRange

    if (state.preset === 'custom' && state.customRange?.from) {
      return {
        from: constrainToDataRange(getStartOfDay(state.customRange.from)),
        to: constrainToDataRange(getEndOfDay(state.customRange.to || state.customRange.from))
      }
    }

    // Always use the data range's endDate as "today"
    const today = new Date(endDate)

    switch (state.preset) {
      case 'today':
        return {
          from: getStartOfDay(constrainToDataRange(today)),
          to: getEndOfDay(constrainToDataRange(today))
        }

      case 'yesterday': {
        const yesterday = subDays(today, 1)
        return {
          from: getStartOfDay(constrainToDataRange(yesterday)),
          to: getEndOfDay(constrainToDataRange(yesterday))
        }
      }

      case 'last_7_days': {
        const from = subDays(today, 6)
        return {
          from: getStartOfDay(constrainToDataRange(from)),
          to: getEndOfDay(constrainToDataRange(today))
        }
      }

      case 'last_30_days': {
        const from = subDays(today, 29)
        return {
          from: getStartOfDay(constrainToDataRange(from)),
          to: getEndOfDay(constrainToDataRange(today))
        }
      }

      case 'this_month': {
        const monthStart = startOfMonth(today)
        return {
          from: getStartOfDay(constrainToDataRange(monthStart)),
          to: getEndOfDay(constrainToDataRange(today))
        }
      }

      case 'last_month': {
        const lastMonth = subMonths(today, 1)
        const monthStart = startOfMonth(lastMonth)
        const monthEnd = endOfMonth(lastMonth)
        return {
          from: getStartOfDay(constrainToDataRange(monthStart)),
          to: getEndOfDay(constrainToDataRange(monthEnd))
        }
      }

      default:
        return {
          from: getStartOfDay(constrainToDataRange(today)),
          to: getEndOfDay(constrainToDataRange(today))
        }
    }
  }, [state.preset, state.customRange, state.dataDateRange, constrainToDataRange, getStartOfDay, getEndOfDay])

  // Calculate previous period for comparison
  const previousRange = useMemo(() => {
    if (!state.comparisonEnabled || !currentRange.from || !currentRange.to) {
      return null
    }

    const daysDiff = Math.ceil(
      (currentRange.to.getTime() - currentRange.from.getTime()) / (1000 * 60 * 60 * 24)
    )

    const previousEnd = subDays(currentRange.from, 1)
    const previousStart = subDays(previousEnd, daysDiff - 1)

    return {
      from: constrainToDataRange(getStartOfDay(previousStart)),
      to: constrainToDataRange(getEndOfDay(previousEnd))
    }
  }, [currentRange, state.comparisonEnabled, constrainToDataRange, getStartOfDay, getEndOfDay])

  // Helper function to format date without timezone issues
  const formatLocalDate = useCallback((date: Date): string => {
    const localDate = new Date(date)
    const year = localDate.getFullYear()
    const month = String(localDate.getMonth() + 1).padStart(2, '0')
    const day = String(localDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Generate API parameters
  const apiParams = useMemo((): DateRangeParams => {
    if (!currentRange.from || !currentRange.to) {
      return { dateRange: state.preset }
    }

    return {
      startDate: formatLocalDate(currentRange.from),
      endDate: formatLocalDate(currentRange.to)
    }
  }, [state.preset, currentRange, formatLocalDate])

  // Generate API parameters for previous period
  const previousApiParams = useMemo((): DateRangeParams | null => {
    if (!state.comparisonEnabled || !previousRange) {
      return null
    }

    return {
      startDate: formatLocalDate(previousRange.from),
      endDate: formatLocalDate(previousRange.to)
    }
  }, [state.comparisonEnabled, previousRange, formatLocalDate])

  const setPreset = useCallback((preset: string) => {
    setState(prev => ({ ...prev, preset, customRange: undefined }))
  }, [])

  const setCustomRange = useCallback((range: DateRange | undefined) => {
    if (range?.from) {
      setState(prev => ({
        ...prev,
        preset: 'custom',
        customRange: range
      }))
    }
  }, [])

  const setComparisonEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, comparisonEnabled: enabled }))
  }, [])

  return {
    // State
    preset: state.preset,
    customRange: state.customRange,
    comparisonEnabled: state.comparisonEnabled,
    dataDateRange: state.dataDateRange,
    
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