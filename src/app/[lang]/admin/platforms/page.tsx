"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
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
    const [historyResponse, migrationResponse] = await Promise.all([
      api.getAdminPlatformHealthHistory({ limit: 16 }),
      api.getAdminPlatformHealthMigrationStatus(),
    ]);
    setHistoryLoading(false);
    if (historyResponse.success && historyResponse.data) {
      setHistory(historyResponse.data.data || []);
    }
    if (migrationResponse.success && migrationResponse.data) {
      setMigration(migrationResponse.data);
    }
  }, []);

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
    setSyncMessage("健康 smoke 已写入历史");
    await loadHistory();
  }

  async function retrySync(platform: AdminPlatformHealthItem["platform"]) {
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
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            基础 schema 状态
          </CardTitle>
          <CardDescription>
            只读检查真实生产库表状态，支付/订单能力上线前必须持续可见。
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => retrySync(item.platform)}
                disabled={syncingPlatform === item.platform}
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
