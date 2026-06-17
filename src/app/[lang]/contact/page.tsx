"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  HelpCircle,
  Clock,
  Mail,
  MessageCircle,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ContactButtons, WechatQRModal } from "@/components/contact/ContactButtons";

// English-first contact channels for the U.S. TCG audience (design A).
// WeChat is intentionally dropped — U.S. collectors use WhatsApp / Email /
// Discord. Links are placeholders the team can fill in (WhatsApp number,
// Discord invite); email reuses the existing support address.
const SUPPORT_EMAIL = "support@jp-buy.com";
// TODO: replace with the live WhatsApp business number / Discord invite.
const WHATSAPP_NUMBER: string = ""; // e.g. "1XXXXXXXXXX" (digits only)
const DISCORD_INVITE = "https://discord.gg/jp-buy"; // placeholder invite

/**
 * EnContactPage —— 设计方向 A（深色高级感）英文联系页。
 *
 * 仅在 locale === "en" 时渲染，统一套在 [lang]/layout.tsx 的 TcgHeader/TcgFooter
 * 外壳内（深墨蓝 #0a0e16 + cyan-400 + Space Grotesk）。渠道面向美国用户：
 * WhatsApp / Email / Discord（去掉微信）。客服时段按北京 09:00–18:00 换算成
 * 美国 ET/PT 显示（夜间）。Live chat 为占位（coming soon），预留接 Hermes 花小妹
 * 智能客服的钩子。
 */
function EnContactPage() {
  const t = useTranslations("contact");

  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`
    : "https://wa.me/";

  const channels = [
    {
      key: "whatsapp",
      icon: MessageCircle,
      href: whatsappHref,
      external: true,
    },
    {
      key: "email",
      icon: Mail,
      href: `mailto:${SUPPORT_EMAIL}`,
      external: false,
      meta: SUPPORT_EMAIL,
    },
    {
      key: "discord",
      icon: Users,
      href: DISCORD_INVITE,
      external: true,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a0e16] text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div className="relative container mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <span className="inline-block rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
            {t("hero.eyebrow")}
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Contact channels */}
        <section>
          <h2 className="text-xl font-semibold text-zinc-100">
            {t("channels.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {t("channels.subtitle")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.key}
                  href={channel.href}
                  {...(channel.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-cyan-400/40 hover:bg-white/[0.05]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-zinc-100">
                    {t(`channels.items.${channel.key}.name`)}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-400">
                    {t(`channels.items.${channel.key}.desc`)}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300 transition-colors group-hover:text-cyan-200">
                    {t(`channels.items.${channel.key}.action`)}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        {/* Live chat (placeholder — Hermes / 花小妹 智能客服 hook goes here) */}
        <section className="mt-10 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-6 sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {t("liveChat.title")}
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-400">
                  {t("liveChat.subtitle")}
                </p>
              </div>
            </div>
            {/*
              Live chat entry point. Disabled placeholder until Hermes
              (花小妹) smart-support is wired up in a later task (#3).
              Replace `disabled` + the onClick no-op with the real opener.
            */}
            <button
              type="button"
              disabled
              aria-disabled="true"
              title={t("liveChat.comingSoon")}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-400/30 px-5 py-3 text-sm font-semibold text-cyan-100/70 cursor-not-allowed"
            >
              {t("liveChat.button")}
              <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-200/80">
                {t("liveChat.comingSoon")}
              </span>
            </button>
          </div>
        </section>

        {/* Support hours — Beijing 09:00–18:00 shown in U.S. time (overnight) */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-cyan-300">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {t("hours.title")}
              </h2>
              <p className="mt-2 text-base font-medium text-cyan-300">
                {t("hours.value")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {t("hours.note")}
              </p>
            </div>
          </div>
        </section>

        {/* FAQ link */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-cyan-300">
                <HelpCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {t("faq.title")}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {t("faq.subtitle")}
                </p>
              </div>
            </div>
            <Link
              href="/en/help"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
            >
              {t("faq.linkLabel")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Proxy / shipping note */}
        <p className="mt-8 text-center text-sm leading-relaxed text-zinc-500">
          {t("note")}
        </p>
      </main>
    </div>
  );
}

export default function ContactPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";
  const [showWechatModal, setShowWechatModal] = useState(false);

  // English → design A (U.S. TCG dark shell). Other locales keep the existing
  // light page unchanged.
  if (lang === "en") {
    return <EnContactPage />;
  }

  const t = {
    zh: {
      title: "联系客服",
      subtitle: "有任何问题？我们随时为您服务",
      wechat: "微信客服",
      wechatDesc: "添加客服微信，快速响应",
      whatsapp: "WhatsApp",
      whatsappDesc: "国际用户首选",
      email: "邮件客服",
      emailDesc: "support@jp-buy.com",
      hours: "服务时间",
      hoursValue: "周一至周五 9:00-18:00 (JST)",
      faq: "常见问题",
      faqLink: "查看 FAQ",
    },
    ja: {
      title: "お問い合わせ",
      subtitle: "ご質問ございますか？",
      wechat: "微信客服",
      wechatDesc: "追加で即対応",
      whatsapp: "WhatsApp",
      whatsappDesc: "国際ユーザー向け",
      email: "メールサポート",
      emailDesc: "support@jp-buy.com",
      hours: "サービス時間",
      hoursValue: "月〜金 9:00-18:00 (JST)",
      faq: "よくある質問",
      faqLink: "FAQを見る",
    },
  };

  const text = t[lang as keyof typeof t] || t.zh;

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">{text.title}</h1>
          <p className="text-gray-600">{text.subtitle}</p>
        </div>

        {/* Contact Methods */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-center">
            {lang === "ja" ? "お問い合わせ方法" : "联系方式"}
          </h2>

          <ContactButtons
            variant="full"
            className="max-w-md mx-auto"
          />
        </div>

        {/* Service Hours */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⏰</span>
            <h3 className="font-semibold">{text.hours}</h3>
          </div>
          <p className="text-gray-600 ml-9">{text.hoursValue}</p>
        </div>

        {/* FAQ Link */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❓</span>
              <h3 className="font-semibold">{text.faq}</h3>
            </div>
            <Link
              href={`/${lang}/help`}
              className="text-rose-600 hover:text-rose-700 font-medium"
            >
              {text.faqLink} →
            </Link>
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-gray-500 text-sm mt-8">
          {lang === "ja"
            ? "代理購入商品は別途送料がかかる場合があります"
            : "代购商品可能需要额外运费，详情请咨询客服"}
        </p>
      </main>

      <WechatQRModal
        isOpen={showWechatModal}
        onClose={() => setShowWechatModal(false)}
      />
    </div>
  );
}
