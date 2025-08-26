import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  onPresetChange?: (preset: string) => void
  showComparison?: boolean
  comparisonEnabled?: boolean
  onComparisonToggle?: (enabled: boolean) => void
  className?: string
}

const presetRanges = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "last_7_days" },
  { label: "Last 30 days", value: "last_30_days" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "Custom range", value: "custom" },
]

export function DateRangePicker({
  value,
  onChange,
  onPresetChange,
  showComparison = true,
  comparisonEnabled = false,
  onComparisonToggle,
  className,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState("last_7_days")
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    onPresetChange?.(preset)
    
    if (preset !== "custom") {
      setIsCalendarOpen(false)
      // Clear custom date range when using presets
      onChange?.(undefined)
    }
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return "Select date range"
    
    if (!range.to) {
      return format(range.from, "LLL dd, y")
    }
    
    return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`
  }

  const getPresetLabel = () => {
    const preset = presetRanges.find(p => p.value === selectedPreset)
    return preset?.label || "Select range"
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        {/* Preset Selector */}
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presetRanges.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        {selectedPreset === "custom" && (
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange(value)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value?.from}
                selected={value}
                onSelect={onChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Current Range Display for Presets */}
        {selectedPreset !== "custom" && (
          <div className="text-sm text-muted-foreground px-3 py-2 border rounded-md bg-muted/50">
            {getPresetLabel()}
          </div>
        )}
      </div>

      {/* Comparison Toggle */}
      {showComparison && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="compare"
            checked={comparisonEnabled}
            onChange={(e) => onComparisonToggle?.(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="compare" className="text-sm font-medium">
            Compare to previous period
          </label>
        </div>
      )}
    </div>
  )
}
