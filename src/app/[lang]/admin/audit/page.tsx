"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileSearch, RefreshCw, Search, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type AdminAuditLogItem } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function shortHash(value?: string | null) {
  if (!value) return "-";
  return value.length > 16
    ? `${value.slice(0, 12)}...${value.slice(-4)}`
    : value;
}

function formatMetadata(value?: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return "-";
  return JSON.stringify(value, null, 2);
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [actorId, setActorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const actionCounts = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  async function load(params?: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    actorId?: string;
  }) {
    setLoading(true);
    setError("");
    const response = await api.listAdminAuditLogs({
      action: params?.action || undefined,
      resourceType: params?.resourceType || undefined,
      resourceId: params?.resourceId || undefined,
      actorId: params?.actorId || undefined,
      limit: 50,
    });
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || "审计日志读取失败");
      setLogs([]);
      setTotal(0);
      return;
    }
    setLogs(response.data.data || []);
    setTotal(response.data.pagination?.total || 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({
      action: action.trim(),
      resourceType: resourceType.trim(),
      resourceId: resourceId.trim(),
      actorId: actorId.trim(),
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            共享后台 P0
          </div>
          <h1 className="mt-2 text-2xl font-semibold">审计日志</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => load()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
          <CardDescription>
            只读查看后台动作轨迹；邮箱、IP 和浏览器指纹仅显示哈希。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
            onSubmit={handleSubmit}
          >
            <Input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="action，例如 order.manual_handling"
            />
            <Input
              value={resourceType}
              onChange={(event) => setResourceType(event.target.value)}
              placeholder="resourceType，例如 order"
            />
            <Input
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
              placeholder="resourceId"
            />
            <Input
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              placeholder="actorId"
            />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4" />
              查询
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>日志总数</CardTitle>
            <CardDescription>当前筛选条件下的记录数</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "..." : total}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>动作类型</CardTitle>
            <CardDescription>当前页覆盖的 action 数量</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {Object.keys(actionCounts).length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>安全边界</CardTitle>
            <CardDescription>无写入按钮，无敏感明文字段</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">readonly</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>动作记录</CardTitle>
          <CardDescription>
            显示前 {logs.length} 条；用于订单处理、客服流转、退款审核追溯。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">时间</th>
                  <th className="px-3 py-2 font-medium">动作</th>
                  <th className="px-3 py-2 font-medium">资源</th>
                  <th className="px-3 py-2 font-medium">操作者</th>
                  <th className="px-3 py-2 font-medium">请求指纹</th>
                  <th className="px-3 py-2 font-medium">摘要</th>
                  <th className="px-3 py-2 font-medium">元数据</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      {loading ? "正在读取审计日志" : "暂无审计日志"}
                    </td>
                  </tr>
                ) : null}
                {logs.map((log) => (
                  <tr key={log.id} className="border-t align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{log.action}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{log.resourceType}</div>
                      <div className="break-all text-muted-foreground">
                        {log.resourceId || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <div>{log.actorId || "-"}</div>
                      <div className="font-mono text-xs">
                        {shortHash(log.actorEmailHash)}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      <div>ip {shortHash(log.ipHash)}</div>
                      <div>ua {shortHash(log.userAgentHash)}</div>
                    </td>
                    <td className="max-w-[260px] px-3 py-2">
                      {log.summary || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <pre className="max-h-36 max-w-[360px] overflow-auto rounded bg-muted p-2 text-xs">
                        {formatMetadata(log.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
        <FileSearch className="mt-0.5 h-4 w-4" />
        <span>
          当前页用于审计和追溯，不负责执行退款、改订单、发客服消息或平台写操作。
        </span>
      </div>
    </div>
  );
}
