"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

/**
 * 顶部 Banner 轮播（纯前端，占位活动）。
 * 暖色渐变背景 + 中文文案，自动轮播（5s）+ 手动切换（圆点 / 左右箭头）。
 * 后续花哥可替换为真图 / 真活动；当前为占位渐变卡。
 */

interface BannerSlide {
  title: string;
  subtitle: string;
  /** 点击跳转（next-intl Link 自动保 /zh 前缀）。 */
  href: string;
  gradient: string;
}

const SLIDES: BannerSlide[] = [
  {
    title: "日本代拍 · 全球直邮",
    subtitle: "雅虎竞拍 · 煤炉一键代购，专业买手帮你抢",
    href: "/yahoo",
    gradient: "from-rose-500 to-orange-400",
  },
  {
    title: "宝可梦卡专场",
    // 2026-08-03：原文案「正品保障」是我们做不到的鉴定承诺（话术库明写没有验货甄别真伪的能力），
    // 改成陈述事实，口径与首页信任标签「日本平台直采」一致。
    subtitle: "日本在售卡牌实时同步，可申请拍照验货",
    href: "/yahoo?kw=ポケモンカード",
    gradient: "from-orange-500 to-rose-600",
  },
  {
    // 2026-08-03：站内没有任何「新人首单优惠」的真实促销依据（无对应券/折扣配置），
    // 原标题会许下站内兑现不了的承诺，改为陈述服务事实（新手引导），不承诺折扣。
    title: "新手代购不用慌",
    subtitle: "全流程客服跟单，从选品下单到直邮到家手把手带你",
    href: "/how-it-works",
    gradient: "from-amber-500 to-rose-500",
  },
];

const ROTATE_MS = 5000;

export function ZhBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const go = (next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4">
      <div className="relative overflow-hidden rounded-2xl">
        {/* 轮播轨道 */}
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide) => (
            <Link
              key={slide.title}
              href={slide.href}
              className={`relative flex min-h-[120px] w-full shrink-0 flex-col justify-center bg-gradient-to-r px-6 py-5 text-white md:min-h-[160px] md:px-12 ${slide.gradient}`}
            >
              <h2 className="text-xl font-extrabold drop-shadow-sm md:text-2xl">
                {slide.title}
              </h2>
              <p className="mt-1.5 max-w-md text-xs text-white/90 md:text-sm">
                {slide.subtitle}
              </p>
              <span className="mt-3 inline-flex w-fit items-center rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-rose-600">
                立即查看 →
              </span>
            </Link>
          ))}
        </div>

        {/* 左右箭头 */}
        <button
          type="button"
          aria-label="上一张"
          onClick={() => go(index - 1)}
          className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/25 p-2 text-white backdrop-blur transition hover:bg-black/40 md:flex"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="下一张"
          onClick={() => go(index + 1)}
          className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/25 p-2 text-white backdrop-blur transition hover:bg-black/40 md:flex"
        >
          ›
        </button>

        {/* 圆点指示器 */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`切换到第 ${i + 1} 张`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
