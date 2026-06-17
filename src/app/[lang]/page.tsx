import type { Metadata } from "next";
import { buildAlternates, isIndexable } from "@/lib/seo";
import { HomePageClient } from "./HomePageClient";
import { TcgHome } from "@/components/home/TcgHome";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (!isIndexable(lang)) {
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

  return {
    alternates: buildAlternates(lang, ""),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  // 美国 TCG 买家专属英文首页（深色高级感）；其余语言保留现有泛电商首页。
  if (lang === "en") {
    return <TcgHome />;
  }

  return <HomePageClient />;
}
