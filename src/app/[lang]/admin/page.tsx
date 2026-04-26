'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Spin } from 'antd';
import {
  UserOutlined,
  AccountBookOutlined,
  InboxOutlined,
  SettingOutlined,
  StarOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/admin/metric-card';
import { TrendChart } from '@/components/admin/trend-chart';
import { AlertList } from '@/components/admin/alert-list';
import { adminApi } from '@/lib/admin-api';
import type { OverviewData, ModuleType } from '@/types/admin';
import { MODULE_COLORS } from '@/types/admin';

const MODULE_CONFIG: Record<ModuleType, { icon: React.ReactNode; name: string; color: string }> = {
  hr: { icon: <UserOutlined />, name: '人事', color: MODULE_COLORS.hr },
  finance: { icon: <AccountBookOutlined />, name: '财务', color: MODULE_COLORS.finance },
  supply_chain: { icon: <InboxOutlined />, name: '供应链', color: MODULE_COLORS.supply_chain },
  operation: { icon: <SettingOutlined />, name: '运营', color: MODULE_COLORS.operation },
  influencer: { icon: <StarOutlined />, name: '红人', color: MODULE_COLORS.influencer },
};

const CHART_COLORS = ['#1890ff', '#722ed1', '#13c2c2', '#52c41a'];

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<'30' | '90'>('30');

  useEffect(() => {
    adminApi.getOverview()
      .then(setOverview)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!overview) {
    return <div className="text-center py-20 text-muted-foreground">暂无数据</div>;
  }

  const activeAlerts = overview.alerts.filter((a) => !a.resolvedAt);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium flex items-center gap-2 mb-1">
          <DashboardOutlined /> 全局健康总览
        </h2>
        <p className="text-sm text-muted-foreground">
          实时监控袋鼠君日本电商核心经营指标，及时发现并处理异常情况
        </p>
      </div>

      {/* 核心指标卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>核心指标</CardTitle>
        </CardHeader>
        <CardContent>
          <Row gutter={[16, 16]}>
            {overview.metrics.map((metric) => (
              <Col xs={24} sm={12} lg={8} xl={4} key={metric.id}>
                <MetricCard metric={metric} />
              </Col>
            ))}
          </Row>
        </CardContent>
      </Card>

      {/* 异常告警栏 */}
      {activeAlerts.length > 0 && (
        <Card className="mb-6" style={{ borderColor: '#ffccc7' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-red-500">●</span> 异常告警 ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList alerts={activeAlerts} />
          </CardContent>
        </Card>
      )}

      {/* 趋势图区域 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>核心指标趋势</CardTitle>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 text-sm rounded ${trendRange === '30' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setTrendRange('30')}
            >
              30天
            </button>
            <button
              className={`px-3 py-1 text-sm rounded ${trendRange === '90' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setTrendRange('90')}
            >
              90天
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <Row gutter={[16, 16]}>
            {overview.metrics.slice(0, 4).map((metric, index) => {
              const data = overview.trendData[metric.id] || [];
              const days = trendRange === '30' ? 30 : 90;
              const slicedData = data.slice(-days);

              return (
                <Col xs={24} lg={12} key={metric.id}>
                  <TrendChart
                    data={slicedData}
                    name={metric.name}
                    color={CHART_COLORS[index % CHART_COLORS.length]}
                    height={250}
                  />
                </Col>
              );
            })}
          </Row>
        </CardContent>
      </Card>

      {/* 快速入口 */}
      <Card>
        <CardHeader>
          <CardTitle>模块详情</CardTitle>
        </CardHeader>
        <CardContent>
          <Row gutter={[16, 16]}>
            {(Object.keys(MODULE_CONFIG) as ModuleType[]).map((module) => {
              const config = MODULE_CONFIG[module];
              return (
                <Col xs={12} sm={8} lg={4} key={module}>
                  <Link href={`/admin/module/${module}`}>
                    <Card className="cursor-pointer text-center transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col items-center py-4">
                        <div style={{ fontSize: '32px', color: config.color, marginBottom: '8px' }}>
                          {config.icon}
                        </div>
                        <span className="text-sm font-medium">{config.name}</span>
                      </CardContent>
                    </Card>
                  </Link>
                </Col>
              );
            })}
          </Row>
        </CardContent>
      </Card>
    </div>
  );
}
