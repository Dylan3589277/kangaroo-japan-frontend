import { YahooSearchPage } from "@/components/yahoo/yahoo-search-page";

type YahooSearchParams = {
  keyword?: string | string[];
  category?: string | string[];
  sort?: string | string[];
};

/**
 * en 首屏的默认关键词：本站定位是 U.S. TCG collectors，雅虎页却默认拉全站在售，
 * 首屏实测全是农业薄膜、汽车避震、垃圾箱——跟首页「Built for U.S. TCG collectors」
 * 直接打架。这里给英文站一个 TCG 默认视角，用户仍可自行改关键词或切分类。
 *
 * 选「ポケモンカード」而不是「ポケカ」：后者在 tcg-keywords.ts 里被标注为返 0 的坑词。
 * 中文站维持原样（默认全站浏览），既有行为不动。
 */
const EN_DEFAULT_TCG_KEYWORD = "ポケモンカード";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function YahooPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<YahooSearchParams>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  const requestedKeyword = firstValue(query.keyword);
  // 只在英文站、且 URL 里压根没带 keyword 时兜底；带 ?keyword= 进来的一律尊重用户
  //（包括显式传空串来看全站的情况）。
  const initialKeyword =
    requestedKeyword === undefined && lang === "en"
      ? EN_DEFAULT_TCG_KEYWORD
      : requestedKeyword;

  return (
    <div className="min-h-screen bg-muted/20">
      <YahooSearchPage
        locale={lang}
        initialKeyword={initialKeyword}
        initialCategory={firstValue(query.category)}
        initialSort={firstValue(query.sort)}
      />
    </div>
  );
}
