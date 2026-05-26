"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  FileSearch,
  KeyRound,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
  Users,
  Warehouse,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  api,
  type AdminWorkflowSummary,
  type LegacyDsrReadonlyApiResponse,
  type LegacyDsrReadonlyParams,
  type LegacyDsrReadonlyRoute,
  type ManualHandlingStatus,
} from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function adminHref(path?: string | null) {
  if (!path) return null;
  return path.startsWith("/zh/") ? path : `/zh${path}`;
}

function handlingLabel(value?: string | null) {
  if (value === "resolved") return "Resolved";
  if (value === "in_progress") return "In progress";
  return "Unhandled";
}

function queueTypeLabel(value: string) {
  if (value === "refund") return "Refund";
  if (value === "support") return "Support";
  return "Warehouse";
}

const LEGACY_DSR_ROUTES: Array<{
  value: LegacyDsrReadonlyRoute;
  label: string;
  sourceRoute: string;
  placeholder: string;
}> = [
  {
    value: "orders.mine",
    label: "Orders.mine",
    sourceRoute: "api/orders/mine",
    placeholder: "status / keyword / order no",
  },
  {
    value: "orders.detail",
    label: "Orders.detail",
    sourceRoute: "api/orders/detail",
    placeholder: "legacy order id",
  },
  {
    value: "warehouse.orders",
    label: "Stores.orders",
    sourceRoute: "api/stores/orders",
    placeholder: "warehouse order keyword",
  },
  {
    value: "warehouse.ships",
    label: "Stores.ships",
    sourceRoute: "api/stores/ships",
    placeholder: "shipment keyword",
  },
  {
    value: "warehouse.photos",
    label: "Stores.photos",
    sourceRoute: "api/stores/photos",
    placeholder: "order id / photo status",
  },
];

function selectedLegacyRoute(route: LegacyDsrReadonlyRoute) {
  return (
    LEGACY_DSR_ROUTES.find((item) => item.value === route) ||
    LEGACY_DSR_ROUTES[0]
  );
}

function buildLegacyDsrParams(
  route: LegacyDsrReadonlyRoute,
  value: string,
): LegacyDsrReadonlyParams {
  const trimmed = value.trim();
  if (!trimmed) return { page: 1 };
  if (route === "orders.detail") return { id: trimmed };
  if (route === "warehouse.photos") return { id: trimmed, orderId: trimmed };
  return { kw: trimmed, q: trimmed, page: 1 };
}

function isSensitiveKey(key: string) {
  return /token|authorization|password|secret|cookie/i.test(key);
}

function formatLegacyJson(value: unknown) {
  try {
    return JSON.stringify(
      value,
      (key, nestedValue) => (isSensitiveKey(key) ? "[hidden]" : nestedValue),
      2,
    );
  } catch {
    return String(value);
  }
}

const ALL_FILTER_VALUE = "__all";
const NO_STATUS_VALUE = "__none";
const UNASSIGNED_OWNER_ID = "__unassigned";
const SLA_WARNING_RATIO = 0.25; // TODO: wire real API/config for warning threshold.

type QueueItem = NonNullable<AdminWorkflowSummary["operationQueue"]>[number];
type OwnerOption = NonNullable<AdminWorkflowSummary["ownerOptions"]>[number];
type QueueSla = NonNullable<AdminWorkflowSummary["queueSla"]>;
type OrderSummary = AdminWorkflowSummary["orders"][number];
type SlaTone = "normal" | "warning" | "overdue";
type OrderStatusFilterKey =
  | "orderProcessing"
  | "support"
  | "refund"
  | "warehouse";

type OrderWorkflowRow = {
  order: OrderSummary;
  orderProcessingStatus: string;
  orderProcessingDetail: string;
  supportStatus: string;
  supportDetail: string;
  refundStatus: string;
  refundDetail: string;
  warehouseStatus: string;
  warehouseDetail: string;
  queueItems: QueueItem[];
};

function queueKey(item: QueueItem) {
  return `${item.type}:${item.id}`;
}

function statusFilterLabel(value: string) {
  if (value === ALL_FILTER_VALUE) return "All";
  if (value === NO_STATUS_VALUE) return "None";
  return value;
}

function normalizeStatus(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || NO_STATUS_VALUE;
}

function ownerDisplayName(
  ownerId: string | null | undefined,
  owners: OwnerOption[],
) {
  if (!ownerId || ownerId === UNASSIGNED_OWNER_ID) return "Unassigned";
  return owners.find((owner) => owner.id === ownerId)?.label || ownerId;
}

