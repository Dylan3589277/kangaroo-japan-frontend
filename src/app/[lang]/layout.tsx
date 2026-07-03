import { ReactNode } from "react";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { isIndexable, organizationJsonLd, webSiteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TcgHeader } from "@/components/tcg/TcgHeader";
import { TcgFooter } from "@/components/tcg/TcgFooter";
import { ChatProvider } from "@/components/tcg/ChatProvider";
import { ChatWidgetGate } from "@/components/tcg/ChatWidgetGate";
import "@/app/globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (isIndexable(lang)) {
    return {
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  return {
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: null,
      languages: {},
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(routing.locales, lang)) {
    notFound();
  }

  // 按 locale 分支站点外壳（chrome）：
  // - en：美国 TCG 站设计方向 A 深色外壳（TcgHeader + TcgFooter），统一套在所有
  //   英文页（首页/cards/fees + 后续英文页）外层，确保风格一致。
  // - 其它语言：保持现有通用买家头部 SiteHeader，原样不变（无 footer）。
  // 最小改动、两套外壳互不影响。
  // 客服浮窗在所有公开页（zh + en）统一挂载：ChatProvider 提供「带商品上下文打开
  // 客服」的能力（商品详情页用），ChatWidgetGate 排除 admin/warehouse 内部页并按
  // locale 切皮（zh 暖色 / en 设计 A 深色）。商品页打开带商品卡，其它页纯 FAQ。
  // GEO：可索引 locale 全站输出 Organization + WebSite 结构化数据（服务端渲染，
  // AI/搜索引擎抓原始 HTML 即可读到；ja 等 noindex locale 不输出）。
  const seoJsonLd = isIndexable(lang) ? (
    <>
      <JsonLd data={organizationJsonLd(lang)} />
      <JsonLd data={webSiteJsonLd(lang)} />
    </>
  ) : null;

  if (lang === "en") {
    return (
      <ChatProvider>
        <div className="flex min-h-screen flex-col bg-[#0a0e16]">
          {seoJsonLd}
          <TcgHeader />
          <div className="flex-1">{children}</div>
          <TcgFooter />
          <ChatWidgetGate />
        </div>
      </ChatProvider>
    );
  }

  return (
    <ChatProvider>
      <div className="min-h-screen flex flex-col">
        {seoJsonLd}
        <SiteHeader />
        {children}
        <ChatWidgetGate />
      </div>
    </ChatProvider>
  );
}
