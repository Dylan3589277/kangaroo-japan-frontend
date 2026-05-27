"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  api,
  type HermesDraft,
  type ManualHandlingStatus,
  type SupportTicket,
  type SupportTicketContextResponse,
} from "@/lib/api";

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
  SENT: "已发送",
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

function getBooleanEvidence(
  source: Record<string, unknown> | null | undefined,
  labels: Record<string, string>,
) {
  if (!source || typeof source !== "object") return [];
  return Object.entries(labels)
    .filter(([key]) => source[key] === true)
    .map(([, label]) => label);
}

function getDraftPolicyLabels(draft: HermesDraft | null) {
  const metadata = draft?.metadata;
  const policy = metadata?.policy;
  if (!policy || typeof policy !== "object") return [];
  const typedPolicy = policy as Record<string, unknown>;
  return Array.from(
    new Set([
      ...getBooleanEvidence(metadata, {
        knowledgeOnly: "仅知识库",
        customerScopeOnly: "仅本客户订单",
        reviewedBeforeSend: "已标记需人工审阅",
      }),
      ...getBooleanEvidence(typedPolicy, {
        knowledgeOnly: "仅知识库",
        customerScopeOnly: "仅本客户订单",
        noAutoSendToCustomer: "不自动发送",
      }),
    ]),
  );
}

