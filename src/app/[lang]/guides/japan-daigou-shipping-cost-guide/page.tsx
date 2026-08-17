import type { Metadata } from "next";
import { faqPageJsonLd, isIndexable } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  ZhGuideShell,
  buildZhGuideMetadata,
  GuideH2,
  GuideH3,
  GuideP,
  GuideOl,
  GuideStrong,
  GuideTldr,
} from "../zh-guide-shell";

/**
 * GEO 长文 zh 侧 ③：日本代购国际运费怎么省（写给中国买家）。
 * 内容改编自 `~/.team/brain/tmp/geo-guides-draft/03-japan-daigou-shipping-cost-guide.md`
 * （内部审稿说明已整段删除，不进入正文）。
 * 🔴 数字纪律：本文我方数字只出现「真人客服」（白名单内），其余我方数字一律写
 * 「以官网当日公示为准」；竞品的专线运费/仓储/合箱阶梯数字照抄源文件已复核数据，
 * 不新增、不改写、不做主观贬低。
 * 🔴 源文件本身没有 markdown 表格——专线运费对比（原第三节）源文件内部审稿说明
 * 明确标注"已改写为叙事段落，与01/02篇的表格形式做区分"，故本篇不引入 GuideTable，
 * 按源文件的叙事结构呈现（详见任务报告"偏离蓝图的决定"一栏）。
 * 竞品沿用源文件的半脱敏代称"挖★姬""乐★番"，不还原实名。
 */

const PATH = "guides/japan-daigou-shipping-cost-guide";
const TITLE = "日本代购国际运费怎么省？集运合箱与专线全解析";
const DESCRIPTION =
  "国际运费是商品价之外最大的一笔开销，省钱核心思路就两个：合箱集运摊薄单件运费、用性价比更高的专线代替标准 EMS。";
const PUBLISHED = "2026-08-17";

