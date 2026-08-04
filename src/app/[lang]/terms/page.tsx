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
 * 服务条款（en / zh）。lang === "zh" 走中文正文，其它 locale（含 en、以及暂未拆分
 * 内容的 ja/ko/th/id/vi）落回原有英文分支——这几个 locale 之前就是看同一份英文
 * 硬编码 JSX，本次改动范围只加 zh，不改变它们的行为。
 *
 * en 分支：
 * 🔴 条款只复述站上**已经对外承诺过的口径**，不新增承诺：
 * - 退款「没买成全额退（含押金）」— 与 /en/buyer-protection 一致
 * - 免费仓储 30–60 天按会员等级 — 与 /en/fees 一致
 * - 不鉴真、不评级 — 与 /en/buyer-protection 一致
 * - 关税由买家承担、诚实申报 — 与关税指南 /en/guides/japan-card-import-tax-us-2026 一致
 * 改这些数字前先确认那几页，别让两处口径打架。
 *
 * zh 分支（2026-08-04 新增）：
 * 正文逐章移植自 docs/legal/zh-terms-final.md（内部起草稿），移植时已删除文首
 * 「文档状态」声明与两处「起草说明」内部批注块（那是给律师看的内部注释，不能
 * 对外展示"这是草稿"）。占位符处理：
 * - 法人番号行整行不展示（未取得，非强制公示项）
 * - 客服联系方式 → 指向 /contact 的「联系客服」链接
 * - 拟生效日期 → 用 2026-08-04（作为 LegalShell 的 updated / "最后更新日期"）
 * 民法典 496 条要求对免除或限制责任、限制用户权利、争议解决方式的条款做显著提示：
 * 弃标 30%、12/24 小时时限、不鉴定真伪、平邮丢失不赔、责任限制等用 <RiskClause>
 * （rose）；其余原文加粗但非风险条款（小节编号、促销信息等）用 <Emphasis>
 * （zinc-900）。禁用 cyan（zh 是浅色买家壳，cyan 是 en 深色壳的强调色）。
 * 改条款数字/费用前先核对 docs/legal/zh-terms-final.md 是否也要同步更新。
 */

const UPDATED = "2026-07-25";
const UPDATED_ZH = "2026-08-04";
const PATH = "terms";
const TITLE = "Terms of Service";
const TITLE_ZH = "服务条款";

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
        "袋鼠君（jp-buy.com）日本代购服务条款：下单与合同成立、费用与汇率、雅虎拍卖代拍规则、验货仓储、国际运输关税、退换与责任限制。",
      alternates: { canonical: buildCanonical(lang, PATH) },
      robots: isIndexable(lang) ? undefined : { index: false, follow: true },
    };
  }

  if (lang !== "en") return {};
  return {
    title: TITLE,
    description:
      "The terms you agree to when using Kangaroo Japan to buy Japanese trading cards through our proxy service.",
    alternates: { canonical: buildCanonical(lang, PATH) },
    robots: isIndexable(lang) ? undefined : { index: false, follow: true },
  };
}

