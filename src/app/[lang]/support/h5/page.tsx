"use client";

import {
  type CSSProperties,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Headset,
  MessageCircle,
  ShoppingBag,
  Send,
  UserRoundCheck,
} from "lucide-react";

import { getH5UidSignature, getNumericH5UserId } from "./identity";

type ChatItem = {
  id?: string;
  role: "assistant" | "user" | "support";
  content: string;
  orderRef?: OrderRef;
  createdAt?: string;
};

type OrderRef = {
  order_id?: string;
  goods_name?: string;
  amount?: string;
  amount_rmb?: string;
};

type SupportParsedResponse = {
  text: string;
  transferHuman: boolean;
  conversationId?: string;
  queuedForHuman?: boolean;
  orderRef?: OrderRef;
};

type MiniProgramWindow = Window & {
  wx?: {
    miniProgram?: {
      navigateTo?: (options: { url: string }) => void;
    };
  };
};

const QUICK_QUESTIONS = [
  "代拍流程是什么？",
  "代拍费用如何计算？",
  "国际运费怎么查？",
  "商品多久能到仓库？",
  "押金怎么退？",
  "我要转人工客服",
];

const SUPPORTED_PLATFORMS = new Set(["mercari", "amazon", "yahoo", "rakuten"]);
const HUMAN_TRANSFER_MESSAGE =
  "袋鼠酱这边暂时有点忙，我先带你转人工客服继续处理～";
const RESPONSE_TIME_NOTE =
  "我会尽量快点回复；复杂问题可能需要十几秒整理，请稍等一下。";
const MINI_PROGRAM_REAL_KEFU_PATH = "/pages/bundle/realkefu/realkefu";
const KF53_CHAT_URL = process.env.NEXT_PUBLIC_KF53_CHAT_URL || "";

const WELCOME_ITEM: ChatItem = {
  role: "assistant",
  content:
    "嗨，我是袋鼠酱～你可以直接问我，也可以点下面的快捷问题。代拍流程、费用、国际运费这些我都能先帮你捋一捋；遇到需要人工确认的事，我会马上带你去找客服同事。",
};

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getOrderRef(value: unknown): OrderRef | undefined {
  const record = getRecord(value);
  const orderId = getString(record.order_id);
  if (!orderId) return undefined;

  return {
    order_id: orderId,
    goods_name: getString(record.goods_name),
    amount: getString(record.amount),
    amount_rmb: getString(record.amount_rmb),
  };
}

function parseSupportResponse(payload: unknown): SupportParsedResponse {
  const root = getRecord(payload);
  const data = getRecord(root.data) || root;
  const action = data.action || root.action;
  const type = data.type || root.type;
  const fallback = data.fallback || root.fallback;
  const transferHuman =
    action === "transfer_human" ||
    type === "transfer_human" ||
    fallback === "53kf";
  const orderRef = getOrderRef(data.order_ref || root.order_ref);

  const text =
    getString(data.reply) ||
    getString(data.answer) ||
    getString(data.message) ||
    getString(data.autoReply) ||
    (transferHuman
      ? HUMAN_TRANSFER_MESSAGE
      : "这个问题袋鼠酱需要请人工客服一起确认，点一下就能转过去～");

  return {
    text,
    transferHuman,
    conversationId: getString(data.conversationId),
    queuedForHuman: Boolean(data.queuedForHuman),
    orderRef,
  };
}

function mapServerRole(role: unknown): ChatItem["role"] {
  if (role === "visitor") return "user";
  if (role === "support") return "support";
  return "assistant";
}

function mapServerMessages(payload: unknown): ChatItem[] {
  const root = getRecord(payload);
  const data = getRecord(root.data);
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return messages
    .map((item) => {
      const record = getRecord(item);
      const content = getString(record.content);
      if (!content) return null;
      return {
        id: getString(record.id),
        role: mapServerRole(record.role),
        content,
        createdAt: getString(record.createdAt),
      } satisfies ChatItem;
    })
    .filter(Boolean) as ChatItem[];
}

