"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";
import { AlertForm } from "./AlertForm";
import { AlertPreview } from "./AlertPreview";

/**
 * 设计 A（深色高级感）英文 TCG「上新提醒」落地页。
 * 讲清价值（never miss a restock）+ 订阅表单 + 卡牌样式的「提醒长这样」预览。
 * ?confirmed=1 / ?unsubscribed=1 时顶部显成功提示条（来自后端邮件里的 GET 链接回跳）。
 *
 * banner 的 dismiss 用本地 state；初始可见性派生自 URL（render 期读 searchParams，
 * 不在 effect 里 setState）。
 */
export function AlertsLandingPage() {
  const t = useTranslations("tcg-alerts");
  const searchParams = useSearchParams();

  const confirmed = searchParams.get("confirmed") === "1";
  const unsubscribed = searchParams.get("unsubscribed") === "1";
  const bannerKind = confirmed ? "confirmed" : unsubscribed ? "unsubscribed" : null;

  const [bannerDismissed, setBannerDismissed] = useState(false);
  // URL 上的状态变化（前进后退/再次回跳）时，重新展示 banner——把本地 dismiss 状态
  // 对齐外部 URL 状态，是该 effect 的合法用途。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBannerDismissed(false);
  }, [bannerKind]);

  const showBanner = bannerKind !== null && !bannerDismissed;

  useEffect(() => {
    document.title = `${t("meta.title")} | JP-Buy`;
  }, [t]);

  return (
    <main
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      {/* 成功提示条 */}
      {showBanner && (
        <div
          role="status"
          className={`border-b ${
            bannerKind === "unsubscribed"
              ? "border-slate-400/20 bg-slate-400/[0.08]"
              : "border-cyan-400/30 bg-cyan-400/[0.1]"
          }`}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <p
              className={`text-sm font-medium ${
                bannerKind === "unsubscribed" ? "text-slate-200" : "text-cyan-100"
              }`}
            >
              {t(`banner.${bannerKind}`)}
            </p>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label={t("banner.dismiss")}
              className="shrink-0 rounded-lg p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeWidth={1.8}
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero + 表单 两栏 */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(50% 55% at 18% -5%, rgba(56,189,248,0.18), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 md:py-20 lg:grid-cols-2 lg:gap-12">
          {/* 左：价值主张 */}
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
              {t("hero.eyebrow")}
            </span>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
              {t("hero.subtitle")}
            </p>

            <ul className="mt-8 space-y-3">
              {(["instant", "filters", "channels"] as const).map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
                    <svg
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="m5 13 4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="text-sm text-slate-300">
                    {t(`hero.points.${key}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 右：订阅表单卡片 */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
              {t("form.title")}
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">{t("form.subtitle")}</p>
            <div className="mt-6">
              <AlertForm />
            </div>
          </div>
        </div>
      </section>

      {/* 「提醒长这样」预览 */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 md:py-16 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t("preview.title")}
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-slate-400">
              {t("preview.subtitle")}
            </p>
          </div>
          <AlertPreview />
        </div>
      </section>

      {/* 引导回搜索页一键建提醒 */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-8 text-center sm:p-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white sm:text-2xl">
            {t("cta.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            {t("cta.subtitle")}
          </p>
          <Link
            href="/cards"
            className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-[#06121b] transition-colors hover:bg-cyan-300"
          >
            {t("cta.browse")}
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14m-6-6 6 6-6 6"
              />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}
