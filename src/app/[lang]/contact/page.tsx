"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ContactButtons, WechatQRModal } from "@/components/contact/ContactButtons";

export default function ContactPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";
  const [showWechatModal, setShowWechatModal] = useState(false);

  const t = {
    zh: {
      title: "联系客服",
      subtitle: "有任何问题？我们随时为您服务",
      wechat: "微信客服",
      wechatDesc: "添加客服微信，快速响应",
      whatsapp: "WhatsApp",
      whatsappDesc: "国际用户首选",
      email: "邮件客服",
      emailDesc: "support@jp-buy.com",
      hours: "服务时间",
      hoursValue: "周一至周五 9:00-18:00 (JST)",
      faq: "常见问题",
      faqLink: "查看 FAQ",
    },
    en: {
      title: "Contact Us",
      subtitle: "Questions? We're here to help",
      wechat: "WeChat Support",
      wechatDesc: "Add us for quick response",
      whatsapp: "WhatsApp",
      whatsappDesc: "For international users",
      email: "Email Support",
      emailDesc: "support@jp-buy.com",
      hours: "Service Hours",
      hoursValue: "Mon-Fri 9:00-18:00 (JST)",
      faq: "FAQ",
      faqLink: "View FAQ",
    },
    ja: {
      title: "お問い合わせ",
      subtitle: "ご質問ございますか？",
      wechat: "微信客服",
      wechatDesc: "追加で即対応",
      whatsapp: "WhatsApp",
      whatsappDesc: "国際ユーザー向け",
      email: "メールサポート",
      emailDesc: "support@jp-buy.com",
      hours: "サービス時間",
      hoursValue: "月〜金 9:00-18:00 (JST)",
      faq: "よくある質問",
      faqLink: "FAQを見る",
    },
  };

  const text = t[lang as keyof typeof t] || t.zh;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header showSearch={false} />
      
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">{text.title}</h1>
          <p className="text-gray-600">{text.subtitle}</p>
        </div>

        {/* Contact Methods */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-center">
            {lang === "zh" ? "联系方式" : lang === "ja" ? "联系方式" : "Contact Methods"}
          </h2>
          
          <ContactButtons
            variant="full"
            className="max-w-md mx-auto"
          />
        </div>

        {/* Service Hours */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⏰</span>
            <h3 className="font-semibold">{text.hours}</h3>
          </div>
          <p className="text-gray-600 ml-9">{text.hoursValue}</p>
        </div>

        {/* FAQ Link */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❓</span>
              <h3 className="font-semibold">{text.faq}</h3>
            </div>
            <a
              href={`/${lang}/help`}
              className="text-rose-600 hover:text-rose-700 font-medium"
            >
              {text.faqLink} →
            </a>
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-gray-500 text-sm mt-8">
          {lang === "zh" 
            ? "代购商品可能需要额外运费，详情请咨询客服"
            : lang === "ja"
            ? "代理購入商品は別途送料がかかる場合があります"
            : "Proxy purchase items may require additional shipping fees"}
        </p>
      </main>

      <WechatQRModal
        isOpen={showWechatModal}
        onClose={() => setShowWechatModal(false)}
      />
    </div>
  );
}