/** rose 强调：民法典 496 条要求显著提示的免责 / 限权 / 争议解决条款。仅 zh 分支使用。 */
function RiskClause({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-rose-700">{children}</strong>;
}
/** zinc 强调：原文加粗但非风险条款（小节编号、一般强调）。仅 zh 分支使用。 */
function Emphasis({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-zinc-900">{children}</strong>;
}

export default async function TermsPage({
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
        intro="我们能为您做什么、不能承诺什么，以及费用、验货、运输和责任如何处理。"
      >
        <LegalH2 id="notice" lang={lang}>
          审慎阅读提示
        </LegalH2>
        <LegalP lang={lang}>
          在您注册成为用户、下单使用本服务之前，请您务必完整阅读并充分理解本《服务条款》（以下简称&ldquo;本条款&rdquo;），特别是
          <RiskClause>
            以粗体标识的、涉及免除或者限制我方责任、限制您的权利、争议解决方式的条款
          </RiskClause>
          。如您对本条款内容有任何疑问，请通过客服渠道咨询后再行注册或下单。
        </LegalP>
        <LegalP lang={lang}>
          您完成注册程序，或您提交订单并完成支付的，即视为您已充分阅读、理解并接受本条款的全部内容，本条款即在您与株式会社長月商事（Nagatsuki
          Corporation）（以下简称&ldquo;我们&rdquo;或&ldquo;平台&rdquo;）之间成立并生效。
        </LegalP>
        <LegalP lang={lang}>
          我们可能会根据业务发展、法律法规变化等不定期修改本条款，修改后的版本将在官网公示或以弹窗、站内信等方式提示您。若您不同意修改后的内容，应自变更生效之日起停止使用本服务；您继续使用本服务的，视为接受变更后的条款。
        </LegalP>

        <LegalH2 id="definitions" lang={lang}>
          第一章 定义与服务性质
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>1.1 定义</Emphasis>
        </LegalP>
        <LegalUl lang={lang}>
          <li>
            &ldquo;平台&rdquo;&ldquo;我们&rdquo;：指本服务的运营主体株式会社長月商事（Nagatsuki
            Corporation）及其提供的 jp-buy.com 中文站服务；
          </li>
          <li>&ldquo;用户&rdquo;&ldquo;您&rdquo;：指注册并使用本服务的个人用户；</li>
          <li>
            &ldquo;原卖家&rdquo;：指在 Mercari（煤炉）、雅虎拍卖（Yahoo！オークション）、雅虎フリマ（Yahoo
            Frima）、乐天ラクマ（Rakuma）、日本亚马逊（Amazon.co.jp）等日本境内网络平台上发布商品、与我们成立购买关系的第三方卖家或平台自身；
          </li>
          <li>&ldquo;代购服务&rdquo;：指我们按照您的委托，代您在日本境内相关网络平台完成商品的采购、验收、仓储、打包及国际转运等服务。</li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>1.2 服务性质</Emphasis> 我们是接受您委托、代您在日本境内网络平台完成购买及后续物流处理的
          <Emphasis>代理人</Emphasis>，我们<Emphasis>不是</Emphasis>您所购商品的卖家，
          <Emphasis>不持有</Emphasis>
          商品库存。您所购商品由原卖家出售，商品本身的真实性、合法性、质量、成色及描述准确性，第一责任在原卖家，而非我们。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>1.3 关于验货与真伪的重要声明</Emphasis>
        </LegalP>
        <LegalP lang={lang}>
          <RiskClause>
            我们不具备对商品进行专业鉴定真伪的能力，默认不会拆封验货。除非您另行购买&ldquo;拍照验货&rdquo;服务（见第八章），我们不对商品拍照、开箱查验。我们不对您所购商品的真伪作任何保证或承诺，请您在下单前自行结合原卖家的描述、信用与评价审慎判断。
          </RiskClause>
        </LegalP>

        <LegalH2 id="company-info" lang={lang}>
          第二章 运营主体
        </LegalH2>
        <LegalP lang={lang}>本服务由以下主体运营：</LegalP>
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
        <LegalP lang={lang}>
          如上信息与我们在其他站点（含 jp-buy.com 英文站）公示的运营主体信息不一致，以本条款实际发布时公示的信息为准。
        </LegalP>

        <LegalH2 id="account" lang={lang}>
          第三章 账户注册与实名
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>3.1 注册资格</Emphasis>{" "}
          您应为完全民事行为能力人。若您未满 18 周岁，应在您的父母或监护人参与、同意下使用本服务；因未满 18
          周岁用户擅自使用本服务产生的后果，由其监护人承担相应责任。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>3.2 信息真实性</Emphasis>{" "}
          您应对注册信息（含收货地址、联系方式、实名信息等）的真实性、准确性、合法性负责。因您提供的信息错误、不完整导致的订单延误、无法配送、丢件等后果，由您自行承担；如因此产生额外费用（如退件费、重新配送费），由您承担。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>3.3 账户安全</Emphasis>{" "}
          您的账户由您本人负责保管，因账户密码保管不善、遭他人冒用导致的损失，由您自行承担；但因我方原因（如系统安全漏洞）导致的除外。如发现账户被他人未经授权使用，请立即联系客服处理。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>3.4 同一用户认定</Emphasis>{" "}
          如您使用相同手机号、身份信息、收货地址或支付账户等方式注册多个账户，我们有权认定其为同一用户，并对相关账户的权益（如优惠券、积分等）进行合并处理。
        </LegalP>

        <LegalH2 id="fees" lang={lang}>
          第四章 服务内容与费用
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>4.1 服务概览</Emphasis>{" "}
          我们提供的代购服务包括但不限于：跨平台商品代购（一口价购买）、雅虎拍卖代拍、商品验收与仓储、拍照验货、合并打包与国际转运。具体费用如下，
          <Emphasis>如有调整，以官网费用页面实时公示为准</Emphasis>。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.2 平台与支付手续费（按件收取，随代购订单一并收取）</Emphasis>
        </LegalP>
        <LegalInfoTable
          rows={[
            ["Mercari（煤炉）", "100 日元 / 件"],
            ["雅虎拍卖（Yahoo！オークション）", "220 日元 / 件"],
            ["雅虎フリマ（Yahoo Frima）", "100 日元 / 件"],
            ["乐天ラクマ（Rakuma）", "100 日元 / 件"],
            ["日本亚马逊（Amazon.co.jp）", "220 日元 / 件"],
          ]}
        />
        <LegalP lang={lang}>同一订单中如包含同一雅虎卖家的多件商品，该笔手续费只收取一次，不按件重复收取。</LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.3 代拍服务费</Emphasis> 代拍服务费为 200 日元 / 件；
          <Emphasis>当前 8 月活动期内免费</Emphasis>，具体以下单时页面实时展示为准。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.4 结算汇率</Emphasis> 结算汇率 = 下单当日中国银联公布的日元实时汇率 + 0.0025
          服务加点；<Emphasis>当前 8 月活动期内，所有会员等级统一执行该标准，不因会员等级设置差异化加点</Emphasis>
          。汇率活动政策如有调整，以官网实时公示为准。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>4.5 验货与包装相关费用</Emphasis>
        </LegalP>
        <LegalInfoTable
          rows={[
            ["拍照验货（每单，含 3 张实拍照片）", "200 日元"],
            ["错发漏发检查", "100 日元"],
            ["合并打包服务本身", "免费"],
            ["打包材料 - 中箱", "350 日元"],
            ["打包材料 - 大箱", "710 日元"],
            ["打包材料 - 打包带", "140 日元"],
            ["打包材料 - 防水膜", "140 日元"],
          ]}
        />
        <LegalP lang={lang}>
          <Emphasis>4.6 仓储费用</Emphasis> 我们为您提供一定期限的<Emphasis>免费仓储期</Emphasis>
          （具体天数根据您的会员等级及当期活动确定，
          <Emphasis>以商品页面、会员规则页面或费用说明页面的实时展示为准</Emphasis>
          ），便于您合并多笔订单一并转运。
          <RiskClause>超出免费仓储期后，每个包裹每日收取人民币 5 元的仓储费</RiskClause>
          ，从超期之日起计算，直至您提交转运申请或办理其他处理为止。
        </LegalP>

        <LegalH2 id="orders" lang={lang}>
          第五章 下单与合同成立
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>5.1 要约邀请</Emphasis>{" "}
          平台上展示的商品信息、价格、预估费用等，均为要约邀请，不构成我们的承诺。您通过平台提交订单、填写收货信息并完成支付的行为，视为向我们发出要约。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>5.2 订单确认</Emphasis>{" "}
          我们收到您的订单及支付后，将结合商品是否仍在售、原卖家是否愿意交易等因素，判断是否代您完成采购。如商品已下架、缺货、原卖家拒绝交易或标价存在明显错误等，我们会通知您取消订单并
          <Emphasis>全额退还</Emphasis>您已支付的款项（不含已实际发生且不可退还的第三方费用，如有）。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>5.3 订单一旦成立</Emphasis>{" "}
          对于&ldquo;一口价&rdquo;类商品（Mercari、雅虎フリマ、乐天 Rakuma、日本亚马逊等），我们完成向原卖家的下单 /
          付款操作后，该笔采购即对我们产生不可撤销的付款义务；在此之前，您可以申请取消订单。
        </LegalP>

        <LegalH2 id="yahoo-auction" lang={lang}>
          第六章 雅虎拍卖代拍专项规则
        </LegalH2>
        <LegalP lang={lang}>
          雅虎拍卖（Yahoo！オークション）采用竞价方式成交，与&ldquo;一口价&rdquo;商品的规则不同，请您在使用代拍服务前重点阅读本章。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>6.1 出价不可撤销</Emphasis> 竞拍进行中，您委托我们提交的出价
          <RiskClause>不可撤销</RiskClause>，除非该出价被其他买家的更高出价超过。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>6.2 中标即产生购买义务</Emphasis>{" "}
          一旦竞拍结束且您为最高出价方（中标），<RiskClause>该笔交易即不可取消</RiskClause>
          。中标后，我们将代您向原卖家履行付款义务。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>6.3 弃标手续费</Emphasis>{" "}
          <RiskClause>
            如您在中标后放弃购买（弃标），我们将从您的账户保证金 / 押金中扣除相应的弃标手续费，金额为中标价的
            30%（不足 1 日元部分向上取整）。
          </RiskClause>{" "}
          该费用性质为您违反代拍委托、导致我们已对原平台产生不可撤销付款义务、已发生的采购成本无法收回、以及我们在原平台的账户信用因弃标记录受损等实际损失所对应的
          <RiskClause>违约金</RiskClause>，并非定金。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>6.4 中标后支付时限</Emphasis> 中标结果确认后，您应在
          <RiskClause>12 小时内</RiskClause>
          完成支付。逾期未支付的，我们将安排人工介入处理，并
          <RiskClause>优先以您的押金抵扣相应款项及第 6.3 条所述弃标手续费</RiskClause>
          （押金不足以覆盖差额部分的，我们不再向您追偿，但已扣除部分也不予退还），同时
          <RiskClause>暂停您账户的下单服务</RiskClause>
          ，直至处理完毕。您按时完成支付的，不影响账户的正常使用。请注意合理规划支付时间：客服服务时间见第二章运营主体信息表，如中标确认时间接近或处于客服服务时间之外，逾期风险需由您自行注意、提前规划。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>6.5 押金说明与退还</Emphasis>{" "}
          竞拍下单时，您可能被要求缴纳一定金额的押金 / 保证金，作为诚信履约保障，具体金额与规则以下单页面为准。符合退还条件的押金，我们将在您
          <Emphasis>提交退还申请后 1-2 个工作日内</Emphasis>处理。
        </LegalP>

        <LegalH2 id="payment" lang={lang}>
          第七章 支付
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>7.1 支付方式与币种</Emphasis> 您通过平台支持的支付方式以人民币完成付款，具体支付渠道以下单页面展示为准。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>7.2 汇率适用</Emphasis> 适用汇率规则见第 4.4
          条。因汇率波动导致的下单前后价格差异，以您实际支付时锁定 / 展示的金额为准。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>7.3 积分与优惠券</Emphasis>{" "}
          如您在下单时使用积分、优惠券等权益抵扣部分或全部价款，具体使用规则以下单页面及活动规则为准。发生订单取消、退款等情形的，相关积分
          / 优惠券将按对应活动规则处理或原路退还至您的账户；如因逾期或不再满足使用条件导致无法退还的，我们不再另行补发或折价补偿。
        </LegalP>

        <LegalH2 id="inspection-storage" lang={lang}>
          第八章 验货、仓储与转运
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>8.1 默认不拆封</Emphasis> 如第 1.3 条所述，我们默认<RiskClause>不会拆封</RiskClause>
          您所购买的商品进行验货。如您需要，可另行购买&ldquo;拍照验货&rdquo;服务。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>8.2 拍照验货</Emphasis> 拍照验货服务每单收费 200 日元，包含 3
          张实物拍摄照片，供您在决定转运前确认商品外观状态。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>8.3 错发漏发检查</Emphasis> 如您怀疑收到的商品存在错发、漏发情形，可申请错发漏发检查服务，收费 100 日元 /
          次。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>8.4 合并打包</Emphasis>{" "}
          我们支持将您在仓储期内的多笔订单合并为一个包裹转运，合并打包服务本身免费，仅按实际使用的包装材料收取材料费（费用见第
          4.5 条）。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>8.5 仓储期限</Emphasis> 免费仓储期及超期费用见第 4.6
          条。请您在仓储期届满前，通过平台提交转运申请或联系客服处理，避免产生超期仓储费用。
        </LegalP>

        <LegalH2 id="no-authentication" lang={lang}>
          第九章 商品描述与非鉴定声明
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>9.1 商品来源与描述</Emphasis>{" "}
          您所购买的商品信息（含标题、描述、成色说明、图片等）均来自原卖家在原平台的发布内容，我们仅作展示或翻译转述，
          <RiskClause>不对该等描述的真实性、准确性作实质审核，也不承担担保责任</RiskClause>。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>9.2 二手商品与成色</Emphasis> 本服务所涉商品<Emphasis>以二手 / 闲置商品为主</Emphasis>
          ，商品的实际成色请以原卖家的描述及（如您购买）拍照验货服务提供的实拍照片为准；二手商品存在合理使用痕迹属于正常情况，不属于质量问题。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>9.3 我们不保证正品</Emphasis>{" "}
          <RiskClause>我们不具备专业鉴定能力，对商品是否为正品不作任何保证或承诺。</RiskClause>{" "}
          您应结合原卖家的信用记录、评价及商品描述，自行判断购买风险；如您对商品真伪存在疑虑，建议您谨慎下单或另行寻求专业鉴定服务。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>9.4 描述不符的处理</Emphasis> 如您收到商品后，认为商品与原卖家描述、您购买的拍照验货照片存在
          <RiskClause>实质不符</RiskClause>，请在<RiskClause>收到商品后 24 小时内</RiskClause>
          联系客服，并提供相关照片作为凭证。我们会在核实后，尽力协助您与原卖家沟通协商解决方案；因我们并非商品的卖家，
          <RiskClause>
            具体处理结果取决于原卖家的意愿及原平台的规则，我们无法保证问题必然能够得到解决，但会本着善意协助沟通
          </RiskClause>
          。
        </LegalP>

        <LegalH2 id="shipping-customs" lang={lang}>
          第十章 国际运输、关税与相关风险
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>10.1 如实申报</Emphasis> 我们将按照实际情况<Emphasis>如实申报</Emphasis>
          国际包裹内容与价值，<Emphasis>不会</Emphasis>
          为您进行低报、瞒报或谎报为&ldquo;礼物&rdquo;等操作。由此产生的进口关税、清关费用，
          <RiskClause>由收件人（您）承担</RiskClause>。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>10.2 个人自用</Emphasis>{" "}
          您通过本服务代购的商品应为您个人自用，不得用于国内转售等经营性用途；因您将代购商品用于经营性用途所引发的合规、清关或其他风险及后果，由您自行承担。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>10.3 运输损坏或丢失</Emphasis>
        </LegalP>
        <LegalUl lang={lang}>
          <li>
            对于<Emphasis>已投保或可查询单号</Emphasis>
            的包裹，如发生损坏或丢失，我们将协助您向承运的邮局 / 物流商发起理赔申请，具体理赔结果及金额以物流商核定为准；
          </li>
          <li>
            对于您自行选择的<RiskClause>平邮（无追踪单号、不投保）</RiskClause>
            方式，因该方式本身不提供追踪与保险，<RiskClause>如发生丢失，我们不承担赔偿责任</RiskClause>
            ，请您在选择运输方式时充分知悉此风险。
          </li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>10.4 拒收 / 弃货</Emphasis> 如您在收到包裹时无正当理由拒绝签收，或长期不处理仓储中的包裹导致我们按规则做弃货处理的，
          <RiskClause>视为您单方放弃继续履行合同，已发生的采购成本、平台手续费、国际运费等费用不予退还</RiskClause>
          。
        </LegalP>

        <LegalH2 id="no-return" lang={lang}>
          第十一章 七天无理由退货的适用说明
        </LegalH2>
        <LegalP lang={lang}>请您在下单前重点阅读本章内容。</LegalP>
        <LegalP lang={lang}>
          <Emphasis>11.1 不适用七天无理由退货</Emphasis>
        </LegalP>
        <LegalP lang={lang}>
          <RiskClause>
            本服务项下的商品，均为您在下单时，基于原卖家已公开的具体商品页面、实物描述、图片及成色说明，指定购买的特定二手
            / 闲置商品，具有&ldquo;一物一件、不可替代&rdquo;的特征，属于您指定的特定标的。您在提交订单前，需对&ldquo;该商品不适用七天无理由退货&rdquo;这一事项进行显著确认。因此，本服务项下商品原则上不适用七天无理由退货规则。
          </RiskClause>
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>11.2 个案协商</Emphasis>{" "}
          如您对具体订单是否适用七天无理由退货存在异议，可联系客服，我们将结合具体情况协商处理，但这不构成对第 11.1 条的变更或承诺。
        </LegalP>

        <LegalH2 id="conduct" lang={lang}>
          第十二章 用户行为规范
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>12.1 禁止行为</Emphasis> 您在使用本服务过程中，不得从事以下行为：
        </LegalP>
        <LegalUl lang={lang}>
          <li>恶意注册、重复注册多个账户骗取优惠权益；</li>
          <li>虚假交易、套现、恶意套取或转售优惠券、积分等权益；</li>
          <li>冒用他人身份或授权信息使用本服务；</li>
          <li>提交虚假订购信息、恶意拍下后大量弃标扰乱交易秩序；</li>
          <li>利用本服务从事任何违反中华人民共和国及日本相关法律法规的行为，包括但不限于代购国家禁止进出口、限制流通的物品；</li>
          <li>侵犯我们或第三方的知识产权、商业秘密或其他合法权益；</li>
          <li>其他违反本条款约定或公序良俗的行为。</li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>12.2 处理措施</Emphasis>{" "}
          如您违反上述规定，我们有权视情节采取以下一种或多种措施：暂停或终止您账户的部分或全部服务、取消相应订单、冻结相应权益（如优惠券、积分）。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>12.3 赔偿责任</Emphasis>{" "}
          因您违反本条款给我们或第三方造成损失的，您应承担相应的赔偿责任；涉嫌违法犯罪的，我们有权移交有关部门处理。
        </LegalP>

        <LegalH2 id="ip" lang={lang}>
          第十三章 知识产权
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>13.1 平台内容</Emphasis> jp-buy.com 网站 /
          小程序内的界面设计、文字说明、软件等内容（不含来自原卖家的商品信息）的知识产权归我们或相关权利人所有，未经许可，您不得擅自复制、传播或用于商业用途。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>13.2 用户提交内容</Emphasis>{" "}
          您因使用本服务（如售后维权、评价晒单等）向我们提交的文字、图片等内容，应为您本人原创或已获得合法授权，不得侵犯他人权利。您授权我们在为您处理相应服务事项（如与原卖家沟通、售后处理）范围内使用该等内容；如涉及将您的内容用于评价展示、营销宣传等其他用途的，我们会另行征得您的同意。
        </LegalP>

        <LegalH2 id="liability" lang={lang}>
          第十四章 责任限制、免责与不可抗力
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>14.1 责任限制的适用原则</Emphasis>{" "}
          本章各项责任限制、免责条款，均按照&ldquo;过错与因果关系&rdquo;原则适用：我们仅对因
          <RiskClause>我方过错</RiskClause>
          导致您损失的部分承担责任，且以我们收取的相应服务费用为限；对于
          <RiskClause>非因我方过错</RiskClause>
          （如原卖家违约、第三方物流延误或损毁、您自身提供信息错误等）导致的损失，我们不承担赔偿责任，但会在合理范围内协助您向责任方主张权利。
          <RiskClause>本章内容不排除、也不限制您依据中华人民共和国法律法规享有的不可被排除的权利。</RiskClause>
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>14.2 我们的责任边界</Emphasis> 我们在处理您委托的代购、验货、仓储、转运等事项时，将尽到合理的注意义务。除本条款另有约定外，我们对以下情形
          <RiskClause>不承担责任</RiskClause>：
        </LegalP>
        <LegalUl lang={lang}>
          <li>原卖家提供的商品描述、成色说明本身存在错误或误导；</li>
          <li>商品在原卖家发货前发生的质量问题；</li>
          <li>国际物流、海关环节因第三方原因造成的延误（第 10.3 条另有约定的除外）；</li>
          <li>因不可抗力导致的服务中断或延误（见第 14.3 条）。</li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>14.3 不可抗力</Emphasis> 因下列情形导致订单延迟、无法完成代购或配送的，我们不承担违约责任，但会及时告知您处理进展：
        </LegalP>
        <LegalUl lang={lang}>
          <li>自然灾害；</li>
          <li>政府、司法机关的行为、决定或命令（如交通管制）；</li>
          <li>意外交通事故；</li>
          <li>罢工；</li>
          <li>法律法规、政策的修改；</li>
          <li>恐怖事件、抢劫等暴力犯罪；</li>
          <li>战争等其他不可抗力或情势变更因素。</li>
        </LegalUl>

        <LegalH2 id="notices" lang={lang}>
          第十五章 通知与送达
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>15.1 通知方式</Emphasis>{" "}
          我们可通过站内信、小程序推送、短信、您注册时留存的联系方式等一种或多种方式向您发送与本服务相关的通知（含条款变更、订单状态、费用调整等）。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>15.2 送达确认</Emphasis>{" "}
          上述通知以发送成功即视为已送达，请您注意保持联系方式的有效性并及时查收。因您未及时更新联系方式或未及时查收导致的不利后果，由您自行承担。
        </LegalP>

        <LegalH2 id="termination" lang={lang}>
          第十六章 协议的变更、解除与终止
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>16.1 条款变更</Emphasis>{" "}
          我们有权根据业务发展、法律法规变化等修改本条款，变更后的版本将在官网公示或以适当方式提示您。如您不同意变更内容，应停止使用本服务；您继续使用的，视为接受变更。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>16.2 终止情形</Emphasis> 本条款在下列情形下终止：
        </LegalP>
        <LegalUl lang={lang}>
          <li>您注销账户；</li>
          <li>我们依据第 12.2 条终止向您提供服务；</li>
          <li>我们停止运营本服务。</li>
        </LegalUl>
        <LegalP lang={lang}>
          <Emphasis>16.3 终止后的处理</Emphasis>{" "}
          条款终止后，我们将按照相关法律法规及我们的隐私政策处理您的账户信息；已产生的订单、售后、退款等事项，双方仍应按本条款约定继续处理至完结。
        </LegalP>

        <LegalH2 id="disputes" lang={lang}>
          第十七章 争议解决与法律适用
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>17.1 友好协商</Emphasis> 因本条款或您使用本服务产生的任何争议，双方应首先通过客服渠道友好协商解决。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>17.2 法律适用</Emphasis>{" "}
          本条款的订立、效力、解释、履行及争议解决，适用中华人民共和国法律（不含港澳台地区法律）。
          <RiskClause>本条不影响您依照中华人民共和国消费者保护相关法律法规所享有的各项强制性权利。</RiskClause>
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>17.3 争议解决</Emphasis>{" "}
          协商不成的，您可以依照法律规定的途径解决争议，包括但不限于向有管辖权的人民法院提起诉讼。
          <RiskClause>我们不通过本条款排除或限制您依法向您住所地人民法院提起诉讼的权利。</RiskClause>
        </LegalP>

        <LegalH2 id="misc" lang={lang}>
          第十八章 其他
        </LegalH2>
        <LegalP lang={lang}>
          <Emphasis>18.1 可分割性</Emphasis> 本条款中任何条款被认定无效或不可执行的，不影响其余条款的效力。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>18.2 语言版本</Emphasis> 本条款以中文撰写并以中文文本为准。
        </LegalP>
        <LegalP lang={lang}>
          <Emphasis>18.3 附件</Emphasis>{" "}
          本条款的附件包括但不限于我们在网站 /
          小程序各页面展示的费用说明、活动规则、会员规则等；与本条款不一致的，就该特定事项，以更具体的专门规则为准，专门规则未约定的事项，以本条款为准。
        </LegalP>
      </LegalShell>
    );
  }

  return (
    <LegalShell
      lang={lang}
      title={TITLE}
      updated={UPDATED}
      intro="What we do for you, what we cannot promise, and how money and parcels are handled."
    >
      <LegalH2 id="what-we-are">What this service is</LegalH2>
      <LegalP>
        We are a <strong className="font-medium text-white">proxy buying agent</strong>.
        You choose a listing on a Japanese marketplace; we buy it in Japan on your
        behalf, receive it at our warehouse, and forward it to you. We are not the seller
        of the item and we do not own the inventory. The seller&apos;s listing is the
        source of truth for what the item is.
      </LegalP>

      <LegalH2 id="orders">Orders and payment</LegalH2>
      <LegalUl>
        <li>
          An order request becomes binding once we place the purchase in Japan. Before
          that point you can cancel.
        </li>
        <li>
          Figures shown before checkout are <strong className="font-medium text-white">estimates</strong>.
          International shipping is quoted after your parcel is weighed at our Japan
          warehouse.
        </li>
        <li>
          Payment is taken through our payment processor. Prices on the English site are
          shown in USD, converted from the Japanese yen price at the rate shown at the
          time.
        </li>
      </LegalUl>

      <LegalH2 id="cannot-promise">What we cannot promise</LegalH2>
      <LegalP>
        Japanese marketplaces are live and competitive. We cannot guarantee that an item
        will still be available when we go to buy it, that a seller will reply or agree
        to ship, or that an auction bid will win. If a purchase does not go through,
        <strong className="font-medium text-white">
          {" "}
          we refund what you paid for it in full, including any deposit
        </strong>
        .
      </LegalP>

      <LegalH2 id="condition">Condition, authenticity and grading</LegalH2>
      <LegalP>
        We translate the seller&apos;s Japanese condition notes into English and, on
        request, photograph the actual card before it ships. We do{" "}
        <strong className="font-medium text-white">not</strong> authenticate cards and we
        do <strong className="font-medium text-white">not</strong> grade them. A
        seller&apos;s description and our photos are the basis on which you decide; see{" "}
        <Link
          href={`/${lang}/buyer-protection`}
          className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          buyer protection
        </Link>{" "}
        for how disputes are handled.
      </LegalP>

      <LegalH2 id="storage">Warehouse storage</LegalH2>
      <LegalP>
        Items are stored free at our Japan warehouse for 30–60 days depending on your
        membership tier, so you can consolidate several purchases into one parcel. Tell
        us before that window ends how you want them shipped.
      </LegalP>

      <LegalH2 id="customs">Duties, taxes and declarations</LegalH2>
      <LegalP>
        Import duty, taxes and carrier clearance fees are assessed by the authorities and
        the carrier in your country and are{" "}
        <strong className="font-medium text-white">paid by you</strong>, not by us. We
        declare contents and value honestly and will not under-declare or mark a parcel
        as a gift on request — doing so is illegal and would also cap any insurance
        claim. See the{" "}
        <Link
          href={`/${lang}/guides/japan-card-import-tax-us-2026`}
          className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          U.S. import tax guide
        </Link>{" "}
        for current rates.
      </LegalP>

      <LegalH2 id="prohibited">What we will not buy or ship</LegalH2>
      <LegalP>
        We will not handle items that are illegal to export from Japan or import into
        your country, or that carriers refuse to carry. If an order turns out to involve
        such an item, we cancel it and refund you.
      </LegalP>

      <LegalH2 id="accounts">Your account</LegalH2>
      <LegalP>
        Keep your login details to yourself; you are responsible for activity on your
        account. Tell us immediately if you think someone else has access. We may suspend
        an account used for fraud, chargeback abuse, or attempts to have us buy
        prohibited items.
      </LegalP>

      <LegalH2 id="liability">Limits of our responsibility</LegalH2>
      <LegalP>
        We are responsible for handling your items with reasonable care while they are in
        our hands, and for refunding purchases we fail to complete. We are not
        responsible for the seller&apos;s own description errors, for delays or damage
        caused by carriers or customs, or for market price movements while your item is
        in transit.
      </LegalP>

      <LegalH2 id="law">Governing law</LegalH2>
      <LegalP>
        These terms are governed by the laws of Japan. {COMPANY.legalNameEn} is
        registered in Osaka, Japan, and disputes are subject to the jurisdiction of the
        courts there.
      </LegalP>
    </LegalShell>
  );
}
