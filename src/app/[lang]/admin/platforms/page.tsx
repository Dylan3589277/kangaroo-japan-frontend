"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, type AdminPlatformHealthItem } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export default function AdminPlatformsPage() {
  const [items, setItems] = useState<AdminPlatformHealthItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const blockedCount = useMemo(
    () => items.filter((item) => item.status === "blocked").length,
    [items],
  );

  async function load() {
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
            <Server className="h-4 w-4" />
            共用后台 P0
          </div>
          <h1 className="mt-2 text-2xl font-semibold">平台健康与真实样本</h1>
        </div>
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

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>平台数</CardTitle>
            <CardDescription>
              Yahoo / Rakuten / Amazon / Mercari
            </CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "..." : items.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>已配置</CardTitle>
            <CardDescription>可进入真实样本烟测</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {items.filter((item) => item.configured).length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>阻塞项</CardTitle>
            <CardDescription>凭证或详情样本待补</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-amber-600">
            {blockedCount}
          </CardContent>
        </Card>
      </div>

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
                  {item.sample.sampleId} / {item.sample.sampleKind}
                </div>
                {item.sample.detailPath ? (
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {item.sample.detailPath}
                  </div>
                ) : null}
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-medium">Smoke 状态</div>
                <div className="mt-2 grid gap-1 text-muted-foreground">
                  <div>整体：{item.sampleSmoke.status}</div>
                  <div>详情：{item.sampleSmoke.detailStatus}</div>
                  <div>图片：{item.sampleSmoke.imageStatus}</div>
                  <div>检查：{formatDate(item.sampleSmoke.checkedAt)}</div>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
