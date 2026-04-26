'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Row, Col, Spin, Table } from 'antd';
import {
  UserOutlined,
  AccountBookOutlined,
  InboxOutlined,
  SettingOutlined,
  StarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/admin/metric-card';
import { TrendChart } from '@/components/admin/trend-chart';
import { AlertList } from '@/components/admin/alert-list';
import { adminApi } from '@/lib/admin-api';
import type { ModuleData, ModuleType } from '@/types/admin';
import { MODULE_NAMES, MODULE_COLORS } from '@/types/admin';

const MODULE_CONFIG: Record<ModuleType, { icon: React.ReactNode; name: string; color: string }> = {
  hr: { icon: <UserOutlined />, name: '人事', color: MODULE_COLORS.hr },
  finance: { icon: <AccountBookOutlined />, name: '财务', color: MODULE_COLORS.finance },
  supply_chain: { icon: <InboxOutlined />, name: '供应链', color: MODULE_COLORS.supply_chain },
  operation: { icon: <SettingOutlined />, name: '运营', color: MODULE_COLORS.operation },
  influencer: { icon: <StarOutlined />, name: '红人', color: MODULE_COLORS.influencer },
};

const CHART_COLORS = ['#1890ff', '#722ed1', '#13c2c2', '#52c41a'];

export default function ModuleDetailPage() {
  const params = useParams();
  const module = params.module as string;
  const [data, setData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<'30' | '90'>('30');

  useEffect(() => {
    if (!module) return;
    setLoading(true);
    adminApi.getModuleData(module)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [module]);

  if (!module || !(module in MODULE_CONFIG)) {
    return <div className="text-center py-20 text-muted-foreground">模块不存在</div>;
  }

  const moduleType = module as ModuleType;
  const config = MODULE_CONFIG[moduleType];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-muted-foreground">暂无数据</div>;
  }

  const activeAlerts = data.alerts.filter((a) => !a.resolvedAt);
  const days = trendRange === '30' ? 30 : 90;

  const columns = [
    { title: '指标名称', dataIndex: 'name', key: 'name' },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: any) => `${value}${record.unit}`,
    },
    {
      title: '预警阈值',
      key: 'threshold',
      render: (_: unknown, record: any) => `<${record.threshold.yellow} ${record.unit}`,
    },
    {
      title: '告警阈值',
      key: 'redThreshold',
      render: (_: unknown, record: any) => `<${record.threshold.red} ${record.unit}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'green' | 'yellow' | 'red') => (
        <span className={status === 'green' ? 'text-green-500' : status === 'yellow' ? 'text-yellow-500' : 'text-red-500'}>
          {status === 'green' ? '正常' : status === 'yellow' ? '预警' : '告警'}
        </span>
      ),
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      render: (trend: number, _: unknown, record: any) => {
        const isPositive = trend > 0;
        return (
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {isPositive ? '+' : ''}{trend.toFixed(1)}%
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium flex items-center gap-2 mb-1">
          <span style={{ color: config.color }}>{config.icon}</span> {config.name}模块
        </h2>
        <p className="text-sm text-muted-foreground">
          {MODULE_NAMES[moduleType]}核心指标监控与分析
        </p>
      </div>

      {/* 模块指标卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>模块指标</CardTitle>
        </CardHeader>
        <CardContent>
          <Row gutter={[16, 16]}>
            {data.metrics.map((metric) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={metric.id}>
                <MetricCard metric={metric} />
              </Col>
            ))}
          </Row>
        </CardContent>
      </Card>

      {/* 趋势图 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>指标趋势</CardTitle>
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
            {data.metrics.slice(0, 4).map((metric, index) => {
              const trendData = data.trendData[metric.id] || [];
              const slicedData = trendData.slice(-days);

              return (
                <Col xs={24} lg={12} key={metric.id}>
                  <Card size="sm" title={metric.name}>
                    <TrendChart
                      data={slicedData}
                      name={metric.name}
                      color={CHART_COLORS[index % CHART_COLORS.length]}
                      height={200}
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        </CardContent>
      </Card>

      {/* 告警记录 */}
      {activeAlerts.length > 0 && (
        <Card className="mb-6" style={{ borderColor: '#ffccc7' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-red-500">●</span> 告警记录 ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList alerts={activeAlerts} />
          </CardContent>
        </Card>
      )}

      {/* 明细列表 */}
      <Card>
        <CardHeader>
          <CardTitle>指标明细</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            dataSource={data.metrics}
            rowKey="id"
            pagination={false}
            size="small"
            columns={columns}
          />
        </CardContent>
      </Card>
    </div>
  );
}
