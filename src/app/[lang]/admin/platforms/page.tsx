"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Database,
  RefreshCw,
  Server,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  api,
  type AdminAuditLogItem,
  type AdminPlatformHealthAlertCode,
  type AdminPlatformHealthAlertHandlingStatus,
  type AdminPlatformHealthAlertState,
  type AdminPlatformHealthAlertStateSummary,
  type AdminPlatformHealthHandlingOutcome,
  type AdminPlatformHealthHistoryItem,
  type AdminPlatformHealthItem,
  type AdminPlatformHealthMigrationStatus,
  type AdminSchemaTableStatus,
} from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function badgeVariant(status: string) {
  if (status === "passed" || status === "healthy" || status === "ok") {
    return "secondary";
  }
  if (status === "failed" || status === "blocked") return "destructive";
  return "outline";
}

function historyAlertCodes(item: AdminPlatformHealthHistoryItem) {
  const alerts = (
    item.payload as {
      alerts?: Array<{ code?: string; severity?: string }>;
    }
  )?.alerts;
  return Array.isArray(alerts)
    ? alerts
        .map((alert) => alert.code)
        .filter((code): code is string => Boolean(code))
    : [];
}

function tableBadge(table?: AdminSchemaTableStatus) {
  if (!table) return { text: "未检查", variant: "outline" as const };
  if (table.tableReady && table.migrationRecorded !== false) {
    return { text: "已就绪", variant: "secondary" as const };
  }
  if (table.tableReady)
    return { text: "表存在，迁移待查", variant: "outline" as const };
  return { text: "缺表", variant: "destructive" as const };
}

