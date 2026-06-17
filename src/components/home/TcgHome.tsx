"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";
import { HeroSection } from "./tcg/HeroSection";
import { PopularSearches } from "./tcg/PopularSearches";
import { HowItWorks } from "./tcg/HowItWorks";
import { Marketplaces } from "./tcg/Marketplaces";
import { BuyerProtection } from "./tcg/BuyerProtection";
import { FeesTeaser } from "./tcg/FeesTeaser";
import { Faq } from "./tcg/Faq";
import { FooterCta } from "./tcg/FooterCta";

const HOW_IT_WORKS_ID = "how-it-works";

/**
 * 美国 TCG 买家专属英文首页（设计方向 A：深色高级感）。
 * 仅在 locale === "en" 时由 [lang]/page.tsx 渲染；其它语言走 HomePageClient。
 * 自带显式深色背景与作用域展示字体（--font-display），不依赖全局亮色主题。
 */
export function TcgHome() {
  const t = useTranslations("tcg.meta");
  const router = useRouter();

  // SEO：英文 TCG 首页标题/描述（与现有 HomePageClient 一致的客户端写法）。
  useEffect(() => {
    document.title = `${t("title")} | JP-Buy`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", t("description"));
  }, [t]);

  const goSearch = (query: string) => {
    const q = query.trim();
    // 沿用现有站内搜索路由 /products?search=...；useRouter 来自 next-intl，会自动补 /en 前缀。
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  };

  const scrollToHow = () => {
    document.getElementById(HOW_IT_WORKS_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      <HeroSection onSearch={goSearch} onHowItWorks={scrollToHow} />
      <PopularSearches onChip={goSearch} />
      <HowItWorks id={HOW_IT_WORKS_ID} />
      <Marketplaces />
      <BuyerProtection />
      <FeesTeaser />
      <Faq />
      <FooterCta onSearch={() => goSearch("")} onHowItWorks={scrollToHow} />
    </main>
  );
}
