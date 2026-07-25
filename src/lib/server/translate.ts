import { unstable_cache } from "next/cache";

/**
 * 日→英翻译（Azure Translator），服务端专用。
 *
 * 用途：Mercari 商品标题是日文原名（例「ミネズミ AR SV11W ホワイトフレア 151/086」），
 * 对美国买家既不可读、也拿不到英文长尾搜索流量。这里把标题翻成英文，用于 en 详情页的
 * title / description / OG 与页面上的副标题；**日文原名始终保留**（它是买家跟 Mercari
 * 原页核对的依据，而且型号 SV11W、151/086 本身就是英文可搜的关键词）。
 *
 * 为什么不走后端的 /translate/jp2zh：那条链是「后端转发 → 老后台 PHP /api/trans2zh/jp2zh」，
 * 目标语言写死中文，且老后台是脆弱的生产库。前端项目本身已配好 AZURE_TRANSLATOR_KEY /
 * AZURE_TRANSLATOR_REGION（Production 均有），服务端直连更短也更安全。
 *
 * 外部调用三件套（见 ~/.claude/rules/external-call-resilience.md）：
 * - **超时**：3s AbortSignal，绝不让翻译拖慢首屏。
 * - **缓存**：unstable_cache 30 天——同一商品标题不会变，翻译结果稳定，既省 Azure 调用
 *   也避免爬虫刷页放大成本。（本项目未启用 cacheComponents，故用 unstable_cache 而非
 *   `use cache`；不为这一个功能改全局配置。）
 * - **熔断/降级**：任何失败（无 key、超时、非 2xx、结构不符）一律返回 null，调用方回退到
 *   日文原名。serverless 无常驻状态做不了真正的连续失败熔断，这里以「快速超时 + 全路径
 *   降级 + 长缓存」达到同等效果：翻译挂了页面只是少一行英文，绝不报错、绝不变慢。
 */

const AZURE_ENDPOINT =
  "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=ja&to=en";
const TIMEOUT_MS = 3000;
/** 标题够短，超过这个长度的多半不是卡名（脏数据），不值得送去翻译。 */
const MAX_INPUT_LENGTH = 500;

interface AzureTranslateItem {
  translations?: { text?: string }[];
}

async function callAzureJaToEn(text: string): Promise<string | null> {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  // 没配 key 就安静降级——本地开发默认没有，不该因此报错或刷屏。
  if (!key || !region) return null;

  try {
    const res = await fetch(AZURE_ENDPOINT, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ Text: text }]),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // 缓存由外层 unstable_cache 负责，这里不要再进 Next 的 fetch 缓存。
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = (await res.json()) as AzureTranslateItem[];
    const translated = json?.[0]?.translations?.[0]?.text?.trim();
    if (!translated) return null;

    // 翻译结果与原文完全一致时视为「没翻出东西」（例如纯型号串），
    // 返回 null 让调用方只显示原名，避免页面出现两行一模一样的标题。
    return translated === text.trim() ? null : translated;
  } catch {
    return null;
  }
}

/**
 * 取商品标题的英文译名；失败/未配置一律返回 null，调用方回退日文原名。
 *
 * 缓存 key：unstable_cache 默认已把函数入参计入 key，所以不同标题各自成条，
 * 不会互相串（keyParts 只用于标识这个函数本身）。
 */
export const translateTitleJaToEn = unstable_cache(
  async (text: string): Promise<string | null> => {
    const src = text?.trim();
    if (!src || src.length > MAX_INPUT_LENGTH) return null;
    return await callAzureJaToEn(src);
  },
  ["mercari-title-ja2en"],
  { revalidate: 60 * 60 * 24 * 30 },
);
