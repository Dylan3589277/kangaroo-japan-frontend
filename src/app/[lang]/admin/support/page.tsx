"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  ClipboardList,
  Copy,
  Download,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
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
  api,
  type HermesDraft,
  type ManualHandlingStatus,
  type SupportOrderLookupItem,
  type SupportTicket,
  type SupportTicketContextResponse,
} from "@/lib/api";

type OrderLookupForm = {
  orderNo: string;
  email: string;
  phone: string;
  trackingNumber: string;
};

const supportTicketStatusLabel: Record<string, string> = {
  open: "待处理",
  in_progress: "处理中",
  resolved: "已解决",
  closed: "已关闭",
};

const manualHandlingLabels: Record<ManualHandlingStatus, string> = {
  unhandled: "未处理",
  in_progress: "处理中",
  resolved: "已解决",
};

function supportHandlingStatus(ticket: SupportTicket): ManualHandlingStatus {
  if (ticket.handlingStatus) return ticket.handlingStatus;
  if (ticket.status === "open") return "unhandled";
  if (ticket.status === "in_progress") return "in_progress";
  return "resolved";
}

const supportTicketCategoryLabel: Record<string, string> = {
  order: "订单问题",
  shipping: "物流问题",
  refund: "退款问题",
  change_address: "改地址",
  cancel_order: "取消订单",
  compensation: "赔付问题",
  complaint: "投诉建议",
  general: "一般咨询",
};

const hermesDraftStatusLabel: Record<string, string> = {
  PENDING: "生成中",
  READY: "待审阅",
  DISMISSED: "已驳回",
};

const csvHeaders = [
  "工单编号",
  "创建时间",
  "站点",
  "来源",
  "语言",
  "页面路径",
  "客户邮箱",
  "订单号",
  "问题分类",
  "优先级",
  "状态",
  "负责人",
  "最后更新时间",
  "处理摘要",
  "下一步动作",
  "备注",
];

