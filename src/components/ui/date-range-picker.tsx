import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDateRangeContext, DATE_RANGE_PRESETS } from '@/contexts/date-range-context';

export function DateRangePicker() {
  const {
    preset,
    customRange,
    comparisonEnabled,
    currentRange,
    previousRange,
    dataDateRange,
    setPreset,
    setCustomRange,
    setComparisonEnabled,
  } = useDateRangeContext();

  // Format date for display
  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Get current date range display
  const getCurrentRangeDisplay = () => {
    if (!currentRange) return 'Select date range';
    return `${formatDate(currentRange.from)} - ${formatDate(currentRange.to)}`;
  };

  return (
    <div className="flex items-center gap-4">
      {/* Preset selector */}
      <Select value={preset} onValueChange={setPreset}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            {DATE_RANGE_PRESETS.find(p => p.value === preset)?.label || 'Select date range'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((presetOption) => (
            <SelectItem key={presetOption.value} value={presetOption.value}>
              {presetOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Current date range display */}
      <div className="text-sm">
        {getCurrentRangeDisplay()}
      </div>

      {/* Custom date range picker */}
      {preset === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal w-[280px]',
                !customRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customRange?.from ? (
                customRange.to ? (
                  <>
                    {formatDate(customRange.from)} - {formatDate(customRange.to)}
                  </>
                ) : (
                  formatDate(customRange.from)
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={currentRange.from}
              selected={customRange}
              onSelect={setCustomRange}
              numberOfMonths={2}
              disabled={(date) => {
                if (!dataDateRange) return false;
                return (
                  date < dataDateRange.startDate ||
                  date > dataDateRange.endDate
                );
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Comparison toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="comparison"
          checked={comparisonEnabled}
          onCheckedChange={setComparisonEnabled}
        />
        <Label htmlFor="comparison">Compare with previous period</Label>
      </div>

      {/* Display comparison period if enabled */}
      {comparisonEnabled && previousRange && (
        <div className="text-sm text-muted-foreground">
          vs {formatDate(previousRange.from)} - {formatDate(previousRange.to)}
        </div>
      )}

      {/* Display available date range */}
      {dataDateRange && (
        <div className="text-xs text-muted-foreground">
          Available data: {formatDate(dataDateRange.startDate)} - {formatDate(dataDateRange.endDate)}
        </div>
      )}
    </div>
  );
}