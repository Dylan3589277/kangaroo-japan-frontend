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
  zh: {
    brand: "JP-Buy",
    titleDefault: "JP-Buy | 日本商品跨境购物平台",
    titleTemplate: "%s | JP-Buy",
    description:
      "专业的日本商品跨境购物平台，聚合乐天、Yahoo、Amazon、Mercari 等日本电商资源，提供实时价格比较，让你不吃亏",
    ogDescription:
      "专业的日本商品跨境购物平台，聚合乐天、Yahoo、Amazon、Mercari 等日本电商资源",
    ogLocale: "zh_CN",
    ogImageAlt: "JP-Buy - 日本商品跨境购物平台",
    keywords: [
      "日本购物",
      "跨境电商",
      "日本amazon",
      "乐天市场",
      "日本拍卖",
      "Mercari",
      "Yahoo拍卖",
      "日淘",
      "日本商品",
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
