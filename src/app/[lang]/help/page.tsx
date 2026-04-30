"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";

type Locale = "zh" | "en" | "ja";

interface FaqItem {
  q: string;
  a: string;
}

interface Category {
  icon: string;
  title: string;
  items: FaqItem[];
}

interface Translations {
  pageTitle: string;
  pageSubtitle: string;
  disclaimer: string;
  contactCta: string;
  categories: Category[];
}

const translations: Record<Locale, Translations> = {
  zh: {
    pageTitle: "帮助中心",
    pageSubtitle: "常见问题解答 · 日本代拍服务",
    disclaimer:
      "⚠️ 重要提示：退款、赔偿、补发、改地址、更换物流、禁运品判断及海关税费等事项，最终结果须由人工客服确认，本页面内容仅供参考，不构成任何承诺。",
    contactCta: "未找到答案？联系客服",
    categories: [
      {
        icon: "🛒",
        title: "代拍流程",
        items: [
          {
            q: "什么是日本代拍？",
            a: "我们替您在日本各大购物平台（Mercari、Yahoo!拍卖、亚马逊等）购买商品，并帮您完成付款、验货、打包、国际发货全流程。",
          },
          {
            q: "如何下单代拍？",
            a: "在平台搜索或粘贴商品链接，确认价格与代拍服务费后提交订单，充值余额支付即可。我们会在日本确认库存后进行购买。",
          },
          {
            q: "代拍成功后多久能收到商品？",
            a: "商品到达我们日本仓库后会即时通知您。整体时效因商品来源和国际物流方式而异，一般为 7-21 个工作日。",
          },
          {
            q: "代拍失败（竞拍未中/商品售罄）会怎样？",
            a: "代拍失败时，款项将全额退回您的账户余额，不收取任何手续费。",
          },
          {
            q: "可以代拍多件商品合并发货吗？",
            a: "支持。多件商品均到达日本仓库后，可申请合并打包，节省国际运费。具体合包操作请联系客服确认。",
          },
        ],
      },
      {
        icon: "💳",
        title: "费用与付款",
        items: [
          {
            q: "代拍收费标准是什么？",
            a: "服务费为商品价格的一定比例，具体费率请查看平台费率说明页面。竞拍商品以最终成交价计算。",
          },
          {
            q: "如何充值账户余额？",
            a: "支持支付宝、微信支付、银行转账等方式充值，充值后余额即时到账，可直接用于下单。",
          },
          {
            q: "余额可以退款吗？",
            a: "余额退款申请须人工审核，退款周期及可退金额视具体情况由客服最终确认，本页面不作任何承诺。",
          },
          {
            q: "国际运费如何计算？",
            a: "运费根据商品实际重量、体积及所选物流方式计算，商品到达仓库称重后系统会显示预估运费，最终以实际重量为准。",
          },
        ],
      },
      {
        icon: "✈️",
        title: "国际配送",
        items: [
          {
            q: "支持发往哪些国家？",
            a: "我们支持发往中国大陆、香港、澳门、台湾及东南亚多个国家和地区。具体可达地区以下单时平台显示为准。",
          },
          {
            q: "有哪些国际物流方式？",
            a: "提供 EMS、DHL、FedEx、经济小包等多种方式，可在仓库发货页面根据重量和时效需求选择。",
          },
          {
            q: "包裹丢失或损坏怎么办？",
            a: "如包裹在运输途中丢失或损坏，请联系客服提交索赔申请。赔偿方案（赔付金额、处理方式）须由人工客服评估后最终确认，不在本页面承诺。",
          },
          {
            q: "可以修改收货地址吗？",
            a: "包裹尚未发出时，可在订单页面申请修改地址，是否成功需客服人工确认；已发出的包裹地址变更须联系物流公司，结果以物流方确认为准。",
          },
        ],
      },
      {
        icon: "🚫",
        title: "禁运品与关税",
        items: [
          {
            q: "哪些商品无法代拍或发货？",
            a: "危险品、仿冒品、管制药品、食品（部分国家限制）、活体动植物等属于禁运范围。具体商品是否可发送至您所在地区，须由客服人工判断，请勿自行假设可以寄送。",
          },
          {
            q: "目的国关税由谁承担？",
            a: "目的国进口关税及清关费用由收件人（买家）自行承担。具体税率因国家和商品类别而异，我们无法保证免税或代缴关税。",
          },
          {
            q: "报关价值如何填写？",
            a: "我们按实际交易价格如实申报，不提供低报价值服务，以确保合规合法。",
          },
          {
            q: "海关扣押包裹怎么处理？",
            a: "如遭海关扣押，请第一时间联系客服。处理方案（退回、补税放行或其他）须由客服与相关方协商后人工确认，具体结果无法在本页面预先承诺。",
          },
        ],
      },
      {
        icon: "📦",
        title: "售后与订单异常",
        items: [
          {
            q: "收到的商品与描述不符怎么办？",
            a: "请在商品签收后 3 日内联系客服并提供照片证明。我们会与日本卖家沟通协商，但赔偿或退换结果须经人工客服最终确认。",
          },
          {
            q: "商品在日本仓库被验出破损怎么办？",
            a: "验货团队会拍照记录并通知您。后续处理（退货、索赔、代买新品等）须客服与您确认后推进，不在本页面预设处理方案。",
          },
          {
            q: "订单状态长时间没有更新怎么办？",
            a: "如订单状态超过预期时间未更新，请联系客服查询。我们会核实日本卖家和物流状态并反馈给您。",
          },
          {
            q: "可以取消已下单的代拍吗？",
            a: "订单提交后如尚未在日本购买，可申请取消并全额退回余额；已购买的商品是否可退货需视日本卖家政策而定，结果由客服确认。",
          },
        ],
      },
      {
        icon: "💬",
        title: "联系客服",
        items: [
          {
            q: "客服服务时间是什么？",
            a: "人工客服服务时间为周一至周五 9:00-18:00（日本时间 JST）。节假日可能有所调整，请以平台公告为准。",
          },
          {
            q: "如何联系客服？",
            a: "可通过站内消息、微信客服或 WhatsApp 联系我们。在线聊天功能（右下角图标）也可直接发起会话。",
          },
          {
            q: "咨询响应需要多久？",
            a: "工作时间内一般 30 分钟内回复；非工作时间的留言我们将于下一工作日优先处理。",
          },
        ],
      },
    ],
  },

  en: {
    pageTitle: "Help Center",
    pageSubtitle: "Frequently Asked Questions · Japan Proxy Buying",
    disclaimer:
      "⚠️ Important: All decisions regarding refunds, compensation, reshipment, address changes, logistics changes, prohibited item assessment, and customs duties must be confirmed by a human support agent. This page is for reference only and does not constitute any guarantee or promise.",
    contactCta: "Didn't find your answer? Contact Support",
    categories: [
      {
        icon: "🛒",
        title: "How Proxy Buying Works",
        items: [
          {
            q: "What is Japan proxy buying?",
            a: "We purchase items from Japanese shopping platforms (Mercari, Yahoo! Auctions, Amazon Japan, etc.) on your behalf, and handle payment, inspection, packaging, and international shipping.",
          },
          {
            q: "How do I place a proxy order?",
            a: "Search on our platform or paste the item URL, confirm the price and service fee, then submit your order and pay via wallet balance. We purchase the item in Japan after confirming stock availability.",
          },
          {
            q: "How long until I receive my item?",
            a: "We notify you as soon as the item arrives at our Japan warehouse. Overall delivery time varies by item source and shipping method — typically 7-21 business days.",
          },
          {
            q: "What happens if a proxy purchase fails (auction lost/item sold out)?",
            a: "If the purchase fails, the full amount is returned to your wallet balance immediately with no handling fee.",
          },
          {
            q: "Can multiple items be consolidated for one shipment?",
            a: "Yes. Once all items arrive at our Japan warehouse, you can request consolidation to save on international shipping. Please contact support to confirm the process.",
          },
        ],
      },
      {
        icon: "💳",
        title: "Fees & Payment",
        items: [
          {
            q: "What are the service fees?",
            a: "Service fees are a percentage of the item price. Please refer to the platform's fee schedule page for exact rates. Auction items are calculated based on the final bid price.",
          },
          {
            q: "How do I top up my wallet?",
            a: "We accept Alipay, WeChat Pay, bank transfer, and other methods. Funds are credited instantly and can be used for orders right away.",
          },
          {
            q: "Can I get a refund of my wallet balance?",
            a: "Balance refund requests require manual review. The timeline and eligible amount will be confirmed by a support agent — no promises are made on this page.",
          },
          {
            q: "How is international shipping calculated?",
            a: "Shipping fees are based on actual weight, volume, and the shipping method you choose. An estimated fee is shown after weighing at the warehouse; the final charge is based on actual weight.",
          },
        ],
      },
      {
        icon: "✈️",
        title: "International Shipping",
        items: [
          {
            q: "Which countries do you ship to?",
            a: "We ship to mainland China, Hong Kong, Macau, Taiwan, and multiple Southeast Asian countries. The exact list of available destinations is shown at checkout.",
          },
          {
            q: "What shipping options are available?",
            a: "We offer EMS, DHL, FedEx, economy airmail, and more. You can choose based on weight and delivery time requirements on the warehouse shipment page.",
          },
          {
            q: "What if my package is lost or damaged in transit?",
            a: "Please contact support within the claim period and provide evidence. Compensation (amount and method) must be assessed and confirmed by a human agent — no specific outcome is guaranteed here.",
          },
          {
            q: "Can I change my delivery address?",
            a: "If the package has not yet shipped, you may request an address change via the order page — subject to manual confirmation by support. For packages already in transit, contact the carrier directly; the result depends on carrier policy.",
          },
        ],
      },
      {
        icon: "🚫",
        title: "Prohibited Items & Customs",
        items: [
          {
            q: "What items cannot be purchased or shipped?",
            a: "Hazardous materials, counterfeit goods, controlled pharmaceuticals, certain foods (restricted in some countries), and live animals/plants are prohibited. Whether a specific item can be shipped to your country must be assessed by a support agent — do not assume.",
          },
          {
            q: "Who pays import duties at the destination?",
            a: "Import duties and customs clearance fees at the destination country are the buyer's responsibility. Rates vary by country and item category; we cannot guarantee tax-exempt status or prepay duties on your behalf.",
          },
          {
            q: "How is the declared customs value determined?",
            a: "We declare the actual transaction price in compliance with customs regulations. We do not offer undervaluing services.",
          },
          {
            q: "What happens if customs seizes my package?",
            a: "Contact support immediately if your package is seized. The resolution (return to sender, duty payment for release, or other) must be negotiated with the relevant parties and confirmed by our team — we cannot predetermine the outcome.",
          },
        ],
      },
      {
        icon: "📦",
        title: "After-Sales & Order Issues",
        items: [
          {
            q: "What if the item doesn't match the description?",
            a: "Contact support within 3 days of receipt with photo evidence. We will negotiate with the Japanese seller, but any compensation or replacement outcome must be confirmed by a human agent.",
          },
          {
            q: "What if damage is found during warehouse inspection?",
            a: "Our inspection team will photograph and notify you. Next steps (return, claim, replacement purchase, etc.) will be determined by our team in coordination with you — no default outcome is assumed.",
          },
          {
            q: "My order status hasn't updated for a long time — what should I do?",
            a: "If an order status hasn't updated within the expected timeframe, contact support. We will check with the Japanese seller and carrier and report back to you.",
          },
          {
            q: "Can I cancel a proxy order after submitting?",
            a: "If the item hasn't been purchased in Japan yet, you can cancel for a full wallet refund. If already purchased, cancellation depends on the Japanese seller's return policy — the result is confirmed by support.",
          },
        ],
      },
      {
        icon: "💬",
        title: "Contact Support",
        items: [
          {
            q: "What are the support hours?",
            a: "Human support is available Monday to Friday, 9:00-18:00 Japan Standard Time (JST). Hours may vary on public holidays — please check platform announcements.",
          },
          {
            q: "How can I reach support?",
            a: "You can contact us via in-app messaging, WeChat, or WhatsApp. The live chat widget (bottom-right icon) is also available for direct sessions.",
          },
          {
            q: "How quickly will I get a response?",
            a: "During business hours, we typically respond within 30 minutes. Messages sent outside business hours will be prioritized on the next working day.",
          },
        ],
      },
    ],
  },

  ja: {
    pageTitle: "ヘルプセンター",
    pageSubtitle: "よくある質問 · 日本代理購入サービス",
    disclaimer:
      "⚠️ 重要：返金・賠償・再発送・住所変更・配送方法の変更・禁制品の判断・関税に関する最終的な結果は、必ずカスタマーサポートが人工確認いたします。このページの内容は参考情報であり、いかなる保証・約束も行いません。",
    contactCta: "解決しない場合はサポートへ",
    categories: [
      {
        icon: "🛒",
        title: "代理購入の流れ",
        items: [
          {
            q: "代理購入とは何ですか？",
            a: "日本の各ショッピングプラットフォーム（メルカリ・Yahoo!オークション・Amazonなど）でお客様の代わりに商品を購入し、支払い・検品・梱包・国際発送までを一括代行するサービスです。",
          },
          {
            q: "注文方法を教えてください。",
            a: "プラットフォームで商品を検索するか商品URLを貼り付け、価格と代行手数料を確認してご注文ください。残高チャージ後にお支払いいただければ、在庫確認後に購入手続きを進めます。",
          },
          {
            q: "商品が届くまでどのくらいかかりますか？",
            a: "商品が日本倉庫に到着次第ご連絡いたします。商品の入手先や国際配送方法により異なりますが、一般的に7〜21営業日程度です。",
          },
          {
            q: "落札できなかった場合や売り切れの場合はどうなりますか？",
            a: "代理購入に失敗した場合は、全額をアカウント残高へ返金いたします。手数料は一切かかりません。",
          },
          {
            q: "複数の商品をまとめて発送できますか？",
            a: "可能です。すべての商品が日本倉庫に揃った後、合梱をご申請いただけます。国際送料の節約になります。詳細な手順はサポートにお問い合わせください。",
          },
        ],
      },
      {
        icon: "💳",
        title: "料金・お支払い",
        items: [
          {
            q: "代行手数料はどのくらいですか？",
            a: "手数料は商品価格に対する一定割合です。詳しくはプラットフォームの料金ページをご確認ください。オークション商品は落札価格を基準に計算されます。",
          },
          {
            q: "残高のチャージ方法は？",
            a: "Alipay・WeChat Pay・銀行振込など各種方法に対応しています。チャージ後すぐにご利用いただけます。",
          },
          {
            q: "残高は返金してもらえますか？",
            a: "残高の返金申請は人工審査が必要です。返金の可否・金額・期間は担当スタッフが最終確認いたします。このページでは事前にお約束できません。",
          },
          {
            q: "国際送料はどのように計算されますか？",
            a: "送料は実際の重量・サイズおよび選択した配送方法に基づいて計算されます。倉庫での計量後に概算が表示されますが、最終料金は実重量で確定します。",
          },
        ],
      },
      {
        icon: "✈️",
        title: "国際配送",
        items: [
          {
            q: "どの国・地域に発送できますか？",
            a: "中国本土・香港・マカオ・台湾および東南アジアの複数の国・地域に対応しています。対応地域の最新情報はご注文時にプラットフォームでご確認ください。",
          },
          {
            q: "利用できる配送方法は？",
            a: "EMS・DHL・FedEx・エコノミー航空便など複数の方法からお選びいただけます。重量と到着希望日に合わせて倉庫発送ページでご選択ください。",
          },
          {
            q: "荷物が紛失・破損した場合はどうなりますか？",
            a: "配送中の紛失・破損が生じた場合は、速やかにサポートへご連絡のうえ証拠をご提出ください。補償の可否・金額はスタッフが確認後にお知らせします。このページで確約することはできません。",
          },
          {
            q: "配送先の住所を変更できますか？",
            a: "発送前であれば注文ページから変更申請が可能ですが、担当スタッフの確認が必要です。発送済みの場合は配送会社への連絡が必要で、変更可否は配送会社の判断によります。",
          },
        ],
      },
      {
        icon: "🚫",
        title: "禁制品・関税",
        items: [
          {
            q: "購入・発送できない商品はありますか？",
            a: "危険物・偽造品・規制薬品・一部の食品・生きた動植物などは禁制品です。特定の商品がお客様の国に発送できるかどうかは、必ずスタッフが個別に判断いたします。自己判断でご依頼いただいた場合でも対応できない場合があります。",
          },
          {
            q: "輸入関税は誰が負担しますか？",
            a: "輸入関税・通関費用は受取人（お客様）のご負担となります。税率は国や商品カテゴリにより異なります。免税の保証や関税の立替えは対応しておりません。",
          },
          {
            q: "申告価格はどのように決まりますか？",
            a: "法令遵守のため、実際の取引価格で申告いたします。価格の過少申告には対応しておりません。",
          },
          {
            q: "関税当局に荷物が差し押さえられた場合は？",
            a: "差し押さえが発生した際は直ちにサポートへご連絡ください。対応方法（返送・課税通関・その他）は関係各所と協議の上、スタッフが最終確認いたします。結果はこのページで事前にお約束できません。",
          },
        ],
      },
      {
        icon: "📦",
        title: "アフターサービス・注文トラブル",
        items: [
          {
            q: "届いた商品が説明と異なる場合は？",
            a: "受取後3日以内に写真とともにサポートへご連絡ください。日本の出品者と交渉いたしますが、補償・交換の可否はスタッフが最終確認の上でお知らせします。",
          },
          {
            q: "倉庫検品で破損が発見された場合は？",
            a: "検品チームが写真を撮影しご連絡いたします。その後の対応（返品・賠償請求・再購入など）はスタッフとお客様で確認の上進めます。このページで解決策を事前に確約することはできません。",
          },
          {
            q: "注文状況が長時間更新されない場合は？",
            a: "予定期間を過ぎても状況が更新されない場合は、サポートへお問い合わせください。日本の出品者・配送状況を確認の上ご報告いたします。",
          },
          {
            q: "注文後にキャンセルできますか？",
            a: "日本で購入手続きが始まる前であればキャンセル・全額返金が可能です。購入済みの場合は出品者の返品ポリシーに依存するため、可否はスタッフが確認いたします。",
          },
        ],
      },
      {
        icon: "💬",
        title: "サポートへのお問い合わせ",
        items: [
          {
            q: "サポートの対応時間は？",
            a: "人工サポートの対応時間は月〜金 9:00〜18:00（日本時間）です。祝日は変更になる場合がありますので、プラットフォームのお知らせをご確認ください。",
          },
          {
            q: "サポートへの連絡方法は？",
            a: "サイト内メッセージ・WeChat・WhatsAppでお問い合わせいただけます。右下のチャットアイコンからライブチャットも利用可能です。",
          },
          {
            q: "返信までどのくらいかかりますか？",
            a: "営業時間内は通常30分以内にご返答いたします。営業時間外のメッセージは翌営業日に優先対応いたします。",
          },
        ],
      },
    ],
  },
};

function AccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-100 last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-rose-600 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-medium text-sm leading-snug">{item.q}</span>
        <span className="shrink-0 text-zinc-400 text-lg">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p className="pb-4 text-sm text-zinc-600 leading-relaxed">{item.a}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  const params = useParams();
  const rawLang = (params.lang as string) || "zh";
  const lang: Locale = (["zh", "en", "ja"] as Locale[]).includes(rawLang as Locale)
    ? (rawLang as Locale)
    : "zh";

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header showSearch={false} />

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Page header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">{t.pageTitle}</h1>
          <p className="text-gray-500">{t.pageSubtitle}</p>
        </div>

        {/* Safety disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800 leading-relaxed">
          {t.disclaimer}
        </div>

        {/* FAQ categories */}
        <div className="space-y-6">
          {t.categories.map((cat) => (
            <section
              key={cat.title}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100">
                <span className="text-2xl">{cat.icon}</span>
                <h2 className="font-semibold text-base">{cat.title}</h2>
              </div>
              <div className="px-6">
                {cat.items.map((item) => (
                  <AccordionItem key={item.q} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-10 text-center">
          <a
            href={`/${lang}/contact`}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <span>💬</span>
            {t.contactCta}
          </a>
        </div>
      </main>
    </div>
  );
}
