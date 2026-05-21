"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  CreditCard,
  FileSearch,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
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
import { Input } from "@/components/ui/input";
import { api, type AdminWorkflowSummary } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function adminHref(path?: string | null) {
  if (!path) return null;
  return path.startsWith("/zh/") ? path : `/zh${path}`;
}

export default function AdminWorkflowsPage() {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState<AdminWorkflowSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(
    () => ({
      orders: summary?.orders.length || 0,
      operations: summary?.orderOperations.length || 0,
      refunds: summary?.refundApprovals.length || 0,
      tickets: summary?.supportTickets.length || 0,
      audits: summary?.auditLogs.length || 0,
    }),
    [summary],
  );

  const load = useCallback(async (nextQuery: string) => {
    setLoading(true);
    setError("");
    const response = await api.getAdminWorkflowOrderSummary({
      q: nextQuery || undefined,
      limit: 10,
    });
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || "Workflow summary failed.");
      setSummary(null);
      return;
    }
    setSummary(response.data);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(query.trim());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            Shared admin console
          </div>
          <h1 className="mt-2 text-2xl font-semibold">
            Unified workflow workbench
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Search by order number, payment id, tracking number, ticket text, or
            audit text. This page only aggregates existing admin data.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => load(query.trim())}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order workflow search</CardTitle>
          <CardDescription>
            One workbench for kangaroo-japan and the DSR mini-program shared
            backend. No refund, customer message, or provider action runs here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order no / payment id / tracking no / ticket keyword"
              aria-label="workflow search keyword"
            />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Orders", value: counts.orders, icon: ShoppingCart },
          { label: "Operations", value: counts.operations, icon: ClipboardList },
          { label: "Refunds", value: counts.refunds, icon: CreditCard },
          { label: "Tickets", value: counts.tickets, icon: MessageSquare },
          { label: "Audit", value: counts.audits, icon: FileSearch },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <item.icon className="h-4 w-4" />
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {loading ? "..." : item.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Orders and operation states</CardTitle>
            <CardDescription>
              Entry point for manual cancel, refund, compensation, and shipping
              handling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary?.orders.length ? (
              <div className="space-y-3">
                {summary.orders.map((order) => (
                  <div key={order.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={adminHref(order.adminPath)!}
                      >
                        {order.orderNo}
                      </Link>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                    <div className="mt-2 text-muted-foreground">
                      {order.totalAmount} {order.totalCurrency} /{" "}
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No orders.</div>
            )}

            <div className="rounded-lg border">
              <div className="border-b px-3 py-2 text-sm font-medium">
                Order operation states
              </div>
              <div className="divide-y">
                {summary?.orderOperations.length ? (
                  summary.orderOperations.map((operation) => (
                    <div key={operation.id} className="p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          className="text-primary hover:underline"
                          href={adminHref(operation.adminPath)!}
                        >
                          {operation.orderNo || operation.orderId}
                        </Link>
                        <Badge variant="outline">{operation.status}</Badge>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {operation.operation} / {formatDate(operation.createdAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">
                    No operation states.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refund lifecycle and payments</CardTitle>
            <CardDescription>
              Approval ledger only. Provider refunds stay manual and guarded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {summary?.payments.length ? (
                summary.payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={adminHref(payment.adminPath)!}
                      >
                        {payment.paymentNo}
                      </Link>
                      <Badge variant="outline">{payment.status}</Badge>
                    </div>
                    <div className="mt-2 text-muted-foreground">
                      {payment.amount} {payment.currency} / {payment.provider}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No payments.</div>
              )}
            </div>

            <div className="rounded-lg border">
              <div className="border-b px-3 py-2 text-sm font-medium">
                Refund approvals
              </div>
              <div className="divide-y">
                {summary?.refundApprovals.length ? (
                  summary.refundApprovals.map((refund) => (
                    <div key={refund.id} className="p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          className="text-primary hover:underline"
                          href={adminHref(refund.adminPath)!}
                        >
                          {refund.paymentId}
                        </Link>
                        <Badge variant="outline">{refund.decision}</Badge>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {refund.amount} {refund.currency} / provider action:{" "}
                        {String(refund.providerRefundAction)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">
                    No refund approvals.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Support tickets</CardTitle>
            <CardDescription>
              Customer-service lifecycle and Hermes draft review remain
              human-reviewed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary?.supportTickets.length ? (
              summary.supportTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={adminHref(ticket.adminPath)!}
                    >
                      {ticket.ticketNumber}
                    </Link>
                    <Badge variant="outline">{ticket.status}</Badge>
                  </div>
                  <div className="mt-1">{ticket.subject}</div>
                  <div className="mt-1 text-muted-foreground">
                    {ticket.category} / {ticket.site} /{" "}
                    {formatDate(ticket.updatedAt)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No related tickets.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit trail</CardTitle>
            <CardDescription>
              Read-only trace across order, payment, refund, and support
              handling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary?.auditLogs.length ? (
              summary.auditLogs.map((audit) => (
                <div key={audit.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={adminHref(audit.adminPath)!}
                    >
                      {audit.action}
                    </Link>
                    <Badge variant="outline">{audit.resourceType}</Badge>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {audit.summary || "-"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {audit.resourceId || "-"} / {formatDate(audit.createdAt)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No audit logs.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4" />
        <span>
          Safety: admin-only, readonly, no customer message, no order state
          change, no provider refund. Use the linked module pages for guarded
          lifecycle actions.
        </span>
      </div>
    </div>
  );
}
