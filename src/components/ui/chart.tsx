import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type ChartData = {
  name: string;
  [key: string]: string | number;
};

interface ChartProps {
  title: string;
  data: ChartData[];
  type?: 'line' | 'area' | 'bar';
  height?: number;
  loading?: boolean;
  series: {
    key: string;
    name: string;
    color: string;
  }[];
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  customTooltip?: React.ComponentType<TooltipProps<ValueType, NameType>>;
}

export function Chart({
  title,
  data,
  type = 'line',
  height = 350,
  loading = false,
  series,
  className,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  customTooltip,
}: ChartProps) {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const renderSeries = () =>
      series.map(({ key, color }) => {
        const SeriesComponent: React.ComponentType<any> = type === 'bar' ? Bar : type === 'area' ? Area : Line;
        return (
          <SeriesComponent
            key={key}
            type="monotone"
            dataKey={key}
            stroke={color}
            fill={type === 'area' || type === 'bar' ? color : undefined}
            fillOpacity={type === 'area' ? 0.3 : 1}
          />
        );
      });

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            {showTooltip && (
              <Tooltip content={customTooltip as any} />
            )}
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) =>
                  series.find((s) => s.key === value)?.name || value
                }
              />
            )}
            {renderSeries()}
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            {showTooltip && (
              <Tooltip content={customTooltip as any} />
            )}
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) =>
                  series.find((s) => s.key === value)?.name || value
                }
              />
            )}
            {renderSeries()}
          </BarChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            {showTooltip && (
              <Tooltip content={customTooltip as any} />
            )}
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) =>
                  series.find((s) => s.key === value)?.name || value
                }
              />
            )}
            {renderSeries()}
          </LineChart>
        );
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[200px]" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className={`w-full h-[${height}px]`} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Custom tooltip component
export function CustomTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  series: { key: string; name: string; color: string }[];
}) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 font-semibold">{label}</div>
        {payload.map((entry: any, index: number) => {
          const seriesInfo = series.find((s) => s.key === entry.dataKey);
          if (!seriesInfo) return null;

          return (
            <div
              key={`item-${index}`}
              className="flex items-center gap-2"
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: seriesInfo.color }}
              />
              <span className="text-sm text-muted-foreground">
                {seriesInfo.name}:
              </span>
              <span className="font-medium">{entry.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}