function formatDuration(ms: number) {
  const absMs = Math.abs(ms);
  const totalMinutes = Math.max(1, Math.round(absMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function slaHoursForType(type: QueueItem["type"], queueSla?: QueueSla) {
  if (!queueSla) return null;
  if (type === "refund") return queueSla.refundApprovalHours;
  if (type === "support") return queueSla.supportTicketHours;
  return queueSla.warehouseExceptionHours;
}

function getQueueSlaState(
  item: QueueItem,
  queueSla: QueueSla | undefined,
  nowMs: number,
): { tone: SlaTone; label: string; detail: string } {
  if (!item.dueAt) {
    return {
      tone: "normal",
      label: "SLA not set",
      detail: "No due time returned",
    };
  }

  const dueMs = Date.parse(item.dueAt);
  if (Number.isNaN(dueMs)) {
    return {
      tone: "warning",
      label: "SLA unknown",
      detail: "Invalid due time",
    };
  }

  const remainingMs = dueMs - nowMs;
  if (remainingMs <= 0 || item.isOverdue) {
    return {
      tone: "overdue",
      label: `Overdue ${formatDuration(remainingMs)}`,
      detail: `Due ${formatDate(item.dueAt)}`,
    };
  }

  const slaHours = slaHoursForType(item.type, queueSla);
  const warningMs = slaHours
    ? slaHours * 60 * 60 * 1000 * SLA_WARNING_RATIO
    : 0;
  const tone: SlaTone =
    warningMs > 0 && remainingMs <= warningMs ? "warning" : "normal";

  return {
    tone,
    label: `Due in ${formatDuration(remainingMs)}`,
    detail: `Due ${formatDate(item.dueAt)}`,
  };
}

function slaClassName(tone: SlaTone) {
  if (tone === "overdue")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function orderTokens(order: OrderSummary) {
  return [order.id, order.orderNo, order.paymentId].filter(Boolean) as string[];
}

function textMatchesOrder(
  order: OrderSummary,
  values: Array<string | null | undefined>,
) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (!text) return false;
  return orderTokens(order).some((token) => text.includes(token.toLowerCase()));
}

function latestByCreatedAt<
  T extends { createdAt?: string; updatedAt?: string },
>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      Date.parse(right.createdAt || right.updatedAt || "") -
      Date.parse(left.createdAt || left.updatedAt || ""),
  )[0];
}

// TODO: wire real API order-level workflow_status fields when backend exposes
// explicit order/support/refund/warehouse status columns for this workbench.
function buildOrderWorkflowRows(
  summary: AdminWorkflowSummary | null,
): OrderWorkflowRow[] {
  if (!summary) return [];

  return summary.orders.map((order) => {
    const latestOrderOperation = latestByCreatedAt(
      summary.orderOperations.filter(
        (operation) =>
          operation.orderId === order.id ||
          operation.orderNo === order.orderNo ||
          textMatchesOrder(order, [
            operation.adminPath,
            operation.primaryAdminPath,
          ]),
      ),
    );
    const latestRefund = latestByCreatedAt(
      summary.refundApprovals.filter(
        (refund) =>
          refund.orderId === order.id ||
          refund.paymentId === order.paymentId ||
          textMatchesOrder(order, [refund.adminPath]),
      ),
    );
    const latestWarehouse = latestByCreatedAt(
      summary.warehouseOperations.filter(
        (warehouse) =>
          warehouse.orderId === order.id ||
          warehouse.orderIds.includes(order.id) ||
          warehouse.shipmentOrderId === order.id ||
          textMatchesOrder(order, [
            warehouse.adminPath,
            warehouse.orderAdminPath,
            warehouse.trackingNumber,
          ]),
      ),
    );
    const latestSupport = latestByCreatedAt(
      summary.supportTickets.filter((ticket) =>
        textMatchesOrder(order, [
          ticket.ticketNumber,
          ticket.subject,
          ticket.adminPath,
        ]),
      ),
    );
    const queueItems = (summary.operationQueue || []).filter((item) =>
      textMatchesOrder(order, [
        item.id,
        item.label,
        item.summary,
        item.adminPath,
      ]),
    );

    return {
      order,
      orderProcessingStatus: normalizeStatus(
        latestOrderOperation?.status || order.status,
      ),
      orderProcessingDetail: latestOrderOperation
        ? `${latestOrderOperation.operation} / ${formatDate(latestOrderOperation.createdAt)}`
        : `Order status / ${formatDate(order.updatedAt)}`,
      supportStatus: normalizeStatus(
        latestSupport?.handlingStatus || latestSupport?.status,
      ),
      supportDetail: latestSupport
        ? `${latestSupport.ticketNumber} / ${latestSupport.subject}`
        : "No linked support ticket",
      refundStatus: normalizeStatus(
        latestRefund?.handlingStatus || latestRefund?.decision,
      ),
      refundDetail: latestRefund
        ? `${latestRefund.amount} ${latestRefund.currency} / ${formatDate(latestRefund.createdAt)}`
        : "No linked refund approval",
      warehouseStatus: normalizeStatus(
        latestWarehouse?.handlingStatus || latestWarehouse?.action,
      ),
      warehouseDetail: latestWarehouse
        ? `${latestWarehouse.action} / ${formatDate(latestWarehouse.createdAt)}`
        : order.warehouseAdminPath
          ? "Warehouse flow available"
          : "No linked warehouse operation",
      queueItems,
    };
  });
}

function orderRowSlaState(
  row: OrderWorkflowRow,
  queueSla: QueueSla | undefined,
  nowMs: number,
) {
  const states = row.queueItems.map((item) =>
    getQueueSlaState(item, queueSla, nowMs),
  );
  return (
    states.find((state) => state.tone === "overdue") ||
    states.find((state) => state.tone === "warning") ||
    states[0] || {
      tone: "normal" as SlaTone,
      label: "No active SLA",
      detail: "No linked queue item",
    }
  );
}

export default function AdminWorkflowsPage() {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState<AdminWorkflowSummary | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workflowHandlingStatus, setWorkflowHandlingStatus] = useState<
    "all" | ManualHandlingStatus
  >("all");
  const [workflowOwnerId, setWorkflowOwnerId] = useState("");
  const [workflowOverdueOnly, setWorkflowOverdueOnly] = useState(false);
  const [legacyDsrRoute, setLegacyDsrRoute] =
    useState<LegacyDsrReadonlyRoute>("orders.mine");
  const [legacyDsrQuery, setLegacyDsrQuery] = useState("");
  const [legacyDsrLoading, setLegacyDsrLoading] = useState(false);
  const [legacyDsrError, setLegacyDsrError] = useState("");
  const [legacyDsrResult, setLegacyDsrResult] =
    useState<LegacyDsrReadonlyApiResponse | null>(null);
  const [orderStatusFilters, setOrderStatusFilters] = useState<
    Record<OrderStatusFilterKey, string>
  >({
    orderProcessing: ALL_FILTER_VALUE,
    support: ALL_FILTER_VALUE,
    refund: ALL_FILTER_VALUE,
    warehouse: ALL_FILTER_VALUE,
  });
  const [localQueueAssignments, setLocalQueueAssignments] = useState<
    Record<string, string>
  >({});
  const [selectedQueueKeys, setSelectedQueueKeys] = useState<string[]>([]);
  const [takeoverOwnerId, setTakeoverOwnerId] = useState("");
  const [confirmTakeoverOpen, setConfirmTakeoverOpen] = useState(false);

  const counts = useMemo(
    () => ({
      orders: summary?.orders.length || 0,
      operations: summary?.orderOperations.length || 0,
      warehouse: summary?.warehouseOperations.length || 0,
      refunds: summary?.refundApprovals.length || 0,
      tickets: summary?.supportTickets.length || 0,
      audits: summary?.auditLogs.length || 0,
    }),
    [summary],
  );
  const queueItems = useMemo(() => summary?.operationQueue || [], [summary]);
  const ownerOptions = useMemo(() => {
    const baseOptions = summary?.ownerOptions?.length
      ? summary.ownerOptions
      : [];
    const hasUnassigned = baseOptions.some(
      (owner) => owner.id === UNASSIGNED_OWNER_ID,
    );

    return hasUnassigned
      ? baseOptions
      : [
          {
            id: UNASSIGNED_OWNER_ID,
            label: "Unassigned",
            count: summary?.queueStats?.unassigned ?? 0,
            source: "unassigned",
          },
          ...baseOptions,
        ];
  }, [summary]);
  const assignableOwnerOptions = ownerOptions.filter(
    (owner) => owner.id !== UNASSIGNED_OWNER_ID,
  );
  const selectedTakeoverOwnerId =
    takeoverOwnerId || assignableOwnerOptions[0]?.id || "";
  const legacyRoute = selectedLegacyRoute(legacyDsrRoute);
  const legacyTimeline = legacyDsrResult?.timeline || [];
  const orderWorkflowRows = useMemo(
    () => buildOrderWorkflowRows(summary),
    [summary],
  );
  const filteredOrderWorkflowRows = useMemo(
    () =>
      orderWorkflowRows.filter(
        (row) =>
          (orderStatusFilters.orderProcessing === ALL_FILTER_VALUE ||
            row.orderProcessingStatus === orderStatusFilters.orderProcessing) &&
          (orderStatusFilters.support === ALL_FILTER_VALUE ||
            row.supportStatus === orderStatusFilters.support) &&
          (orderStatusFilters.refund === ALL_FILTER_VALUE ||
            row.refundStatus === orderStatusFilters.refund) &&
          (orderStatusFilters.warehouse === ALL_FILTER_VALUE ||
            row.warehouseStatus === orderStatusFilters.warehouse),
      ),
    [orderStatusFilters, orderWorkflowRows],
  );
  const orderStatusOptions = useMemo(() => {
    function optionsFor(key: OrderStatusFilterKey) {
      const values = new Set<string>();
      orderWorkflowRows.forEach((row) => {
        values.add(row[`${key}Status` as const]);
      });
      return [ALL_FILTER_VALUE, ...Array.from(values).sort()];
    }

    return {
      orderProcessing: optionsFor("orderProcessing"),
      support: optionsFor("support"),
      refund: optionsFor("refund"),
      warehouse: optionsFor("warehouse"),
    };
  }, [orderWorkflowRows]);
  const filteredQueueItems = useMemo(
    () =>
      queueItems.filter((item) => {
        if (!workflowOwnerId) return true;
        const effectiveOwnerId =
          localQueueAssignments[queueKey(item)] ||
          item.ownerId ||
          UNASSIGNED_OWNER_ID;

        return workflowOwnerId === UNASSIGNED_OWNER_ID
          ? effectiveOwnerId === UNASSIGNED_OWNER_ID
          : effectiveOwnerId === workflowOwnerId;
      }),
    [localQueueAssignments, queueItems, workflowOwnerId],
  );
  const selectedQueueItems = filteredQueueItems.filter((item) =>
    selectedQueueKeys.includes(queueKey(item)),
  );
  const allFilteredQueueSelected =
    filteredQueueItems.length > 0 &&
    filteredQueueItems.every((item) =>
      selectedQueueKeys.includes(queueKey(item)),
    );

  const load = useCallback(
    async (nextQuery: string) => {
      setLoading(true);
      setError("");
      const response = await api.getAdminWorkflowOrderSummary({
        q: nextQuery || undefined,
        limit: 10,
        handlingStatus:
          workflowHandlingStatus === "all" ? undefined : workflowHandlingStatus,
        ownerId:
          workflowOwnerId && workflowOwnerId !== UNASSIGNED_OWNER_ID
            ? workflowOwnerId
            : undefined,
        overdueOnly: workflowOverdueOnly,
      });
      setLoading(false);
      if (!response.success || !response.data) {
        setError(response.error?.message || "Workflow summary failed.");
        setSummary(null);
        setNowMs(Date.now());
        return;
      }
      setSummary(response.data);
      setNowMs(Date.now());
    },
    [workflowHandlingStatus, workflowOwnerId, workflowOverdueOnly],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(query.trim());
  }

  function toggleQueueSelection(key: string) {
    setSelectedQueueKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function toggleAllFilteredQueueSelection() {
    if (allFilteredQueueSelected) {
      setSelectedQueueKeys((current) =>
        current.filter(
          (key) => !filteredQueueItems.some((item) => queueKey(item) === key),
        ),
      );
      return;
    }

    setSelectedQueueKeys((current) =>
      Array.from(
        new Set([
          ...current,
          ...filteredQueueItems.map((item) => queueKey(item)),
        ]),
      ),
    );
  }

  function openTakeoverConfirmation() {
    if (!selectedQueueItems.length || !selectedTakeoverOwnerId) return;
    setConfirmTakeoverOpen(true);
  }

  function confirmBatchTakeover() {
    if (!selectedTakeoverOwnerId) return;

    // TODO: wire real safe batch assignment API. This is local UI state only.
    setLocalQueueAssignments((current) => {
      const next = { ...current };
      selectedQueueItems.forEach((item) => {
        next[queueKey(item)] = selectedTakeoverOwnerId;
      });
      return next;
    });
    setSelectedQueueKeys([]);
    setConfirmTakeoverOpen(false);
  }

  async function handleLegacyDsrSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLegacyDsrError("");

    setLegacyDsrLoading(true);
    const params = buildLegacyDsrParams(legacyDsrRoute, legacyDsrQuery);
    let response: LegacyDsrReadonlyApiResponse;
    if (legacyDsrRoute === "orders.detail") {
      response = await api.getAdminLegacyDsrOrdersDetail(params);
    } else if (legacyDsrRoute === "warehouse.orders") {
      response = await api.getAdminLegacyDsrWarehouseOrders(params);
    } else if (legacyDsrRoute === "warehouse.ships") {
      response = await api.getAdminLegacyDsrWarehouseShips(params);
    } else if (legacyDsrRoute === "warehouse.photos") {
      response = await api.getAdminLegacyDsrWarehousePhotos(params);
    } else {
      response = await api.getAdminLegacyDsrOrdersMine(params);
    }
    setLegacyDsrLoading(false);
    setLegacyDsrResult(response);
    if (!response.success) {
      setLegacyDsrError(response.error?.message || "Legacy DSR read failed.");
      return;
    }
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
          <form
            className="grid gap-3 md:grid-cols-[1fr_auto]"
            onSubmit={handleSubmit}
          >
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              { label: "All queues", value: "all" },
              { label: "Unhandled", value: "unhandled" },
              { label: "In progress", value: "in_progress" },
              { label: "Resolved", value: "resolved" },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={
                  workflowHandlingStatus === item.value ? "default" : "outline"
                }
                onClick={() =>
                  setWorkflowHandlingStatus(
                    item.value as "all" | ManualHandlingStatus,
                  )
                }
              >
                {item.label}
              </Button>
            ))}
            <Select
              value={workflowOwnerId || ALL_FILTER_VALUE}
              onValueChange={(value) =>
                setWorkflowOwnerId(
                  value === ALL_FILTER_VALUE ? "" : value || "",
                )
              }
            >
              <SelectTrigger className="w-full max-w-[240px]">
                <Users className="h-4 w-4" />
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Any owner</SelectItem>
                {ownerOptions.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.label} ({owner.count})
                    {owner.source === "legacy_queue_owner" ? " legacy" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant={workflowOverdueOnly ? "default" : "outline"}
              onClick={() => setWorkflowOverdueOnly((value) => !value)}
            >
              Overdue only
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void load(query.trim())}
              disabled={loading}
            >
              Apply filters
            </Button>
          </div>
          {summary?.queueFilters ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Active queue filter:{" "}
              {summary.queueFilters.handlingStatus || "all"} / owner{" "}
              {workflowOwnerId
                ? ownerDisplayName(workflowOwnerId, ownerOptions)
                : summary.queueFilters.ownerId || "any"}{" "}
              / overdue {summary.queueFilters.overdueOnly ? "yes" : "no"}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Legacy DSR readonly
              </CardTitle>
              <CardDescription>
                Pull Ali/DSR order and warehouse snapshots through the backend
                readonly token. The browser never handles the long-lived legacy
                credential.
              </CardDescription>
            </div>
            <Badge variant="outline">No write actions</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 xl:grid-cols-[minmax(180px,260px)_minmax(180px,1fr)_auto]"
            onSubmit={handleLegacyDsrSubmit}
          >
            <Select
              value={legacyDsrRoute}
              onValueChange={(value) =>
                setLegacyDsrRoute(value as LegacyDsrReadonlyRoute)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Legacy route" />
              </SelectTrigger>
              <SelectContent>
                {LEGACY_DSR_ROUTES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={legacyDsrQuery}
              onChange={(event) => setLegacyDsrQuery(event.target.value)}
              placeholder={legacyRoute.placeholder}
              aria-label="legacy DSR query or order id"
            />
            <Button type="submit" disabled={legacyDsrLoading}>
              <Search className="h-4 w-4" />
              {legacyDsrLoading ? "Fetching" : "Fetch"}
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{legacyRoute.sourceRoute}</Badge>
            <span>
              Modern admin JWT stays in Authorization; the backend adds its
              readonly DSR credential server-side.
            </span>
          </div>
          {legacyDsrError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {legacyDsrError}
            </div>
          ) : null}
          {legacyDsrResult?.success ? (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="text-sm font-medium">Snapshot data</div>
                  <Badge variant="outline">
                    {legacyDsrResult.safety?.upstream_status
                      ? `upstream ${legacyDsrResult.safety.upstream_status}`
                      : "readonly"}
                  </Badge>
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 text-xs text-muted-foreground">
                  {formatLegacyJson(legacyDsrResult.data)}
                </pre>
              </div>
              <div className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="text-sm font-medium">Workflow timeline</div>
                  <Badge variant="outline">{legacyTimeline.length} items</Badge>
                </div>
                <div className="max-h-72 overflow-auto">
                  {legacyTimeline.length ? (
                    <div className="divide-y">
                      {legacyTimeline.map((item) => (
                        <div key={item.id} className="p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                              {item.orderId || "Legacy warehouse row"}
                            </span>
                            <Badge variant="outline">
                              {item.originalAction}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDate(item.createdAt)} / {item.sourceRoute}
                          </div>
                          <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs text-muted-foreground">
                            {formatLegacyJson(item.metadata)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground">
                      No mapped timeline entries returned for this source.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-6">
        {[
          { label: "Orders", value: counts.orders, icon: ShoppingCart },
          {
            label: "Operations",
            value: counts.operations,
            icon: ClipboardList,
          },
          { label: "Warehouse", value: counts.warehouse, icon: Warehouse },
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

      {summary?.queueStats?.overdue ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>
            {summary.queueStats.overdue} queue items are past SLA. Apply Overdue
            only and assign an owner before continuing lower priority work.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Operations queue</CardTitle>
          <CardDescription>
            Refund approvals, customer-service tickets, and warehouse exceptions
            in one dispatch view.{" "}
            {summary?.queueSla
              ? `SLA: refund ${summary.queueSla.refundApprovalHours}h / support ${summary.queueSla.supportTicketHours}h / warehouse ${summary.queueSla.warehouseExceptionHours}h.`
              : "SLA config not returned. TODO: wire real API/config."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-6">
            {[
              { label: "Total", value: summary?.queueStats?.total ?? 0 },
              {
                label: "Unhandled",
                value: summary?.queueStats?.unhandled ?? 0,
              },
              {
                label: "In progress",
                value: summary?.queueStats?.inProgress ?? 0,
              },
              { label: "Overdue", value: summary?.queueStats?.overdue ?? 0 },
              {
                label: "Unassigned",
                value: summary?.queueStats?.unassigned ?? 0,
              },
              {
                label: "RBAC blocked",
                value: summary?.queueStats?.permissionBlocked ?? 0,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1 text-2xl font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={allFilteredQueueSelected}
                  onChange={toggleAllFilteredQueueSelection}
                  aria-label="select all visible queue rows"
                />
                Select visible ({filteredQueueItems.length})
              </label>
              <Badge variant="outline">
                {selectedQueueItems.length} selected
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedTakeoverOwnerId || ALL_FILTER_VALUE}
                onValueChange={(value) => setTakeoverOwnerId(value || "")}
                disabled={!assignableOwnerOptions.length}
              >
                <SelectTrigger className="w-full min-w-[220px] sm:w-[240px]">
                  <UserCheck className="h-4 w-4" />
                  <SelectValue placeholder="Takeover owner" />
                </SelectTrigger>
                <SelectContent>
                  {assignableOwnerOptions.length ? (
                    assignableOwnerOptions.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={ALL_FILTER_VALUE}>
                      No assignable owner
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                onClick={openTakeoverConfirmation}
                disabled={
                  !selectedQueueItems.length || !selectedTakeoverOwnerId
                }
              >
                <CheckSquare className="h-4 w-4" />
                Batch takeover
              </Button>
            </div>
          </div>
          <div className="divide-y rounded-lg border">
            {filteredQueueItems.length ? (
              filteredQueueItems.map((item) => {
                const key = queueKey(item);
                const effectiveOwnerId =
                  localQueueAssignments[key] ||
                  item.ownerId ||
                  UNASSIGNED_OWNER_ID;
                const slaState = getQueueSlaState(
                  item,
                  summary?.queueSla,
                  nowMs,
                );

                return (
                  <div
                    key={key}
                    className={`grid gap-3 p-3 text-sm md:grid-cols-[32px_140px_minmax(0,1fr)_250px] ${
                      slaState.tone === "overdue" ? "bg-amber-50" : ""
                    }`}
                  >
                    <div>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-border"
                        checked={selectedQueueKeys.includes(key)}
                        onChange={() => toggleQueueSelection(key)}
                        aria-label={`select ${item.label}`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {queueTypeLabel(item.type)}
                      </Badge>
                      {slaState.tone === "overdue" ? (
                        <Badge variant="destructive">SLA overdue</Badge>
                      ) : null}
                      {item.ownerCanHandle === false && item.ownerId ? (
                        <Badge variant="destructive">RBAC blocked</Badge>
                      ) : null}
                    </div>
                    <div>
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={adminHref(item.adminPath)!}
                      >
                        {item.label}
                      </Link>
                      <div className="mt-1 text-muted-foreground">
                        {item.summary}
                      </div>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {ownerDisplayName(effectiveOwnerId, ownerOptions)}
                        {localQueueAssignments[key] ? (
                          <Badge variant="outline">local</Badge>
                        ) : null}
                      </div>
                      <div>permission {item.requiredPermission || "-"}</div>
                      <div
                        className={`inline-flex flex-col gap-0.5 rounded-md border px-2 py-1 ${slaClassName(
                          slaState.tone,
                        )}`}
                      >
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          {slaState.label}
                        </span>
                        <span className="text-xs">{slaState.detail}</span>
                      </div>
                      <Badge variant="outline">
                        {handlingLabel(item.handlingStatus)}
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                No queue items match the current filters.
              </div>
            )}
          </div>
          {ownerOptions.length ? (
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium">Owner permissions</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {ownerOptions.map((owner) => (
                  <div key={owner.id} className="rounded-md border p-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{owner.label}</span>
                      <Badge variant="outline">{owner.source || "owner"}</Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      role {owner.roleId ?? "default"} / legacy uid{" "}
                      {owner.legacyMemberUid ?? "-"}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      order cats{" "}
                      {owner.orderCategoryIds?.length
                        ? owner.orderCategoryIds.join(", ")
                        : "all"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(owner.canHandle || []).map((item) => (
                        <Badge key={item} variant="outline">
                          {queueTypeLabel(item)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
            <div className="rounded-lg border">
              <div className="border-b p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      Order aggregation view
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      TODO: wire real API order-level workflow status fields;
                      current columns derive from loaded summary arrays.
                    </div>
                  </div>
                  <Badge variant="outline">
                    {filteredOrderWorkflowRows.length} /{" "}
                    {orderWorkflowRows.length} orders
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  {[
                    {
                      key: "orderProcessing" as const,
                      label: "Order processing",
                    },
                    { key: "support" as const, label: "Support" },
                    { key: "refund" as const, label: "Refund" },
                    { key: "warehouse" as const, label: "Warehouse" },
                  ].map((filter) => (
                    <Select
                      key={filter.key}
                      value={orderStatusFilters[filter.key]}
                      onValueChange={(value) =>
                        setOrderStatusFilters((current) => ({
                          ...current,
                          [filter.key]: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={filter.label} />
                      </SelectTrigger>
                      <SelectContent>
                        {orderStatusOptions[filter.key].map((value) => (
                          <SelectItem key={value} value={value}>
                            {filter.label}: {statusFilterLabel(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              </div>
              {filteredOrderWorkflowRows.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Order</th>
                        <th className="px-3 py-2 font-medium">
                          Order processing
                        </th>
                        <th className="px-3 py-2 font-medium">Support</th>
                        <th className="px-3 py-2 font-medium">Refund</th>
                        <th className="px-3 py-2 font-medium">Warehouse</th>
                        <th className="px-3 py-2 font-medium">SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredOrderWorkflowRows.map((row) => {
                        const slaState = orderRowSlaState(
                          row,
                          summary?.queueSla,
                          nowMs,
                        );

                        return (
                          <tr key={row.order.id} className="align-top">
                            <td className="px-3 py-3">
                              <Link
                                className="font-medium text-primary hover:underline"
                                href={adminHref(row.order.adminPath)!}
                              >
                                {row.order.orderNo}
                              </Link>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {row.order.totalAmount}{" "}
                                {row.order.totalCurrency} /{" "}
                                {formatDate(row.order.createdAt)}
                              </div>
                              {adminHref(row.order.warehouseAdminPath) ? (
                                <Link
                                  className="mt-2 inline-block text-xs text-primary hover:underline"
                                  href={
                                    adminHref(row.order.warehouseAdminPath)!
                                  }
                                >
                                  warehouse flow
                                </Link>
                              ) : null}
                            </td>
                            {[
                              {
                                status: row.orderProcessingStatus,
                                detail: row.orderProcessingDetail,
                              },
                              {
                                status: row.supportStatus,
                                detail: row.supportDetail,
                              },
                              {
                                status: row.refundStatus,
                                detail: row.refundDetail,
                              },
                              {
                                status: row.warehouseStatus,
                                detail: row.warehouseDetail,
                              },
                            ].map((cell, index) => (
                              <td key={index} className="px-3 py-3">
                                <Badge variant="outline">
                                  {statusFilterLabel(cell.status)}
                                </Badge>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {cell.detail}
                                </div>
                              </td>
                            ))}
                            <td className="px-3 py-3">
                              <div
                                className={`inline-flex flex-col gap-0.5 rounded-md border px-2 py-1 ${slaClassName(
                                  slaState.tone,
                                )}`}
                              >
                                <span className="flex items-center gap-1 font-medium">
                                  <Clock className="h-3.5 w-3.5" />
                                  {slaState.label}
                                </span>
                                <span className="text-xs">
                                  {slaState.detail}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  No orders match the current aggregation filters.
                </div>
              )}
            </div>

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
                        {operation.operation} /{" "}
                        {formatDate(operation.createdAt)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {adminHref(operation.primaryAdminPath) ? (
                          <Link
                            className="text-primary hover:underline"
                            href={adminHref(operation.primaryAdminPath)!}
                          >
                            primary action
                          </Link>
                        ) : null}
                        {adminHref(operation.warehouseAdminPath) ? (
                          <Link
                            className="text-primary hover:underline"
                            href={adminHref(operation.warehouseAdminPath)!}
                          >
                            warehouse
                          </Link>
                        ) : null}
                        {operation.warehouseStage ? (
                          <Badge variant="outline">
                            {operation.warehouseStage}
                          </Badge>
                        ) : null}
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

            <div className="rounded-lg border">
              <div className="border-b px-3 py-2 text-sm font-medium">
                Warehouse operation timeline
              </div>
              <div className="divide-y">
                {summary?.warehouseOperations.length ? (
                  summary.warehouseOperations.map((history) => (
                    <div key={history.id} className="p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          className="text-primary hover:underline"
                          href={adminHref(history.adminPath)!}
                        >
                          {history.orderId ||
                            history.orderIds[0] ||
                            history.shipmentOrderId ||
                            "warehouse history"}
                        </Link>
                        <Badge variant="outline">{history.action}</Badge>
                        {history.isException ? (
                          <Badge variant="destructive">exception</Badge>
                        ) : null}
                        {history.isException ? (
                          <Badge variant="outline">
                            {history.handlingStatus === "resolved"
                              ? "已解决"
                              : history.handlingStatus === "in_progress"
                                ? "处理中"
                                : "未处理"}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {formatDate(history.createdAt)} / area{" "}
                        {history.area || "-"} / weight {history.weight ?? "-"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {adminHref(history.orderAdminPath) ? (
                          <Link
                            className="text-primary hover:underline"
                            href={adminHref(history.orderAdminPath)!}
                          >
                            order detail
                          </Link>
                        ) : null}
                        {history.trackingNumber ? (
                          <Badge variant="outline">
                            {history.trackingNumber}
                          </Badge>
                        ) : null}
                        {history.photoCount ? (
                          <Badge variant="outline">
                            photos {history.photoCount}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">
                    No warehouse operation history.
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
                  <div
                    key={payment.id}
                    className="rounded-lg border p-3 text-sm"
                  >
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
                <div className="text-sm text-muted-foreground">
                  No payments.
                </div>
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
                        <Badge variant="outline">
                          {refund.handlingStatus === "resolved"
                            ? "已解决"
                            : refund.handlingStatus === "in_progress"
                              ? "处理中"
                              : "未处理"}
                        </Badge>
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
                    <Badge variant="outline">
                      {ticket.handlingStatus === "resolved"
                        ? "已解决"
                        : ticket.handlingStatus === "in_progress"
                          ? "处理中"
                          : "未处理"}
                    </Badge>
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

      <Dialog open={confirmTakeoverOpen} onOpenChange={setConfirmTakeoverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm batch takeover</DialogTitle>
            <DialogDescription>
              This only updates local UI assignment state for the selected queue
              rows. No backend mutation will run from this workbench.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-3 text-sm">
            Assign {selectedQueueItems.length} selected row
            {selectedQueueItems.length === 1 ? "" : "s"} to{" "}
            <span className="font-medium">
              {ownerDisplayName(selectedTakeoverOwnerId, ownerOptions)}
            </span>
            .
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmTakeoverOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmBatchTakeover}>
              Confirm takeover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
