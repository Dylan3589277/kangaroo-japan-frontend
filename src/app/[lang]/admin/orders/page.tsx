"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, ShoppingCart } from "lucide-react";

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
import { api, type AdminOrderItem } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(params?: { q?: string; status?: string }) {
    setLoading(true);
    setError("");
    const response = await api.listAdminOrders({
      q: params?.q || undefined,
      status: params?.status || undefined,
      limit: 20,
    });
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || "订单读取失败");
      setOrders([]);
      setTotal(0);
      return;
    }
    setOrders(response.data.data || []);
    setTotal(response.data.pagination?.total || 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({ q: query.trim(), status: status.trim() });
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
            <ShoppingCart className="h-4 w-4" />
            共用后台 P0
          </div>
          <h1 className="mt-2 text-2xl font-semibold">订单只读台账</h1>
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
            订单号、物流号、支付 ID；只读不改状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_220px_auto]"
            onSubmit={handleSubmit}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="订单号 / 物流号 / 支付 ID"
            />
            <Input
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="状态，逗号分隔"
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

      <Card>
        <CardHeader>
          <CardTitle>订单列表</CardTitle>
          <CardDescription>
            共 {total} 笔，显示前 {orders.length} 笔
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">订单号</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">金额</th>
                  <th className="px-3 py-2 font-medium">商品</th>
                  <th className="px-3 py-2 font-medium">支付</th>
                  <th className="px-3 py-2 font-medium">物流</th>
                  <th className="px-3 py-2 font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      {loading ? "正在读取订单" : "暂无订单"}
                    </td>
                  </tr>
                ) : null}
                {orders.map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {order.order_no}
                      {order.linked_context ? (
                        <div className="mt-2 grid gap-1 text-xs font-normal text-muted-foreground">
                          <span>
                            support: {order.linked_context.support_lookup_path}
                          </span>
                          {order.linked_context.audit_lookup_path ? (
                            <Link
                              className="text-primary hover:underline"
                              href={order.linked_context.audit_lookup_path}
                            >
                              order audit trail
                            </Link>
                          ) : null}
                          {order.linked_context.refund_review_candidate ? (
                            <Badge variant="outline" className="w-fit">
                              refund candidate
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{order.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {order.total_amount} {order.total_currency}
                    </td>
                    <td className="max-w-[320px] px-3 py-2 text-muted-foreground">
                      {order.items
                        .map(
                          (item) =>
                            `${item.title || item.product_id} x ${item.quantity}`,
                        )
                        .join("；") || "-"}
                      {order.linked_context?.product_sources ? (
                        <div className="mt-2 flex flex-wrap gap-1 text-xs">
                          {order.linked_context.product_sources.platforms.map(
                            (platform) => (
                              <Badge key={platform} variant="outline">
                                {platform}
                              </Badge>
                            ),
                          )}
                          <span>
                            detail links{" "}
                            {
                              order.linked_context.product_sources.detail_links
                                .length
                            }
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {order.payment_link?.payment_id ||
                        order.payment_method ||
                        "-"}{" "}
                      / {formatDate(order.paid_at)}
                      {order.payment_link?.admin_path ? (
                        <div className="mt-1 text-xs">
                          <Link
                            className="text-primary hover:underline"
                            href={order.payment_link.admin_path}
                          >
                            payment admin
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {order.shipping_carrier || "-"} /{" "}
                      {order.tracking_number || "-"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(order.created_at)}
                      {order.timeline?.some((item) => item.done) ? (
                        <div className="mt-1 text-xs">
                          {order.timeline
                            .filter((item) => item.done)
                            .map((item) => item.label)
                            .join(" / ")}
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
