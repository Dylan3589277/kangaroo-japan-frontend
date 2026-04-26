import type { ModuleType } from '@/types/admin';

const ADMIN_API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3000/dashboard';

export type MetricStatus = 'green' | 'yellow' | 'red';

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

class AdminApi {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${ADMIN_API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`Admin API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async getOverview(): Promise<OverviewData> {
    return this.request<OverviewData>('/overview');
  }

  async getModuleData(module: string): Promise<ModuleData> {
    return this.request<ModuleData>(`/module/${module}`);
  }

  async getAlerts(filters?: {
    status?: string;
    module?: string;
    dateRange?: string;
  }): Promise<Alert[]> {
    const searchParams = new URLSearchParams();
    if (filters?.status) searchParams.set('status', filters.status);
    if (filters?.module) searchParams.set('module', filters.module);
    if (filters?.dateRange) searchParams.set('dateRange', filters.dateRange);
    const query = searchParams.toString();
    const data = await this.request<{ alerts: Alert[] }>(`/alerts${query ? `?${query}` : ''}`);
    return data.alerts || [];
  }

  async resolveAlert(alertId: string, result: string, handler: string): Promise<void> {
    await this.request('/alerts/resolve', {
      method: 'POST',
      body: JSON.stringify({ alertId, result, handler }),
    });
  }
}

export const adminApi = new AdminApi();
