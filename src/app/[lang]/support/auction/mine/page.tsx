"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";

import { CANDY_THEME_CSS } from "../../candy-theme";

type Source = "yahoo" | "mercari";

type BidItem = {
  source: Source;
  id?: number | string;
  status?: number;
  status_txt?: string;
  order_id?: string;
  goods_no?: string;
  goods_name?: string;
  cover?: string;
  price?: number;
  create_time?: string;
};

function getRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// 三 tab 对应老版 yahoos.vue 的 status 入参口径：0=竞拍中，3=失败/结束，
// 其它（约定 2）=中标。煤炉 h5bids 的 bucket 口径与此一致（0=进行中 2=已中标 3=已结束）。
const STATUS_TABS: { key: string; label: string; status: number }[] = [
  { key: "bidding", label: "竞拍中", status: 0 },
  { key: "won", label: "已中标", status: 2 },
  { key: "ended", label: "已结束", status: 3 },
];

type SourceState = {
  page: number;
  hasMore: boolean;
  errored: boolean;
};

const INITIAL_SOURCE_STATE: SourceState = { page: 1, hasMore: false, errored: false };

class SignatureError extends Error {}

function parseTime(value?: string): number {
  if (!value) return 0;
  const t = Date.parse(value.replace(" ", "T"));
  return Number.isNaN(t) ? 0 : t;
}