export default function AdminPlatformsPage() {
  const [items, setItems] = useState<AdminPlatformHealthItem[]>([]);
  const [history, setHistory] = useState<AdminPlatformHealthHistoryItem[]>([]);
  const [migration, setMigration] =
    useState<AdminPlatformHealthMigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [smokeRunning, setSmokeRunning] = useState(false);
  const [error, setError] = useState("");
  const [syncKeyword, setSyncKeyword] = useState("iphone");
  const [syncingPlatform, setSyncingPlatform] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [alertNote, setAlertNote] = useState("");
  const [alertActionBusy, setAlertActionBusy] = useState("");
  const [alertAuditLogs, setAlertAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [alertStates, setAlertStates] = useState<
    AdminPlatformHealthAlertState[]
  >([]);
  const [alertStateSummary, setAlertStateSummary] =
    useState<AdminPlatformHealthAlertStateSummary>({
      total: 0,
      unhandled: 0,
      inProgress: 0,
      resolved: 0,
    });
  const [alertStateStatus, setAlertStateStatus] = useState<
    "all" | AdminPlatformHealthAlertHandlingStatus
  >("all");
  const [historyPlatform, setHistoryPlatform] = useState<
    "all" | AdminPlatformHealthItem["platform"]
  >("all");
  const [historyStatus, setHistoryStatus] = useState<
    "all" | "healthy" | "attention" | "blocked"
  >("all");
  const [historyAlertCode, setHistoryAlertCode] = useState<
    | "all"
    | "platform_blocked"
    | "missing_credentials"
    | "missing_sample"
    | "live_smoke_failed"
    | "stale_sync"
  >("all");
  const [historyAlerts, setHistoryAlerts] = useState({
    total: 0,
    blocked: 0,
    attention: 0,
  });
  const [healthAlerts, setHealthAlerts] = useState<{
    total: number;
    blocked: number;
    attention: number;
    notifications?: Array<Record<string, unknown>>;
  }>({ total: 0, blocked: 0, attention: 0 });

  const schema = migration?.schema;
  const blockedCount = useMemo(
    () => items.filter((item) => item.status === "blocked").length,
    [items],
  );
  const passedCount = useMemo(
    () => items.filter((item) => item.sampleSmoke.status === "passed").length,
    [items],
  );
  const schemaTables = schema?.tables || [];
  const paymentTable = schemaTables.find((table) => table.key === "payments");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const [historyResponse, migrationResponse, auditResponse, stateResponse] =
      await Promise.all([
        api.getAdminPlatformHealthHistory({
          limit: 16,
          platform: historyPlatform === "all" ? undefined : historyPlatform,
          status: historyStatus === "all" ? undefined : historyStatus,
          alertCode: historyAlertCode === "all" ? undefined : historyAlertCode,
        }),
        api.getAdminPlatformHealthMigrationStatus(),
        api.listAdminAuditLogs({
          resourceType: "platform_health_alert",
          limit: 8,
        }),
        api.getAdminPlatformHealthAlertStates({
          limit: 16,
          platform: historyPlatform === "all" ? undefined : historyPlatform,
          status: alertStateStatus === "all" ? undefined : alertStateStatus,
        }),
      ]);
    setHistoryLoading(false);
    if (historyResponse.success && historyResponse.data) {
      setHistory(historyResponse.data.data || []);
      setHistoryAlerts(
        historyResponse.data.alerts || { total: 0, blocked: 0, attention: 0 },
      );
    }
    if (migrationResponse.success && migrationResponse.data) {
      setMigration(migrationResponse.data);
    }
    if (auditResponse.success && auditResponse.data) {
      setAlertAuditLogs(auditResponse.data.data || []);
    }
    if (stateResponse.success && stateResponse.data) {
      setAlertStates(stateResponse.data.data || []);
      setAlertStateSummary(stateResponse.data.summary);
    }
  }, [alertStateStatus, historyAlertCode, historyPlatform, historyStatus]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await api.getAdminPlatformHealth();
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || "平台健康读取失败");
      setItems([]);
      return;
    }
    setItems(response.data.data || []);
    setHealthAlerts(
      response.data.alerts || { total: 0, blocked: 0, attention: 0 },
    );
    if (response.data.alertStates) {
      setAlertStateSummary(response.data.alertStates);
    }
    await loadHistory();
  }, [loadHistory]);

  async function runSmoke() {
    setSmokeRunning(true);
    setSyncMessage("");
    const response = await api.runAdminPlatformHealthSmoke();
    setSmokeRunning(false);
    if (!response.success || !response.data) {
      setSyncMessage(response.error?.message || "健康 smoke 触发失败");
      return;
    }
    setItems(response.data.data || []);
    setMigration(response.data.persistence);
    setHealthAlerts(
      response.data.alerts || { total: 0, blocked: 0, attention: 0 },
    );
    if (response.data.alertStates) {
      setAlertStateSummary(response.data.alertStates);
    }
    setSyncMessage("健康 smoke 已写入历史");
    await loadHistory();
  }

  async function retrySync(platform: AdminPlatformHealthItem["platform"]) {
    if (platform === "yahoo-shopping") {
      setSyncMessage(
        "Yahoo Shopping uses the Yahoo sync path; retry yahoo instead.",
      );
      return;
    }
    const keyword = syncKeyword.trim();
    if (!keyword) {
      setSyncMessage("请先填写同步关键词");
      return;
    }
    setSyncingPlatform(platform);
    setSyncMessage("");
    const response = await api.retryPlatformSync({ platform, keyword });
    setSyncingPlatform("");
    if (!response.success || !response.data) {
      setSyncMessage(response.error?.message || "同步重试失败");
      return;
    }
    const result = response.data.result;
    setSyncMessage(
      `${platform}: ${result.success ? "成功" : "失败"}，同步 ${result.synced} 个`,
    );
    await load();
  }

  async function acknowledgeAlert(
    platform: AdminPlatformHealthItem["platform"],
    code: AdminPlatformHealthAlertCode,
  ) {
    const key = `${platform}:${code}:ack`;
    setAlertActionBusy(key);
    setSyncMessage("");
    const response = await api.acknowledgePlatformHealthAlert({
      platform,
      code,
      note: alertNote.trim() || undefined,
    });
    setAlertActionBusy("");
    if (!response.success) {
      setSyncMessage(response.error?.message || "Alert acknowledge failed");
      return;
    }
    setSyncMessage(`acknowledged ${platform}/${code}`);
    setAlertNote("");
    await loadHistory();
  }

  async function recordAlertHandling(
    platform: AdminPlatformHealthItem["platform"],
    code: AdminPlatformHealthAlertCode,
    outcome: AdminPlatformHealthHandlingOutcome,
  ) {
    const key = `${platform}:${code}:${outcome}`;
    setAlertActionBusy(key);
    setSyncMessage("");
    const response = await api.handlePlatformHealthAlert({
      platform,
      code,
      outcome,
      note: alertNote.trim() || undefined,
      nextAction:
        outcome === "retry_started" ? "platform sync retry" : undefined,
    });
    setAlertActionBusy("");
    if (!response.success) {
      setSyncMessage(response.error?.message || "Alert handling failed");
      return;
    }
    setSyncMessage(`recorded ${outcome} for ${platform}/${code}`);
    setAlertNote("");
    await loadHistory();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="h-4 w-4" />
            共用后台 P0
          </div>
          <h1 className="mt-2 text-2xl font-semibold">平台健康与真实样本</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => runSmoke()}
            disabled={loading || smokeRunning}
          >
            <RefreshCw
              className={`h-4 w-4 ${smokeRunning ? "animate-spin" : ""}`}
            />
            手动 smoke
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <input
          value={syncKeyword}
          onChange={(event) => setSyncKeyword(event.target.value)}
          className="h-9 min-w-56 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="同步关键词"
          placeholder="同步关键词"
        />
        <span className="text-sm text-muted-foreground">
          平台同步重试会写入商品缓存；健康 smoke 只读平台详情并写入健康历史。
        </span>
        {syncMessage ? (
          <span className="text-sm text-muted-foreground">{syncMessage}</span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader>
            <CardTitle>平台数</CardTitle>
            <CardDescription>四个平台</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "..." : items.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>已配置</CardTitle>
            <CardDescription>凭证可用</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {items.filter((item) => item.configured).length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>阻塞项</CardTitle>
            <CardDescription>凭证或样本缺失</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-amber-600">
            {blockedCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live smoke</CardTitle>
            <CardDescription>详情与图片通过</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-emerald-600">
            {passedCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>基础 schema</CardTitle>
            <CardDescription>订单/支付核心表</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Badge
              variant={schema?.allRequiredReady ? "secondary" : "destructive"}
            >
              {schema?.allRequiredReady ? "全部就绪" : "有缺失"}
            </Badge>
            <div className="text-muted-foreground">
              缺失 {schema?.missingRequired.length ?? "-"} 项
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>支付表</CardTitle>
            <CardDescription>payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Badge variant={tableBadge(paymentTable).variant}>
              {tableBadge(paymentTable).text}
            </Badge>
            <div className="text-muted-foreground">
              行数 {paymentTable?.rows ?? "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health alert rules</CardTitle>
          <CardDescription>
            Admin console notifications only; external push remains disabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <input
              value={alertNote}
              onChange={(event) => setAlertNote(event.target.value)}
              className="h-9 min-w-72 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="platform alert handling note"
              placeholder="Handling note for acknowledge / record"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={healthAlerts.total > 0 ? "destructive" : "secondary"}
            >
              current alerts {healthAlerts.total}
            </Badge>
            <span className="text-muted-foreground">
              critical {healthAlerts.blocked} / warning {healthAlerts.attention}
            </span>
          </div>
          {(healthAlerts.notifications || []).length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {(healthAlerts.notifications || []).map((notification, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        notification.severity === "critical"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {String(notification.platform)} /{" "}
                      {String(notification.code)}
                    </Badge>
                    <span className="text-muted-foreground">
                      {String(notification.channel)}
                    </span>
                  </div>
                  <div className="mt-2 text-muted-foreground">
                    {String(notification.message)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    externalPush={String(notification.externalPush)} action=
                    {String(notification.actionPath)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">
              No active health alerts.
            </div>
          )}
          {alertAuditLogs.length > 0 ? (
            <div className="rounded-lg border p-3">
              <div className="mb-2 font-medium">
                Recent alert handling audit
              </div>
              <div className="grid gap-2">
                {alertAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="grid gap-1 border-t pt-2 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.resourceId || "-"}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    {log.summary ? (
                      <div className="text-muted-foreground">{log.summary}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert handling state</CardTitle>
          <CardDescription>
            Mutable operations view for unhandled, in-progress, and resolved
            platform health alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={alertStateStatus}
              onChange={(event) =>
                setAlertStateStatus(
                  event.target.value as typeof alertStateStatus,
                )
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
              aria-label="platform alert handling status filter"
            >
              <option value="all">all handling states</option>
              <option value="unhandled">未处理</option>
              <option value="in_progress">处理中</option>
              <option value="resolved">已解决</option>
            </select>
            <Badge variant="outline">total {alertStateSummary.total}</Badge>
            <Badge
              variant={alertStateSummary.unhandled ? "destructive" : "outline"}
            >
              未处理 {alertStateSummary.unhandled}
            </Badge>
            <Badge
              variant={alertStateSummary.inProgress ? "outline" : "secondary"}
            >
              处理中 {alertStateSummary.inProgress}
            </Badge>
            <Badge variant="secondary">
              已解决 {alertStateSummary.resolved}
            </Badge>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Platform</th>
                  <th className="px-3 py-2 font-medium">Alert</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Last action</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {alertStates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No mutable alert states for this filter.
                    </td>
                  </tr>
                ) : null}
                {alertStates.map((state) => (
                  <tr key={state.id} className="border-t align-top">
                    <td className="px-3 py-2 font-medium capitalize">
                      {state.platform}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs">{state.code}</div>
                      <div className="mt-1 text-muted-foreground">
                        {state.message}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          state.status === "resolved"
                            ? "secondary"
                            : state.status === "unhandled"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {state.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <div>{state.lastAction || "-"}</div>
                      <div>{state.lastOutcome || "-"}</div>
                      <div>count {state.handlingCount}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {state.note || "-"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(state.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            基础 schema 状态
          </CardTitle>
          <CardDescription>
            只读检查真实生产库表状态，支付/订单能力上线前必须持续可见。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={historyPlatform}
              onChange={(event) =>
                setHistoryPlatform(event.target.value as typeof historyPlatform)
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
              aria-label="platform health history platform filter"
            >
              <option value="all">全部平台</option>
              <option value="yahoo">Yahoo Auction</option>
              <option value="yahoo-shopping">Yahoo Shopping</option>
              <option value="rakuten">Rakuten</option>
              <option value="amazon">Amazon</option>
              <option value="mercari">Mercari</option>
            </select>
            <select
              value={historyStatus}
              onChange={(event) =>
                setHistoryStatus(event.target.value as typeof historyStatus)
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
              aria-label="platform health history status filter"
            >
              <option value="all">全部状态</option>
              <option value="healthy">healthy</option>
              <option value="attention">attention</option>
              <option value="blocked">blocked</option>
            </select>
            <select
              value={historyAlertCode}
              onChange={(event) =>
                setHistoryAlertCode(
                  event.target.value as typeof historyAlertCode,
                )
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
              aria-label="platform health history alert code filter"
            >
              <option value="all">all alert codes</option>
              <option value="missing_credentials">missing_credentials</option>
              <option value="missing_sample">missing_sample</option>
              <option value="live_smoke_failed">live_smoke_failed</option>
              <option value="platform_blocked">platform_blocked</option>
              <option value="stale_sync">stale_sync</option>
            </select>
            <Badge
              variant={historyAlerts.total > 0 ? "destructive" : "secondary"}
            >
              alerts {historyAlerts.total}
            </Badge>
            <span className="text-sm text-muted-foreground">
              blocked {historyAlerts.blocked} / attention{" "}
              {historyAlerts.attention}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">能力</th>
                  <th className="px-3 py-2 font-medium">表</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">迁移</th>
                  <th className="px-3 py-2 font-medium">行数</th>
                  <th className="px-3 py-2 font-medium">用途</th>
                </tr>
              </thead>
              <tbody>
                {schemaTables.map((table) => (
                  <tr key={table.key} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{table.label}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {table.table}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={tableBadge(table).variant}>
                        {tableBadge(table).text}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {table.migrationRecorded === null
                        ? "-"
                        : table.migrationRecorded
                          ? "recorded"
                          : "missing"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {table.rows ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {table.requiredFor}
                      {table.error ? (
                        <div className="mt-1 break-all text-red-600">
                          {table.error}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <Card key={item.platform}>
            <CardHeader className="gap-3 md:flex md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="capitalize">{item.platform}</CardTitle>
                <CardDescription>
                  商品缓存 {item.totalProducts}，最近同步{" "}
                  {formatDate(item.lastSync)}
                </CardDescription>
              </div>
              <Badge variant={item.configured ? "secondary" : "outline"}>
                {item.configured ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {item.credentialStatus === "configured" ? "已配置" : "缺凭证"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <div className="font-medium">固定样本</div>
                <div className="mt-1 text-muted-foreground">
                  {item.sample.sampleId || "缺少样本"} /{" "}
                  {item.sample.sampleKind} / {item.sample.sampleSource}
                </div>
                {item.sample.sampleEnvKey ? (
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {item.sample.sampleEnvKey}
                  </div>
                ) : null}
                {item.sample.detailPath ? (
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {item.sample.detailPath}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">Live smoke</div>
                  <Badge variant={badgeVariant(item.sampleSmoke.status)}>
                    {item.sampleSmoke.status}
                  </Badge>
                </div>
                <div className="mt-2 grid gap-1 text-muted-foreground">
                  <div>详情：{item.sampleSmoke.detailStatus}</div>
                  <div>图片：{item.sampleSmoke.imageStatus}</div>
                  {item.sampleSmoke.imageUrl ? (
                    <div className="break-all">
                      图片地址：{item.sampleSmoke.imageUrl}
                    </div>
                  ) : null}
                  {item.sampleSmoke.error ? (
                    <div className="break-all text-red-600">
                      原因：{item.sampleSmoke.error}
                    </div>
                  ) : null}
                  <div>检查：{formatDate(item.sampleSmoke.checkedAt)}</div>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="font-medium">凭证状态</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(item.sample.credentialMissingKeys || []).length === 0 ? (
                    <Badge variant="secondary">required ready</Badge>
                  ) : (
                    item.sample.credentialMissingKeys?.map((key) => (
                      <Badge key={key} variant="destructive">
                        missing {key}
                      </Badge>
                    ))
                  )}
                  {item.sample.optionalCredentialMissingKeys?.map((key) => (
                    <Badge key={key} variant="outline">
                      optional {key}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-medium">图片源</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.sample.imageHosts.map((host) => (
                    <Badge key={host} variant="outline">
                      {host}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                {item.sample.notice}
              </div>
              {item.alerts?.length ? (
                <div className="rounded-lg border p-3">
                  <div className="font-medium">Alert operations</div>
                  <div className="mt-2 grid gap-2">
                    {item.alerts.map((alert) => {
                      const code = alert.code as AdminPlatformHealthAlertCode;
                      return (
                        <div
                          key={`${item.platform}-${alert.code}`}
                          className="rounded-md bg-muted p-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                alert.severity === "critical"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {alert.code}
                            </Badge>
                            <span className="text-muted-foreground">
                              {alert.message}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                acknowledgeAlert(item.platform, code)
                              }
                              disabled={
                                alertActionBusy ===
                                `${item.platform}:${code}:ack`
                              }
                            >
                              Acknowledge
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                recordAlertHandling(
                                  item.platform,
                                  code,
                                  "investigating",
                                )
                              }
                              disabled={
                                alertActionBusy ===
                                `${item.platform}:${code}:investigating`
                              }
                            >
                              Investigating
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                recordAlertHandling(
                                  item.platform,
                                  code,
                                  "retry_started",
                                )
                              }
                              disabled={
                                alertActionBusy ===
                                `${item.platform}:${code}:retry_started`
                              }
                            >
                              Retry noted
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                recordAlertHandling(
                                  item.platform,
                                  code,
                                  "resolved",
                                )
                              }
                              disabled={
                                alertActionBusy ===
                                `${item.platform}:${code}:resolved`
                              }
                            >
                              Resolved
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => retrySync(item.platform)}
                disabled={
                  syncingPlatform === item.platform ||
                  item.platform === "yahoo-shopping"
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    syncingPlatform === item.platform ? "animate-spin" : ""
                  }`}
                />
                重试同步
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近健康留痕</CardTitle>
          <CardDescription>
            每次后台健康检查会保存一组只读快照，方便追踪凭证、样本、详情和图片状态。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">时间</th>
                  <th className="px-3 py-2 font-medium">平台</th>
                  <th className="px-3 py-2 font-medium">总状态</th>
                  <th className="px-3 py-2 font-medium">凭证 / 样本</th>
                  <th className="px-3 py-2 font-medium">Smoke</th>
                  <th className="px-3 py-2 font-medium">详情 / 图片</th>
                  <th className="px-3 py-2 font-medium">样本 / 错误</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      {historyLoading ? "正在读取历史留痕" : "暂无历史留痕"}
                    </td>
                  </tr>
                ) : null}
                {history.map((item) => (
                  <tr key={item.id} className="border-t align-top">
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(item.checkedAt || item.createdAt)}
                    </td>
                    <td className="px-3 py-2 font-medium capitalize">
                      {item.platform}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={badgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                      {historyAlertCodes(item).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {historyAlertCodes(item).map((code) => (
                            <Badge key={code} variant="outline">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.credentialStatus} / {item.sampleStatus}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.sampleSmokeStatus}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.detailStatus} / {item.imageStatus}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <div>{item.sampleId || "-"}</div>
                      {item.error ? (
                        <div className="mt-1 max-w-md break-all text-red-600">
                          {item.error}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
