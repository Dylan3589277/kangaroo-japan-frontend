import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { inter, notoSansSC, notoSansJP, notoSans } from "./fonts";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://jp-buy.com"),
  title: {
    default: "JP-Buy | 日本商品跨境购物平台",
    template: "%s | JP-Buy",
  },
  description: "专业的日本商品跨境购物平台，聚合乐天、Yahoo、Amazon、Mercari 等日本电商资源，提供实时价格比较，让你不吃亏",
  keywords: ["日本购物", "跨境电商", "日本amazon", "乐天市场", "日本拍卖", "Mercari", "Yahoo拍卖", "日淘", "日本商品"],
  authors: [{ name: "JP-Buy" }],
  creator: "JP-Buy",
  publisher: "JP-Buy",
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
    locale: "zh_CN",
    alternateLocale: ["en_US", "ja_JP"],
    siteName: "JP-Buy",
    title: "JP-Buy | 日本商品跨境购物平台",
    description: "专业的日本商品跨境购物平台，聚合乐天、Yahoo、Amazon、Mercari 等日本电商资源",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JP-Buy - 日本商品跨境购物平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JP-Buy | 日本商品跨境购物平台",
    description: "专业的日本商品跨境购物平台，聚合乐天、Yahoo、Amazon、Mercari 等日本电商资源",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://jp-buy.com",
    languages: {
      "zh-CN": "https://jp-buy.com/zh",
      "zh-SG": "https://jp-buy.com/zh",
      "en-US": "https://jp-buy.com/en",
      "en-GB": "https://jp-buy.com/en",
      "en-AU": "https://jp-buy.com/en",
      "en-PH": "https://jp-buy.com/en",
      "en-SG": "https://jp-buy.com/en",
      "en-MY": "https://jp-buy.com/en",
      "ko-KR": "https://jp-buy.com/ko",
      "th-TH": "https://jp-buy.com/th",
      "id-ID": "https://jp-buy.com/id",
      "vi-VN": "https://jp-buy.com/vi",
      "ja-JP": "https://jp-buy.com/ja",
    },
  },
};

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