export default function AdminSupportPage() {
  const [ticketKeyword, setTicketKeyword] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportTotal, setSupportTotal] = useState(0);
  const [supportScopeEvidence, setSupportScopeEvidence] = useState<string[]>(
    [],
  );
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
  const [sendSafetyEvidence, setSendSafetyEvidence] = useState<string[]>([]);
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
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
    setSendSafetyEvidence([]);
    setSendConfirmed(false);
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
      setSupportScopeEvidence([]);
      return;
    }

    const rows = response.data.data || [];
    setSupportTickets(rows);
    setSelectedSupportTicketIds((current) =>
      current.filter((id) => rows.some((ticket) => ticket.id === id)),
    );
    setSupportTotal(response.data.total || 0);
    setSupportScopeEvidence([
      ...getBooleanEvidence(response.data.safety, {
        adminOnly: "后台 admin 接口",
        currentAdminScopeOnly: "仅当前管理员可读范围",
        customerScopeOnly: "不跨客户拉取订单上下文",
        legacyHistoryDisabled: "旧系统无可用客服历史",
      }),
      ...(response.data.scope?.site
        ? [`站点：${response.data.scope.site}`]
        : []),
    ]);
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
    setSendConfirmed(false);
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
    setSendSafetyEvidence([]);
    setSendConfirmed(false);
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
    setSendConfirmed(false);
    setDraftMessage("草稿已驳回，未发送给客户。");
  }

  async function handleSendDraft() {
    if (!selectedDraft || selectedDraft.status !== "READY" || !sendConfirmed) {
      return;
    }
    setDraftLoading(true);
    setDraftMessage("");
    const response = await api.sendHermesDraft(selectedDraft.jobId);
    setDraftLoading(false);

    if (!response.success || !response.data) {
      setDraftMessage(response.error?.message || "草稿发送失败。");
      return;
    }

    setDrafts((current) =>
      current.map((draft) =>
        draft.jobId === response.data?.draft.jobId
          ? response.data.draft
          : draft,
      ),
    );
    setSendSafetyEvidence(
      getBooleanEvidence(response.data.safety, {
        reviewedBeforeSend: "reviewedBeforeSend=true",
        knowledgeOnly: "knowledgeOnly=true",
        customerScopeOnly: "customerScopeOnly=true",
        externalTransport: "externalTransport=true",
      }),
    );
    setSendConfirmed(false);
    setSendConfirmOpen(false);
    setDraftMessage(
      `草稿已发送到客户可见会话；审计记录=${String(
        response.data.auditRecorded,
      )}。`,
    );
    await refreshSelectedTicket();
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
          工单列表来自后台 admin 支持接口；订单上下文只展示所选工单 API
          返回的当前账号允许范围，不提供按邮箱、手机或物流号任意拉取客户资料的入口。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>真实工单</CardTitle>
            <CardDescription>
              来自后台 admin 工单接口，只统计当前管理员可读取范围。
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
            <p>
              Hermes 只能依据订单上下文和知识库回答，超出范围必须拒答或转人工。
            </p>
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
              前端只创建草稿、展示审阅和驳回；发送必须由客服人工勾选确认。
              Hermes
              只能使用所选工单订单上下文和知识库，无法覆盖的问题必须拒答或交给人工处理。
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
              <div className="border-b px-4 py-3 text-xs text-muted-foreground">
                <div>
                  后端筛选：site=kangaroo-japan，handling/owner/SLA 由 admin API
                  执行。
                </div>
                {supportScopeEvidence.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {supportScopeEvidence.map((item) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
                    后端未返回额外 scope/safety
                    标记；本页仍按工单上下文边界展示，旧系统无可用客服历史，也不提供任意订单查询入口。
                  </div>
                )}
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
                            ? `后端为此工单返回 ${ticketContext.orders.total} 条脱敏订单；草稿只能引用这些当前账号允许订单。`
                            : "此工单 API 未返回可用订单上下文；Hermes 必须只按知识库答复，无法确认的问题拒答或转人工。"}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getBooleanEvidence(ticketContext?.orders?.safety, {
                            readonly: "readonly=true",
                            masked: "masked=true",
                            externalCarrierLookup: "externalCarrierLookup=true",
                            paymentSensitiveFieldsHidden:
                              "paymentSensitiveFieldsHidden=true",
                          }).map((item) => (
                            <Badge key={item} variant="outline">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {ticketContext?.orders?.items?.length ? (
                        <div className="rounded-lg border p-3">
                          <div className="font-medium">允许订单与审计入口</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            只显示上下文 API
                            返回的链接；没有返回的客户资料不在前端请求。
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
                                        订单流程
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
                                        支付/退款
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
                                        审计记录
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
                  <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    生成边界：Hermes
                    只能依据当前工单、后端返回的允许订单上下文和知识库起草回复；超出知识库或订单上下文的问题必须拒答或交给人工，不得猜测客户资料、退款承诺或禁运结论。
                  </div>
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
                          onClick={() => {
                            setSelectedDraftJobId(draft.jobId);
                            setSendConfirmed(false);
                            setSendSafetyEvidence([]);
                          }}
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
                  {sendSafetyEvidence.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">发送返回安全证据</div>
                      <div className="flex flex-wrap gap-2">
                        {sendSafetyEvidence.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    草稿只供人工审阅。回复必须只基于订单上下文和知识库；知识库外、客户账号外、退款赔偿补发改地址、禁运判断等问题必须拒答或交给人工最终确认。
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
                      <label className="flex gap-2 rounded-lg border p-3 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={sendConfirmed}
                          onChange={(event) =>
                            setSendConfirmed(event.target.checked)
                          }
                        />
                        <span>
                          我已人工审阅草稿，确认它只使用当前工单订单上下文和知识库；
                          超出范围内容已拒答或转人工，现在允许调用发送 API。
                        </span>
                      </label>
                      <Button
                        type="button"
                        onClick={() => setSendConfirmOpen(true)}
                        disabled={draftLoading || !sendConfirmed}
                      >
                        {draftLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        审阅通过并发送
                      </Button>
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
            <table className="w-full min-w-[1060px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Select</th>
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
                      colSpan={8}
                    >
                      暂无匹配工单
                    </td>
                  </tr>
                ) : null}
                {filteredSupportTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`select ${ticket.ticketNumber}`}
                        checked={selectedSupportTicketIds.includes(ticket.id)}
                        onChange={(event) =>
                          setSelectedSupportTicketIds((current) =>
                            event.target.checked
                              ? [...current, ticket.id]
                              : current.filter((id) => id !== ticket.id),
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {ticket.ticketNumber}
                      {ticket.assignedAdminId ? (
                        <div className="mt-1 text-xs font-normal text-muted-foreground">
                          owner {ticket.assignedAdminId}
                        </div>
                      ) : null}
                      {ticket.slaDueAt ? (
                        <div className="mt-1 text-xs font-normal text-muted-foreground">
                          due {compactDate(ticket.slaDueAt)}
                        </div>
                      ) : null}
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
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认发送客服回复</DialogTitle>
            <DialogDescription>
              该动作会把已审阅的 Hermes
              草稿发送到客户可见会话，并写入管理员审计日志。发送内容必须只基于当前工单、允许的订单上下文和知识库。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            知识库外、客户账号外、退款赔偿补发改地址、禁运判断等内容必须拒答或转人工；确认前请再次核对草稿没有越界承诺。
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSendConfirmOpen(false)}
              disabled={draftLoading}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSendDraft}
              disabled={
                draftLoading ||
                !sendConfirmed ||
                !selectedDraft ||
                selectedDraft.status !== "READY"
              }
            >
              {draftLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              确认发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
