"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, RefreshCw, Search, ShieldCheck } from "lucide-react";

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
import { api, type AdminPaymentItem } from "@/lib/api";
import type {
  AdminPaymentReconciliation,
  AdminRefundApprovalItem,
} from "@/lib/api";

type RefundReviewDecision =
  | "needs_review"
  | "approved_for_manual_refund"
  | "rejected";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function refundReviewLabel(decision: RefundReviewDecision | string) {
  if (decision === "approved_for_manual_refund") return "批准人工退款";
  if (decision === "rejected") return "驳回退款";
  return "需要复核";
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [approvals, setApprovals] = useState<AdminRefundApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reconciliation, setReconciliation] =
    useState<AdminPaymentReconciliation | null>(null);
  const [reviewDecision, setReviewDecision] = useState<
    Record<string, RefundReviewDecision>
  >({});
  const [reviewReason, setReviewReason] = useState<Record<string, string>>({});
  const [reviewingPaymentId, setReviewingPaymentId] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const latestApprovalByPayment = useMemo(() => {
    const next = new Map<string, AdminRefundApprovalItem>();
    for (const approval of approvals) {
      if (!next.has(approval.paymentId)) {
        next.set(approval.paymentId, approval);
      }
    }
    return next;
  }, [approvals]);

  async function load(params?: {
    q?: string;
    status?: string;
    provider?: string;
  }) {
    setLoading(true);
    setError("");
    const response = await api.listAdminPayments({
      q: params?.q || undefined,
      status: params?.status || undefined,
      provider: params?.provider || undefined,
      limit: 20,
    });
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || "支付流水读取失败");
      setPayments([]);
      setApprovals([]);
      setTotal(0);
      return;
    }
    setPayments(response.data.data || []);
    setTotal(response.data.pagination?.total || 0);

    const [reconciliationResponse, approvalsResponse] = await Promise.all([
      api.getAdminPaymentReconciliation(),
      api.listAdminRefundApprovals({ limit: 50 }),
    ]);
    if (reconciliationResponse.success && reconciliationResponse.data) {
      setReconciliation(reconciliationResponse.data);
    }
    if (approvalsResponse.success && approvalsResponse.data) {
      setApprovals(approvalsResponse.data.data || []);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({
      q: query.trim(),
      status: status.trim(),
      provider: provider.trim(),
    });
  }

  async function submitRefundReview(payment: AdminPaymentItem) {
    const decision = reviewDecision[payment.id] || "needs_review";
    setReviewingPaymentId(payment.id);
    setReviewMessage("");
    const response = await api.recordAdminRefundReview(payment.id, {
      decision,
      reason: reviewReason[payment.id]?.trim() || null,
    });
    setReviewingPaymentId("");
    if (!response.success || !response.data) {
      setReviewMessage(response.error?.message || "退款审核记录失败");
      return;
    }
    setReviewMessage(
      `已记录 ${payment.paymentNo} 的退款审核：${refundReviewLabel(
        decision,
      )}；未触发真实退款，也未改写支付状态。`,
    );
    await load({
      q: query.trim(),
      status: status.trim(),
      provider: provider.trim(),
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
            <CreditCard className="h-4 w-4" />
            共用后台 P0
          </div>
          <h1 className="mt-2 text-2xl font-semibold">支付流水与退款审核</h1>
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
            支付号、网关 ID、订单号；不展示卡号等敏感字段。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]"
            onSubmit={handleSubmit}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="支付号 / 网关 ID / 订单号"
            />
            <Input
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="状态"
            />
            <Input
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="stripe / pingxx"
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

      {reviewMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {reviewMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>对账样本</CardTitle>
            <CardDescription>最近 500 笔支付记录</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {reconciliation?.total ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>超时待支付</CardTitle>
            <CardDescription>创建超过 1 小时仍 pending</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-amber-600">
            {reconciliation?.stalePending ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>退款候选</CardTitle>
            <CardDescription>已支付但订单取消/退款</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-red-600">
            {reconciliation?.refundCandidates ?? "-"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>流水列表</CardTitle>
          <CardDescription>
            共 {total} 笔，显示前 {payments.length}{" "}
            笔。退款审核进入生命周期台账，只写审计。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1520px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">支付号</th>
                  <th className="px-3 py-2 font-medium">订单号</th>
                  <th className="px-3 py-2 font-medium">金额</th>
                  <th className="px-3 py-2 font-medium">通道</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">退款</th>
                  <th className="px-3 py-2 font-medium">最近审核</th>
                  <th className="px-3 py-2 font-medium">支付时间</th>
                  <th className="px-3 py-2 font-medium">退款审核</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      {loading ? "正在读取支付流水" : "暂无支付流水"}
                    </td>
                  </tr>
                ) : null}
                {payments.map((payment) => {
                  const latestApproval = latestApprovalByPayment.get(
                    payment.id,
                  );
                  return (
                    <tr key={payment.id} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">
                        {payment.paymentNo}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {payment.orderLink?.adminPath ? (
                          <Link
                            className="text-primary hover:underline"
                            href={payment.orderLink.adminPath}
                          >
                            {payment.orderNo || payment.orderId}
                          </Link>
                        ) : (
                          payment.orderNo || payment.orderId
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {payment.amount} {payment.currency}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {payment.provider} / {payment.method}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{payment.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {payment.refundAmount > 0 ? (
                          <span>
                            {payment.refundAmount} {payment.currency}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="min-w-[190px] px-3 py-2 text-muted-foreground">
                        {latestApproval ? (
                          <div className="grid gap-1">
                            <Badge variant="outline" className="w-fit">
                              {refundReviewLabel(latestApproval.decision)}
                            </Badge>
                            <span>{formatDate(latestApproval.createdAt)}</span>
                            <span className="text-xs">
                              provider refund:{" "}
                              {String(latestApproval.providerRefundAction)}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(payment.paidAt)}
                      </td>
                      <td className="min-w-[360px] px-3 py-2">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            生命周期留痕，不触发 provider refund
                          </div>
                          <div className="grid gap-2 md:grid-cols-[150px_1fr_auto]">
                            <select
                              className="h-9 rounded-md border bg-background px-2 text-sm"
                              value={
                                reviewDecision[payment.id] || "needs_review"
                              }
                              onChange={(event) =>
                                setReviewDecision((current) => ({
                                  ...current,
                                  [payment.id]: event.target
                                    .value as RefundReviewDecision,
                                }))
                              }
                            >
                              <option value="needs_review">需要复核</option>
                              <option value="approved_for_manual_refund">
                                批准人工退款
                              </option>
                              <option value="rejected">驳回</option>
                            </select>
                            <Input
                              value={reviewReason[payment.id] || ""}
                              onChange={(event) =>
                                setReviewReason((current) => ({
                                  ...current,
                                  [payment.id]: event.target.value,
                                }))
                              }
                              placeholder="原因 / 备注"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => submitRefundReview(payment)}
                              disabled={reviewingPaymentId === payment.id}
                            >
                              {reviewingPaymentId === payment.id
                                ? "记录中"
                                : "记录"}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
