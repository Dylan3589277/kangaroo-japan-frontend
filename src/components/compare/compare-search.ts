// compare 页专用的真实数据源接入层。
//
// 背景（2026-08-04 中枢实测坐实）：`/integrations/search/unified` 对任何关键词恒返回 0
// （现代后台商品库是空的）。煤炉 / 雅虎等列表页走的是另一条实时搜索链路（后端代理旧系统
// 实时抓取 / 检索，能出真数据，见 ZhMercariList / YahooSearchPage / ZhYahoofrimaList /
// ZhRakumaList）。本文件把 compare 页接到与列表页相同的真实接口：
//   - mercari:    GET /integrations/mercari/list?keyword=&page=
//   - yahoo(竞拍): GET /yahoo/goods?page=&kw=&sort=&lng=
//   - yahoofrima:  GET /integrations/yahoofrima/list?keyword=&page=
//   - rakuma:      GET /integrations/rakuma/list?keyword=&page=
//
// 为什么不直接复用 `src/lib/api.ts` 的 `api.request`：这里需要每站独立、真正可 abort 的
// 超时（AbortController），而 `api.request` 不接受 signal；施工卡明确不许改动 api.ts 的
// 现有方法。于是按 api.ts 里 `getApiBaseUrl()` 同一条同源代理规则（/api/backend）在本文件
// 内重建最小 base URL 逻辑——零改动 api.ts，只多 10 行本地常量。

import {
  extractUnifiedItems,
  normalizeCompareItem,
  type CompareItem,
  type ComparePlatform,
} from "./compare-data";

function getCompareApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (
    !configured ||
    configured.includes("kangaroo-japan-backend-production.up.railway.app")
  ) {
    return "/api/backend";
  }
  return configured;
}

const COMPARE_API_BASE = getCompareApiBase();

export type ComparePlatformSearchResult = {
  platform: ComparePlatform;
  status: "ok" | "error";
  items: CompareItem[];
};

async function fetchJsonWithTimeout(
  path: string,
  timeoutMs: number,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${COMPARE_API_BASE}${path}`, {
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false };
    const data = await response.json();
    return { ok: true, data };
  } catch {
    // 网络错误 / 超时中止都归一成失败，由调用方标 status:"error"，绝不静默吞掉。
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

function buildPath(
  platform: ComparePlatform,
  keyword: string,
  locale: string,
): string {
  const kw = encodeURIComponent(keyword);
  switch (platform) {
    case "mercari":
      return `/integrations/mercari/list?keyword=${kw}&page=1`;
    case "yahoo":
      return `/yahoo/goods?page=1&kw=${kw}&sort=end_a&lng=${encodeURIComponent(locale)}`;
    case "yahoofrima":
      return `/integrations/yahoofrima/list?keyword=${kw}&page=1`;
    case "rakuma":
      return `/integrations/rakuma/list?keyword=${kw}&page=1`;
  }
}

/** 单站搜索：绝不 throw，超时/网络失败/非 2xx 都归一成 status:"error"，不拖垮其它站。 */
async function searchOnePlatform(
  platform: ComparePlatform,
  keyword: string,
  locale: string,
  timeoutMs: number,
): Promise<ComparePlatformSearchResult> {
  const result = await fetchJsonWithTimeout(
    buildPath(platform, keyword, locale),
    timeoutMs,
  );
  if (!result.ok) {
    return { platform, status: "error", items: [] };
  }
  const items = extractUnifiedItems(result.data)
    .map((entry) => normalizeCompareItem(entry, platform))
    .filter((item): item is CompareItem => item !== null);
  return { platform, status: "ok", items };
}

/**
 * 并行搜索所选站点；每站独立 `timeoutMs` 超时（各自 AbortController），互不阻塞——
 * 某一站慢或挂了，其它站正常出结果，整体最多等 `timeoutMs` 就必定 settle。
 */
export async function searchComparePlatforms(
  platforms: ComparePlatform[],
  keyword: string,
  locale: string,
  timeoutMs = 20_000,
): Promise<ComparePlatformSearchResult[]> {
  return Promise.all(
    platforms.map((platform) =>
      searchOnePlatform(platform, keyword, locale, timeoutMs),
    ),
  );
}
