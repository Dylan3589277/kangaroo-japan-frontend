'use client';

import { useState } from 'react';
import { Table, Button } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { Alert } from '@/types/admin';
import { formatDateTime, getRemainingTime, getStatusText } from '@/lib/admin-utils';
import { MODULE_NAMES } from '@/types/admin';
import { Badge as ShadcnBadge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Props {
  alerts: Alert[];
  loading?: boolean;
  onResolve?: (alertId: string, result: string, handler: string) => void;
}

export function AlertList({ alerts, loading = false, onResolve }: Props) {
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [handler, setHandler] = useState('');
  const [result, setResult] = useState('');

  const handleResolve = (alert: Alert) => {
    setSelectedAlert(alert);
    setResolveModalVisible(true);
  };

  const handleSubmit = async () => {
    if (selectedAlert && onResolve && handler && result) {
      onResolve(selectedAlert.id, result, handler);
      setResolveModalVisible(false);
      setHandler('');
      setResult('');
      setSelectedAlert(null);
    }
  };

  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: 'green' | 'yellow' | 'red') => (
        <ShadcnBadge variant={status === 'green' ? 'default' : status === 'yellow' ? 'secondary' : 'destructive'}>
          {getStatusText(status)}
        </ShadcnBadge>
      ),
    },
    {
      title: '指标名称',
      dataIndex: 'metricName',
      key: 'metricName',
      width: 120,
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 80,
      render: (module: string) => MODULE_NAMES[module as keyof typeof MODULE_NAMES] || module,
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: 80,
    },
    {
      title: '当前值',
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 80,
    },
    {
      title: '负责人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 80,
    },
    {
      title: '处理时效',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (deadline: string, record: Alert) => {
        if (record.resolvedAt) {
          return (
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircleOutlined /> 已解决
            </span>
          );
        }
        const { text, hours, isOverdue } = getRemainingTime(deadline);
        return (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : hours < 24 ? 'text-orange-500' : 'text-blue-500'}`}>
            <ClockCircleOutlined /> {text}
          </span>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Alert) => {
        if (record.resolvedAt) {
          return <Button type="link" size="small">查看</Button>;
        }
        return (
          <Button type="link" size="small" onClick={() => handleResolve(record)}>
            处理
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={alerts}
        rowKey="id"
        loading={loading}
        pagination={alerts.length > 10 ? { pageSize: 10 } : false}
        size="small"
      />

      <Dialog open={resolveModalVisible} onOpenChange={setResolveModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>处理告警</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>指标:</strong> {selectedAlert.metricName}</p>
                <p><strong>当前值:</strong> {selectedAlert.currentValue} (阈值: {selectedAlert.threshold})</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">处理人</label>
                <Input
                  value={handler}
                  onChange={(e) => setHandler(e.target.value)}
                  placeholder="请输入处理人姓名"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">处理结果</label>
                <textarea
                  className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="请详细描述处理过程和结果"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResolveModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>确认处理</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
