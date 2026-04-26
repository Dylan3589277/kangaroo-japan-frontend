import type { MetricStatus } from '@/types/admin';

export function formatNumber(value: number, options?: { decimals?: number; unit?: string }): string {
  const { decimals = 0, unit } = options || {};
  let formatted: string;

  if (Math.abs(value) >= 10000000) {
    formatted = (value / 10000000).toFixed(decimals) + '千万';
  } else if (Math.abs(value) >= 10000) {
    formatted = (value / 10000).toFixed(decimals) + '万';
  } else {
    formatted = value.toLocaleString('ja-JP', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return unit ? `${formatted}${unit}` : formatted;
}

export function formatCurrency(value: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatValue(value: number, unit: string): string {
  if (unit === '%') return formatPercent(value);
  if (unit === 'JPY') return formatCurrency(value);
  return formatNumber(value, { unit });
}

export function getStatusColor(status: MetricStatus): string {
  const colors: Record<MetricStatus, string> = {
    green: '#52c41a',
    yellow: '#faad14',
    red: '#ff4d4f',
  };
  return colors[status];
}

export function getStatusBadgeVariant(status: MetricStatus): 'default' | 'secondary' | 'destructive' {
  const map: Record<MetricStatus, 'default' | 'secondary' | 'destructive'> = {
    green: 'default',
    yellow: 'secondary',
    red: 'destructive',
  };
  return map[status];
}

export function getStatusText(status: MetricStatus): string {
  const map: Record<MetricStatus, string> = {
    green: '正常',
    yellow: '预警',
    red: '告警',
  };
  return map[status];
}

export function getTrendDisplay(trend: number): { text: string; isPositive: boolean; color: string } {
  const isPositive = trend > 0;
  const text = `${isPositive ? '+' : ''}${trend.toFixed(1)}%`;
  const color = isPositive ? '#52c41a' : '#ff4d4f';
  return { text, isPositive, color };
}

export function getRemainingTime(deadline: string): { text: string; hours: number; isOverdue: boolean } {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const isOverdue = diffHours < 0;

  let text: string;
  if (isOverdue) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) {
      text = `已超时${Math.floor(overdueHours)}小时`;
    } else {
      text = `已超时${Math.floor(overdueHours / 24)}天`;
    }
  } else {
    if (diffHours < 24) {
      text = `剩余${Math.floor(diffHours)}小时`;
    } else {
      text = `剩余${Math.floor(diffHours / 24)}天`;
    }
  }

  return { text, hours: diffHours, isOverdue };
}

export function formatDate(date: string): string {
  return new Date(date).toISOString().split('T')[0];
}

export function formatDateTime(date: string): string {
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
