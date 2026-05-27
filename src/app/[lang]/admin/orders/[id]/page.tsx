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
import { api, type AdminLegacyOrderSnapshot } from "@/lib/api";

const NOTICE =
  "此页面展示旧系统基础订单信息，部分字段（地址、申报、物流）需补充旧系统管理员接口后方可展示";

const PENDING_FIELD_LABELS: Record<string, string> = {
  pay_time: "pay_time",
  shipped_at: "shipped_at",
  address: "地址",
  declaration: "申报",
  tracking: "物流",
};

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

function DetailRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="grid gap-1 rounded-md border bg-background px-4 py-3 text-sm md:grid-cols-[180px_1fr] md:gap-4">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0">
        <div className="break-words font-medium text-foreground">{value}</div>
        {note ? (
          <div className="mt-1 text-xs text-muted-foreground">{note}</div>
        ) : null}
      </div>
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
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex gap-2">
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
          <h1 className="mt-2 text-2xl font-semibold">旧订单基础参考</h1>
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
          <CardTitle>基础信息</CardTitle>
          <CardDescription>
            仅展示后端旧订单 snapshot 当前批准返回的基础字段。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              正在读取旧订单基础信息
            </div>
          ) : snapshot ? (
            <>
              <DetailRow label="旧订单 id" value={snapshot.order_id} />
              <DetailRow
                label="旧订单号 out_trade_no"
                value={valueText(snapshot.out_trade_no)}
              />
              <DetailRow
                label="商品名称"
                value={valueText(snapshot.goods_name)}
              />
              <DetailRow label="数量" value={numberText(snapshot.quantity)} />
              <DetailRow
                label="单价"
                value={moneyText(snapshot.price, "JPY")}
              />
              <DetailRow
                label="日元总金额 amount"
                value={moneyText(snapshot.amount, "JPY")}
              />
              <DetailRow
                label="人民币金额 amount_rmb"
                value={moneyText(snapshot.amount_rmb, "RMB")}
                note="旧源字段，仅供参考"
              />
              <DetailRow label="状态" value={valueText(snapshot.status)} />
              <DetailRow
                label="创建时间"
                value={formatDate(snapshot.created_at)}
              />
            </>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              暂无旧订单基础信息
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>扩展字段状态</CardTitle>
          <CardDescription>
            下列字段当前不可用，仅提示需要旧系统管理员接口补充。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingFields.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {pendingFields.map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {PENDING_FIELD_LABELS[field] || field}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    待旧系统管理员接口补充 / 不可用
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              暂无扩展字段状态
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
