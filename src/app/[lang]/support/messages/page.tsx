"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import { getH5UidSignature, getNumericH5UserId } from "../h5/identity";

// ---------------------------------------------------------------------------
// 留言中心 H5（袋鼠君小程序 webview 内嵌页）。
// 顾客通过代留言服务给日本卖家发砍价/咨询留言，本页展示留言任务列表与进度。
// 身份约定与 support/h5 完全一致：URL query 的 uid|user_id + ts + sig，无登录墙；
// 数据走同源 BFF /api/support/seller-messages（action: list | detail），
// 由 BFF 中继到现代后端 visitor 端点并由后端验签。
// 金额一律 JPY 整数（数据库值即日元，不除以 100）。
// ---------------------------------------------------------------------------

type VisitorTask = {
  id: string | number;
  platform?: string;
  goods_no?: string;
  item_url?: string;
  message_type?: string; // 'bargain' | 'question' | ...
  customer_status?: string; // 'processing'|'rejected'|'sent'|'replied'|'agreed'|'closed'
  status_text?: string; // 后端下发的中文状态文案（优先展示）
  customer_request_zh?: string;
  target_price_jpy?: number;
  listing_price_jpy?: number;
  agreed_price_jpy?: number;
  minimum_bargain_price_jpy?: number;
  reject_reason_zh?: string;
  reply_zh?: string;
  created_at?: string;
  sent_at?: string;
  reply_detected_at?: string;
};

type DetailState = {
  loading: boolean;
  error: string;
  data?: VisitorTask;
};

type FilterKey = "all" | "active" | "replied" | "closed";

const FILTER_TABS: { key: FilterKey; label: string; statuses?: string[] }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中", statuses: ["processing", "sent"] },
  { key: "replied", label: "已回复", statuses: ["replied", "agreed"] },
  { key: "closed", label: "已结束", statuses: ["rejected", "closed"] },
];