export default function SupportAuctionMinePage() {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = params?.lang || "zh";
  const userId = searchParams.get("user_id") || "";
  const ts = searchParams.get("ts") || "";
  const sig = searchParams.get("sig") || "";
  const isCandyTheme = searchParams.get("theme") === "candy";

  const originalQuery = useMemo(() => {
    const qs = new URLSearchParams();
    if (userId) qs.set("user_id", userId);
    if (ts) qs.set("ts", ts);
    if (sig) qs.set("sig", sig);
    if (isCandyTheme) qs.set("theme", "candy");
    return qs.toString();
  }, [userId, ts, sig, isCandyTheme]);

  const [activeTab, setActiveTab] = useState(STATUS_TABS[0].key);
  const [items, setItems] = useState<BidItem[]>([]);
  const [yahooState, setYahooState] = useState<SourceState>(INITIAL_SOURCE_STATE);
  const [mercariState, setMercariState] = useState<SourceState>(INITIAL_SOURCE_STATE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const activeStatus =
    STATUS_TABS.find((tab) => tab.key === activeTab)?.status ?? 0;

  const fetchYahoo = useCallback(
    async (targetPage: number) => {
      const res = await fetch("/api/support/yahoo/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          ts,
          sig,
          status: activeStatus,
          page: targetPage,
        }),
      });
      const payload = await res.json().catch(() => null);
      const root = getRecord(payload);
      if (root.code === 101) {
        throw new SignatureError();
      }
      if (root.code !== 0) {
        throw new Error((root.errmsg as string) || "雅虎记录加载失败");
      }
      const data = getRecord(root.data);
      const list = Array.isArray(data.list)
        ? (data.list as BidItem[])
        : Array.isArray(root.data)
          ? (root.data as BidItem[])
          : [];
      const totalPages = Number(data.totalPages ?? data.total_pages ?? 0);
      return {
        list: list.map((item) => ({ ...item, source: "yahoo" as const })),
        hasMore:
          list.length > 0 && (targetPage < totalPages || Boolean(data.has_more)),
      };
    },
    [userId, ts, sig, activeStatus],
  );

  const fetchMercari = useCallback(
    async (targetPage: number) => {
      const res = await fetch("/api/support/mercari/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          ts,
          sig,
          bucket: activeStatus,
          page: targetPage,
        }),
      });
      const payload = await res.json().catch(() => null);
      const root = getRecord(payload);
      if (root.code === 101) {
        throw new SignatureError();
      }
      if (root.code !== 0) {
        throw new Error((root.errmsg as string) || "煤炉记录加载失败");
      }
      const data = getRecord(root.data);
      const list = Array.isArray(data.list) ? (data.list as Record<string, unknown>[]) : [];
      const totalPages = Number(data.totalPages ?? data.total_pages ?? 0);
      const mapped: BidItem[] = list.map((raw) => ({
        source: "mercari" as const,
        id: raw.id as number | string | undefined,
        status: raw.status as number | undefined,
        status_txt: raw.status_txt as string | undefined,
        order_id: raw.order_id as string | undefined,
        goods_no: raw.goods_no as string | undefined,
        goods_name: raw.goods_name as string | undefined,
        price: raw.max_bid_jpy as number | undefined,
        create_time: raw.create_time as string | undefined,
      }));
      return {
        list: mapped,
        hasMore:
          mapped.length > 0 && (targetPage < totalPages || Boolean(data.has_more)),
      };
    },
    [userId, ts, sig, activeStatus],
  );

  const loadTab = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const [yahooResult, mercariResult] = await Promise.allSettled([
      fetchYahoo(1),
      fetchMercari(1),
    ]);

    if (
      (yahooResult.status === "rejected" && yahooResult.reason instanceof SignatureError) ||
      (mercariResult.status === "rejected" && mercariResult.reason instanceof SignatureError)
    ) {
      setLoadError("请从客服对话重新进入");
      setItems([]);
      setLoading(false);
      return;
    }

    const errors: string[] = [];
    let merged: BidItem[] = [];
    let nextYahoo: SourceState = { ...INITIAL_SOURCE_STATE };
    let nextMercari: SourceState = { ...INITIAL_SOURCE_STATE };

    if (yahooResult.status === "fulfilled") {
      merged = merged.concat(yahooResult.value.list);
      nextYahoo = { page: 1, hasMore: yahooResult.value.hasMore, errored: false };
    } else {
      nextYahoo = { page: 1, hasMore: false, errored: true };
      errors.push("雅虎记录加载失败");
    }

    if (mercariResult.status === "fulfilled") {
      merged = merged.concat(mercariResult.value.list);
      nextMercari = { page: 1, hasMore: mercariResult.value.hasMore, errored: false };
    } else {
      nextMercari = { page: 1, hasMore: false, errored: true };
      errors.push("煤炉记录加载失败");
    }

    merged.sort((a, b) => parseTime(b.create_time) - parseTime(a.create_time));

    setItems(merged);
    setYahooState(nextYahoo);
    setMercariState(nextMercari);
    setLoadError(errors.join(" / "));
    setLoading(false);
  }, [fetchYahoo, fetchMercari]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const wantYahoo = yahooState.hasMore && !yahooState.errored;
    const wantMercari = mercariState.hasMore && !mercariState.errored;
    const nextYahooPage = yahooState.page + 1;
    const nextMercariPage = mercariState.page + 1;

    const [yahooResult, mercariResult] = await Promise.allSettled([
      wantYahoo ? fetchYahoo(nextYahooPage) : Promise.resolve(null),
      wantMercari ? fetchMercari(nextMercariPage) : Promise.resolve(null),
    ]);

    if (
      (yahooResult.status === "rejected" && yahooResult.reason instanceof SignatureError) ||
      (mercariResult.status === "rejected" && mercariResult.reason instanceof SignatureError)
    ) {
      setLoadError("请从客服对话重新进入");
      setLoadingMore(false);
      return;
    }

    let added: BidItem[] = [];
    let nextYahoo = yahooState;
    let nextMercari = mercariState;
    const errors: string[] = [];

    if (wantYahoo) {
      if (yahooResult.status === "fulfilled" && yahooResult.value) {
        added = added.concat(yahooResult.value.list);
        nextYahoo = { page: nextYahooPage, hasMore: yahooResult.value.hasMore, errored: false };
      } else {
        nextYahoo = { ...yahooState, errored: true };
        errors.push("雅虎记录加载失败");
      }
    }

    if (wantMercari) {
      if (mercariResult.status === "fulfilled" && mercariResult.value) {
        added = added.concat(mercariResult.value.list);
        nextMercari = { page: nextMercariPage, hasMore: mercariResult.value.hasMore, errored: false };
      } else {
        nextMercari = { ...mercariState, errored: true };
        errors.push("煤炉记录加载失败");
      }
    }

    setItems((prev) =>
      [...prev, ...added].sort(
        (a, b) => parseTime(b.create_time) - parseTime(a.create_time),
      ),
    );
    setYahooState(nextYahoo);
    setMercariState(nextMercari);
    if (errors.length) setLoadError(errors.join(" / "));
    setLoadingMore(false);
  }, [fetchYahoo, fetchMercari, yahooState, mercariState]);

  useEffect(() => {
    void loadTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/${lang}/support/h5${originalQuery ? "?" + originalQuery : ""}`);
  }

  const themeAttr = isCandyTheme ? "candy" : undefined;
  const hasMore = yahooState.hasMore || mercariState.hasMore;

  return (
    <div
      className="min-h-screen bg-[#f5f7fb] pb-8"
      data-theme={themeAttr}
      data-testid="support-auction-mine-page"
    >
      {isCandyTheme ? <style>{CANDY_THEME_CSS}</style> : null}

      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-3">
        <button
          type="button"
          className="rounded-full p-1 text-slate-500"
          onClick={goBack}
          aria-label="返回"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 truncate text-sm font-semibold text-slate-800">
          我的竞拍
        </h1>
      </header>

      <div className="flex border-b border-slate-100 bg-white px-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`flex-1 py-2.5 text-sm font-medium ${
              activeTab === tab.key
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-slate-500"
            }`}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`support-auction-mine-tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-slate-400">
          {loadError || "暂无记录"}
        </div>
      ) : (
        <div className="space-y-2 px-3 py-3">
          {loadError ? (
            <p className="px-1 text-xs text-amber-600">{loadError}</p>
          ) : null}
          {items.map((item) => (
            <button
              key={`${item.source}-${item.id ?? item.order_id ?? item.goods_no}`}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left shadow-sm"
              data-source={item.source}
              onClick={() => {
                if (item.source !== "yahoo" || !item.goods_no) return;
                router.push(
                  `/${lang}/support/auction/${encodeURIComponent(item.goods_no)}${
                    originalQuery ? "?" + originalQuery : ""
                  }`,
                );
              }}
              data-testid="support-auction-mine-item"
            >
              <div className="relative h-14 w-14 flex-none">
                {item.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.cover}
                    alt={item.goods_name || "商品图片"}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-md bg-slate-100" />
                )}
                <span
                  className={`absolute left-0 top-0 rounded px-1 text-[10px] text-white ${
                    item.source === "yahoo" ? "bg-blue-600" : "bg-red-500"
                  }`}
                >
                  {item.source === "yahoo" ? "雅虎" : "煤炉"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-800">
                  {item.goods_name || item.goods_no}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.create_time || ""}
                </p>
              </div>
              <div className="flex-none text-right">
                {item.source === "mercari" ? (
                  <p className="text-sm font-semibold text-orange-600">
                    出价上限 ¥{(item.price ?? 0).toLocaleString("ja-JP")}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-orange-600">
                    ¥{(item.price ?? 0).toLocaleString("ja-JP")}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {item.status_txt || ""}
                </p>
              </div>
            </button>
          ))}

          {hasMore ? (
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-slate-200 py-2 text-xs text-slate-500 disabled:opacity-50"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              data-testid="support-auction-mine-load-more"
            >
              {loadingMore ? "加载中…" : "加载更多"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
