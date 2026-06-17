import { ReactNode } from "react";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { isIndexable } from "@/lib/seo";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TcgHeader } from "@/components/tcg/TcgHeader";
import { TcgFooter } from "@/components/tcg/TcgFooter";
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
  if (lang === "en") {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0e16]">
        <TcgHeader />
        <div className="flex-1">{children}</div>
        <TcgFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      {children}
    </div>
  );
}
