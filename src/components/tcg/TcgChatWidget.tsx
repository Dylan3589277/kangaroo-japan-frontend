"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";

/**
 * TcgChatWidget —— 美国 TCG 站（设计方向 A 深色高级感）右下角浮动在线客服。
 *
 * 仅由 [lang]/layout.tsx 在 locale === "en" 时挂载，与 TcgHeader/TcgFooter 同一深色
 * 外壳（#0a0e16 + cyan-400 + Space Grotesk）。
 *
 * v1：只答 FAQ，不查订单。走同源 /api/support/chat（site=kangaroo-japan-tcg +
 * faqOnly:true）→ Hermes 英文 FAQ 应答路径，全程不带 user_id / 不查单。无法回答或
 * 涉及具体订单时 fail-closed 引导到 Contact 页的 Email / WhatsApp。订单查询能力留到
 * 二期（待 TCG 用户 ↔ legacy 订单映射打通）。
 */

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
  /** assistant 消息是否为转人工提示，用于附加 Contact 链接。 */
  transfer?: boolean;
}

const SUGGESTION_KEYS = ["fees", "customs", "condition", "valueAdded"] as const;

export function TcgChatWidget() {
  const t = useTranslations("tcg-chat");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Seed the greeting via a lazy initializer so it's set once at mount without a
  // setState-in-effect cascade. `t` from next-intl is available synchronously.
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: "assistant", content: t("greeting") },
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, open]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading],
  );

  // Show suggestion chips only before the visitor has asked anything.
  const showSuggestions = messages.filter((m) => m.role === "user").length === 0;

  async function sendMessage(raw: string) {
    const content = raw.trim();
    if (!content || loading) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content }]);
    setLoading(true);

    const response = await api.sendTcgSupportChat({ message: content, conversationId });
    setLoading(false);

    if (!response.success || !response.data) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: t("requestError"), transfer: true },
      ]);
      return;
    }

    const data = response.data as {
      reply?: string;
      conversationId?: string;
      action?: string;
    };
    if (data.conversationId) setConversationId(data.conversationId);

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: data.reply || t("requestError"),
        transfer: data.action === "transfer_human",
      },
    ]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div
      className={`${spaceGrotesk.variable} fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6`}
    >
      {open ? (
        <section
          role="dialog"
          aria-label={t("title")}
          className="mb-3 flex max-h-[calc(100vh-7rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e16] text-zinc-100 shadow-2xl shadow-black/40 sm:w-[380px]"
        >
          {/* Header */}
          <div className="relative overflow-hidden border-b border-white/10 px-4 py-3.5">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 right-0 h-32 w-48 rounded-full bg-cyan-500/20 blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
                    {t("title")}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {t("faqBadge")}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {t("subtitle")}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("launcherClose")}
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="min-h-[280px] flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[84%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-cyan-400 text-[#0a0e16]"
                      : "border border-white/10 bg-white/[0.04] text-zinc-200"
                  }`}
                >
                  {message.content}
                  {message.role === "assistant" && message.transfer ? (
                    <Link
                      href="/contact"
                      onClick={() => setOpen(false)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 underline-offset-2 hover:underline"
                    >
                      {t("contactCta")}
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-zinc-400">
                  {t("thinking")}
                </div>
              </div>
            ) : null}

            {showSuggestions && !loading ? (
              <div className="pt-1">
                <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  {t("suggestionsLabel")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGGESTION_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void sendMessage(t(`suggestions.${key}`))}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
                    >
                      {t(`suggestions.${key}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-white/10 px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("inputPlaceholder")}
                aria-label={t("inputAria")}
                className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-400/50"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={t("send")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-[#0a0e16] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-zinc-500">
              {t("footerNote")}
            </p>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        aria-label={t("launcherOpen")}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`${spaceGrotesk.variable} flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400 text-[#0a0e16] shadow-xl shadow-cyan-500/20 transition-transform hover:-translate-y-0.5 hover:bg-cyan-300`}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
