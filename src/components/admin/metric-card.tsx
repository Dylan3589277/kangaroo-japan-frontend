'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { MetricCard as MetricCardType } from '@/types/admin';
import { formatValue, getStatusColor, getTrendDisplay, getStatusText } from '@/lib/admin-utils';

interface Props {
  metric: MetricCardType;
  onClick?: () => void;
}

export function MetricCard({ metric, onClick }: Props) {
  const { name, value, unit, status, trend, trendDirection } = metric;
  const trendDisplay = getTrendDisplay(trend);
  const borderColor = getStatusColor(status);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 text-sm text-muted-foreground">{name}</div>
            <div className="text-2xl font-bold">{formatValue(value, unit)}</div>
          </div>
          <Badge
            variant={
              status === 'green' ? 'default' : status === 'yellow' ? 'secondary' : 'destructive'
            }
          >
            {getStatusText(status)}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: trendDisplay.color }}>
          {trendDirection === 'up' ? (
            <ArrowUpOutlined />
          ) : (
            <ArrowDownOutlined />
          )}
          <span>{trendDisplay.text}</span>
          <span className="text-muted-foreground">较上月</span>
        </div>
      </CardContent>
    </Card>
  );
}
