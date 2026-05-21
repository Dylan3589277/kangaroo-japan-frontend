"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock3,
  ClipboardCheck,
  Image as ImageIcon,
  PackageCheck,
  Printer,
  RefreshCw,
  Scale,
  Search,
  Truck,
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
import { api, type AdminWarehouseOperationHistoryItem } from "@/lib/api";

interface WarehouseOverview {
  pendingInbound: number;
  pendingOutbound: number;
  totalStock: number;
}

interface WarehouseOverviewResponse {
  overview?: WarehouseOverview;
}

const warehouseEntries = [
  {
    href: "/warehouse/instore",
    label: "Inbound scan",
    description: "Register arrived purchase parcels into warehouse stock.",
    icon: PackageCheck,
    stage: "inbound",
  },
  {
    href: "/warehouse/orders",
    label: "Stored orders",
    description: "Review warehouse order records and current stock state.",
    icon: Warehouse,
    stage: "stock",
  },
  {
    href: "/warehouse/shipments",
    label: "Outbound requests",
    description: "Process shipment requests and international dispatch.",
    icon: Truck,
    stage: "outbound",
  },
  {
    href: "/warehouse/confirm-ship",
    label: "Confirm shipment",
    description: "Confirm selected shipping method, package weight, and fee.",
    icon: Scale,
    stage: "confirm",
  },
  {
    href: "/warehouse/print",
    label: "Print tasks",
    description: "Print picking labels, packing sheets, and outbound labels.",
    icon: Printer,
    stage: "print",
  },
  {
    href: "/warehouse/photos",
    label: "Inspection photos",
    description: "Attach product inspection photos for support and disputes.",
    icon: ImageIcon,
    stage: "evidence",
  },
  {
    href: "/warehouse/pick",
    label: "Pick and stock check",
    description: "Pick items and reconcile inventory before shipment.",
    icon: ClipboardCheck,
    stage: "pick",
  },
];

const historyActions = [
  { value: "instore", label: "Inbound" },
  { value: "cancelstore", label: "Cancel inbound" },
  { value: "confirm_shipment", label: "Confirm shipment" },
  { value: "doship", label: "Dispatch" },
  { value: "photos_upload", label: "Inspection photos" },
  { value: "print_task_pull", label: "Print pull" },
  { value: "shipment_failed", label: "Shipment failed" },
  { value: "photo_upload_failed", label: "Photo failed" },
  { value: "sync_replay_failed", label: "Sync replay failed" },
  { value: "compensation_action", label: "Compensation" },
];

type WarehouseHandlingStatus = "unhandled" | "in_progress" | "resolved";

const handlingStatuses: Array<{
  value: WarehouseHandlingStatus;
  label: string;
  badge: "secondary" | "outline" | "default";
}> = [
  { value: "unhandled", label: "未处理", badge: "secondary" },
  { value: "in_progress", label: "处理中", badge: "outline" },
  { value: "resolved", label: "已解决", badge: "default" },
];

