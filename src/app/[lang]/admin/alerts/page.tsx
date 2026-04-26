'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Select, Spin } from 'antd';
import { BellOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertList } from '@/components/admin/alert-list';
import { adminApi } from '@/lib/admin-api';
import type { Alert } from '@/types/admin';
import { MODULE_NAMES } from '@/types/admin';

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    adminApi.getAlerts({ status: statusFilter, module: moduleFilter })
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, moduleFilter]);

  const handleResolve = async (alertId: string, result: string, handler: string) => {
    try {
      await adminApi.resolveAlert(alertId, result, handler);
      // Refresh alerts
      const updated = await adminApi.getAlerts({ status: statusFilter, module: moduleFilter });
      setAlerts(updated);
    } catch (error) {
      console.error('处理告警失败:', error);
    }
  };

  const stats = {
    total: alerts.length,
    red: alerts.filter((a) => a.status === 'red' && !a.resolvedAt).length,
    yellow: alerts.filter((a) => a.status === 'yellow' && !a.resolvedAt).length,
    resolved: alerts.filter((a) => a.resolvedAt).length,
  };

  const activeAlerts = alerts.filter((a) => !a.resolvedAt);
  const resolvedAlerts = alerts.filter((a) => a.resolvedAt);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium flex items-center gap-2 mb-1">
          <BellOutlined /> 告警中心
        </h2>
        <p className="text-sm text-muted-foreground">
          集中管理所有业务告警，支持按状态、模块、时间范围筛选
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card size="sm">
            <div className="text-sm text-muted-foreground">全部告警</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="sm">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> 紧急告警
            </div>
            <div className="text-2xl font-bold text-red-500">{stats.red}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="sm">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ClockCircleOutlined style={{ color: '#faad14' }} /> 待处理预警
            </div>
            <div className="text-2xl font-bold text-yellow-500">{stats.yellow}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="sm">
            <div className="text-sm text-muted-foreground">已处理</div>
            <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
          </Card>
        </Col>
      </Row>

      {/* 筛选器 */}
      <Card className="mb-6">
        <CardContent>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8} md={6}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">状态:</span>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="flex-1"
                  options={[
                    { value: 'all', label: '全部' },
                    { value: 'red', label: '告警' },
                    { value: 'yellow', label: '预警' },
                    { value: 'green', label: '已解决' },
                  ]}
                />
              </div>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">模块:</span>
                <Select
                  value={moduleFilter}
                  onChange={setModuleFilter}
                  className="flex-1"
                  options={[
                    { value: 'all', label: '全部' },
                    ...Object.entries(MODULE_NAMES).map(([key, label]) => ({ value: key, label })),
                  ]}
                />
              </div>
            </Col>
          </Row>
        </CardContent>
      </Card>

      {/* 告警列表 */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spin size="large" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">暂无告警记录</div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">待处理 ({activeAlerts.length})</TabsTrigger>
              <TabsTrigger value="resolved">已处理 ({resolvedAlerts.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <AlertList alerts={activeAlerts} onResolve={handleResolve} />
            </TabsContent>
            <TabsContent value="resolved">
              <AlertList alerts={resolvedAlerts} />
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  );
}
