import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  change?: number | string;
  loading?: boolean;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  change,
  loading = false,
  className,
  trend,
  trendLabel,
}: StatCardProps) {
  const renderTrendIndicator = () => {
    if (!trend || !change) return null;

    const isPositive = trend === 'up';
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-green-500' : 'text-red-500';

    return (
      <div className={cn('flex items-center gap-1 text-sm', color)}>
        <Icon className="h-4 w-4" />
        <span>{typeof change === 'number' ? Math.abs(change).toFixed(1) + '%' : change}</span>
        {trendLabel && <span className="text-muted-foreground ml-1">{trendLabel}</span>}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-[100px]" />
          </CardTitle>
          {icon && <Skeleton className="h-4 w-4" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-[120px]" />
          {(description || change) && (
            <Skeleton className="h-4 w-[80px] mt-2" />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || change !== undefined) && (
          <div className="flex items-center justify-between mt-2">
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {renderTrendIndicator()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}