// 状态胶囊配色：processing/sent=琥珀（进行中）、replied=蓝、agreed=绿、
// rejected/closed=灰（已结束）。未知状态回落灰色，缺 status_text 用本地兜底文案。
const STATUS_PILLS: Record<string, { label: string; className: string }> = {
  processing: {
    label: "处理中",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  sent: {
    label: "已发给卖家",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  replied: {
    label: "卖家已回复",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  agreed: {
    label: "卖家已同意",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "未能发送",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
  closed: {
    label: "已结束",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
};

const FALLBACK_PILL = {
  label: "处理中",
  className: "border-slate-200 bg-slate-100 text-slate-500",
};

// 平台徽章：当前只有煤炉（mercari）走留言服务；其它平台展示原样兜底，零回归。
const PLATFORM_BADGES: Record<string, string> = {
  mercari: "煤炉",
  rakuma: "ラクマ",
  yahoofrima: "PayPayフリマ",
  yahoo: "雅虎",
};

const MESSAGE_TYPE_BADGES: Record<string, string> = {
  bargain: "砍价",
  question: "咨询",
};

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getId(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return getString(value);
}

// 单条留言任务解析：没有 id 的条目无法展开详情/去重，丢弃。
function parseTask(value: unknown): VisitorTask | null {
  const record = getRecord(value);
  const id = getId(record.id);
  if (id === undefined) return null;
  return {
    id,
    platform: getString(record.platform),
    goods_no: getString(record.goods_no),
    item_url: getString(record.item_url),
    message_type: getString(record.message_type),
    customer_status: getString(record.customer_status),
    status_text: getString(record.status_text),
    customer_request_zh: getString(record.customer_request_zh),
    target_price_jpy: getNumber(record.target_price_jpy),
    listing_price_jpy: getNumber(record.listing_price_jpy),
    agreed_price_jpy: getNumber(record.agreed_price_jpy),
    minimum_bargain_price_jpy: getNumber(record.minimum_bargain_price_jpy),
    reject_reason_zh: getString(record.reject_reason_zh),
    reply_zh: getString(record.reply_zh),
    created_at: getString(record.created_at),
    sent_at: getString(record.sent_at),
    reply_detected_at: getString(record.reply_detected_at),
  };
}

function formatJpy(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

// yyyy-MM-dd hh:mm；解析不了的原样返回（别把后端给的文案吞成空白）。
function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 商品链接安全校验：只放行 http(s)，其它一律不渲染按钮（webview 内跳转用 location.href）。
function getSafeItemUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

// 同源 BFF 调用：BFF 已做 10s 硬超时与友好错误包装，页面只看 {code, data, errmsg}。
async function postSellerMessages(body: Record<string, unknown>): Promise<
  | { ok: true; data: unknown }
  | { ok: false; errmsg: string }
> {
  try {
    const response = await fetch("/api/support/seller-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload: unknown = await response.json().catch(() => null);
    const record = getRecord(payload);
    if (!response.ok || record.code !== 0) {
      return {
        ok: false,
        errmsg: getString(record.errmsg) || "网络开小差了，请稍后重试～",
      };
    }
    return { ok: true, data: record.data };
  } catch {
    return { ok: false, errmsg: "网络开小差了，请稍后重试～" };
  }
}

// 糖果橙皮（新版小程序 webview 用 ?theme=candy 拼进 URL 换肤，老小程序不带参数=零变化）。
// 页面固定用 Tailwind 默认 orange-* 调色板 + 品牌橙 hex(#FD7E3B/#F97E2F) + 页面底
// #f5f7fb；这里用 [data-theme="candy"] 祖先选择器覆盖这些 utility class 编译出的
// 固定颜色，不改任何组件结构/逻辑，老皮（无 data-theme 属性）零变化。
// 色值：主色 #EF8632 / 深 #D96E1E / 浅底 #FFF0E0 / 页面底 #FFFBF5 / 文字墨色 #4A3426。
const CANDY_THEME_CSS = `
[data-theme="candy"] [class~="bg-[#f5f7fb]"] { background-color: #FFFBF5 !important; }
[data-theme="candy"] [class~="text-[#FD7E3B]"] { color: #EF8632 !important; }
[data-theme="candy"] [class~="text-[#F97E2F]"] { color: #D96E1E !important; }
[data-theme="candy"] [class~="bg-[#FD7E3B]"] { background-color: #EF8632 !important; }
[data-theme="candy"] [class~="bg-[#FD7E3B]/10"] { background-color: rgba(239, 134, 50, 0.12) !important; }
[data-theme="candy"] .border-orange-100,
[data-theme="candy"] .border-orange-200 { border-color: #F7CDA0 !important; }
[data-theme="candy"] .text-orange-300 { color: #F0B27E !important; }
[data-theme="candy"] .text-slate-900 { color: #4A3426 !important; }
`;

export default function SellerMessagesH5Page() {
  const searchParams = useSearchParams();
  const userId = getNumericH5UserId(searchParams);
  const uidSignature = getH5UidSignature(searchParams);
  // 新版小程序换肤参数：?theme=candy。缺省/其它值一律按原皮渲染，零回归。
  const isCandyTheme = searchParams.get("theme") === "candy";

  const [tasks, setTasks] = useState<VisitorTask[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [detailByKey, setDetailByKey] = useState<Record<string, DetailState>>(
    {},
  );
  // StrictMode 双挂载防重复拉取（与 support/h5 的 ref 防抖同款思路）。
  const initialLoadRef = useRef(false);

  const loadList = useCallback(
    async (targetPage: number, mode: "replace" | "append") => {
      if (!userId) return;
      if (mode === "replace") {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setListError("");

      const result = await postSellerMessages({
        action: "list",
        user_id: userId,
        ts: uidSignature.ts,
        sig: uidSignature.sig,
        page: targetPage,
      });

      if (!result.ok) {
        // 加载更多失败不清空已有列表，只提示；首页加载失败进错误态（带重试按钮）。
        setListError(result.errmsg);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const data = getRecord(result.data);
      const rawList = Array.isArray(data.list) ? data.list : [];
      const parsed = rawList
        .map((item) => parseTask(item))
        .filter((item): item is VisitorTask => item !== null);

      setTotal(getNumber(data.total));
      setPage(getNumber(data.page) ?? targetPage);
      if (mode === "replace") {
        setTasks(parsed);
      } else {
        setTasks((current) => {
          const seen = new Set(current.map((task) => String(task.id)));
          return [
            ...current,
            ...parsed.filter((task) => !seen.has(String(task.id))),
          ];
        });
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [userId, uidSignature.ts, uidSignature.sig],
  );

  useEffect(() => {
    if (!userId) return;
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    // 用 0ms 定时器把首拉挪出 effect 同步体（react-hooks/set-state-in-effect），
    // 行为等价：挂载后立刻拉第一页。
    const timer = window.setTimeout(() => void loadList(1, "replace"), 0);
    return () => window.clearTimeout(timer);
  }, [userId, loadList]);

  const loadDetail = useCallback(
    async (task: VisitorTask) => {
      if (!userId) return;
      const key = String(task.id);
      setDetailByKey((current) => ({
        ...current,
        [key]: { loading: true, error: "", data: current[key]?.data },
      }));

      const result = await postSellerMessages({
        action: "detail",
        id: task.id,
        user_id: userId,
        ts: uidSignature.ts,
        sig: uidSignature.sig,
      });

      if (!result.ok) {
        setDetailByKey((current) => ({
          ...current,
          [key]: { loading: false, error: result.errmsg },
        }));
        return;
      }

      const detail = parseTask(result.data);
      setDetailByKey((current) => ({
        ...current,
        [key]: {
          loading: false,
          error: "",
          // 详情解析失败（缺 id 等）回落列表里的这条，时间线至少能画出提交节点。
          data: detail ?? task,
        },
      }));
    },
    [userId, uidSignature.ts, uidSignature.sig],
  );

  function toggleExpand(task: VisitorTask) {
    const key = String(task.id);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    const cached = detailByKey[key];
    if (!cached?.data && !cached?.loading) {
      void loadDetail(task);
    }
  }

  // 商品链接：小程序 webview 安全跳转 —— 一律当前页跳转（location.assign），绝不 window.open。
  function openItemUrl(url: string) {
    window.location.assign(url);
  }

  const activeTab =
    FILTER_TABS.find((tab) => tab.key === filter) ?? FILTER_TABS[0];
  const visibleTasks = activeTab.statuses
    ? tasks.filter(
        (task) =>
          task.customer_status &&
          activeTab.statuses!.includes(task.customer_status),
      )
    : tasks;
  const hasMore =
    total !== undefined && tasks.length < total && tasks.length > 0;

  // ── 身份缺失：不发任何 API，只给回小程序的指引占位。 ──
  if (!userId) {
    return (
      <main
        className="fixed inset-0 overflow-y-auto bg-[#f5f7fb] text-slate-900"
        data-theme={isCandyTheme ? "candy" : undefined}
      >
        {isCandyTheme ? <style>{CANDY_THEME_CSS}</style> : null}
        <header className="border-b border-orange-100 bg-white px-4 py-3">
          <div className="flex items-center gap-1.5 text-base font-semibold">
            <MessageCircle className="h-4 w-4 text-[#FD7E3B]" />
            我的留言
          </div>
          <div className="mt-0.5 text-xs text-slate-500">帮你用日语问卖家</div>
        </header>
        <section className="px-4 py-10">
          <div
            className="rounded-lg border border-orange-100 bg-white p-5 text-center shadow-sm"
            data-testid="seller-messages-missing-identity"
          >
            <MessageCircle className="mx-auto h-8 w-8 text-orange-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              暂时认不出你是哪位买家
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              请从袋鼠君小程序的客服或商品页进入本页，袋鼠君才能帮你查留言进度哦～
            </p>
          </div>
        </section>
      </main>
    );
  }

  const renderTaskCard = (task: VisitorTask) => {
    const key = String(task.id);
    const pill =
      (task.customer_status && STATUS_PILLS[task.customer_status]) ||
      FALLBACK_PILL;
    const pillLabel = task.status_text || pill.label;
    const platformBadge = task.platform
      ? PLATFORM_BADGES[task.platform] || task.platform
      : undefined;
    const typeBadge = task.message_type
      ? MESSAGE_TYPE_BADGES[task.message_type] || task.message_type
      : undefined;
    const itemUrl = getSafeItemUrl(task.item_url);
    const expanded = expandedKey === key;
    const detail = detailByKey[key];
    // 详情接口拿到的字段更全，展开后优先用详情数据渲染时间线。
    const view = detail?.data ?? task;
    const isAgreed = task.customer_status === "agreed";
    const isRejected = task.customer_status === "rejected";

    return (
      <div
        key={key}
        className="rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
        data-testid={`seller-messages-card-${key}`}
        onClick={() => toggleExpand(task)}
      >
        {/* 徽章行：平台 + 留言类型 + 状态胶囊 */}
        <div className="flex items-center gap-1.5">
          {platformBadge ? (
            <span className="rounded bg-[#FD7E3B]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#F97E2F]">
              {platformBadge}
            </span>
          ) : null}
          {typeBadge ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
              {typeBadge}
            </span>
          ) : null}
          <span
            className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] font-medium ${pill.className}`}
            data-testid={`seller-messages-status-${key}`}
          >
            {pillLabel}
          </span>
        </div>

        {task.goods_no ? (
          <div className="mt-1.5 text-xs text-slate-500">
            商品编号：{task.goods_no}
          </div>
        ) : null}

        {/* 砍价价格行：标价 → 目标价（JPY 整数） */}
        {task.message_type === "bargain" &&
        (task.listing_price_jpy !== undefined ||
          task.target_price_jpy !== undefined) ? (
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-sm">
            {task.listing_price_jpy !== undefined ? (
              <span className="text-slate-500">
                标价 {formatJpy(task.listing_price_jpy)}
              </span>
            ) : null}
            {task.target_price_jpy !== undefined ? (
              <span className="font-semibold text-[#F97E2F]">
                → 目标 {formatJpy(task.target_price_jpy)} 日元
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 砍价成功横幅：显眼绿色，agreed_price 为准 */}
        {isAgreed ? (
          <div
            className="mt-2 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"
            data-testid="seller-messages-agreed-banner"
          >
            {task.agreed_price_jpy !== undefined
              ? `砍价成功 ${formatJpy(task.agreed_price_jpy)} 日元`
              : "卖家已同意降价"}
            <span className="mt-0.5 block text-xs font-normal text-emerald-50">
              卖家已同意，请回小程序按新价格下单～
            </span>
          </div>
        ) : null}

        {task.customer_request_zh ? (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-700">
            {task.customer_request_zh}
          </p>
        ) : null}

        {/* 卖家回复块 */}
        {task.reply_zh ? (
          <div
            className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2"
            data-testid={`seller-messages-reply-${key}`}
          >
            <div className="mb-0.5 text-[11px] font-medium text-blue-700">
              卖家回复
            </div>
            <p className="text-xs leading-5 text-slate-700">{task.reply_zh}</p>
          </div>
        ) : null}

        {/* 未能发送：友好说明（信息态，不吓人） */}
        {isRejected && task.reject_reason_zh ? (
          <div
            className="mt-2 flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600"
            data-testid={`seller-messages-reject-${key}`}
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>这条留言没有发出：{task.reject_reason_zh}</span>
          </div>
        ) : null}

        {/* 底部行：时间 + 商品链接 + 展开指示 */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            {formatTime(task.created_at)}
          </span>
          <span className="flex items-center gap-2">
            {itemUrl ? (
              <button
                type="button"
                className="flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-medium text-[#F97E2F]"
                onClick={(event) => {
                  event.stopPropagation();
                  openItemUrl(itemUrl);
                }}
                data-testid={`seller-messages-item-link-${key}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                商品链接
              </button>
            ) : null}
            <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
              {expanded ? "收起" : "详情"}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </span>
          </span>
        </div>

        {/* 内联展开详情：简单时间线（提交 → 已发给卖家 → 卖家回复） */}
        {expanded ? (
          <div
            className="mt-2 border-t border-slate-100 pt-2"
            data-testid={`seller-messages-detail-${key}`}
            onClick={(event) => event.stopPropagation()}
          >
            {detail?.loading ? (
              <p className="text-xs leading-5 text-slate-400">
                正在加载详情…
              </p>
            ) : detail?.error ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs leading-5 text-slate-500">
                  {detail.error}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-medium text-[#F97E2F]"
                  onClick={() => void loadDetail(task)}
                  data-testid={`seller-messages-detail-retry-${key}`}
                >
                  重试
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {renderTimeline(view)}
                {view.minimum_bargain_price_jpy !== undefined ? (
                  <p className="text-[11px] leading-4 text-slate-400">
                    小提示：本单砍价下限约{" "}
                    {formatJpy(view.minimum_bargain_price_jpy)}{" "}
                    日元（低于标价八折的留言不代发）。
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  // 时间线：提交（created_at）→ 已发给卖家（sent_at）→ 卖家回复（reply_detected_at + reply_zh）。
  // rejected 单：第二步换成「未能发出」并展示原因，后续步骤不再画。
  const renderTimeline = (view: VisitorTask) => {
    type Step = {
      label: string;
      time?: string;
      done: boolean;
      body?: string;
      pendingNote?: string;
    };
    const steps: Step[] = [
      {
        label: "提交留言",
        time: view.created_at,
        done: true,
        body: view.customer_request_zh,
      },
    ];
    if (view.customer_status === "rejected") {
      steps.push({
        label: "未能发出",
        done: true,
        body: view.reject_reason_zh
          ? `原因：${view.reject_reason_zh}`
          : undefined,
      });
    } else {
      steps.push({
        label: "已发给卖家",
        time: view.sent_at,
        done: Boolean(view.sent_at),
        pendingNote: "客服正在为你翻译成日语并发送",
      });
      steps.push({
        label: "卖家回复",
        time: view.reply_detected_at,
        done: Boolean(view.reply_detected_at || view.reply_zh),
        body: view.reply_zh,
        pendingNote: "等待卖家回复，有动静会同步到这里",
      });
    }

    return (
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-2">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                step.done ? "bg-[#FD7E3B]" : "border border-slate-300 bg-white"
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-xs font-medium ${
                    step.done ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                {step.time ? (
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {formatTime(step.time)}
                  </span>
                ) : null}
              </span>
              {step.done && step.body ? (
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {step.body}
                </span>
              ) : null}
              {!step.done && step.pendingNote ? (
                <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">
                  {step.pendingNote}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <main
      className="fixed inset-0 overflow-y-auto bg-[#f5f7fb] text-slate-900"
      data-theme={isCandyTheme ? "candy" : undefined}
    >
      {isCandyTheme ? <style>{CANDY_THEME_CSS}</style> : null}
      <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="flex items-start justify-between px-4 pt-3">
          <div>
            <div className="flex items-center gap-1.5 text-base font-semibold">
              <MessageCircle className="h-4 w-4 text-[#FD7E3B]" />
              我的留言
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              帮你用日语问卖家
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#F97E2F] disabled:opacity-50"
            onClick={() => void loadList(1, "replace")}
            disabled={loading}
            data-testid="seller-messages-refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
        <div className="mt-1 flex gap-5 px-4" data-testid="seller-messages-tabs">
          {FILTER_TABS.map((tab) => {
            const active = tab.key === filter;
            return (
              <button
                key={tab.key}
                type="button"
                className={`relative pb-2 text-sm ${
                  active
                    ? "font-semibold text-[#F97E2F]"
                    : "text-slate-500"
                }`}
                onClick={() => setFilter(tab.key)}
                data-testid={`seller-messages-tab-${tab.key}`}
              >
                {tab.label}
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#FD7E3B]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <section className="space-y-3 px-3 pb-10 pt-3">
        {listError && tasks.length === 0 && !loading ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center"
            data-testid="seller-messages-error"
          >
            <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
            <p className="mt-2 text-sm text-amber-800">{listError}</p>
            <button
              type="button"
              className="mt-3 rounded-md bg-[#FD7E3B] px-4 py-2 text-sm font-medium text-white shadow-sm"
              onClick={() => void loadList(1, "replace")}
              data-testid="seller-messages-retry"
            >
              重试
            </button>
          </div>
        ) : null}

        {loading && tasks.length === 0 && !listError ? (
          <div className="rounded-lg border border-orange-100 bg-white px-3 py-4 text-center text-xs leading-5 text-slate-500 shadow-sm">
            正在加载留言记录，请稍等…
          </div>
        ) : null}

        {!loading && !listError && tasks.length === 0 ? (
          <div
            className="rounded-lg border border-orange-100 bg-white p-5 text-center shadow-sm"
            data-testid="seller-messages-empty"
          >
            <MessageCircle className="mx-auto h-8 w-8 text-orange-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              还没有留言记录
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              去商品页点「留言」发起第一条，袋鼠君帮你用日语向卖家砍价、问细节～
            </p>
          </div>
        ) : null}

        {tasks.length > 0 && visibleTasks.length === 0 ? (
          <div
            className="rounded-lg border border-orange-100 bg-white p-4 text-center text-xs leading-5 text-slate-500 shadow-sm"
            data-testid="seller-messages-filter-empty"
          >
            这个分类下暂时没有留言，切到「全部」看看吧～
          </div>
        ) : null}

        {visibleTasks.map((task) => renderTaskCard(task))}

        {/* 加载更多失败时列表还在，用一条轻提示 + 重试，不清空已有内容 */}
        {listError && tasks.length > 0 ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-xs text-amber-800">{listError}</span>
            <button
              type="button"
              className="shrink-0 rounded-md bg-[#FD7E3B] px-3 py-1.5 text-xs font-medium text-white"
              onClick={() => void loadList(1, "replace")}
              data-testid="seller-messages-retry-inline"
            >
              重试
            </button>
          </div>
        ) : null}

        {hasMore && !listError ? (
          <button
            type="button"
            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-sm font-medium text-[#F97E2F] shadow-sm disabled:opacity-50"
            onClick={() => void loadList(page + 1, "append")}
            disabled={loadingMore}
            data-testid="seller-messages-load-more"
          >
            {loadingMore ? "正在加载…" : "加载更多"}
          </button>
        ) : null}
      </section>
    </main>
  );
}
