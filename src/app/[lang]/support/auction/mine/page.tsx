"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";

import { CANDY_THEME_CSS } from "../../candy-theme";

type BidItem = {
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
// 其它（约定 2）=中标。此映射按施工单契约文字推断，若老后台实际用别的值，
// 只需改这里的 STATUS_TABS。
const STATUS_TABS: { key: string; label: string; status: number }[] = [
  { key: "bidding", label: "竞拍中", status: 0 },
  { key: "won", label: "已中标", status: 2 },
  { key: "ended", label: "已结束", status: 3 },
];

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
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BidItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const activeStatus =
    STATUS_TABS.find((tab) => tab.key === activeTab)?.status ?? 0;

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
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
          setLoadError("请从客服对话重新进入");
          return;
        }
        if (root.code !== 0) {
          setLoadError((root.errmsg as string) || "加载失败，请重试");
          return;
        }
        const data = getRecord(root.data);
        const list = Array.isArray(data.list)
          ? (data.list as BidItem[])
          : Array.isArray(root.data)
            ? (root.data as BidItem[])
            : [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length > 0 && Boolean(data.has_more));
        setLoadError("");
        setPage(targetPage);
      } catch {
        setLoadError("网络异常，请重试");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, ts, sig, activeStatus],
  );

  useEffect(() => {
    setItems([]);
    void loadPage(1, false);
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
      ) : loadError ? (
        <div className="px-4 py-16 text-center text-sm text-slate-500">
          {loadError}
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-slate-400">
          暂无记录
        </div>
      ) : (
        <div className="space-y-2 px-3 py-3">
          {items.map((item) => (
            <button
              key={item.id ?? item.order_id ?? item.goods_no}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left shadow-sm"
              onClick={() => {
                if (!item.goods_no) return;
                router.push(
                  `/${lang}/support/auction/${encodeURIComponent(item.goods_no)}${
                    originalQuery ? "?" + originalQuery : ""
                  }`,
                );
              }}
              data-testid="support-auction-mine-item"
            >
              {item.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.cover}
                  alt={item.goods_name || "商品图片"}
                  className="h-14 w-14 flex-none rounded-md object-cover"
                />
              ) : (
                <div className="h-14 w-14 flex-none rounded-md bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-800">
                  {item.goods_name || item.goods_no}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.create_time || ""}
                </p>
              </div>
              <div className="flex-none text-right">
                <p className="text-sm font-semibold text-orange-600">
                  ¥{(item.price ?? 0).toLocaleString("ja-JP")}
                </p>
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
              onClick={() => loadPage(page + 1, true)}
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
