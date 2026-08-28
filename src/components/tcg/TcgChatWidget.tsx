"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MessageCircle, Send, X, Sparkles, ShoppingBag } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";
import { useChatWidgetContext } from "./ChatProvider";

/**
 * 全站浮动在线客服。由 [lang]/layout.tsx 经 ChatProvider + ChatWidgetGate 在所有
 * 公开页面挂载（zh 暖色中性外壳 / en 设计 A 深色外壳，按 locale 切皮）。
 *
 * 两种打开方式：
 * - 通用入口（任意页）：纯 FAQ，无商品卡。
 * - 商品详情页：详情组件经 useChatLauncher().openWithProduct(...) 带「当前商品」打开，
 *   浮窗顶部渲染商品卡（缩略图 + 名 + 价 JPY）+「为我下单 / Order this for me」CTA，
 *   CTA 跳该商品的现有结算/下单路由（Mercari → /[lang]/checkout；Yahoo → 联系客服）。
 *
 * 后端：en 走 sendTcgSupportChat（site=kangaroo-japan-tcg，FAQ-only，英文）；
 * zh 走 sendSupportChat（site=kangaroo-japan，中文 KB）。不改任何后端/支付逻辑。
 */

// zh 转人工落点是企业微信客服（2026-08-27 由 53kf 切换，见 commit b3aa103）；
// 这里直接打开企业微信客服链接，而不是跳内部 /contact 页。en 仍走站内 /contact 页。
const WECOM_KEFU_CHAT_URL_DEFAULT =
  "https://work.weixin.qq.com/kfid/kfcdd40f1f6c4b4b499";
// env 名沿用历史名 KF53，保留是为了不破坏既有配置。
const WECOM_KEFU_CHAT_URL = process.env.NEXT_PUBLIC_KF53_CHAT_URL || WECOM_KEFU_CHAT_URL_DEFAULT;

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
  /** assistant 消息是否为转人工提示，用于附加 Contact 链接。 */
  transfer?: boolean;
}

// Max suggestion chips shown in one row at a time (see visibleSuggestionKeys below).
const MAX_VISIBLE_SUGGESTIONS = 4;

