"use client";

import { useTranslations } from "next-intl";

/**
 * 设计 A 上新提醒「长这样」预览。
 * 做成卡牌样式的消息卡片，复用 TcgCard 的视觉语言（深色圆角卡 + cyan 强调 + 方形卡图
 * + 标题两行 + JPY 价格），让用户一眼明白收到的提醒长啥样：
 *   卡图占位 + Restock alert 徽章 + 卡名 + 价格 + View 按钮。
 *
 * 纯展示，无业务逻辑/后端调用；卡图用内联占位图（不引官方卡图，规避版权）。
 */
export function AlertPreview() {
  const t = useTranslations("tcg-alerts.preview");

  return (
    <div className="mx-auto w-full max-w-xs">
      {/* 卡牌样式的提醒消息卡（对齐 TcgCard 的圆角/边框/底色/hover 微光） */}
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-cyan-400/30 bg-white/[0.03] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_18px_40px_-18px_rgba(56,189,248,0.4)]">
        {/* 顶部「Restock alert」提示条 */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-cyan-400/[0.08] px-3 py-2">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
            <svg
              className="size-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
              />
            </svg>
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200">
            {t("badge")}
          </span>
        </div>

        {/* 卡图占位（与 TcgCard 同为正方形深色块） */}
        <div className="relative aspect-square overflow-hidden bg-[#0e131d]">
          <div
            aria-hidden
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 35%, rgba(56,189,248,0.18), transparent 65%)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="size-16 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <rect
                x="4"
                y="3"
                width="16"
                height="18"
                rx="2"
                strokeWidth={1.4}
              />
              <path strokeWidth={1.4} d="M8 7h8M8 11h8M8 15h5" />
            </svg>
          </div>
          <span className="absolute left-2 top-2 inline-flex items-center rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 backdrop-blur">
            Mercari
          </span>
        </div>

        {/* 文字内容：卡名 + 元信息 + 价格 + View 按钮 */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 min-h-[2.4rem] text-sm font-medium leading-snug text-slate-100">
            {t("sampleName")}
          </h3>
          <p className="text-[11px] text-slate-500">{t("sampleMeta")}</p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="text-base font-bold text-cyan-300">
              &yen;{(24800).toLocaleString("en-US")}
            </span>
            <span
              aria-hidden
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-[#06121b]"
            >
              {t("viewListing")}
              <svg
                className="size-3.5"
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
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">{t("footnote")}</p>
    </div>
  );
}