const MINI_FAQ = [
  {
    q: "合箱一定比分开寄便宜吗？",
    a: "大多数情况下是的，因为省了重复的基础运费。但要留意免费合箱额度和合箱后的仓储期限制，如果因为等待合箱超期被收仓储费，或者超出免费合箱件数被额外收费，可能会抵消一部分合箱省下的钱。",
  },
  {
    q: "专线运费限制这么多，还值得用吗？",
    a: "如果商品单价不高、重量在限制范围内、又不着急收货，专线通常是最省钱的选择。如果是高价值或大件商品，专线大概率用不了，建议直接按标准EMS的价格来预算。",
  },
  {
    q: "怎么判断自己会不会被收体积重的运费？",
    a: "可以在下单前咨询客服商品的预估打包尺寸。遇到需要结合具体商品情况判断的问题，人工客服通常能给到更贴合实际的预判。",
  },
  {
    q: "袋鼠君有没有类似的低价专线？",
    a: "目前主要走日本邮政的标准渠道（EMS/航空/海运），价格与日邮官方公示一致，没有额外加价，但还没有推出限量的自营经济专线。运费计算也可以在下单前直接问真人客服拿到实际预估，具体运费、仓储天数、专线限制以官网当日公示为准。",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return buildZhGuideMetadata({ lang, path: PATH, title: TITLE, description: DESCRIPTION });
}

export default async function JapanDaigouShippingCostGuidePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <ZhGuideShell
      lang={lang}
      path={PATH}
      eyebrow="运费攻略"
      title={TITLE}
      intro="国际运费会因为重量、体积、路线大幅波动，尤其是体积重和多次分开寄送这两项最容易让运费虚高。这篇实操指南讲清楚集运合箱怎么摊薄单件运费、自营专线和标准EMS该怎么选、体积重怎么避免多付钱，附2026年7月的实测费率作参考。"
      datePublished={PUBLISHED}
    >
      {isIndexable(lang) && <JsonLd data={faqPageJsonLd(MINI_FAQ)} />}

      <GuideTldr>
        国际运费是日本代购里商品价之外最大的一笔开销，省钱核心思路就两个——
        <GuideStrong>合箱集运</GuideStrong>（把多件商品拼成一个包裹，摊薄单件运费）和
        <GuideStrong>用性价比更高的专线代替标准EMS</GuideStrong>
        。以2026年7月实测数据为例，挖★姬自营专线100g活动价610円起（约26.5元人民币）、
        乐★番专线1kg起2300円，都比标准EMS（0.5kg起约1450円）便宜，但两条专线都有
        <GuideStrong>货值上限、重量上限、发货频率上限</GuideStrong>
        ；同时要留意<GuideStrong>免费合箱额度</GuideStrong>和
        <GuideStrong>合单后仓储期变短</GuideStrong>这两个容易被忽略的细节，别让攒单反而多花钱。
      </GuideTldr>

      <GuideH2 id="why-shipping-matters">一、国际运费为什么是大头</GuideH2>
      <GuideP>
        日本代购的成本大致分三块：商品价、代购手续费、国际运费。前两项基本是「一口价」，唯独国际运费会因为
        <GuideStrong>重量、体积、路线</GuideStrong>大幅波动——尤其是<GuideStrong>体积重</GuideStrong>
        （部分快递按体积折算重量，轻但占地方的商品可能比实际重量贵很多）和
        <GuideStrong>多次分开寄送</GuideStrong>
        （每个包裹都要收一次基础运费），这两项是运费虚高的最常见原因，也是最值得优化的地方。
      </GuideP>

      <GuideH2 id="consolidation-basics">二、集运合箱：把多件商品拼成一个包裹寄</GuideH2>
      <GuideP>
        <GuideStrong>合箱（也叫合单/集运）</GuideStrong>
        是把你在同一平台买的多件商品，先寄到代购平台的日本仓库暂存，等攒够一定数量或者你手动确认后，
        平台把这些商品<GuideStrong>打包成一个包裹</GuideStrong>
        再统一寄回国内——这样只用付一次运费的基础费用，而不是每件商品各付一次。
      </GuideP>
      <GuideP>合箱要注意两个容易被忽略的点：</GuideP>
      <GuideOl>
        <li>
          <GuideStrong>免费合箱额度是有限的</GuideStrong>
          。行业常见做法是「前几单免费，超过后按件收费」——比如「前10单免费，第11单起每单收100円」，
          或者「前3件免费，4-9件每件200円，第10件起每件150円」。如果你一次要合并的商品数量超过免费额度，
          超出部分的合箱费也要算进总成本。
        </li>
        <li>
          <GuideStrong>合箱之后，免费仓储期可能会变短</GuideStrong>
          。有平台单件商品仓储免费期给到90天，但合箱打包之后，免费期反而缩短到只剩15天——逻辑是
          「既然已经打包准备发货，就不该再长期占仓位」。如果你合箱之后又在等其他商品、迟迟没发货，
          很可能因为这个更短的期限被收超期费，甚至包裹被视为放弃。
        </li>
      </GuideOl>

      <GuideH2 id="proxy-line-vs-ems">三、专线运费 vs 标准EMS</GuideH2>
      <GuideP>
        除了日本邮政的标准EMS，不少代购平台会自营「专线」，主打比EMS更便宜，但通常带限制条件。
        以2026年7月实测数据为例：挖★姬的自营专线（俗称「竹蜻蜓专线」）100g活动价610円
        （约26.5元人民币）、1kg为980円、2kg为1470円，时效7-12天；乐★番的「关税补贴专线」
        则是1kg起2300円，已经含税含手续费，同样是7-12天到货。两条专线都不是无条件敞开用的——
        挖★姬这条限中国大陆收货、要实名认证、单次货值不能超过2000元人民币，还限每日发1件、
        每月最多10件；乐★番这条则限定2000元人民币货值以内、且包裹不超过3kg。作为参照，
        标准EMS渠道0.5kg起价在1450円左右，专线的价格优势主要体现在500g-2kg这个轻量区间。
      </GuideP>
      <GuideP>
        可以看到专线便宜是有代价的——<GuideStrong>货值上限、重量上限、发货频率上限</GuideStrong>
        ，一旦超出限制就得退回标准EMS渠道，价格会明显上升。买高价值商品或者大件商品之前，
        先算一下是否在专线的限制范围内，别到打包环节才发现要多付一笔。
      </GuideP>

      <GuideH2 id="volumetric-weight">四、体积重：轻但占地方的东西可能更贵</GuideH2>
      <GuideP>
        国际快递计费通常在「实际重量」和「体积重量」（长×宽×高÷抛比系数）之间取较大值收费。
        像手办、卡包、玩偶这类「轻但占体积」的商品，很容易被按体积重收费而不是实际重量，
        导致运费比想象中高不少。买这类商品前，可以主动问一下代购平台包裹的预估尺寸和计费方式，
        避免运费超出预期。
      </GuideP>

      <GuideH2 id="faq">五、常见问题 FAQ</GuideH2>
      {MINI_FAQ.map(({ q, a }) => (
        <div key={q}>
          <GuideH3>{q}</GuideH3>
          <GuideP>{a}</GuideP>
        </div>
      ))}
    </ZhGuideShell>
  );
}
