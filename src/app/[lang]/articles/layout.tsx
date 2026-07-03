import type { Metadata } from "next";
import { ReactNode } from "react";

/**
 * /[lang]/articles —— 文章列表（老后台 CMS 驱动，页面本体是 client component，
 * metadata 只能由本 layout 提供）。
 *
 * 2026-07-03：CMS 目前 en/zh 都没有已发布文章（页面显示 Coming soon / 暂无文章），
 * 空壳列表页被搜索引擎收录是减分项 → 全 locale 暂设 noindex。
 * CMS 有真实文章后，把 robots 恢复为 buildAlternates + index:true（参照 compare/layout.tsx）。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  return {
    title: lang === "zh" ? "代购资讯" : "Articles",
    robots: { index: false, follow: true },
    alternates: { canonical: null, languages: {} },
  };
}

export default function ArticlesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