function withZh(path: string) {
  return path.startsWith("/zh/") ? path : `/zh${path}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function adminHref(path?: string | null) {
  if (!path) return null;
  return path.startsWith("/zh/") ? path : `/zh${path}`;
}

function formatHistoryAmount(history: AdminWarehouseOperationHistoryItem) {
  const values = [
    history.weight !== null && history.weight !== undefined
      ? `weight ${history.weight}`
      : "",
    history.after_post_fee !== null && history.after_post_fee !== undefined
      ? `after fee ${history.after_post_fee}`
      : "",
    history.post_fee !== null && history.post_fee !== undefined
      ? `post ${history.post_fee}`
      : "",
    history.pack_fee !== null && history.pack_fee !== undefined
      ? `pack ${history.pack_fee}`
      : "",
  ].filter(Boolean);
  return values.length ? values.join(" / ") : "-";
}

function dayStart(value: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function dayEnd(value: string) {
  return value ? `${value}T23:59:59.999Z` : undefined;
}

function getHandlingStatus(
  item: AdminWarehouseOperationHistoryItem,
): WarehouseHandlingStatus | null {
  if (!item.is_exception) return null;
  return item.handling_status || "unhandled";
}

function getHandlingLabel(status?: WarehouseHandlingStatus | null) {
  return (
    handlingStatuses.find((item) => item.value === status)?.label || "未处理"
  );
}

function getHandlingBadgeVariant(status?: WarehouseHandlingStatus | null) {
  return (
    handlingStatuses.find((item) => item.value === status)?.badge || "secondary"
  );
}

export default function AdminWarehousePage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [overview, setOverview] = useState<WarehouseOverview | null>(null);
  const [history, setHistory] = useState<AdminWarehouseOperationHistoryItem[]>(
    [],
  );
  const [historyActionsSelected, setHistoryActionsSelected] = useState<
    string[]
  >([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exceptionOnly, setExceptionOnly] = useState(false);
  const [handlingStatus, setHandlingStatus] = useState<
    "all" | WarehouseHandlingStatus
  >("all");
  const [handlingBusyId, setHandlingBusyId] = useState("");
  const [handlingMessage, setHandlingMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return warehouseEntries;
    return warehouseEntries.filter((entry) =>
      [entry.label, entry.description, entry.stage]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    const [response, historyResponse] = await Promise.all([
      api.request<WarehouseOverviewResponse>("/warehouse/list", {
        method: "POST",
      }),
      api.listAdminWarehouseOperationHistory({
        q: query.trim() || undefined,
        action: historyActionsSelected.length
          ? historyActionsSelected.join(",")
          : undefined,
        startDate: dayStart(startDate),
        endDate: dayEnd(endDate),
        exceptionOnly: exceptionOnly || handlingStatus !== "all",
        handlingStatus: handlingStatus === "all" ? undefined : handlingStatus,
        limit: 20,
      }),
    ]);
    setLoading(false);
    if (!response.success) {
      setError(
        response.error?.message ||
          "Warehouse overview is not available from the backend.",
      );
      setOverview(null);
      return;
    }
    setOverview(response.data?.overview || null);
    if (historyResponse.success && historyResponse.data) {
      setHistory(historyResponse.data.data || []);
    }
  }, [
    endDate,
    exceptionOnly,
    handlingStatus,
    historyActionsSelected,
    query,
    startDate,
  ]);

  function toggleHistoryAction(action: string) {
    setHistoryActionsSelected((current) =>
      current.includes(action)
        ? current.filter((item) => item !== action)
        : [...current, action],
    );
  }

  async function updateHandlingStatus(
    item: AdminWarehouseOperationHistoryItem,
    status: WarehouseHandlingStatus,
  ) {
    setHandlingBusyId(item.id);
    setHandlingMessage("");
    const response = await api.updateAdminWarehouseOperationHandling(item.id, {
      status,
      note: `Admin marked warehouse exception as ${status}.`,
    });
    setHandlingBusyId("");
    if (!response.success) {
      setHandlingMessage(
        response.error?.message || "Failed to update exception handling state.",
      );
      return;
    }
    setHandlingMessage(`异常处理状态已更新为 ${getHandlingLabel(status)}。`);
    await loadOverview();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOverview]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Warehouse className="h-4 w-4" />
            Shared admin console
          </div>
          <h1 className="mt-2 text-2xl font-semibold">Warehouse operations</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Admin entry for inbound, weighing, outbound shipment, printing, and
            inspection evidence. This connects order workflows to the existing
            warehouse tools without changing order or payment state.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => loadOverview()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Pending inbound", overview?.pendingInbound ?? 0],
          ["Pending outbound", overview?.pendingOutbound ?? 0],
          ["Total stock", overview?.totalStock ?? 0],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {loading ? "..." : value}
            </CardContent>
          </Card>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Warehouse task and history search</CardTitle>
          <CardDescription>
            Filter entry points and replayable warehouse operation history by
            order, shipment, tracking number, area, or actor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto_auto]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="order / shipment / tracking / area / actor"
              aria-label="warehouse workflow filter"
            />
            <Input
              value={startDate}
              type="date"
              aria-label="warehouse history start date"
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              value={endDate}
              type="date"
              aria-label="warehouse history end date"
              onChange={(event) => setEndDate(event.target.value)}
            />
            <Button
              type="button"
              variant={exceptionOnly ? "default" : "outline"}
              onClick={() => setExceptionOnly((value) => !value)}
            >
              Exceptions
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => loadOverview()}
              disabled={loading}
            >
              <Search className="h-4 w-4" />
              Filter
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={handlingStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setHandlingStatus("all")}
            >
              全部处理状态
            </Button>
            {handlingStatuses.map((status) => (
              <Button
                key={status.value}
                type="button"
                variant={
                  handlingStatus === status.value ? "default" : "outline"
                }
                size="sm"
                onClick={() => {
                  setExceptionOnly(true);
                  setHandlingStatus(status.value);
                }}
              >
                {status.label}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {historyActions.map((action) => (
              <Button
                key={action.value}
                type="button"
                variant={
                  historyActionsSelected.includes(action.value)
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => toggleHistoryAction(action.value)}
              >
                {action.label}
              </Button>
            ))}
          </div>
          {handlingMessage ? (
            <div className="mt-3 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {handlingMessage}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredEntries.map((entry) => (
          <Card key={entry.href}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <entry.icon className="h-4 w-4" />
                {entry.label}
              </CardTitle>
              <CardDescription>{entry.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <Badge variant="outline">{entry.stage}</Badge>
              <Link href={withZh(entry.href)}>
                <Button type="button" variant="outline" size="sm">
                  Open
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            Warehouse operation timeline
          </CardTitle>
          <CardDescription>
            Replayable history from `warehouse_operation_history`; no order,
            refund, or customer-message action is executed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Handling</th>
                  <th className="px-3 py-2 font-medium">Order / shipment</th>
                  <th className="px-3 py-2 font-medium">Area / metrics</th>
                  <th className="px-3 py-2 font-medium">Tracking</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Links</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      {loading ? "Loading history" : "No warehouse history."}
                    </td>
                  </tr>
                ) : null}
                {history.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{item.action}</Badge>
                      {item.is_exception ? (
                        <Badge
                          className="mt-1 block w-fit"
                          variant="destructive"
                        >
                          exception
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {item.is_exception ? (
                        <div className="space-y-2">
                          <Badge
                            variant={getHandlingBadgeVariant(
                              getHandlingStatus(item),
                            )}
                          >
                            {getHandlingLabel(getHandlingStatus(item))}
                          </Badge>
                          {item.handling_note ? (
                            <div className="max-w-[180px] text-xs text-muted-foreground">
                              {item.handling_note}
                            </div>
                          ) : null}
                          {item.handled_by ? (
                            <div className="text-xs text-muted-foreground">
                              {item.handled_by}
                              {item.handled_at
                                ? ` / ${formatDate(item.handled_at)}`
                                : ""}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-1">
                            {getHandlingStatus(item) !== "in_progress" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={handlingBusyId === item.id}
                                onClick={() =>
                                  updateHandlingStatus(item, "in_progress")
                                }
                              >
                                接手
                              </Button>
                            ) : null}
                            {getHandlingStatus(item) !== "resolved" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={handlingBusyId === item.id}
                                onClick={() =>
                                  updateHandlingStatus(item, "resolved")
                                }
                              >
                                关闭
                              </Button>
                            ) : null}
                            {getHandlingStatus(item) === "resolved" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={handlingBusyId === item.id}
                                onClick={() =>
                                  updateHandlingStatus(item, "in_progress")
                                }
                              >
                                重开
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {item.order_id || item.order_ids[0] || "-"}
                      <div className="mt-1 text-muted-foreground">
                        shipment {item.shipment_order_id || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.area || "-"}
                      <div className="mt-1 text-xs">
                        {formatHistoryAmount(item)}
                      </div>
                      {item.photo_count ? (
                        <Badge variant="outline" className="mt-1">
                          photos {item.photo_count}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.tracking_number || "-"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.actor_id || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {adminHref(item.linked_context?.order_admin_path) ? (
                          <Link
                            className="text-primary hover:underline"
                            href={
                              adminHref(item.linked_context?.order_admin_path)!
                            }
                          >
                            order
                          </Link>
                        ) : null}
                        {adminHref(item.linked_context?.workflow_admin_path) ? (
                          <Link
                            className="text-primary hover:underline"
                            href={
                              adminHref(
                                item.linked_context?.workflow_admin_path,
                              )!
                            }
                          >
                            workflow
                          </Link>
                        ) : null}
                        {adminHref(item.linked_context?.audit_lookup_path) ? (
                          <Link
                            className="text-primary hover:underline"
                            href={
                              adminHref(item.linked_context?.audit_lookup_path)!
                            }
                          >
                            audit
                          </Link>
                        ) : null}
                        {item.audit_log_id ? (
                          <Badge variant="outline">audit linked</Badge>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
        Safety: this page is an admin entry point only. Inbound, outbound,
        photos, labels, and shipment confirmation continue to run in the
        existing guarded warehouse pages; refunds and customer replies remain in
        their own reviewed workflows.
      </div>
    </div>
  );
}
