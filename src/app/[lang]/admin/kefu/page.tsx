"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Headset,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  api,
  SupportConversation,
  SupportConversationMessage,
  SupportConversationStatus,
} from "@/lib/api";

const statusLabels: Record<SupportConversationStatus, string> = {
  open: "AI接待中",
  pending_human: "待人工接手",
  human_active: "人工处理中",
  resolved: "已解决",
  closed: "已关闭",
  error: "异常",
};

const statusTone: Record<SupportConversationStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-100",
  pending_human: "bg-orange-50 text-orange-700 border-orange-100",
  human_active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  resolved: "bg-slate-50 text-slate-700 border-slate-100",
  closed: "bg-slate-50 text-slate-500 border-slate-100",
  error: "bg-red-50 text-red-700 border-red-100",
};

const filters: Array<{ label: string; value?: SupportConversationStatus }> = [
  { label: "全部" },
  { label: "待人工", value: "pending_human" },
  { label: "人工处理中", value: "human_active" },
  { label: "AI接待中", value: "open" },
  { label: "已关闭", value: "closed" },
];

function formatDate(value?: string | null) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function messageLabel(role: SupportConversationMessage["role"]) {
  if (role === "visitor") return "客户";
  if (role === "support") return "人工客服";
  return "AI";
}

function messageBubbleClass(role: SupportConversationMessage["role"]) {
  if (role === "visitor") return "ml-auto bg-[#4f67ff] text-white";
  if (role === "support") return "mr-auto border border-orange-100 bg-white";
  return "mr-auto bg-slate-100";
}

