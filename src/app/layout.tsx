import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { inter, notoSansSC, notoSansJP, notoSans } from "./fonts";
import { Toaster } from "@/components/ui/sonner";

/**
 * Per-locale root metadata. The HTML <title>/<meta description> must match the
 * visitor's language — English visitors previously got Chinese tags because the
 * metadata was a single hardcoded zh object. We resolve the active locale at
 * request time via next-intl's getLocale() and pick the matching copy.
 */
type LocaleMeta = {
  brand: string;
  titleDefault: string;
  titleTemplate: string;
  description: string;
  ogDescription: string;
  ogLocale: string;
  ogImageAlt: string;
  keywords: string[];
};

const SITE_BRAND = "Kangaroo Japan";

const LOCALE_META: Record<string, LocaleMeta> = {
  en: {
    brand: SITE_BRAND,
    titleDefault: "Kangaroo Japan | Buy Japanese Pokémon & Yu-Gi-Oh Cards from Japan",
    titleTemplate: `%s | ${SITE_BRAND}`,
    description:
      "Proxy buying service for Japanese trading cards. We buy Pokémon, Yu-Gi-Oh, One Piece and more from Mercari, Yahoo! Auctions and Japanese shops, then inspect, consolidate and ship them worldwide.",
    ogDescription:
      "Buy Japanese trading cards — Pokémon, Yu-Gi-Oh, One Piece — from Mercari, Yahoo! Auctions and more. We inspect, consolidate and ship worldwide.",
    ogLocale: "en_US",
    ogImageAlt: "Kangaroo Japan - Japanese trading card proxy buying",
    keywords: [
      "Japanese Pokemon cards",
      "Yu-Gi-Oh cards Japan",
      "buy from Japan",
      "Japan proxy buying",
      "Mercari proxy",
      "Yahoo Auctions proxy",
      "trading cards",
      "TCG",
      "Japanese trading cards",
    ],
  },
  ja: {
    brand: SITE_BRAND,
    titleDefault: "Kangaroo Japan | 日本のトレカ・ポケカ・遊戯王を世界へ",
    titleTemplate: `%s | ${SITE_BRAND}`,
    description:
      "メルカリ・Yahoo!オークション・日本のショップから、ポケモンカードや遊戯王などのトレーディングカードを代理購入。検品・合梱のうえ海外へ発送します。",
    ogDescription:
      "メルカリ・Yahoo!オークションなどから日本のトレカを代理購入。検品・合梱して海外へ発送します。",
    ogLocale: "ja_JP",
    ogImageAlt: "Kangaroo Japan - 日本のトレカ代理購入",
    keywords: [
      "トレカ 代理購入",
      "ポケカ 海外発送",
      "遊戯王 代理購入",
      "Mercari 代行",
      "Yahoo オークション 代行",
      "トレーディングカード",
      "TCG",
    ],
  },
  // GEO：zh 标题/描述打买家真实搜索词（日本代购/煤炉代购/雅虎代拍）。
  // zh 对外品牌 = 袋鼠君（花哥 2026-07-04 拍板，与小程序一致；JP-Buy 作副名保留）。
  zh: {
    brand: "袋鼠君",
    titleDefault: "袋鼠君 | 日本代购代拍平台 - 煤炉Mercari代购·雅虎竞拍·日淘直邮",
    titleTemplate: "%s | 袋鼠君",
    description:
      "袋鼠君（JP-Buy）日本代购代拍平台：煤炉 Mercari 代购、雅虎拍卖代拍、乐天/Amazon 日淘，实时搜索比价，日本仓验货合箱直邮，手续费透明。",
    ogDescription:
      "袋鼠君日本代购代拍：煤炉 Mercari 代购、雅虎拍卖代拍、乐天/Amazon 日淘，日本仓验货合箱直邮。",
    ogLocale: "zh_CN",
    ogImageAlt: "袋鼠君 - 日本代购代拍平台",
    keywords: [
      "日本代购",
      "煤炉代购",
      "Mercari代购",
      "雅虎代拍",
      "日本雅虎竞拍",
      "日淘",
      "日本代拍",
      "乐天代购",
      "日本买卡",
      "日本谷子代购",
    ],
  },
};

const ALL_OG_LOCALES = ["zh_CN", "en_US", "ja_JP", "ko_KR", "th_TH", "id_ID", "vi_VN"];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const meta = LOCALE_META[locale] ?? LOCALE_META.zh;

  return {
    metadataBase: new URL("https://jp-buy.com"),
    title: {
      default: meta.titleDefault,
      template: meta.titleTemplate,
    },
    description: meta.description,
    keywords: meta.keywords,
    authors: [{ name: meta.brand }],
    creator: meta.brand,
    publisher: meta.brand,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: meta.ogLocale,
      alternateLocale: ALL_OG_LOCALES.filter((l) => l !== meta.ogLocale),
      siteName: meta.brand,
      title: meta.titleDefault,
      description: meta.ogDescription,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: meta.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.titleDefault,
      description: meta.ogDescription,
      images: ["/og-image.png"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${notoSansSC.variable} ${notoSansJP.variable} ${notoSans.variable}`}>
      <body className="font-sans">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
