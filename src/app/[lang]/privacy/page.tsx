import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { buildCanonical, isIndexable } from "@/lib/seo";
import {
  COMPANY,
  LegalH2,
  LegalInfoTable,
  LegalP,
  LegalShell,
  LegalUl,
} from "@/components/legal/legal-shell";

/**
 * 隐私政策（en / zh）。lang === "zh" 走中文正文，其它 locale（含 en、以及暂未拆分
 * 内容的 ja/ko/th/id/vi）落回原有英文分支——这几个 locale 之前就是看同一份英文
 * 硬编码 JSX，本次改动范围只加 zh，不改变它们的行为。
 *
 * en 分支：
 * 🔴 内容口径只写**站点实际在做的事**，不写没有的承诺：支付走 Stripe（我们不接触卡号）、
 * 人机验证用 Cloudflare Turnstile，代购必然要把收货信息交给承运商与海关。
 * 未经证实的东西（如是否已做 GDPR/CCPA 专门流程）一律不写。
 *
 * zh 分支（2026-08-04 新增）：
 * 正文逐章移植自 docs/legal/zh-privacy-final.md（内部起草稿），移植时已删除文首
 * 「文档状态」声明与两处「起草说明」内部批注块（那是给律师看的内部注释，不能
 * 对外展示"这是草稿"）。占位符处理：
 * - 法人番号行整行不展示（未取得，非强制公示项）
 * - 客服联系方式 / 营销消息退订入口 → 指向 /contact 的「联系客服」链接
 * - 中国大陆个人信息保护联系人/境内代表尚未指定 → 改为中性表述 + 沿用原文的兜底承诺
 *   句（不编造一个代表），第十章的引用改成回指第一章 1.2，不再展示占位符方括号
 * - 拟生效日期 → 用 2026-08-04（作为 LegalShell 的 updated / "最后更新日期"）
 * 民法典 496 条 / 个人信息保护法要求对免责及跨境处理等重要内容做显著提示：第三章
 * 「数据处理地在日本」整章及类似条款用 <RiskClause>（rose）；其余原文加粗但非风险
 * 条款（小节编号、一般强调）用 <Emphasis>（zinc-900）。禁用 cyan（zh 是浅色买家壳）。
 */

const UPDATED = "2026-07-25";
const UPDATED_ZH = "2026-08-04";
const PATH = "privacy";
const TITLE = "Privacy Policy";
const TITLE_ZH = "隐私政策";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (lang === "zh") {
    return {
      title: TITLE_ZH,
      description:
        "袋鼠君（jp-buy.com）如何收集、使用、共享您的个人信息：收集范围、跨境处理说明、保存期限，以及您可以行使的权利。",
      alternates: { canonical: buildCanonical(lang, PATH) },
      robots: isIndexable(lang) ? undefined : { index: false, follow: true },
    };
  }

  if (lang !== "en") return {};
  return {
    title: TITLE,
    description:
      "How Kangaroo Japan collects, uses and shares your data when you buy Japanese cards through our proxy service.",
    alternates: { canonical: buildCanonical(lang, PATH) },
    robots: isIndexable(lang) ? undefined : { index: false, follow: true },
  };
}