export default function AdminLegacyKefuPage() {
  const [statusFilter, setStatusFilter] = useState<
    SupportConversationStatus | undefined
  >("pending_human");
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupportConversation | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedMessages = useMemo(
    () => selected?.messages || [],
    [selected?.messages],
  );

  async function loadConversations(nextSelectedId?: string | null) {
    setLoading(true);
    setError("");
    const response = await api.listSupportConversations({
      status: statusFilter,
      limit: 50,
    });
    if (!response.success || !response.data) {
      setError(response.error?.message || "会话列表加载失败");
      setLoading(false);
      return;
    }

    setConversations(response.data.data);
    setTotal(response.data.total);
    const targetId =
      nextSelectedId ||
      selectedId ||
      response.data.data.find((item) => item.status === "pending_human")?.id ||
      response.data.data[0]?.id ||
      null;
    setSelectedId(targetId);
    setLoading(false);
  }

  async function loadConversation(id: string) {
    setError("");
    const response = await api.getSupportConversation(id);
    if (!response.success || !response.data) {
      setError(response.error?.message || "会话详情加载失败");
      return;
    }
    setSelected(response.data);
  }

  useEffect(() => {
    void loadConversations(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    void loadConversation(selectedId);
  }, [selectedId]);

  async function claimSelected() {
    if (!selected) return;
    setActionLoading(true);
    setNotice("");
    setError("");
    const response = await api.claimSupportConversation(selected.id, {
      adminNote: "Claimed from legacy kefu workbench.",
    });
    if (!response.success || !response.data) {
      setError(response.error?.message || "接手失败");
      setActionLoading(false);
      return;
    }
    setNotice("已接手会话，客户侧仍通过 H5 轮询读取人工回复。");
    setSelected(response.data.conversation);
    await loadConversations(response.data.conversation.id);
    setActionLoading(false);
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setActionLoading(true);
    setNotice("");
    setError("");
    const response = await api.sendSupportConversationMessage(
      selected.id,
      reply.trim(),
    );
    if (!response.success || !response.data) {
      setError(response.error?.message || "回复失败");
      setActionLoading(false);
      return;
    }
    setReply("");
    setNotice("人工回复已记录，客户 H5 可通过轮询看到；未主动 push。");
    await loadConversation(selected.id);
    await loadConversations(selected.id);
    setActionLoading(false);
  }

  async function closeSelected() {
    if (!selected) return;
    setActionLoading(true);
    setNotice("");
    setError("");
    const response = await api.closeSupportConversation(selected.id, "handled");
    if (!response.success || !response.data) {
      setError(response.error?.message || "关闭失败");
      setActionLoading(false);
      return;
    }
    setNotice("会话已关闭。");
    setSelected(response.data.conversation);
    await loadConversations(response.data.conversation.id);
    setActionLoading(false);
  }

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquareText className="h-4 w-4" />
            袋鼠君后台 / 客服模块
          </div>
          <h1 className="mt-2 text-2xl font-semibold">小程序客服工作台</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            这是旧后台语义下的最简工作台：会话列表、接手、人工回复、关闭。首页真人客服和
            53KF 兜底保持不变。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadConversations(selectedId)}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      <Card className="border-orange-200 bg-orange-50/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <ShieldCheck className="h-5 w-5" />
            最小影响模式
          </CardTitle>
          <CardDescription className="text-orange-800">
            当前页面只调用本地/Preview support
            API。未部署到阿里云，不改线上小程序包，不改 53KF
            授权；人工消息只进入自有 H5 轮询链路。
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              会话队列
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              对应旧后台 chat/index / consults/index 的最小可用列表。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs ${
                    statusFilter === filter.value
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "bg-white text-slate-600"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  暂无会话
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full rounded-md border p-3 text-left text-sm ${
                      selectedId === conversation.id
                        ? "border-orange-300 bg-orange-50"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {conversation.visitorName || "小程序客户"}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          statusTone[conversation.status]
                        }`}
                      >
                        {statusLabels[conversation.status]}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                      <span>
                        来源：{conversation.sourceChannel || "未记录"}
                      </span>
                      <span>
                        商品：{conversation.sourceGoodsId || "未记录"}
                      </span>
                      <span>
                        更新时间：
                        {formatDate(
                          conversation.lastMessageAt || conversation.updatedAt,
                        )}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[700px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Headset className="h-5 w-5" />
              会话处理
            </CardTitle>
            <CardDescription>
              对应旧后台 chat/gpt / consults/handle：接手、回复、关闭。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                请选择左侧会话
              </div>
            ) : (
              <>
                <div className="grid gap-3 rounded-md border bg-slate-50 p-3 text-sm md:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">状态</div>
                    <div className="mt-1 font-medium">
                      {statusLabels[selected.status]}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      来源页面
                    </div>
                    <div className="mt-1 truncate font-medium">
                      {selected.sourcePage || "未记录"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      转人工原因
                    </div>
                    <div className="mt-1 font-medium">
                      {selected.handoffReason || "未记录"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void claimSelected()}
                    disabled={
                      actionLoading || selected.status === "human_active"
                    }
                    className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm text-white disabled:bg-orange-200"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    接手会话
                  </button>
                  <button
                    type="button"
                    onClick={() => void closeSelected()}
                    disabled={actionLoading || selected.status === "closed"}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    关闭会话
                  </button>
                </div>

                <div className="h-[360px] space-y-3 overflow-y-auto rounded-md border bg-[#f8fafc] p-3">
                  {selectedMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      暂无消息
                    </div>
                  ) : (
                    selectedMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[78%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${messageBubbleClass(
                          message.role,
                        )}`}
                      >
                        <div className="mb-1 text-[11px] opacity-70">
                          {messageLabel(message.role)} ·{" "}
                          {formatDate(message.createdAt)}
                        </div>
                        {message.content}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={4}
                    maxLength={5000}
                    placeholder="输入人工回复。发送后客户 H5 会通过轮询看到；当前不主动 push 到微信。"
                    className="w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                      不承诺退款、不承诺发货时间；超出知识库或订单权限范围继续人工确认。
                    </div>
                    <button
                      type="button"
                      onClick={() => void sendReply()}
                      disabled={
                        actionLoading ||
                        !reply.trim() ||
                        selected.status !== "human_active"
                      }
                      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:bg-slate-300"
                    >
                      <Send className="h-4 w-4" />
                      发送回复
                    </button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
