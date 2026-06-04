"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Send, UserRoundCheck } from "lucide-react";

type ChatItem = {
  role: "assistant" | "user";
  content: string;
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

function textFromSupportResponse(payload: unknown) {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  for (const key of ["reply", "answer", "message"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "这个问题我需要请人工客服继续处理，请点击转人工客服。";
}

export default function MiniProgramSupportH5Page() {
  const params = useParams<{ lang?: string }>();
  const searchParams = useSearchParams();
  const lang = params?.lang || "zh";
  const initialSessionId = searchParams.get("session_id") || undefined;
  const sourceGoodsId = searchParams.get("gid") || undefined;
  const rawShop = searchParams.get("shop") || "mercari";
  const sourcePlatform = SUPPORTED_PLATFORMS.has(rawShop) ? rawShop : "mercari";
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
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
      const data = payload?.data || payload;
      if (data?.conversationId) setConversationId(data.conversationId);
      setItems((current) => [
        ...current,
        { role: "assistant", content: textFromSupportResponse(payload) },
      ]);
    } catch {
      setItems((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "客服分身暂时不可用。请返回小程序点击人工客服，或稍后再试。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="text-center text-base font-semibold">袋鼠智能客服</div>
        <div className="mt-1 text-center text-xs text-slate-500">
          AI 先答复，复杂问题请转人工客服
        </div>
      </header>

      <section className="space-y-3 px-3 pb-28 pt-4">
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

        <div className="rounded-lg bg-white p-3 shadow-sm">
          <div className="mb-2 text-xs font-medium text-slate-500">快捷问题</div>
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
            转人工客服
          </div>
          Hermes 离线、问题超出知识库、涉及退款承诺/发货承诺/他人订单时，请返回小程序点击人工客服。
        </div>
      </section>

      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
          placeholder="请输入问题"
          maxLength={1000}
        />
        <button
          type="submit"
          className="flex h-10 w-11 items-center justify-center rounded-md bg-orange-500 text-white disabled:bg-orange-200"
          disabled={loading || !draft.trim()}
          aria-label="发送"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
