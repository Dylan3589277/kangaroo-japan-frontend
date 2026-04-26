'use client';

import ReactECharts from 'echarts-for-react';
import type { TrendDataPoint } from '@/types/admin';

interface Props {
  data: TrendDataPoint[];
  name: string;
  color?: string;
  height?: number;
}

const COLORS = {
  blue: '#1890ff',
  purple: '#722ed1',
  cyan: '#13c2c2',
  green: '#52c41a',
  yellow: '#faad14',
};

export function TrendChart({ data, name, color = COLORS.blue, height = 250 }: Props) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        暂无数据
      </div>
    );
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>${name}: ${p.value}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map((d) => d.date),
      axisLabel: {
        show: true,
        formatter: (value: string) => value.slice(5),
      },
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name,
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          opacity: 0.1,
        },
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: {
          color,
        },
        data: data.map((d) => d.value),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} opts={{ renderer: 'canvas' }} />;
}