export function TcgChatWidget() {
  const t = useTranslations("tcg-chat");
  const locale = useLocale();
  const isEn = locale === "en";
  const allMessages = useMessages() as Record<string, unknown> | undefined;
  const { product, open, setOpen, toggleOpen, clearProduct } =
    useChatWidgetContext();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Seed the greeting via a lazy initializer so it's set once at mount without a
  // setState-in-effect cascade. `t` from next-intl is available synchronously.
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: "assistant", content: t("greeting") },
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  // Suggestion keys the visitor already tapped — excluded from future chip rows
  // so the same question isn't offered twice in one session.
  const [usedSuggestionKeys, setUsedSuggestionKeys] = useState<string[]>([]);
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

  // Suggestion keys come from the locale file itself (t.raw) rather than a
  // hardcoded list, so zh (11 questions) and en (4 questions) can differ in
  // count/names without touching this component.
  const rawSuggestions = t.raw("suggestions");
  const suggestionMap: Record<string, unknown> =
    rawSuggestions && typeof rawSuggestions === "object"
      ? (rawSuggestions as Record<string, unknown>)
      : {};
  // Optional explicit priority order (zh only — src/i18n/request.ts deep-merges
  // every non-en locale onto the en base per-key, which silently keeps en's key
  // order for any key name that also exists in en; `suggestions` reuses names
  // like "fees"/"customs" from en, so plain Object.keys(suggestionMap) would NOT
  // reflect zh's intended priority order for those shared keys. suggestionsOrder
  // is a zh-only array — arrays are replaced wholesale by deepMerge, not merged
  // key-by-key, so it survives with its declared order intact. en has no such
  // key: read via useMessages() (plain object lookup) rather than t.raw(), which
  // throws/logs MISSING_MESSAGE for a key absent from en's locale file.
  const tcgChatMessages = (allMessages?.["tcg-chat"] ?? {}) as Record<
    string,
    unknown
  >;
  const rawOrder = tcgChatMessages["suggestionsOrder"];
  const explicitOrder = Array.isArray(rawOrder)
    ? rawOrder.filter(
        (key): key is string => typeof key === "string" && key in suggestionMap,
      )
    : [];
  const naturalOrder = Object.keys(suggestionMap).filter(
    (key) => !explicitOrder.includes(key),
  );
  const suggestionKeys = [...explicitOrder, ...naturalOrder];
  const visibleSuggestionKeys = suggestionKeys
    .filter((key) => !usedSuggestionKeys.includes(key))
    .slice(0, MAX_VISIBLE_SUGGESTIONS);

  // Chips re-appear after every assistant reply (not just before the first
  // message): visible whenever the composer is idle (no draft, not loading)
  // and unused suggestions remain. 花哥 2026-08 feedback: the FAQ capability
  // was invisible because chips vanished for good after one tap.
  const showSuggestions =
    !loading && input.trim().length === 0 && visibleSuggestionKeys.length > 0;

  async function sendMessage(raw: string) {
    const content = raw.trim();
    if (!content || loading) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content }]);
    setLoading(true);

    // en → isolated English TCG FAQ path; other locales → Chinese mini-program
    // support path (Chinese KB). Both hit the same same-origin /api/support/chat
    // route; neither changes any backend/payment logic.
    const response = isEn
      ? await api.sendTcgSupportChat({ message: content, conversationId })
      : await api.sendSupportChat({ message: content, conversationId, language: locale });
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

  // Tapping a chip both sends its text and retires that key from future rows
  // (so it isn't offered again this session).
  function handleSuggestionClick(key: string) {
    setUsedSuggestionKeys((current) =>
      current.includes(key) ? current : [...current, key],
    );
    void sendMessage(t(`suggestions.${key}`));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  // Per-locale skin tokens. en = design A dark (cyan); zh/others = warm/neutral
  // light shell that sits well on the buyer site chrome.
  const skin = isEn
    ? {
        panel:
          "border-white/10 bg-[#0a0e16] text-zinc-100 shadow-black/40",
        headerBorder: "border-white/10",
        glow: "bg-cyan-500/20",
        badge:
          "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
        subtitle: "text-zinc-400",
        closeBtn: "text-zinc-400 hover:bg-white/10 hover:text-zinc-100",
        userBubble: "bg-cyan-400 text-[#0a0e16]",
        botBubble: "border border-white/10 bg-white/[0.04] text-zinc-200",
        thinking: "border border-white/10 bg-white/[0.04] text-zinc-400",
        link: "text-cyan-300",
        suggLabel: "text-zinc-500",
        suggChip:
          "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-cyan-400/40 hover:text-cyan-200",
        composerBorder: "border-white/10",
        field:
          "border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-400/50",
        sendBtn:
          "bg-cyan-400 text-[#0a0e16] hover:bg-cyan-300 disabled:bg-white/10 disabled:text-zinc-500",
        footerNote: "text-zinc-500",
        launcher:
          "bg-cyan-400 text-[#0a0e16] shadow-cyan-500/20 hover:bg-cyan-300",
        card: "border-white/10 bg-white/[0.04]",
        cardTitle: "text-zinc-100",
        cardPrice: "text-cyan-300",
        cardPlatform: "text-cyan-200/80",
        cardCta: "bg-cyan-400 text-[#0a0e16] hover:bg-cyan-300",
      }
    : {
        panel:
          "border-rose-100 bg-white text-zinc-800 shadow-rose-900/10",
        headerBorder: "border-rose-100",
        glow: "bg-rose-300/30",
        badge: "border-rose-200 bg-rose-50 text-rose-600",
        subtitle: "text-zinc-500",
        closeBtn: "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
        userBubble: "bg-rose-500 text-white",
        botBubble: "border border-zinc-100 bg-zinc-50 text-zinc-700",
        thinking: "border border-zinc-100 bg-zinc-50 text-zinc-400",
        link: "text-rose-600",
        suggLabel: "text-zinc-400",
        suggChip:
          "border-zinc-200 bg-white text-zinc-600 hover:border-rose-300 hover:text-rose-600",
        composerBorder: "border-zinc-100",
        field:
          "border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:border-rose-400",
        sendBtn:
          "bg-rose-500 text-white hover:bg-rose-600 disabled:bg-zinc-200 disabled:text-zinc-400",
        footerNote: "text-zinc-400",
        launcher: "bg-rose-500 text-white shadow-rose-500/25 hover:bg-rose-600",
        card: "border-rose-100 bg-rose-50/60",
        cardTitle: "text-zinc-800",
        cardPrice: "text-rose-600",
        cardPlatform: "text-rose-500",
        cardCta: "bg-rose-500 text-white hover:bg-rose-600",
      };

  const numberFormatter = new Intl.NumberFormat(isEn ? "en-US" : "zh-CN");

  return (
    <div
      className={`${spaceGrotesk.variable} fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6`}
    >
      {open ? (
        <section
          role="dialog"
          aria-label={t("title")}
          className={`mb-3 flex max-h-[calc(100vh-7rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:w-[380px] ${skin.panel}`}
        >
          {/* Header */}
          <div
            className={`relative overflow-hidden border-b px-4 py-3.5 ${skin.headerBorder}`}
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute -top-16 right-0 h-32 w-48 rounded-full blur-3xl ${skin.glow}`}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
                    {t("title")}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${skin.badge}`}
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {t("faqBadge")}
                  </span>
                </div>
                <p className={`mt-1 text-xs leading-relaxed ${skin.subtitle}`}>
                  {t("subtitle")}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("launcherClose")}
                onClick={() => setOpen(false)}
                className={`rounded-full p-1 transition-colors ${skin.closeBtn}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Product context card (only when opened from a product page) */}
          {product ? (
            <div className={`border-b px-4 py-3 ${skin.headerBorder}`}>
              <div
                className={`flex items-center gap-3 rounded-xl border p-2.5 ${skin.card}`}
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-black/10">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-5 w-5 opacity-40" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-wider ${skin.cardPlatform}`}
                  >
                    {product.platform === "mercari"
                      ? "Mercari"
                      : product.platform === "amazon"
                        ? "Amazon"
                        : "Yahoo Auctions"}
                  </p>
                  <p
                    className={`line-clamp-2 text-xs font-medium leading-snug ${skin.cardTitle}`}
                  >
                    {product.title}
                  </p>
                  {typeof product.priceJpy === "number" ? (
                    <p
                      className={`mt-0.5 text-sm font-bold tabular-nums ${skin.cardPrice}`}
                    >
                      JPY {numberFormatter.format(product.priceJpy)}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={t("productCard.dismiss")}
                  onClick={clearProduct}
                  className={`shrink-0 rounded-full p-1 transition-colors ${skin.closeBtn}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <Link
                href={product.href}
                onClick={() => setOpen(false)}
                className={`mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${skin.cardCta}`}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                {t("productCard.cta")}
              </Link>
            </div>
          ) : null}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="min-h-[240px] flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[84%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user" ? skin.userBubble : skin.botBubble
                  }`}
                >
                  {message.content}
                  {message.role === "assistant" && message.transfer ? (
                    isEn ? (
                      <Link
                        href="/contact"
                        onClick={() => setOpen(false)}
                        className={`mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline ${skin.link}`}
                      >
                        {t("contactCta")}
                      </Link>
                    ) : (
                      <a
                        href={WECOM_KEFU_CHAT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className={`mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline ${skin.link}`}
                      >
                        {t("contactCta")}
                      </a>
                    )
                  ) : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm ${skin.thinking}`}
                >
                  {t("thinking")}
                </div>
              </div>
            ) : null}

            {showSuggestions ? (
              <div className="pt-1">
                <p
                  className={`px-1 text-[11px] font-medium uppercase tracking-wider ${skin.suggLabel}`}
                >
                  {t("suggestionsLabel")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleSuggestionKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSuggestionClick(key)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${skin.suggChip}`}
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
            className={`border-t px-3 py-3 ${skin.composerBorder}`}
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("inputPlaceholder")}
                aria-label={t("inputAria")}
                className={`h-10 flex-1 rounded-xl border px-3 text-sm outline-none transition-colors ${skin.field}`}
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={t("send")}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed ${skin.sendBtn}`}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className={`mt-2 px-1 text-[11px] leading-relaxed ${skin.footerNote}`}>
              {t("footerNote")}
            </p>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        aria-label={t("launcherOpen")}
        aria-expanded={open}
        onClick={toggleOpen}
        className={`${spaceGrotesk.variable} flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-transform hover:-translate-y-0.5 ${skin.launcher}`}
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
