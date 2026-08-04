"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompareResults } from "@/components/compare/compare-results";
import {
  COMPARE_PLATFORMS,
  attachCnyApprox,
  cheapestAcross,
  filterByPriceRange,
  sortCompareItems,
  type ComparePlatform,
  type CompareSort,
  type ComparePlatformResult,
} from "@/components/compare/compare-data";
import { searchComparePlatforms } from "@/components/compare/compare-search";
import { fetchJpyToCny } from "@/components/home/zh/zh-daigou-data";

const SORT_OPTIONS: CompareSort[] = ["relevance", "price_asc", "price_desc"];
const PER_SITE_LIMIT = 12;
// 每站独立超时：某一站慢/挂不拖累其它站，整体最多等这么久必定 settle（按钮必恢复可点）。
const SEARCH_TIMEOUT_MS = 20_000;

function parsePrice(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replaceAll(",", ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function CompareContent() {
  const params = useParams();
  const locale = (params.lang as string) || "zh";
  const t = useTranslations("compare");

  const [keyword, setKeyword] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState<CompareSort>("relevance");
  const [selectedSites, setSelectedSites] = useState<ComparePlatform[]>([
    ...COMPARE_PLATFORMS,
  ]);

  const [results, setResults] = useState<ComparePlatformResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  // ≈人民币汇率（仅非 en 站需要；英文站只显 JPY，绝不显人民币，与列表页/详情页口径一致）。
  const [jpyToCny, setJpyToCny] = useState<number | null>(null);
  useEffect(() => {
    if (locale === "en") return;
    let active = true;
    (async () => {
      const rate = await fetchJpyToCny();
      if (active) setJpyToCny(rate);
    })();
    return () => {
      active = false;
    };
  }, [locale]);

  const toggleSite = (site: ComparePlatform) => {
    setSelectedSites((previous) =>
      previous.includes(site)
        ? previous.filter((value) => value !== site)
        : [...previous, site],
    );
  };

  const runSearch = useCallback(
    async (
      term: string,
      sites: ComparePlatform[],
      min: number | undefined,
      max: number | undefined,
      currentSort: CompareSort,
    ) => {
      const version = requestVersionRef.current + 1;
      requestVersionRef.current = version;
      setLoading(true);
      setSearched(true);
      setGlobalError(null);

      try {
        // 每站独立真实接口 + 独立超时并行搜索（见 compare-search.ts）；某站超时/失败
        // 只标记该站 status:"error"，不影响其它站，Promise.all 最多等 SEARCH_TIMEOUT_MS
        // 就必定 settle——按钮/加载态保证能恢复，不会再出现「55 秒无响应也无报错」。
        const settlements = await searchComparePlatforms(
          sites,
          term,
          locale,
          SEARCH_TIMEOUT_MS,
        );

        if (version !== requestVersionRef.current) return;

        const grouped: ComparePlatformResult[] = settlements.map((result) => {
          if (result.status === "error") {
            return { platform: result.platform, status: "error", items: [] };
          }
          const withCny = attachCnyApprox(result.items, jpyToCny);
          const filtered = filterByPriceRange(withCny, min, max);
          const sorted = sortCompareItems(filtered, currentSort).slice(
            0,
            PER_SITE_LIMIT,
          );
          return {
            platform: result.platform,
            items: sorted,
            status: sorted.length > 0 ? "ok" : "empty",
          };
        });
        setResults(grouped);
      } catch (error) {
        if (version !== requestVersionRef.current) return;
        console.error("Compare search failed:", error);
        setResults([]);
        setGlobalError(t("loadError"));
      } finally {
        if (version === requestVersionRef.current) setLoading(false);
      }
    },
    [t, locale, jpyToCny],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = keyword.trim();
    if (!term || selectedSites.length === 0) return;
    void runSearch(
      term,
      selectedSites,
      parsePrice(priceMin),
      parsePrice(priceMax),
      sort,
    );
  };

  const cheapest = useMemo(() => cheapestAcross(results), [results]);
  const canSearch = keyword.trim().length > 0 && selectedSites.length > 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-4"
      >
        {/* 搜索栏 */}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={t("searchLabel")}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-10 rounded-full pl-9"
            />
          </div>
          <Button
            type="submit"
            disabled={!canSearch || loading}
            className="h-10 rounded-full px-6"
          >
            {loading ? t("searching") : t("searchButton")}
          </Button>
        </div>

        {/* 条件栏：价格区间 + 排序 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compare-price-min" className="text-xs">
              {t("priceMinLabel")}
            </Label>
            <Input
              id="compare-price-min"
              inputMode="numeric"
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
              placeholder={t("pricePlaceholderMin")}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compare-price-max" className="text-xs">
              {t("priceMaxLabel")}
            </Label>
            <Input
              id="compare-price-max"
              inputMode="numeric"
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
              placeholder={t("pricePlaceholderMax")}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <Label className="text-xs">{t("sortLabel")}</Label>
            <Select
              value={sort}
              onValueChange={(value) => value && setSort(value as CompareSort)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value) => t(`sort.${value ?? "relevance"}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`sort.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 站点选择 */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs">{t("sitesLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            {COMPARE_PLATFORMS.map((site) => {
              const active = selectedSites.includes(site);
              return (
                <button
                  key={site}
                  type="button"
                  onClick={() => toggleSite(site)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t(`platform.${site}`)}
                </button>
              );
            })}
          </div>
          {selectedSites.length === 0 && (
            <p className="text-xs text-destructive">{t("noSiteSelected")}</p>
          )}
        </div>
      </form>

      {globalError && (
        <div className="mb-6 rounded-2xl border bg-card px-4 py-8 text-center">
          <p className="text-sm font-medium">{globalError}</p>
        </div>
      )}

      {!searched && !loading && !globalError ? (
        <div className="rounded-2xl border bg-card px-4 py-16 text-center">
          <Search className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">{t("idleTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("idleHint")}</p>
        </div>
      ) : (
        !globalError && (
          <CompareResults
            locale={locale}
            loading={loading}
            results={results}
            cheapestPlatform={cheapest?.platform}
            cheapestPriceJpy={cheapest?.priceJpy}
            skeletonCount={selectedSites.length}
          />
        )
      )}
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareContent />
    </Suspense>
  );
}
