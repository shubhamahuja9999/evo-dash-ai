import React, { createContext, useContext, ReactNode } from 'react';
import { useDateRange, DateRangeState, DateRangeParams } from '@/hooks/use-date-range';

interface DateRangeContextType {
  // State
  preset: string;
  customRange: DateRangeState['customRange'];
  comparisonEnabled: boolean;
  
  // Calculated ranges
  currentRange: { from: Date; to: Date };
  previousRange: { from: Date; to: Date } | null;
  
  // API parameters
  apiParams: DateRangeParams;
  previousApiParams: DateRangeParams | null;
  
  // Actions
  setPreset: (preset: string) => void;
  setCustomRange: (range: DateRangeState['customRange']) => void;
  setComparisonEnabled: (enabled: boolean) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const dateRange = useDateRange();
  
  return (
    <DateRangeContext.Provider value={dateRange}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRangeContext() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRangeContext must be used within a DateRangeProvider');
  }
  return context;
}

// Presets for date range picker
export const DATE_RANGE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];
