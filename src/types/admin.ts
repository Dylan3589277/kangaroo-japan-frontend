export type MetricStatus = 'green' | 'yellow' | 'red';
export type ModuleType = 'hr' | 'finance' | 'supply_chain' | 'operation' | 'influencer';

export interface MetricCard {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: MetricStatus;
  threshold: { yellow: number; red: number };
  trend: number;
  trendDirection: 'up' | 'down';
}

export interface Alert {
  id: string;
  metricId: string;
  metricName: string;
  module: ModuleType;
  status: MetricStatus;
  threshold: number;
  currentValue: number;
  assignee: string;
  createdAt: string;
  deadline: string;
  handlingResult?: string;
  handler?: string;
  resolvedAt?: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface OverviewData {
  metrics: MetricCard[];
  alerts: Alert[];
  trendData: Record<string, TrendDataPoint[]>;
}

export interface ModuleData {
  id: ModuleType;
  name: string;
  metrics: MetricCard[];
  alerts: Alert[];
  trendData: Record<string, TrendDataPoint[]>;
}

export const MODULE_NAMES: Record<ModuleType, string> = {
  hr: '人事',
  finance: '财务',
  supply_chain: '供应链',
  operation: '运营',
  influencer: '红人',
};

export const MODULE_COLORS: Record<ModuleType, string> = {
  hr: '#1890ff',
  finance: '#722ed1',
  supply_chain: '#13c2c2',
  operation: '#faad14',
  influencer: '#52c41a',
};