const csvTemplateRows = [
  [
    "SUP-YYYYMMDD-001",
    "2026-05-10 19:00",
    "kangaroo-japan",
    "tawk.to / 离线留言 / 邮件 / 人工录入",
    "zh / ja / en",
    "/zh/products/example",
    "customer@example.com",
    "DSJ-****-1234",
    "商品咨询 / 订单问题 / 物流问题 / 退款问题 / 投诉建议",
    "普通 / 紧急",
    "新工单 / 处理中 / 等客户回复 / 已解决",
    "客服姓名",
    "2026-05-10 19:10",
    "只写处理摘要，不粘贴完整手机号、完整地址、支付号",
    "下一步要做什么",
    "内部备注，禁止记录支付敏感信息",
  ],
];

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function buildCsv() {
  return [csvHeaders, ...csvTemplateRows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

function downloadCsvTemplate() {
  const blob = new Blob([`\ufeff${buildCsv()}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kangaroo-japan-support-ticket-ledger-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function compactDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function adminHref(path?: string | null) {
  if (!path) return null;
  return path.startsWith("/zh/") ? path : `/zh${path}`;
}

function getDraftEvidence(draft: HermesDraft | null) {
  const metadata = draft?.metadata;
  if (!metadata) return [];
  const sourceIds = Array.isArray(metadata.sourceIds)
    ? metadata.sourceIds.map(String)
    : [];
  const evidence = [];
  if (sourceIds.length > 0) evidence.push(`知识库：${sourceIds.join(", ")}`);
  if (metadata.orderContextUsed === true) evidence.push("使用本账号订单上下文");
  if (metadata.boundaryFallback === true)
    evidence.push("知识库外问题：边界回复");
  return evidence;
}

function getDraftPolicyLabels(draft: HermesDraft | null) {
  const policy = draft?.metadata?.policy;
  if (!policy || typeof policy !== "object") return [];
  const typedPolicy = policy as Record<string, unknown>;
  return [
    typedPolicy.knowledgeOnly === true ? "仅知识库" : "",
    typedPolicy.customerScopeOnly === true ? "仅本客户订单" : "",
    typedPolicy.noAutoSendToCustomer === true ? "不自动发送" : "",
  ].filter(Boolean);
}

function hasLookupCondition(form: OrderLookupForm) {
  return Object.values(form).some((value) => value.trim().length >= 4);
}

export default function AdminSupportPage() {
  const [ticketKeyword, setTicketKeyword] = useState("");
  const [lookupForm, setLookupForm] = useState<OrderLookupForm>({
    orderNo: "",
    email: "",
    phone: "",
    trackingNumber: "",
  });
  const [lookupItems, setLookupItems] = useState<SupportOrderLookupItem[]>([]);
  const [lookupTotal, setLookupTotal] = useState(0);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportTotal, setSupportTotal] = useState(0);
  const [supportHandlingFilter, setSupportHandlingFilter] = useState<
    "all" | ManualHandlingStatus
  >("all");
  const [supportAssigneeFilter, setSupportAssigneeFilter] = useState("");
  const [supportOverdueOnly, setSupportOverdueOnly] = useState(false);
  const [selectedSupportTicketIds, setSelectedSupportTicketIds] = useState<
    string[]
  >([]);
  const [supportBatchLoading, setSupportBatchLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [ticketContext, setTicketContext] =
    useState<SupportTicketContextResponse | null>(null);
  const [ticketContextLoading, setTicketContextLoading] = useState(false);
  const [drafts, setDrafts] = useState<HermesDraft[]>([]);
  const [selectedDraftJobId, setSelectedDraftJobId] = useState("");
  const [promptContext, setPromptContext] = useState("");
  const [dismissReason, setDismissReason] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [copiedJobId, setCopiedJobId] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("");
  const [lifecycleNote, setLifecycleNote] = useState("");
  const [assignedAdminId, setAssignedAdminId] = useState("");
  const [slaDueAt, setSlaDueAt] = useState("");
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const selectedTicketIdRef = useRef("");
  const reviewRequestSeq = useRef(0);

  const openTicketCount = useMemo(
    () =>
      supportTickets.filter(
        (ticket) => ticket.status === "open" || ticket.status === "in_progress",
      ).length,
    [supportTickets],
  );
  const latestTicket = useMemo(
    () => supportTickets[0] ?? null,
    [supportTickets],
  );
  const filteredSupportTickets = useMemo(() => {
    const normalized = ticketKeyword.trim().toLowerCase();
    if (!normalized) return supportTickets;
    return supportTickets.filter((ticket) =>
      [
        ticket.ticketNumber,
        ticket.site,
        ticket.language,
        ticket.visitorName,
        ticket.visitorEmail,
        ticket.category,
        ticket.status,
        ticket.subject,
        ticket.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [supportTickets, ticketKeyword]);

  const selectedTicket = useMemo(
    () =>
      supportTickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, supportTickets],
  );
  const selectedDraft = useMemo(
    () =>
      selectedDraftJobId
        ? (drafts.find((draft) => draft.jobId === selectedDraftJobId) ?? null)
        : (drafts[0] ?? null),
    [drafts, selectedDraftJobId],
  );
  const draftEvidence = useMemo(
    () => getDraftEvidence(selectedDraft),
    [selectedDraft],
  );
  const draftPolicyLabels = useMemo(
    () => getDraftPolicyLabels(selectedDraft),
    [selectedDraft],
  );

  const selectSupportTicket = useCallback((ticketId: string) => {
    selectedTicketIdRef.current = ticketId;
    reviewRequestSeq.current += 1;
    setSelectedTicketId(ticketId);
    setTicketContext(null);
    setTicketContextLoading(false);
    setDrafts([]);
    setSelectedDraftJobId("");
    setDraftMessage("");
    setLifecycleStatus("");
    setLifecycleNote("");
    setAssignedAdminId("");
    setSlaDueAt("");
  }, []);

  const loadSupportTickets = useCallback(async () => {
    setSupportLoading(true);
    setSupportError("");
    const response = await api.listSupportTickets({
      site: "kangaroo-japan",
      handlingStatus:
        supportHandlingFilter === "all" ? undefined : supportHandlingFilter,
      assignedAdminId: supportAssigneeFilter.trim() || undefined,
      overdueOnly: supportOverdueOnly,
      limit: 20,
    });
    setSupportLoading(false);
    if (!response.success || !response.data) {
      setSupportError(
        response.error?.message || "工单列表读取失败，请确认管理员登录状态。",
      );
      setSupportTickets([]);
      setSupportTotal(0);
      return;
    }

    const rows = response.data.data || [];
    setSupportTickets(rows);
    setSelectedSupportTicketIds((current) =>
      current.filter((id) => rows.some((ticket) => ticket.id === id)),
    );
    setSupportTotal(response.data.total || 0);
    if (!rows.some((ticket) => ticket.id === selectedTicketIdRef.current)) {
      selectSupportTicket(rows[0]?.id || "");
    }
  }, [
    selectSupportTicket,
    supportAssigneeFilter,
    supportHandlingFilter,
    supportOverdueOnly,
  ]);

  const loadTicketReviewData = useCallback(async (ticketId: string) => {
    if (!ticketId) return;
    const requestSeq = ++reviewRequestSeq.current;
    setTicketContextLoading(true);
    setDraftMessage("");
    const [contextResponse, draftsResponse] = await Promise.all([
      api.getSupportTicketContext(ticketId),
      api.listHermesDraftsForTicket(ticketId),
    ]);
    if (
      requestSeq !== reviewRequestSeq.current ||
      selectedTicketIdRef.current !== ticketId
    ) {
      return;
    }
    setTicketContextLoading(false);

    if (!contextResponse.success || !contextResponse.data) {
      setDraftMessage(contextResponse.error?.message || "工单上下文读取失败。");
      setTicketContext(null);
    } else {
      setTicketContext(contextResponse.data);
    }

    if (!draftsResponse.success || !draftsResponse.data) {
      setDrafts([]);
      setSelectedDraftJobId("");
      setDraftMessage(draftsResponse.error?.message || "草稿列表读取失败。");
      return;
    }

    setDrafts(draftsResponse.data);
    setSelectedDraftJobId((current) =>
      current && draftsResponse.data?.some((draft) => draft.jobId === current)
        ? current
        : draftsResponse.data?.[0]?.jobId || "",
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSupportTickets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSupportTickets]);

  useEffect(() => {
    if (selectedTicketId) {
      const timer = window.setTimeout(() => {
        void loadTicketReviewData(selectedTicketId);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [loadTicketReviewData, selectedTicketId]);

  useEffect(() => {
    if (!selectedDraft || selectedDraft.status !== "PENDING") return;
    const timer = window.setInterval(async () => {
      const response = await api.getHermesDraft(selectedDraft.jobId);
      if (!response.success || !response.data) return;
      setDrafts((current) =>
        current.map((draft) =>
          draft.jobId === response.data?.jobId ? response.data : draft,
        ),
      );
    }, 2500);
    return () => window.clearInterval(timer);
  }, [selectedDraft]);

  async function handleLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupError("");
    if (!hasLookupCondition(lookupForm)) {
      setLookupError(
        "请至少填写一个 4 位以上的查询条件，避免过宽查询。可用订单号、邮箱、手机号或物流单号。",
      );
      return;
    }

    setLookupLoading(true);
    const response = await api.lookupSupportOrders({
      ...lookupForm,
      limit: 10,
    });
    setLookupLoading(false);
    if (!response.success || !response.data) {
      setLookupError(
        response.error?.message || "查询失败，请确认账号权限和查询条件。",
      );
      setLookupItems([]);
      setLookupTotal(0);
      return;
    }
    setLookupItems(response.data.items || []);
    setLookupTotal(response.data.total || 0);
  }

  function updateLookupField(field: keyof OrderLookupForm, value: string) {
    setLookupForm((current) => ({ ...current, [field]: value }));
  }

  async function refreshSelectedTicket() {
    if (!selectedTicketId) return;
    setRefreshLoading(true);
    await loadTicketReviewData(selectedTicketId);
    setRefreshLoading(false);
  }

  async function handleUpdateTicketLifecycle() {
    if (!selectedTicketId || !selectedTicket) return;
    setLifecycleLoading(true);
    setDraftMessage("");
    const response = await api.updateSupportTicketLifecycle(selectedTicketId, {
      status: lifecycleStatus as typeof selectedTicket.status,
      adminNote: lifecycleNote.trim() || null,
      assignedAdminId: assignedAdminId.trim() || null,
      slaDueAt: slaDueAt ? new Date(slaDueAt).toISOString() : null,
    });
    setLifecycleLoading(false);
    if (!response.success || !response.data) {
      setDraftMessage(
        response.error?.message || "Ticket lifecycle update failed.",
      );
      return;
    }
    setDraftMessage(
      `Ticket lifecycle saved: ${response.data.lifecycle.previousStatus} -> ${response.data.lifecycle.currentStatus}; audit=${String(
        response.data.auditRecorded,
      )}`,
    );
    setSupportTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicketId ? response.data!.ticket : ticket,
      ),
    );
    await loadTicketReviewData(selectedTicketId);
  }

  async function handleBulkClaimTickets() {
    const targetIds = selectedSupportTicketIds.length
      ? selectedSupportTicketIds
      : filteredSupportTickets.map((ticket) => ticket.id);
    if (targetIds.length === 0) return;
    setSupportBatchLoading(true);
    setDraftMessage("");
    const response = await api.bulkClaimSupportTickets({
      ticketIds: targetIds,
      assignedAdminId: assignedAdminId.trim() || undefined,
      adminNote: lifecycleNote.trim() || "Bulk claimed from support console.",
      slaDueAt: slaDueAt ? new Date(slaDueAt).toISOString() : undefined,
    });
    setSupportBatchLoading(false);
    if (!response.success || !response.data) {
      setDraftMessage(response.error?.message || "Bulk claim failed.");
      return;
    }
    setDraftMessage(
      `已批量接手 ${response.data.claimedCount} 个客服工单；audit=${String(
        response.data.auditRecorded,
      )}`,
    );
    setSelectedSupportTicketIds([]);
    await loadSupportTickets();
  }

  async function handleTriggerDraft() {
    if (!selectedTicketId) return;
    const ticketId = selectedTicketId;
    setDraftLoading(true);
    setDraftMessage("");
    const response = await api.triggerHermesDraft({
      ticketId,
      promptContext: promptContext.trim() || undefined,
    });
    setDraftLoading(false);

    if (!response.success || !response.data) {
      setDraftMessage(response.error?.message || "Hermes 草稿任务创建失败。");
      return;
    }

    const pendingDraft: HermesDraft = {
      id: response.data.jobId,
      ticketId,
      jobId: response.data.jobId,
      status: "PENDING",
      draftBody: null,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDraftMessage("草稿任务已创建，正在等待客服分身回传。");
    setSelectedDraftJobId(response.data.jobId);
    setDrafts((current) => [
      pendingDraft,
      ...current.filter((draft) => draft.jobId !== response.data?.jobId),
    ]);
  }

  async function handleDismissDraft() {
    if (!selectedDraft || selectedDraft.status !== "READY") return;
    setDraftLoading(true);
    setDraftMessage("");
    const response = await api.dismissHermesDraft(
      selectedDraft.jobId,
      dismissReason.trim() || undefined,
    );
    setDraftLoading(false);

    if (!response.success || !response.data) {
      setDraftMessage(response.error?.message || "草稿驳回失败。");
      return;
    }

    setDrafts((current) =>
      current.map((draft) =>
        draft.jobId === response.data?.jobId ? response.data : draft,
      ),
    );
    setDismissReason("");
    setDraftMessage("草稿已驳回，未发送给客户。");
  }

  async function handleCopyDraft() {
    if (!selectedDraft?.draftBody) return;
    await navigator.clipboard.writeText(selectedDraft.draftBody);
    setCopiedJobId(selectedDraft.jobId);
    window.setTimeout(() => setCopiedJobId(""), 1600);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          客服工作台 · 低风险 MVP
        </div>
        <h1 className="mt-2 text-2xl font-semibold">客服工单台账</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          先把 tawk.to
          在线咨询、离线留言和人工跟进统一记录到台账；订单/物流只读查询只给管理员使用，并保持脱敏、审计和限流边界。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>真实工单</CardTitle>
            <CardDescription>
              来自后台工单接口，只统计当前可读取数据。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {supportLoading ? "..." : supportTotal}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              待处理 {openTicketCount} 个
              {latestTicket
                ? `，最近更新 ${compactDate(latestTicket.updatedAt)}`
                : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>客服红线</CardTitle>
            <CardDescription>避免隐私和资金风险。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>不在第三方客服工具粘贴完整手机号、完整地址、支付号。</p>
            <p>不直接承诺退款、赔偿、补发、改地址。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>台账模板</CardTitle>
            <CardDescription>下载后可用 Excel / 飞书表格维护。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={downloadCsvTemplate}>
              <Download className="h-4 w-4" />
              下载 CSV 模板
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="h-4 w-4" />
              Hermes 客服草稿 · 人工审阅
            </div>
            <CardTitle className="mt-2">草稿审阅队列</CardTitle>
            <CardDescription>
              前端只创建草稿、展示审阅和驳回；不会自动发送给客户，订单/支付/地址敏感信息由后端只读脱敏接口控制。
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={loadSupportTickets}
              disabled={supportLoading}
            >
              {supportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              刷新工单
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={refreshSelectedTicket}
              disabled={!selectedTicketId || refreshLoading}
            >
              {refreshLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              刷新草稿
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {supportError}
            </div>
          ) : null}
          {draftMessage ? (
            <div className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
              {draftMessage}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="font-medium">真实工单</div>
                <Badge variant="secondary">{supportTotal}</Badge>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {supportLoading ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在读取工单
                  </div>
                ) : null}
                {!supportLoading && supportTickets.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    暂无可审阅工单。
                  </div>
                ) : null}
                {supportTickets.map((ticket) => (
                  <button
                    type="button"
                    key={ticket.id}
                    onClick={() => selectSupportTicket(ticket.id)}
                    className={`block w-full border-b px-4 py-3 text-left text-sm transition-colors last:border-b-0 ${
                      selectedTicketId === ticket.id
                        ? "bg-muted"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{ticket.ticketNumber}</span>
                      <Badge
                        variant={
                          ticket.status === "open" ? "secondary" : "outline"
                        }
                      >
                        {supportTicketStatusLabel[ticket.status] ||
                          ticket.status}
                      </Badge>
                      <Badge variant="outline">
                        {manualHandlingLabels[supportHandlingStatus(ticket)]}
                      </Badge>
                    </div>
                    <div className="mt-2 line-clamp-2 text-muted-foreground">
                      {ticket.subject}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>
                        {supportTicketCategoryLabel[ticket.category] ||
                          ticket.category}
                      </span>
                      <span>{ticket.language}</span>
                      <span>{compactDate(ticket.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        工单上下文
                      </div>
                      <h2 className="mt-1 text-lg font-semibold">
                        {selectedTicket?.subject || "请选择工单"}
                      </h2>
                    </div>
                    {selectedTicket ? (
                      <Badge variant="outline">
                        {supportTicketCategoryLabel[selectedTicket.category] ||
                          selectedTicket.category}
                      </Badge>
                    ) : null}
                  </div>

                  {ticketContextLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在读取上下文
                    </div>
                  ) : null}

                  {selectedTicket ? (
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="grid gap-2 text-muted-foreground md:grid-cols-2">
                        <div>客户：{selectedTicket.visitorName || "-"}</div>
                        <div>邮箱：{selectedTicket.visitorEmail || "-"}</div>
                        <div>站点：{selectedTicket.site}</div>
                        <div>
                          更新时间：{compactDate(selectedTicket.updatedAt)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted p-3 text-muted-foreground">
                        {selectedTicket.description}
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="font-medium">本账号订单上下文</div>
                        <div className="mt-2 text-muted-foreground">
                          {ticketContext?.orders?.items?.length
                            ? `匹配 ${ticketContext.orders.total} 条脱敏订单，草稿只能引用这些订单。`
                            : "未匹配到本账号订单；Hermes 必须只按知识库或边界回复。"}
                        </div>
                      </div>
                      {ticketContext?.orders?.items?.length ? (
                        <div className="rounded-lg border p-3">
                          <div className="font-medium">
                            Linked order workflows
                          </div>
                          <div className="mt-3 grid gap-2">
                            {ticketContext.orders.items
                              .slice(0, 3)
                              .map((order) => (
                                <div
                                  key={order.id}
                                  className="rounded-md bg-muted p-3 text-xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-medium">
                                      {order.orderNo}
                                    </span>
                                    <Badge variant="outline">
                                      {order.status}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {adminHref(
                                      order.adminLinks?.orderAdminPath,
                                    ) ? (
                                      <Link
                                        className="text-primary hover:underline"
                                        href={
                                          adminHref(
                                            order.adminLinks?.orderAdminPath,
                                          )!
                                        }
                                      >
                                        order workflow
                                      </Link>
                                    ) : null}
                                    {adminHref(
                                      order.adminLinks?.paymentAdminPath,
                                    ) ? (
                                      <Link
                                        className="text-primary hover:underline"
                                        href={
                                          adminHref(
                                            order.adminLinks?.paymentAdminPath,
                                          )!
                                        }
                                      >
                                        payment/refund
                                      </Link>
                                    ) : null}
                                    {adminHref(
                                      order.adminLinks?.auditLookupPath,
                                    ) ? (
                                      <Link
                                        className="text-primary hover:underline"
                                        href={
                                          adminHref(
                                            order.adminLinks?.auditLookupPath,
                                          )!
                                        }
                                      >
                                        audit
                                      </Link>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">Ticket lifecycle</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Saves admin handling state, writes audit log, and
                              sends no customer message.
                            </div>
                          </div>
                          <Badge variant="outline">
                            {selectedTicket.status}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_180px_220px_auto]">
                          <select
                            className="h-9 rounded-md border bg-background px-2 text-sm"
                            value={lifecycleStatus || selectedTicket.status}
                            onChange={(event) =>
                              setLifecycleStatus(event.target.value)
                            }
                            aria-label="support ticket lifecycle status"
                          >
                            <option value="open">open</option>
                            <option value="in_progress">in_progress</option>
                            <option value="resolved">resolved</option>
                            <option value="closed">closed</option>
                          </select>
                          <Input
                            value={lifecycleNote}
                            onChange={(event) =>
                              setLifecycleNote(event.target.value)
                            }
                            placeholder="Internal handling note"
                            aria-label="support ticket internal handling note"
                          />
                          <Input
                            value={assignedAdminId}
                            onChange={(event) =>
                              setAssignedAdminId(event.target.value)
                            }
                            placeholder="Assigned admin id"
                            aria-label="support ticket assigned admin"
                          />
                          <Input
                            value={slaDueAt}
                            onChange={(event) =>
                              setSlaDueAt(event.target.value)
                            }
                            type="datetime-local"
                            aria-label="support ticket SLA due at"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleUpdateTicketLifecycle}
                            disabled={lifecycleLoading}
                          >
                            {lifecycleLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-muted-foreground">
                      左侧选择一个工单后生成客服草稿。
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4">
                  <div className="font-medium">给客服分身的补充说明</div>
                  <textarea
                    value={promptContext}
                    onChange={(event) => setPromptContext(event.target.value)}
                    className="mt-3 min-h-24 w-full rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    maxLength={2000}
                    placeholder="可选：只写客服需要知道的补充信息，不粘贴完整手机号、完整地址、支付号。"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      {promptContext.length}/2000
                    </div>
                    <Button
                      type="button"
                      onClick={handleTriggerDraft}
                      disabled={!selectedTicketId || draftLoading}
                    >
                      {draftLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                      生成 Hermes 草稿
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">草稿审阅</div>
                    {selectedDraft ? (
                      <Badge
                        variant={
                          selectedDraft.status === "READY"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {hermesDraftStatusLabel[selectedDraft.status] ||
                          selectedDraft.status}
                      </Badge>
                    ) : null}
                  </div>
                  {drafts.length > 1 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {drafts.map((draft) => (
                        <Button
                          key={draft.jobId}
                          type="button"
                          variant={
                            selectedDraft?.jobId === draft.jobId
                              ? "secondary"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedDraftJobId(draft.jobId)}
                        >
                          {compactDate(draft.createdAt)}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 p-4">
                  {!selectedDraft ? (
                    <div className="text-sm text-muted-foreground">
                      还没有草稿。选择工单后点击“生成 Hermes 草稿”。
                    </div>
                  ) : null}
                  {selectedDraft?.status === "PENDING" ? (
                    <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      客服分身正在生成草稿，页面会自动轮询。
                    </div>
                  ) : null}
                  {selectedDraft?.draftBody ? (
                    <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-6">
                      {selectedDraft.draftBody}
                    </div>
                  ) : null}

                  {draftPolicyLabels.length > 0 || draftEvidence.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">边界证据</div>
                      <div className="flex flex-wrap gap-2">
                        {draftPolicyLabels.map((label) => (
                          <Badge key={label} variant="outline">
                            {label}
                          </Badge>
                        ))}
                        {draftEvidence.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    草稿只供人工审阅。工单原文可能包含客户主动填写的信息；退款、赔偿、补发、改地址、禁运判断等事项必须人工最终确认。
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyDraft}
                      disabled={!selectedDraft?.draftBody}
                    >
                      <Copy className="h-4 w-4" />
                      {copiedJobId === selectedDraft?.jobId
                        ? "已复制"
                        : "复制草稿"}
                    </Button>
                  </div>

                  {selectedDraft?.status === "READY" ? (
                    <div className="space-y-3 border-t pt-4">
                      <Input
                        value={dismissReason}
                        onChange={(event) =>
                          setDismissReason(event.target.value)
                        }
                        placeholder="驳回原因，可选"
                        aria-label="驳回原因"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDismissDraft}
                        disabled={draftLoading}
                      >
                        {draftLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        驳回草稿
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>订单/物流只读查询</CardTitle>
          <CardDescription>
            仅限管理员登录后使用。接口会做限流、审计记录和敏感信息脱敏；不提供退款、改地址、补发等写操作。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 md:grid-cols-5"
            onSubmit={handleLookupSubmit}
          >
            <Input
              value={lookupForm.orderNo}
              onChange={(event) =>
                updateLookupField("orderNo", event.target.value)
              }
              placeholder="订单号"
              aria-label="订单号"
            />
            <Input
              value={lookupForm.email}
              onChange={(event) =>
                updateLookupField("email", event.target.value)
              }
              placeholder="客户邮箱"
              aria-label="客户邮箱"
            />
            <Input
              value={lookupForm.phone}
              onChange={(event) =>
                updateLookupField("phone", event.target.value)
              }
              placeholder="手机号"
              aria-label="手机号"
            />
            <Input
              value={lookupForm.trackingNumber}
              onChange={(event) =>
                updateLookupField("trackingNumber", event.target.value)
              }
              placeholder="物流单号"
              aria-label="物流单号"
            />
            <Button type="submit" disabled={lookupLoading}>
              {lookupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              查询
            </Button>
          </form>

          {lookupError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {lookupError}
            </div>
          ) : null}

          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">安全边界</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>最少 4 位查询条件，避免客服随意拉全量订单。</li>
              <li>手机号、邮箱、姓名、地址、邮编、物流单号均只返回脱敏值。</li>
              <li>
                每次查询都会记录审计日志，日志只存查询条件哈希，不存明文。
              </li>
            </ul>
          </div>

          {lookupItems.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                共匹配 {lookupTotal} 条，当前显示 {lookupItems.length} 条。
              </div>
              {lookupItems.map((order) => (
                <div key={order.id} className="rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">{order.orderNo}</div>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-muted-foreground md:grid-cols-2">
                    <div>
                      客户：{order.customer.name || "-"} /{" "}
                      {order.customer.email || "-"} /{" "}
                      {order.customer.phone || "-"}
                    </div>
                    <div>
                      金额：{order.total.amount} {order.total.currency || ""}
                    </div>
                    <div>下单时间：{compactDate(order.createdAt)}</div>
                    <div>支付时间：{compactDate(order.paidAt)}</div>
                    <div>
                      物流：{order.shipping.carrier || "-"} /{" "}
                      {order.shipping.trackingNumber || "-"}
                    </div>
                    <div>
                      收货城市：{order.shipping.address?.country || "-"}{" "}
                      {order.shipping.address?.city || ""}
                    </div>
                  </div>
                  <div className="mt-3 text-muted-foreground">
                    商品：
                    {order.items
                      .map(
                        (item) =>
                          `${item.title || "未命名商品"} × ${item.quantity}`,
                      )
                      .join("；") || "-"}
                  </div>
                  {order.shipmentOrders.length > 0 ? (
                    <div className="mt-3 rounded-md bg-muted p-3 text-muted-foreground">
                      仓库发货单：
                      {order.shipmentOrders
                        .map(
                          (shipment) =>
                            `${shipment.status || "未知状态"} / ${shipment.shipWay || "未知线路"}`,
                        )
                        .join("；")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>tawk.to 预聊天表单字段建议</CardTitle>
          <CardDescription>
            预聊天表单需要在 tawk.to
            后台开启；站点代码只传低敏上下文，不传订单详情。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              建议收集
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>姓名或称呼</li>
              <li>邮箱</li>
              <li>问题类型：商品、订单、物流、退款、投诉建议</li>
              <li>问题描述</li>
              <li>订单号后几位或用户主动提供的订单号</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-medium text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              禁止自动传递
            </div>
            <ul className="list-disc space-y-1 pl-5 text-amber-900/80">
              <li>完整收货地址、完整手机号</li>
              <li>支付网关编号、支付卡信息</li>
              <li>后台订单备注和内部处理记录</li>
              <li>购物车、登录令牌、用户 ID 等敏感上下文</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>真实工单台账</CardTitle>
            <CardDescription>
              从后台工单接口读取；只展示脱敏字段，不展示支付号、完整地址或内部敏感备注。
            </CardDescription>
          </div>
          <Input
            className="max-w-xs"
            value={ticketKeyword}
            onChange={(event) => setTicketKeyword(event.target.value)}
            placeholder="搜索工单、邮箱、分类"
            aria-label="搜索真实工单"
          />
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={supportHandlingFilter === "all" ? "default" : "outline"}
              onClick={() => setSupportHandlingFilter("all")}
            >
              全部
            </Button>
            {(["unhandled", "in_progress", "resolved"] as const).map(
              (status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={
                    supportHandlingFilter === status ? "default" : "outline"
                  }
                  onClick={() => setSupportHandlingFilter(status)}
                >
                  {manualHandlingLabels[status]}
                </Button>
              ),
            )}
            <Input
              className="h-8 max-w-[180px]"
              value={supportAssigneeFilter}
              onChange={(event) => setSupportAssigneeFilter(event.target.value)}
              placeholder="assignee id"
              aria-label="support assignee filter"
            />
            <Button
              type="button"
              size="sm"
              variant={supportOverdueOnly ? "default" : "outline"}
              onClick={() => setSupportOverdueOnly((value) => !value)}
            >
              超时
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                filteredSupportTickets.length === 0 || supportBatchLoading
              }
              onClick={() => void handleBulkClaimTickets()}
            >
              批量接手 {selectedSupportTicketIds.length || "当前筛选"}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">工单编号</th>
                  <th className="px-3 py-2 font-medium">站点/语言</th>
                  <th className="px-3 py-2 font-medium">分类</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">客户</th>
                  <th className="px-3 py-2 font-medium">主题</th>
                  <th className="px-3 py-2 font-medium">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupportTickets.length === 0 ? (
                  <tr className="border-t">
                    <td
                      className="px-3 py-6 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      暂无匹配工单
                    </td>
                  </tr>
                ) : null}
                {filteredSupportTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {ticket.ticketNumber}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {ticket.site} / {ticket.language}
                    </td>
                    <td className="px-3 py-2">
                      {supportTicketCategoryLabel[ticket.category] ||
                        ticket.category}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          ticket.status === "open" ? "secondary" : "outline"
                        }
                      >
                        {supportTicketStatusLabel[ticket.status] ||
                          ticket.status}
                      </Badge>
                      <Badge className="mt-1 block w-fit" variant="outline">
                        {manualHandlingLabels[supportHandlingStatus(ticket)]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {ticket.visitorEmail || ticket.visitorName || "-"}
                    </td>
                    <td className="max-w-[340px] px-3 py-2">
                      {ticket.subject}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {compactDate(ticket.updatedAt)}
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