/** rose 强调：民法典 496 条 / 个保法要求显著提示的重要条款（尤其跨境处理）。仅 zh 分支使用。 */
function RiskClause({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-rose-700">{children}</strong>;
}
/** zinc 强调：原文加粗但非风险条款（小节编号、一般强调）。仅 zh 分支使用。 */
function Emphasis({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-zinc-900">{children}</strong>;
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (lang === "zh") {
    return (
      <LegalShell
        lang={lang}
        title={TITLE_ZH}
        updated={UPDATED_ZH}
        intro="我们收集哪些个人信息、为什么需要，以及会与谁共享、保存多久。"
      >
        <LegalH2 id="intro" lang={lang}>
          写在前面
        </LegalH2>
        <LegalP lang={lang}>
          jp-buy.com 中文站（以下简称&ldquo;本服务&rdquo;）由株式会社長月商事（Nagatsuki Corporation，以下简称&ldquo;我们&rdquo;或&ldquo;平台&rdquo;）运营。我们深知个人信息对您的重要性，制定本《隐私政策》（以下简称&ldquo;本政策&rdquo;），向您说明：我们会收集您的哪些个人信息、出于什么目的收集和使用、可能与哪些第三方共享、信息将在何地处理、保存多长时间，以及您对自己的个人信息享有哪些权利、如何行使。
        </LegalP>
        <LegalP lang={lang}>
          本政策是《jp-buy.com 服务条款》的组成部分，与其共同适用；如两者在个人信息处理事项上的表述不一致，以本政策为准。
        </LegalP>
        <LegalP lang={lang}>
          在使用本服务前，请您完整阅读并理解本政策全部内容，尤其是
          <RiskClause>以粗体标识的重要内容</RiskClause>
          ，包括但不限于第三章&ldquo;数据处理地在日本 /
          跨境处理&rdquo;的相关说明——我们是在日本注册、运营的公司，处理您个人信息的地点在日本境外，这一点对您是否愿意使用本服务可能十分重要。
        </LegalP>
        <LegalP lang={lang}>
          您开始使用本服务（含注册账户、下单）即视为您已阅读、理解并同意本政策的全部内容。若您不同意本政策的任何内容，请不要注册或使用本服务；若您已是用户但不同意修订后的政策内容，应停止使用本服务，您也可以按照本政策第六章申请注销账户。
        </LegalP>
        <LegalP lang={lang}>
          如您是未成年人，请在您的父母或其他监护人陪同下阅读本政策，并在取得他们同意后使用本服务（另见第七章）。
        </LegalP>

        <LegalH2 id="who-we-are" lang={lang}>
          第一章 我们是谁
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>1.1 运营主体</Emphasis>
        </LegalP>
        <LegalP lang={lang}>本政策所称&ldquo;我们&rdquo;&ldquo;平台&rdquo;，指提供 jp-buy.com 中文站服务的以下运营主体：</LegalP>
        <LegalInfoTable
          rows={[
            ["法定名称（日文）", "株式会社長月商事"],
            ["法定名称（中/英文译名）", "Nagatsuki Corporation（长月商事）"],
            ["注册地址", "日本国大阪府大阪市西区江之子島 1-6-2 奥内大八大厦 905（〒550-0006）"],
            ["相关经营资质", "古物商许可：大阪府公安委员会 第 62107R048268 号"],
            [
              "客服联系方式",
              <Link
                key="contact"
                href={`/${lang}/contact`}
                className="text-rose-600 underline-offset-4 hover:text-rose-700 hover:underline"
              >
                联系客服
              </Link>,
            ],
            ["客服服务时间", "每日 9:00–18:00（中国时间，等同于日本时间 10:00–19:00）"],
          ]}
        />
        <LegalP lang={lang}>上表信息与《jp-buy.com 服务条款》第二章一致；如有更新，以官网 / 小程序实时公示的信息为准。</LegalP>
        <LegalP lang={lang}>
          <Emphasis>1.2 中国大陆个人信息保护联系人 / 境内代表</Emphasis>
        </LegalP>
        <LegalP lang={lang}>
          按照中国大陆个人信息保护相关法律要求，境外个人信息处理者处理境内自然人个人信息达到规定情形的，应当在境内设立专门机构或者指定代表，负责处理个人信息保护相关事务，并向有关部门报送该机构或代表的名称、联系方式等信息。
        </LegalP>
        <LegalP lang={lang}>
          我们尚未公布中国大陆个人信息保护专门机构或代表的名称及联系方式。{" "}
          <RiskClause>
            在上述信息补充公布之前，您仍可通过本政策第十章列明的联系方式行使本政策第六章所述的各项权利，我们不会以该信息尚未补充为由拒绝或拖延处理您的合理请求。
          </RiskClause>
        </LegalP>

        <LegalH2 id="what-we-collect" lang={lang}>
          第二章 我们收集的个人信息及使用目的
        </LegalH2>
        <LegalP lang={lang}>我们仅收集为向您提供本服务、实现本章所述目的所必需的个人信息，并按照您使用本服务的具体场景，说明如下：</LegalP>
        <LegalP lang={lang}>
          <Emphasis>2.1 注册与账户管理</Emphasis>
        </LegalP>
        <LegalUl lang={lang}>
          <li>收集信息：手机号码（或您选择的第三方登录方式所提供的必要身份标识信息）；</li>
          <li>使用目的：创建和管理您的账户、验证您的身份、保障账户安全，作为我们向您提供后续代购服务的基础。</li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>2.2 下单与代购</Emphasis>
        </LegalP>
        <LegalUl lang={lang}>
          <li>收集信息：收货人姓名、手机号码、详细收货地址；您选购或委托代拍的商品信息、订单金额、下单时间、订单状态等订单记录；</li>
          <li>使用目的：向原卖家、国际物流商传递完成采购与发货所必需的收货信息；处理订单的生成、变更、取消、售后与争议；供您查询、管理历史订单。</li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>2.3 国际转运与清关</Emphasis>
        </LegalP>
        <LegalUl lang={lang}>
          <li>收集信息：用于清关申报所需的收货人姓名、收货地址等信息（与 2.2 所述信息存在重合，为清关目的再次使用，不另行单独收集）；</li>
          <li>
            使用目的：按照如实申报原则（见服务条款第十章&ldquo;国际运输、关税与相关风险&rdquo;）向海关及相关监管部门提交清关所需信息，确保包裹合法通关；配合国际物流商跟踪包裹运输状态。
          </li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>2.4 支付与账户余额</Emphasis>
        </LegalP>
        <LegalUl lang={lang}>
          <li>收集信息：支付渠道（如支付宝等）返回的支付结果、交易流水等确认支付所必需的信息；您的账户余额、积分、优惠券等账户权益信息及其变动记录（充值、消费、退款）；</li>
          <li>
            使用目的：确认支付结果、处理退款、核对账务、维护您账户余额及相关权益记录的准确性。
            <Emphasis>我们不直接收集、存储您的支付账户密码、支付密码等敏感信息，该等信息由第三方支付渠道按其自身的隐私政策处理。</Emphasis>
          </li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>2.5 客服咨询（含智能客服）</Emphasis>
        </LegalP>
        <LegalUl lang={lang}>
          <li>收集信息：您与人工客服或智能客服（AI）沟通时产生的对话内容；您主动提供的凭证材料（如问题商品照片、订单截图等）；</li>
          <li>使用目的：回应您的咨询、处理投诉与售后申请、留存服务记录以便追溯核实；智能客服的对话内容也可能被用于改进自动答复的准确性与服务效率。</li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>2.6 营销与消息推送</Emphasis>
        </LegalP>
        <LegalUl lang={lang}>
          <li>收集信息：您的服务偏好；站内信、小程序推送等站内消息的发送与查看记录；</li>
          <li>
            使用目的：向您推送与订单、账户直接相关的必要通知（此类服务性通知因关系到服务的正常提供，无法退订）；如涉及优惠活动等营销类消息，您可以通过{" "}
            <Link
              href={`/${lang}/contact`}
              className="text-rose-600 underline-offset-4 hover:text-rose-700 hover:underline"
            >
              联系客服
            </Link>{" "}
            退订。
          </li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>2.7 最小必要原则</Emphasis>{" "}
          我们要求您提供的个人信息，以实现前述各项目的所必需的最小范围为限。除本章列明及法律法规另有规定或经您另行同意的情形外，我们不会收集与本服务无关的个人信息（如身份证件照片原件等），也不会要求您提供超出必要范围的信息。
        </LegalP>

        <LegalH2 id="cross-border" lang={lang}>
          第三章 数据处理地在日本 / 跨境处理的明确告知
        </LegalH2>
        <LegalP lang={lang}>
          <RiskClause>本章是本政策中对您最为重要的内容之一，请您务必重点阅读。</RiskClause>
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>3.1 我们的数据处理地在日本</Emphasis>
        </LegalP>
        <LegalP lang={lang}>
          <RiskClause>
            我们是在日本注册、在日本运营的公司。您使用本服务时向我们提供、以及我们在为您提供代购服务过程中收集或生成的个人信息——包括但不限于您的姓名、手机号码、收货地址、订单记录、账户余额、站内消息、客服对话记录等——均存储在日本，并由我们在日本境内进行处理。
          </RiskClause>{" "}
          这意味着，您向我们提供的个人信息，将从您所在的中国大陆（或港澳台、东南亚等其他地区）传输至日本境外予以处理，构成个人信息的跨境提供。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>3.2 为什么需要跨境处理</Emphasis>{" "}
          本服务的性质是由我们代您在日本境内的网络平台完成商品采购、验收、仓储、打包及国际转运。我们的服务器、办公场所及处理相关事务的人员均在日本，需要在日本本地掌握您的收货信息以完成与日本原卖家、日本物流商之间的对接与沟通，因此您的个人信息必然会被传输至日本境内处理，这是提供本服务所必需的、无法规避的处理方式。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>3.3 我们采取的保护措施</Emphasis>{" "}
          无论您的个人信息在何地被处理，我们均按照不低于本政策所承诺的标准对其加以保护，包括但不限于：采取合理的技术与管理措施，防止个人信息被泄露、篡改、丢失或被未经授权访问；仅在实现本政策所述目的的必要范围内使用、留存您的个人信息；将能够接触您个人信息的人员范围限制在履行相应职责所必需的范围内。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>3.4 跨境提供的合规路径</Emphasis>{" "}
          按照中国大陆个人信息保护相关法律要求，个人信息处理者向境外提供个人信息，需要满足相应的合规条件（可能适用的路径包括：通过国家网信部门组织的安全评估、经专业机构进行个人信息保护认证、按照国家网信部门制定的标准合同与境外接收方约定双方的权利义务等）。
          <RiskClause>
            我们正在评估并推进适用于我方业务模式的具体合规路径，最终以我们届时实际采取、并依法完成相应手续的合规安排为准；如监管要求发生变化，我们会相应调整。
          </RiskClause>{" "}
          在完成前述合规安排之前，我们承诺不会因此降低对您个人信息的保护标准。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>3.5 您的选择</Emphasis>{" "}
          由于跨境处理是本服务代购性质所必需的信息处理方式，如您不同意您的个人信息按本章所述方式被传输至日本境外并在日本境内处理，请您不要注册、下单或使用本服务。
        </LegalP>

        <LegalH2 id="sharing" lang={lang}>
          第四章 我们如何共享您的个人信息
        </LegalH2>
        <LegalP lang={lang}>
          我们仅在实现本政策所述目的的必要范围内，向以下类型的第三方共享您的个人信息；除本章列明的情形及法律法规要求、您另行明确同意的情形外，
          <Emphasis>我们不会与前述范围之外的第三方共享您的个人信息，也不会出售或出租您的个人信息</Emphasis>。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.1 国际物流服务商</Emphasis>{" "}
          为完成商品的国际运输，我们会将收件人姓名、手机号码、收货地址等必要信息提供给承运的国际物流服务商（如
          EMS、DHL、FedEx、日本邮政国际经济小包等，具体以您下单时选择或系统匹配的运输方式为准），用于包裹的分拣、运输、清关配合及投递、物流状态跟踪。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.2 支付渠道</Emphasis>{" "}
          您通过本服务支持的第三方支付渠道（如支付宝等）完成付款时，相关支付信息由该支付渠道按照其自身的隐私政策独立处理；我们仅接收支付结果、交易流水号等确认支付、办理退款所必需的信息，不掌握、不存储您的支付账户密码等敏感信息。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.3 日本各交易平台及原卖家</Emphasis> 为完成您委托的采购，我们需要向 Mercari（煤炉）、雅虎拍卖（Yahoo！オークション）、雅虎フリマ、乐天ラクマ（Rakuma）、日本亚马逊（Amazon.co.jp）等平台上的原卖家提供收货人姓名、收货地址等下单所必需的信息，以便原卖家发货至我们在日本的仓库或配合完成后续转运安排。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.4 海关及相关监管部门</Emphasis>{" "}
          按照如实申报原则（见服务条款第十章&ldquo;国际运输、关税与相关风险&rdquo;），我们会向进出口环节涉及的海关及相关监管部门提交清关所需的收件人信息及商品信息，以配合完成合法通关；由此可能产生的关税，按照服务条款的约定由您承担。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.5 共享原则</Emphasis>{" "}
          我们要求前述第三方仅在实现相应目的的必要范围内使用您的个人信息，并遵守适用法律法规及不低于本政策承诺的保护标准；前述独立的第三方（如支付渠道、原卖家所在平台）的信息处理活动适用其自身的隐私政策，我们无法代替其作出保证，建议您在使用相关第三方服务前一并了解。
        </LegalP>

        <LegalH2 id="retention" lang={lang}>
          第五章 保存期限
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>5.1 保存原则</Emphasis>{" "}
          我们仅在为实现本政策所述目的所必需的最短期限内保存您的个人信息；法律法规对特定信息的保存期限另有强制性规定的（如财务凭证、交易记录等的法定留存要求），从其规定，按孰长的期限保存。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>5.2 账户注销后的处理</Emphasis>{" "}
          您注销账户后，我们将停止对您个人信息的收集与使用（法律法规要求或本政策另有说明须继续保存的情形除外），并在法律法规规定或允许的期限内对相关信息进行删除或匿名化处理。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>5.3 争议、投诉或售后处理中的信息</Emphasis>{" "}
          如您的订单涉及尚未了结的争议、投诉、售后或法律程序，我们可能在该等事项处理完毕后的合理期限内继续保存相关信息，以便留存必要的处理记录、应对可能的权利主张；相关事项了结且超过前述合理期限后，我们会对该等信息进行删除或匿名化处理。
        </LegalP>

        <LegalH2 id="your-rights" lang={lang}>
          第六章 您的权利与行使方式
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>6.1 您享有的权利</Emphasis> 按照适用的个人信息保护法律法规，您对我们持有的您的个人信息享有以下权利：
        </LegalP>
        <LegalUl lang={lang}>
          <li>
            <Emphasis>查阅、复制</Emphasis>：您有权向我们了解、查阅我们持有的您的个人信息，并可要求获取副本；
          </li>
          <li>
            <Emphasis>更正、补充</Emphasis>：如您发现我们持有的您的个人信息有误或不完整，有权要求我们更正或补充；
          </li>
          <li>
            <Emphasis>删除</Emphasis>：在法律规定的情形下（如我们处理您个人信息的目的已实现或不再必要、您撤回同意、我们停止运营本服务等），您有权要求我们删除您的个人信息；
          </li>
          <li>
            <Emphasis>可携带</Emphasis>：符合法律规定条件的，您有权要求将您的个人信息转移至您指定的其他个人信息处理者；
          </li>
          <li>
            <Emphasis>撤回同意</Emphasis>：对于基于您的同意而进行的个人信息处理（如营销类消息推送），您有权随时撤回同意；撤回同意不影响撤回前基于该同意已经进行的处理行为的效力；
          </li>
          <li>
            <Emphasis>注销账户</Emphasis>：您有权申请注销您的账户；注销后，我们将按照本政策第五章处理您的个人信息。
          </li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>6.2 行使方式</Emphasis> 您可以通过本政策第十章列明的联系方式向我们提出上述请求。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>6.3 响应</Emphasis>{" "}
          我们会在收到您的有效请求并核实您的身份后，尽快处理并响应；如您的请求内容复杂、核实或处理需要较长时间，我们会及时告知您预计所需时间及处理进展。
          <Emphasis>具体响应时限的服务承诺，以官网 / 小程序另行公示的内容为准。</Emphasis>
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>6.4 身份核实</Emphasis> 为防止他人冒用您的身份行使前述权利、保障您的账户与信息安全，我们可能需要您配合提供必要信息以核实身份，请您理解。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>6.5 无法满足请求的情形</Emphasis>{" "}
          在法律法规规定的情形下（如涉及国家安全、公共利益、他人合法权益，或您的请求缺乏必要的身份核实、明显超出合理范围等），我们可能无法满足您的相关请求，我们会向您说明理由。
        </LegalP>

        <LegalH2 id="children" lang={lang}>
          第七章 未成年人信息保护
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>7.1 服务对象</Emphasis>{" "}
          本服务主要面向具有完全民事行为能力的成年人提供。若您未满 18 周岁，应在您的父母或其他监护人的同意和指导下使用本服务、注册账户并提供个人信息（另见服务条款第 3.1 条）。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>7.2 我们如何处理未成年人的个人信息</Emphasis>{" "}
          如我们知悉自己收集了未成年人的个人信息，我们只会在监护人同意的范围内使用该等信息，用于实现本政策所述的相应目的，并按照法律法规对未成年人个人信息保护的特别要求处理。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>7.3 监护人的权利</Emphasis>{" "}
          如您是未成年人的监护人，对该未成年人的个人信息处理事宜存在疑问，或希望代未成年人行使本政策第六章所列的权利，可通过第十章列明的联系方式与我们联系。
        </LegalP>

        <LegalH2 id="cookies" lang={lang}>
          第八章 Cookie 与类似技术
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>8.1 我们如何使用 Cookie 及类似技术</Emphasis>{" "}
          本服务（含网站及小程序）可能使用 Cookie、本地存储、设备标识符等类似技术，用于：识别您的登录状态、记住您的偏好设置、保障交易与账户安全、进行必要的服务统计与分析以改进产品体验。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>8.2 第三方技术服务</Emphasis>{" "}
          本服务中的部分功能（如地图定位、支付、消息推送等）可能依赖第三方技术服务的支持，该等第三方可能会按照其自身的隐私政策收集必要的设备与使用信息。我们会要求接入本服务的第三方遵守适用的个人信息保护法律法规。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>8.3 您的选择</Emphasis>{" "}
          您可以通过设备或浏览器设置管理、清除 Cookie 等技术留存的信息；但请注意，禁用相关技术可能影响您正常使用本服务的部分功能（如无法保持登录状态）。
        </LegalP>

        <LegalH2 id="changes" lang={lang}>
          第九章 政策的更新与通知
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>9.1 更新</Emphasis>{" "}
          我们可能会根据法律法规变化、监管要求、业务调整等不定期修订本政策。修订后的版本将在官网 /
          小程序公示；涉及收集目的、共享对象、数据处理地、您的权利行使方式等发生实质性变化的重大修订，我们会通过站内信、弹窗、短信等适当方式另行提示您。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>9.2 生效</Emphasis>{" "}
          本政策的修订版本自公示之日起或公示中另行载明的生效日期起生效。若您在修订后继续使用本服务，视为您已阅读、理解并接受修订后的内容；若您不同意修订内容，应停止使用本服务，您也可以按照本政策第六章申请注销账户。
        </LegalP>

        <LegalH2 id="contact-us" lang={lang}>
          第十章 联系我们
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>10.1 联系方式</Emphasis>{" "}
          如您对本政策的内容、我们处理您个人信息的方式有任何疑问、意见或投诉，或希望行使本政策第六章所列的权利，可通过以下方式联系我们：
        </LegalP>
        <LegalUl lang={lang}>
          <li>
            客服渠道：
            <Link
              href={`/${lang}/contact`}
              className="text-rose-600 underline-offset-4 hover:text-rose-700 hover:underline"
            >
              联系客服
            </Link>
          </li>
          <li>客服服务时间：每日 9:00–18:00（中国时间，等同于日本时间 10:00–19:00）</li>
          <li>中国大陆个人信息保护联系人 / 境内代表：详见本政策第一章 1.2</li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>10.2 处理</Emphasis> 我们会在核实您的身份后，尽快审核您的请求并按照本政策第六章所述方式响应。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>10.3 争议解决</Emphasis>{" "}
          如您对我们的回复不满意，尤其是认为您的个人信息权益受到损害的，您可以通过《jp-buy.com 服务条款》第十七章&ldquo;争议解决与法律适用&rdquo;列明的途径解决争议。
        </LegalP>
      </LegalShell>
    );
  }

  return (
    <LegalShell
      lang={lang}
      title={TITLE}
      updated={UPDATED}
      intro="What we collect when you use Kangaroo Japan, why we need it, and who it is shared with."
    >
      <LegalH2 id="what-we-collect">What we collect</LegalH2>
      <LegalUl>
        <li>
          <strong className="font-medium text-white">Account data</strong> — the email
          address and password you register with. Passwords are stored hashed; we never
          see them in plain text.
        </li>
        <li>
          <strong className="font-medium text-white">Order data</strong> — the listings
          you ask us to buy, order status, and the messages you exchange with our team.
        </li>
        <li>
          <strong className="font-medium text-white">Shipping details</strong> — the
          recipient name, address and phone number you give us for international
          delivery, plus the customs declaration made for your parcel.
        </li>
        <li>
          <strong className="font-medium text-white">Payment data</strong> — handled by
          our payment processor. Card numbers are entered on the processor&apos;s side;
          they do not reach our servers and we cannot see them.
        </li>
        <li>
          <strong className="font-medium text-white">Technical data</strong> — cookies
          for your login session and language preference, and the bot-protection check
          on our sign-in form (Cloudflare Turnstile).
        </li>
      </LegalUl>

      <LegalH2 id="why">Why we need it</LegalH2>
      <LegalP>
        We are a proxy buying service: we purchase items in Japan on your behalf and
        forward them to you. That means we need your order and shipping details to place
        the purchase, receive the item at our Japan warehouse, declare it truthfully to
        customs, and ship it to your address. We also use your email to send order
        updates and to answer support requests.
      </LegalP>

      <LegalH2 id="sharing">Who we share it with</LegalH2>
      <LegalUl>
        <li>
          <strong className="font-medium text-white">Japanese marketplaces and sellers</strong>{" "}
          — to place the order. They see our details as the buyer, not yours.
        </li>
        <li>
          <strong className="font-medium text-white">Carriers</strong> (Japan Post, FedEx,
          UPS, DHL) — your recipient name, address and phone number, so the parcel can be
          delivered.
        </li>
        <li>
          <strong className="font-medium text-white">Customs authorities</strong> — the
          declared contents and value of your parcel. We declare honestly and do not
          under-declare on request.
        </li>
        <li>
          <strong className="font-medium text-white">Our payment processor</strong> — to
          take payment and handle refunds.
        </li>
      </LegalUl>
      <LegalP>
        We do not sell your personal data, and we do not share it for third-party
        advertising.
      </LegalP>

      <LegalH2 id="where">Where your data is handled</LegalH2>
      <LegalP>
        {COMPANY.legalNameEn} operates from Japan, so your data is processed in Japan.
        If you order from the United States or elsewhere, your data crosses borders to
        reach us and to reach the carrier that delivers your parcel.
      </LegalP>

      <LegalH2 id="retention">How long we keep it</LegalH2>
      <LegalP>
        Order, shipping and customs records are kept while your account is active and
        afterwards for as long as tax, customs and antique-dealer record-keeping rules
        require. Account data is deleted when you ask us to close your account, except
        for records we are legally required to retain.
      </LegalP>

      <LegalH2 id="your-choices">Your choices</LegalH2>
      <LegalP>
        Email{" "}
        <a
          href={`mailto:${COMPANY.supportEmail}`}
          className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          {COMPANY.supportEmail}
        </a>{" "}
        to ask for a copy of your data, to correct it, or to close your account and have
        it deleted. Please write from the address on the account so we can confirm it is
        you. We will tell you if a legal retention rule stops us deleting something.
      </LegalP>

      <LegalH2 id="children">Children</LegalH2>
      <LegalP>
        This service is not directed at children under 13, and we do not knowingly
        collect their data.
      </LegalP>

      <LegalH2 id="changes">Changes</LegalH2>
      <LegalP>
        If we change this policy we will update the date at the top of this page.
        Material changes will also be announced on the site.
      </LegalP>
    </LegalShell>
  );
}
