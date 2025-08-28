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
    setPreset,
    setCustomRange,
    setComparisonEnabled,
  } = useDateRangeContext();

  return (
    <div className="flex items-center gap-4">
      {/* Preset selector */}
      <Select value={preset} onValueChange={setPreset}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((presetOption) => (
            <SelectItem key={presetOption.value} value={presetOption.value}>
              {presetOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
                    {format(customRange.from, 'LLL dd, y')} -{' '}
                    {format(customRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(customRange.from, 'LLL dd, y')
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
          vs {format(previousRange.from, 'LLL dd, y')} -{' '}
          {format(previousRange.to, 'LLL dd, y')}
        </div>
      )}
    </div>
  );
}