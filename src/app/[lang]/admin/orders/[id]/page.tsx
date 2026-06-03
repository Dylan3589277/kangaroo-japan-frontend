"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type AdminLegacyOrderSnapshot } from "@/lib/api";

const NOTICE =
  "此页面展示旧系统基础订单信息，部分字段（地址、申报、物流）需补充旧系统管理员接口后方可展示";

const BASE_FIELD_NOTE = "旧源字段，仅供参考";

function valueText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function numberText(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("zh-CN");
}

function moneyText(value?: number | null, currency?: string) {
  const formatted = numberText(value);
  return formatted === "-" ? "-" : `${formatted} ${currency}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t px-4 py-3 text-sm first:border-t-0 md:grid-cols-[190px_1fr] md:gap-4">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-2 px-4 py-3 md:grid-cols-[190px_1fr] md:gap-4"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
      ))}
    </div>
  );
}

export default function AdminLegacyOrderSnapshotPage() {
  const params = useParams();
  const orderId = String(params.id || "");
  const [snapshot, setSnapshot] = useState<AdminLegacyOrderSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pendingFields = useMemo(() => {
    return snapshot?.fields_pending_extended_api || [];
  }, [snapshot]);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError("");
    const response = await api.getAdminLegacyOrderSnapshot(orderId);
    setLoading(false);
    if (!response.success || !response.data) {
      setSnapshot(null);
      setError(response.error?.message || "旧订单基础信息读取失败");
      return;
    }
    setSnapshot(response.data);
  }, [orderId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6 pt-14">
      <div className="fixed left-52 right-0 top-16 z-20 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-950 shadow-sm">
        <div className="flex max-w-7xl gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{NOTICE}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            旧系统只读参考
          </div>
          <h1 className="mt-2 text-2xl font-semibold">旧订单基础信息</h1>
        </div>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          legacy_dsr_readonly
        </Badge>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>基础字段</CardTitle>
              <CardDescription>
                仅展示后端简化旧订单 snapshot 当前批准返回的字段。
              </CardDescription>
            </div>
            <Badge variant="outline">{BASE_FIELD_NOTE}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <LoadingRows />
          ) : snapshot ? (
            <div className="divide-y">
              <DetailRow label="旧订单 id" value={snapshot.order_id} />
              <DetailRow
                label="旧订单号 out_trade_no"
                value={valueText(snapshot.out_trade_no)}
              />
              <DetailRow
                label="商品名称 goods_name"
                value={valueText(snapshot.goods_name)}
              />
              <DetailRow
                label="数量 quantity"
                value={numberText(snapshot.quantity)}
              />
              <DetailRow
                label="单价 price"
                value={moneyText(snapshot.price, "JPY")}
              />
              <DetailRow
                label="日元金额 amount"
                value={moneyText(snapshot.amount, "JPY")}
              />
              <DetailRow
                label="人民币金额 amount_rmb"
                value={moneyText(snapshot.amount_rmb, "RMB")}
              />
              <DetailRow
                label="状态 status"
                value={valueText(snapshot.status)}
              />
              <DetailRow
                label="创建时间 created_at"
                value={formatDate(snapshot.created_at)}
              />
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              暂无旧订单基础信息
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>待补充字段</CardTitle>
          <CardDescription>
            下列字段当前不可用，只标记等待旧系统管理员接口补充。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : pendingFields.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {pendingFields.map((field) => (
                <div
                  key={field}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {field}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    不可用
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              暂无待补充字段
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
