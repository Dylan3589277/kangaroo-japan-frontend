"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Headset,
  MessageCircle,
  Send,
  UserRoundCheck,
} from "lucide-react";

type ChatItem = {
  role: "assistant" | "user";
  content: string;
};

type SupportParsedResponse = {
  text: string;
  transferHuman: boolean;
  reason?: string;
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

const SUPPORTED_PLATFORMS = new Set(["mercari", "amazon", "yahoo"]);
const HUMAN_TRANSFER_MESSAGE = "AI客服暂时不可用，请联系人工客服";
const MINI_PROGRAM_REAL_KEFU_PATH = "/pages/bundle/realkefu/realkefu";

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function parseSupportResponse(payload: unknown): SupportParsedResponse {
  const root = getRecord(payload);
  const data = getRecord(root.data) || root;
  const action = data.action || root.action;
  const type = data.type || root.type;
  const fallback = data.fallback || root.fallback;
  const reason = data.transfer_reason || data.reason || root.reason;

  const transferHuman =
    action === "transfer_human" ||
    type === "transfer_human" ||
    fallback === "53kf";

  for (const key of ["reply", "answer", "message"]) {
    const value = data[key] || root[key];
    if (typeof value === "string" && value.trim()) {
      return {
        text: value,
        transferHuman,
        reason: typeof reason === "string" ? reason : undefined,
      };
    }
  }

  if (transferHuman) {
    return {
      text: HUMAN_TRANSFER_MESSAGE,
      transferHuman: true,
      reason: typeof reason === "string" ? reason : undefined,
    };
  }

  return {
    text: "这个问题需要人工客服继续处理，请点击联系人工客服。",
    transferHuman: true,
  };
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

export default function MiniProgramSupportH5Page() {
  const params = useParams<{ lang?: string }>();
  const searchParams = useSearchParams();
  const lang = params?.lang || "zh";
  const initialSessionId = searchParams.get("session_id") || undefined;
  const sourceGoodsId = searchParams.get("gid") || undefined;
  const rawShop = searchParams.get("shop") || "mercari";
  const sourcePlatform = SUPPORTED_PLATFORMS.has(rawShop) ? rawShop : "mercari";
  const initialTransferHuman =
    searchParams.get("type") === "transfer_human" ||
    searchParams.get("fallback") === "53kf";
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [humanTransferVisible, setHumanTransferVisible] =
    useState(initialTransferHuman);
  const [humanTransferNote, setHumanTransferNote] = useState(
    initialTransferHuman
      ? "AI客服暂时不可用，您可以直接转接人工客服。"
      : "",
  );
  const [items, setItems] = useState<ChatItem[]>([
    {
      role: "assistant",
      content:
        "你好，我是袋鼠智能客服。你可以先点下面的常见问题；如果我答不上来，会提示你转人工客服。",
    },
  ]);

  const externalSessionId = useMemo(
    () => initialSessionId || `mini-h5-${Date.now()}`,
    [initialSessionId],
  );

  async function sendMessage(message: string) {
    const content = message.trim();
    if (!content || loading) return;

    if (content.includes("人工")) {
      setHumanTransferVisible(true);
      setHumanTransferNote("正在为您准备人工客服入口。");
    }

    setItems((current) => [...current, { role: "user", content }]);
    setDraft("");
    setLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": lang,
        },
        body: JSON.stringify({
          message: content,
          conversationId,
          site: "kangaroo-japan",
          language: lang === "ja" ? "ja" : lang === "en" ? "en" : "zh",
          sourceChannel: "mini_program_ai_webview",
          externalSessionId,
          sourceGoodsId,
          sourcePlatform,
          sourcePage:
            typeof window === "undefined" ? undefined : window.location.href,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error("support api failed");
      }
      const data = getRecord(payload).data || payload;
      const parsed = parseSupportResponse(payload);
      const dataRecord = getRecord(data);

      if (typeof dataRecord.conversationId === "string") {
        setConversationId(dataRecord.conversationId);
      }
      if (parsed.transferHuman) {
        setHumanTransferVisible(true);
        setHumanTransferNote(parsed.reason || parsed.text);
      }
      setItems((current) => [
        ...current,
        { role: "assistant", content: parsed.text },
      ]);
    } catch {
      setHumanTransferVisible(true);
      setHumanTransferNote("客服服务暂时不可用，请转接人工客服。");
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
    setHumanTransferVisible(true);
    setHumanTransferNote(
      "当前不是小程序 WebView 环境。请回到袋鼠君小程序，点击在线客服或人工客服入口联系 53KF 人工客服。",
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formMessage = formData.get("message");
    void sendMessage(typeof formMessage === "string" ? formMessage : draft);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="text-center text-base font-semibold">
          袋鼠智能客服
        </div>
        <div className="mt-1 text-center text-xs text-slate-500">
          AI 先答复，复杂问题请转人工客服
        </div>
      </header>

      <section className="space-y-3 px-3 pb-32 pt-4">
        {items.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
                item.role === "user"
                  ? "bg-[#4f67ff] text-white"
                  : "bg-white text-slate-800"
              }`}
            >
              {item.content}
            </div>
          </div>
        ))}

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
                普通 H5 环境无法直接拉起微信客服，请回到袋鼠君小程序后点击人工客服入口。
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
            转人工规则
          </div>
          Hermes 离线、问题超出知识库、涉及退款承诺、发货承诺、他人订单时，请转人工客服处理。
        </div>
      </section>

      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3"
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