function isMiniProgramWebview() {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  return Boolean(win.wx?.miniProgram?.navigateTo);
}

function navigateToMiniProgramHumanKefu() {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  win.wx.miniProgram.navigateTo({ url: MINI_PROGRAM_REAL_KEFU_PATH });
  return true;
}

function navigateToMiniProgramOrderDetail(orderId: string) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  win.wx.miniProgram.navigateTo({
    url: "/pages/daishujun/mine/orderDetail?id=" + orderId,
  });
  return true;
}

function getKf53ChatUrl() {
  const rawUrl = KF53_CHAT_URL.trim();
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function MiniProgramSupportH5Page() {
  const params = useParams<{ lang?: string }>();
  const searchParams = useSearchParams();
  const lang = params?.lang || "zh";
  const initialSessionId = searchParams.get("session_id") || undefined;
  const userId = getNumericH5UserId(searchParams);
  const uidSignature = getH5UidSignature(searchParams);
  const sourceGoodsId = searchParams.get("gid") || undefined;
  const rawShop = searchParams.get("shop") || "mercari";
  const sourcePlatform = SUPPORTED_PLATFORMS.has(rawShop) ? rawShop : "mercari";
  const initialTransferHuman =
    searchParams.get("type") === "transfer_human" ||
    searchParams.get("fallback") === "53kf";
  const [conversationId, setConversationId] = useState<string | undefined>(
    searchParams.get("conversation_id") || undefined,
  );
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [pollingError, setPollingError] = useState("");
  const [humanTransferVisible, setHumanTransferVisible] =
    useState(initialTransferHuman);
  const [humanTransferNote, setHumanTransferNote] = useState(
    initialTransferHuman ? "袋鼠酱暂时接不上，我先帮你转人工客服～" : "",
  );
  const [items, setItems] = useState<ChatItem[]>([WELCOME_ITEM]);
  const [vpRect, setVpRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [wxReady, setWxReady] = useState(false);
  const kf53ChatUrl = getKf53ChatUrl();

  const externalSessionId = useMemo(
    () => initialSessionId || `mini-h5-${Date.now()}`,
    [initialSessionId],
  );

  const loadConversationMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await fetch(
        `/api/support/conversations/${conversationId}/messages?limit=100`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("message polling failed");
      const payload = await response.json().catch(() => null);
      const serverItems = mapServerMessages(payload);
      setItems([WELCOME_ITEM, ...serverItems]);
      setPollingError("");
    } catch {
      setPollingError("消息同步暂时失败，请稍后重试或联系人工客服。");
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    void loadConversationMessages();
    const timer = window.setInterval(() => {
      void loadConversationMessages();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [conversationId, loadConversationMessages]);

  useEffect(() => {
    const win = window as MiniProgramWindow;
    if (win.wx?.miniProgram?.navigateTo) {
      setWxReady(true);
      return;
    }
    const existing = document.getElementById("jweixin-sdk");
    if (existing) {
      existing.addEventListener("load", () => setWxReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "jweixin-sdk";
    script.src = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
    script.async = true;
    script.onload = () => setWxReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    // iOS 微信 webview：键盘弹出时 visualViewport 会缩小并带 offsetTop（页面被顶上去）。
    // 把容器 position:fixed 钉到"当前可视区"（top=offsetTop, height=可视高度），
    // 这样 body 怎么滚，聊天容器始终贴着可见区域，输入条永远浮在键盘上方、不再空白。
    const updateRect = () => {
      if (!viewport) {
        setVpRect(null);
        return;
      }
      setVpRect({
        top: Math.round(viewport.offsetTop),
        left: Math.round(viewport.offsetLeft),
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
      });
    };

    updateRect();
    viewport?.addEventListener("resize", updateRect);
    viewport?.addEventListener("scroll", updateRect);
    window.addEventListener("resize", updateRect);

    return () => {
      viewport?.removeEventListener("resize", updateRect);
      viewport?.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, []);

  async function sendMessage(message: string) {
    const content = message.trim();
    if (!content || loading) return;

    if (content.includes("人工")) {
      setHumanTransferVisible(true);
      setHumanTransferNote("好呀，袋鼠酱这就帮你叫人工客服～");
    }

    setItems((current) => [...current, { role: "user", content }]);
    setDraft("");
    setLoading(true);

    try {
      const endpoint = conversationId
        ? `/api/support/conversations/${conversationId}/messages`
        : "/api/support/chat";
      const body = conversationId
        ? { content }
        : {
            message: content,
            conversationId,
            site: "kangaroo-japan",
            language: lang === "ja" ? "ja" : lang === "en" ? "en" : "zh",
            sourceChannel: "mini_program_ai_webview",
            externalSessionId,
            userId,
            ts: uidSignature.ts,
            sig: uidSignature.sig,
            sourceGoodsId,
            sourcePlatform,
            sourcePage:
              typeof window === "undefined" ? undefined : window.location.href,
          };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": lang,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error("support api failed");
      }
      const parsed = parseSupportResponse(payload);

      if (parsed.conversationId) {
        setConversationId(parsed.conversationId);
      }
      if (parsed.transferHuman || parsed.queuedForHuman) {
        setHumanTransferVisible(true);
        setHumanTransferNote(parsed.text || HUMAN_TRANSFER_MESSAGE);
      }
      if (parsed.text && !parsed.queuedForHuman) {
        setItems((current) => [
          ...current,
          {
            role: "assistant",
            content: parsed.text,
            orderRef: parsed.orderRef,
          },
        ]);
      }
      if (parsed.conversationId || conversationId) {
        window.setTimeout(() => void loadConversationMessages(), 300);
      }
    } catch {
      setHumanTransferVisible(true);
      setHumanTransferNote("袋鼠酱这边暂时卡住了，我先带你转人工客服～");
      setItems((current) => [
        ...current,
        {
          role: "assistant",
          content: HUMAN_TRANSFER_MESSAGE,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function contactHuman() {
    if (navigateToMiniProgramHumanKefu()) return;
    if (kf53ChatUrl) {
      window.open(kf53ChatUrl, "_blank", "noopener,noreferrer");
      setHumanTransferVisible(true);
      setHumanTransferNote("已为你打开网页人工客服窗口，请在新窗口继续沟通。");
      return;
    }

    setHumanTransferVisible(true);
    setHumanTransferNote(
      "当前不是小程序 WebView 环境。请回到袋鼠君小程序，点击在线客服或人工客服入口联系人工客服。",
    );
  }

  function openOrderDetail(orderRef: OrderRef) {
    if (!orderRef.order_id) return;
    if (navigateToMiniProgramOrderDetail(orderRef.order_id)) return;

    setHumanTransferVisible(true);
    setHumanTransferNote(
      "请在袋鼠君小程序内打开本页面，再点击订单卡片查看或支付订单。",
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formMessage = formData.get("message");
    void sendMessage(typeof formMessage === "string" ? formMessage : draft);
  }

  const viewportStyle: CSSProperties = vpRect
    ? {
        position: "fixed",
        top: vpRect.top,
        left: vpRect.left,
        width: vpRect.width,
        height: vpRect.height,
      }
    : { position: "fixed", inset: 0, height: "100dvh" };

  return (
    <main
      className="flex min-h-0 flex-col overflow-hidden bg-[#f5f7fb] text-slate-900"
      style={viewportStyle}
    >
      <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="text-center text-base font-semibold">袋鼠酱</div>
        <div className="mt-1 text-center text-xs text-slate-500">
          我先陪你看，复杂问题可能需要一点时间；拿不准的事马上帮你找人工
        </div>
      </header>

      <section className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4 pt-4">
        {items.map((item, index) => {
          const amountText = item.orderRef?.amount_rmb
            ? `¥${item.orderRef.amount_rmb}`
            : undefined;
          const jpyText = item.orderRef?.amount
            ? `（约 ${item.orderRef.amount} 日元）`
            : "";
          const canNavigateOrder = Boolean(
            item.orderRef?.order_id && wxReady && isMiniProgramWebview(),
          );

          return (
            <div
              key={item.id || `${item.role}-${index}`}
              className={`flex flex-col ${
                item.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
                  item.role === "user"
                    ? "bg-[#4f67ff] text-white"
                    : item.role === "support"
                      ? "border border-orange-100 bg-white text-slate-800"
                      : "bg-white text-slate-800"
                }`}
              >
                {item.role === "support" ? (
                  <div className="mb-1 text-[11px] font-medium text-orange-600">
                    人工客服
                  </div>
                ) : null}
                {item.content}
              </div>
              {item.orderRef?.order_id ? (
                <div
                  className="mt-2 w-[82%] max-w-sm rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
                  data-testid="support-order-card"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ShoppingBag className="h-4 w-4 text-orange-500" />
                    订单信息
                  </div>
                  {item.orderRef.goods_name ? (
                    <div className="line-clamp-2 text-sm leading-5 text-slate-700">
                      {item.orderRef.goods_name}
                    </div>
                  ) : null}
                  {amountText ? (
                    <div className="mt-2 text-sm font-medium text-slate-900">
                      应付金额：{amountText}
                      {jpyText ? (
                        <span className="font-normal text-slate-500">
                          {jpyText}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                    onClick={() => openOrderDetail(item.orderRef as OrderRef)}
                    disabled={!canNavigateOrder}
                  >
                    去支付 / 查看订单
                  </button>
                  {!canNavigateOrder ? (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      请在小程序内打开后查看或支付订单。
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {pollingError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {pollingError}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-start">
            <div className="max-w-[82%] rounded-lg border border-orange-100 bg-white px-3 py-2 text-xs leading-5 text-slate-500 shadow-sm">
              {RESPONSE_TIME_NOTE}
            </div>
          </div>
        ) : null}

        {humanTransferVisible ? (
          <div
            className="rounded-lg border border-orange-200 bg-white p-3 shadow-sm"
            data-testid="human-transfer-card"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700">
              <Headset className="h-4 w-4" />
              联系人工客服
            </div>
            <p className="text-sm leading-6 text-slate-700">
              {humanTransferNote || HUMAN_TRANSFER_MESSAGE}
            </p>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm"
              onClick={contactHuman}
              data-testid="contact-human-button"
            >
              <MessageCircle className="h-4 w-4" />
              联系人工客服
            </button>
            {!isMiniProgramWebview() ? (
              <p className="mt-2 flex items-start gap-1 text-xs leading-5 text-slate-500">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {kf53ChatUrl
                  ? "普通 H5 环境会打开网页人工客服窗口，不会自动携带订单或个人敏感信息。"
                  : "普通 H5 环境无法直接拉起微信客服，请回到袋鼠君小程序后点击人工客服入口。"}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg bg-white p-3 shadow-sm">
          <div className="mb-2 text-xs font-medium text-slate-500">
            快捷问题
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className="rounded-md border border-orange-100 bg-orange-50 px-2 py-2 text-left text-xs text-orange-700"
                onClick={() => void sendMessage(question)}
                disabled={loading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-orange-100 bg-white p-3 text-xs leading-5 text-slate-600">
          <div className="mb-1 flex items-center gap-1 font-medium text-orange-700">
            <UserRoundCheck className="h-4 w-4" />
            袋鼠酱小提醒
          </div>
          袋鼠酱可以先回答代拍流程、费用、物流等常见问题；复杂问题可能需要十几秒整理，请稍等一下。如果遇到退款、改地址、投诉、支付异常，或者需要确认订单的事，我会帮你转给人工客服处理。
        </div>
      </section>

      <form
        onSubmit={submit}
        className="sticky bottom-0 flex shrink-0 gap-2 border-t bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3"
      >
        <input
          name="message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
          placeholder="请输入问题"
          maxLength={1000}
        />
        <button
          type="submit"
          className="flex h-10 w-11 items-center justify-center rounded-md bg-orange-500 text-white disabled:bg-orange-200"
          disabled={loading}
          aria-label="发送"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
