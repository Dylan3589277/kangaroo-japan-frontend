"use client";
import { useTranslations } from "next-intl";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";

export default function MnpPage() {
  const t = useTranslations('mnp');
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";

  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const wechatId = "KangarooJapan";

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header showSearch={false} />

      <main className="container mx-auto px-4 py-12 max-w-lg">
        <Card className="overflow-hidden">
          {/* Hero section */}
          <div className="bg-gradient-to-r from-rose-600 to-rose-500 p-8 text-center text-white">
            <div className="text-5xl mb-3">🐨</div>
            <h1 className="text-2xl font-bold mb-1">
              {t('brandName')}
            </h1>
            <p className="text-white/80 text-sm">
              {t('brandSubtitle')}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                {/* Placeholder QR code - replace with actual QR code image */}
                <div className="w-48 h-48 bg-zinc-100 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">📱</div>
                    <p className="text-xs text-zinc-400">
                      {t('qrcode')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* WeChat ID */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t('wechatId')}
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-zinc-100 px-4 py-2 rounded-lg text-lg font-bold text-rose-600">
                  {wechatId}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(wechatId)}
                  className="flex-shrink-0"
                  title={t('copyId')}
                >
                  {copied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Status toggle */}
            <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-rose-600/10 flex items-center justify-center">
                  <Check className="size-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-rose-900">
                    {t('alreadyFollowed')}
                  </p>
                  <p className="text-xs text-rose-600/70">
                    {t('followDesc')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-200 text-rose-600 hover:bg-rose-100"
                  onClick={() =>
                    window.open("https://weixin.qq.com", "_blank")
                  }
                >
                  {t('openWechat')}
                </Button>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">
                {t('benefits')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: "🛒",
                    text: {
                      zh: "每日好物推荐",
                      ja: "毎日のおすすめ",
                      en: "Daily picks",
                    },
                  },
                  {
                    icon: "💰",
                    text: {
                      zh: "独家优惠券",
                      ja: "限定クーポン",
                      en: "Exclusive coupons",
                    },
                  },
                  {
                    icon: "📦",
                    text: {
                      zh: "物流实时通知",
                      ja: "配送状況通知",
                      en: "Real-time tracking",
                    },
                  },
                  {
                    icon: "🎁",
                    text: {
                      zh: "粉丝专属福利",
                      ja: "ファン特典",
                      en: "Fan benefits",
                    },
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-50 rounded-xl p-3 text-center"
                  >
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <p className="text-xs font-medium">
                      {item.text[lang as keyof typeof item.text] ||
                        item.text.zh}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/${lang}/community`)}
              >
                {t('goCommunity')}
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                onClick={() => router.push(`/${lang}/articles`)}
              >
                {t('readArticles')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
