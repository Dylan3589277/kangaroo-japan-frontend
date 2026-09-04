"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { CANDY_THEME_CSS } from "../../candy-theme";

type MiniProgramWindow = Window & {
  wx?: { miniProgram?: { navigateTo?: (opts: { url: string }) => void } };
};

function isMiniProgramWebview() {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  return Boolean(win.wx?.miniProgram?.navigateTo);
}

function navigateToMiniProgramDepositPay(moneyRmb: number) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  const money = Math.max(1, Math.round(moneyRmb) || 1);
  win.wx.miniProgram.navigateTo({
    url: "/pages/daishujun/index/pay?type=deposit&money=" + money,
  });
  return true;
}

type DepositInfo = {
  state?: string;
  balance_rmb?: number;
  locked_jpy?: number;
  max_bid_allowed_jpy?: number;
  suggest_recharge_rmb?: number;
};

type AuctionDetail = {
  goods_name?: string;
  imgurls?: string[];
  bid_price?: number;
  bid_price_rmb?: string;
  fastprice?: number;
  fastprice_rmb?: string;
  left_time?: string;
  left_timestamp?: number;
  end_time?: string;
  end_timestamp?: number;
  bid_num?: number;
  seller?: string;
  seller_address?: string;
  rate_num?: number;
  rate_percent?: string;
  extras?: Array<{ name: string; value: string }>;
  content?: string;
  url?: string;
  deposit?: DepositInfo;
};

function getRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stripHtml(html?: string) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatCountdown(leftSeconds: number) {
  if (leftSeconds <= 0) return "已结束";
  const d = Math.floor(leftSeconds / 86400);
  const h = Math.floor((leftSeconds % 86400) / 3600);
  const m = Math.floor((leftSeconds % 3600) / 60);
  const s = Math.floor(leftSeconds % 60);
  if (d > 0) return `${d}天${h}时${m}分`;
  if (h > 0) return `${h}时${m}分${s}秒`;
  return `${m}分${s}秒`;
}

export default function SupportAuctionDetailPage() {
  const params = useParams<{ lang?: string; id?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = params?.lang || "zh";
  const itemId = params?.id || "";
  const userId = searchParams.get("user_id") || "";
  const ts = searchParams.get("ts") || "";
  const sig = searchParams.get("sig") || "";
  const isCandyTheme = searchParams.get("theme") === "candy";
  const goodsNameZh = searchParams.get("zh") || "";

  const originalQuery = useMemo(() => {
    const qs = new URLSearchParams();
    if (userId) qs.set("user_id", userId);
    if (ts) qs.set("ts", ts);
    if (sig) qs.set("sig", sig);
    if (isCandyTheme) qs.set("theme", "candy");
    return qs.toString();
  }, [userId, ts, sig, isCandyTheme]);

  const [detail, setDetail] = useState<AuctionDetail | null>(null);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const [bidPanelOpen, setBidPanelOpen] = useState(false);
  const [bidAmountInput, setBidAmountInput] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState("");
  const [buyoutLoading, setBuyoutLoading] = useState(false);

  const signBody = useCallback(
    (extra: Record<string, unknown>) => ({
      user_id: userId,
      ts,
      sig,
      ...extra,
    }),
    [userId, ts, sig],
  );

  const loadDetail = useCallback(
    async (silent?: boolean) => {
      if (!itemId) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/support/yahoo/detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(signBody({ id: itemId })),
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
        setDetail(root.data as AuctionDetail);
        setFetchedAt(Date.now());
        setLoadError("");
      } catch {
        setLoadError("网络异常，请重试");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [itemId, signBody],
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  // 每 30s 静默刷新（仅页面可见时）。
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void loadDetail(true);
    }, 30_000);
    return () => clearInterval(timer);
  }, [loadDetail]);

  // 本地倒计时 tick。
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const leftSeconds = useMemo(() => {
    if (!detail?.end_timestamp && detail?.left_timestamp === undefined) return undefined;
    if (detail?.end_timestamp) {
      return Math.floor(detail.end_timestamp - now / 1000);
    }
    const elapsed = Math.floor((now - fetchedAt) / 1000);
    return Math.max(0, (detail?.left_timestamp ?? 0) - elapsed);
  }, [detail, now, fetchedAt]);

  const isEnded = leftSeconds !== undefined && leftSeconds <= 0;
  function openBidPanel() {
    const defaultAmount = (detail?.bid_price ?? 0) + 10;
    setBidAmountInput(String(defaultAmount));
    setAgreed(false);
    setBidError("");
    setBidPanelOpen(true);
  }

  async function submitBid() {
    const amount = Number(bidAmountInput);
    if (!Number.isInteger(amount) || amount <= 0) {
      setBidError("请输入正确的整数金额");
      return;
    }
    if (!agreed) {
      setBidError("请先阅读并勾选竞拍协议");
      return;
    }
    setBidding(true);
    setBidError("");
    try {
      const res = await fetch("/api/support/yahoo/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signBody({ goods_no: itemId, money: amount })),
      });
      const payload = await res.json().catch(() => null);
      const root = getRecord(payload);
      if (root.code !== 0) {
        setBidError((root.errmsg as string) || "出价失败，请重试");
        return;
      }
      toast.success("出价成功");
      setConfirmOpen(false);
      setBidPanelOpen(false);
      void loadDetail(true);
    } catch {
      setBidError("网络异常，请重试");
    } finally {
      setBidding(false);
    }
  }

  async function doBuyout() {
    if (!itemId || buyoutLoading) return;
    setBuyoutLoading(true);
    try {
      const buyoutRes = await fetch("/api/support/yahoo/buyout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signBody({ id: itemId })),
      });
      const buyoutPayload = await buyoutRes.json().catch(() => null);
      const buyoutRoot = getRecord(buyoutPayload);
      if (buyoutRoot.code !== 0) {
        toast.error((buyoutRoot.errmsg as string) || "下单失败，请重试");
        return;
      }
      const buyoutData = getRecord(buyoutRoot.data);
      if (buyoutData.action === "contact_kefu") {
        toast.error((buyoutData.reason as string) || "该商品需联系客服下单");
        return;
      }
      const orderId = buyoutData.order_id;
      if (!orderId) {
        toast.error("下单失败，请重试");
        return;
      }

      // 建单成功后单独发起收款（两步：与代购下单/收款分离的现成模式一致），
      // 收款发起失败时订单已建，引导去待支付页而不是报错。
      const payRes = await fetch("/api/support/yahoo/buypay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signBody({ order_id: orderId })),
      });
      const payPayload = await payRes.json().catch(() => null);
      const payRoot = getRecord(payPayload);
      const payData = getRecord(payRoot.data);
      const payUrl = payData.pay_url as string | undefined;
      if (payRoot.code === 0 && payUrl) {
        window.location.href = payUrl;
        return;
      }
      toast.warning("下单成功，收款发起失败，请稍后在订单中重试支付");
    } catch {
      toast.error("网络异常，请重试");
    } finally {
      setBuyoutLoading(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/${lang}/support/h5${originalQuery ? "?" + originalQuery : ""}`);
  }

  function goDepositRecharge() {
    const suggest = detail?.deposit?.suggest_recharge_rmb ?? 1;
    if (navigateToMiniProgramDepositPay(suggest)) return;
    toast.error("请在袋鼠君小程序内充值");
  }

  const themeAttr = isCandyTheme ? "candy" : undefined;

  return (
    <div
      className="min-h-screen bg-[#f5f7fb] pb-28"
      data-theme={themeAttr}
      data-testid="support-auction-detail-page"
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
          商品详情
        </h1>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-orange-200 px-2 py-1 text-xs font-medium text-orange-600"
          onClick={() =>
            router.push(
              `/${lang}/support/auction/mine${originalQuery ? "?" + originalQuery : ""}`,
            )
          }
          data-testid="support-auction-mine-entry"
        >
          <ListChecks className="h-3.5 w-3.5" />
          我的竞拍
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="px-4 py-16 text-center text-sm text-slate-500">
          {loadError}
        </div>
      ) : detail ? (
        <div className="px-3 py-3">
          {detail.imgurls && detail.imgurls.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto rounded-lg" data-testid="support-auction-carousel">
              {detail.imgurls.map((url, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={idx}
                  src={url}
                  alt={detail.goods_name || "商品图片"}
                  className="h-48 w-48 flex-none rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}

          <div className="mt-3 rounded-lg bg-white p-3 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">
              {detail.goods_name}
            </h2>
            {goodsNameZh ? (
              <p className="mt-1 text-xs text-slate-400">{goodsNameZh}</p>
            ) : null}

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-orange-600">
                ¥{(detail.bid_price ?? 0).toLocaleString("ja-JP")}
              </span>
              {detail.bid_price_rmb ? (
                <span className="text-xs text-slate-400">
                  ≈¥{detail.bid_price_rmb} 元
                </span>
              ) : null}
            </div>
            {detail.fastprice ? (
              <p className="mt-1 text-xs text-slate-500">
                即決价 ¥{detail.fastprice.toLocaleString("ja-JP")}
                {detail.fastprice_rmb ? ` (≈¥${detail.fastprice_rmb} 元)` : ""}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span data-testid="support-auction-countdown">
                剩余：{leftSeconds !== undefined ? formatCountdown(leftSeconds) : detail.left_time || "—"}
              </span>
              <span>出价数：{detail.bid_num ?? 0}</span>
            </div>

            <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
              <p>卖家：{detail.seller || "—"}{detail.seller_address ? ` (${detail.seller_address})` : ""}</p>
              {detail.rate_percent ? (
                <p className="mt-1">评价：{detail.rate_percent}（{detail.rate_num ?? 0} 条）</p>
              ) : null}
            </div>

            {Array.isArray(detail.extras) && detail.extras.length > 0 ? (
              <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                {detail.extras.map((row, idx) => (
                  <p key={`${row.name}-${idx}`} className="flex justify-between py-0.5">
                    <span className="text-slate-400">{row.name}</span>
                    <span>{row.value}</span>
                  </p>
                ))}
              </div>
            ) : null}

            {detail.content ? (
              <div className="mt-2 whitespace-pre-wrap border-t border-slate-100 pt-2 text-xs leading-5 text-slate-600">
                {stripHtml(detail.content)}
              </div>
            ) : null}
          </div>

          <div className="mt-3 rounded-lg bg-white p-3 shadow-sm" data-testid="support-auction-deposit-bar">
            {detail.deposit?.state === "ok" ? (
              <p className="text-xs text-slate-600">
                押金余额 ¥{detail.deposit.balance_rmb ?? 0}，可出价上限 ¥
                {(detail.deposit.max_bid_allowed_jpy ?? 0).toLocaleString("ja-JP")}
              </p>
            ) : detail.deposit?.state === "insufficient" ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-red-500">
                  押金不足，建议充值 ¥{detail.deposit.suggest_recharge_rmb ?? 0} 元
                </p>
                {isMiniProgramWebview() ? (
                  <button
                    type="button"
                    className="flex-none rounded-md bg-orange-500 px-2.5 py-1.5 text-xs font-medium text-white"
                    onClick={goDepositRecharge}
                  >
                    去充押金
                  </button>
                ) : (
                  <span className="flex-none text-xs text-slate-400">
                    请在袋鼠君小程序内充值
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">押金信息暂不可用</p>
            )}
          </div>
        </div>
      ) : null}

      {detail ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white px-3 py-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {isEnded ? (
            <button
              type="button"
              className="w-full rounded-md bg-orange-200 py-3 text-sm font-semibold text-white"
              disabled
              data-testid="support-auction-buyout-btn"
            >
              竞拍已结束
            </button>
          ) : detail.bid_price && detail.fastprice ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="w-1/2 rounded-md bg-slate-800 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
                onClick={openBidPanel}
                data-testid="support-auction-open-bid-btn"
              >
                出价
              </button>
              <button
                type="button"
                className="w-1/2 rounded-md bg-orange-500 py-3 text-sm font-semibold text-white disabled:bg-orange-200"
                onClick={doBuyout}
                disabled={buyoutLoading}
                data-testid="support-auction-buyout-btn"
              >
                {buyoutLoading
                  ? "处理中…"
                  : `即決价直接买 ¥${detail.fastprice.toLocaleString("ja-JP")}`}
              </button>
            </div>
          ) : detail.fastprice ? (
            <button
              type="button"
              className="w-full rounded-md bg-orange-500 py-3 text-sm font-semibold text-white disabled:bg-orange-200"
              onClick={doBuyout}
              disabled={buyoutLoading}
              data-testid="support-auction-buyout-btn"
            >
              {buyoutLoading
                ? "处理中…"
                : `即決价直接买 ¥${detail.fastprice.toLocaleString("ja-JP")}`}
            </button>
          ) : (
            <button
              type="button"
              className="w-full rounded-md bg-orange-500 py-3 text-sm font-semibold text-white disabled:bg-orange-200"
              onClick={openBidPanel}
              data-testid="support-auction-open-bid-btn"
            >
              出价
            </button>
          )}
        </div>
      ) : null}

      {bidPanelOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => {
            if (!bidding) setBidPanelOpen(false);
          }}
          data-testid="support-auction-bid-panel-backdrop"
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-lg"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            onClick={(event) => event.stopPropagation()}
            data-testid="support-auction-bid-panel"
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-800">出价</h3>
            <p className="mb-2 text-xs text-slate-500">
              现价 ¥{(detail?.bid_price ?? 0).toLocaleString("ja-JP")}
            </p>
            <input
              type="text"
              inputMode="numeric"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={bidAmountInput}
              onChange={(e) =>
                setBidAmountInput(e.target.value.replace(/[^\d]/g, ""))
              }
              data-testid="support-auction-bid-amount-input"
            />
            <div className="mt-2 flex gap-2">
              {[100, 500, 1000].map((step) => (
                <button
                  key={step}
                  type="button"
                  className="rounded-md border border-orange-200 px-2.5 py-1 text-xs font-medium text-orange-600"
                  onClick={() =>
                    setBidAmountInput((prev) =>
                      String((Number(prev) || 0) + step),
                    )
                  }
                >
                  +{step}
                </button>
              ))}
            </div>

            <label className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                data-testid="support-auction-bid-agree-checkbox"
              />
              <span>
                我已阅读并同意
                <a
                  href="https://app.kangaroo-japan.com/agreement/yahoo_auction"
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-600 underline"
                >
                  《雅虎竞拍协议》
                </a>
                ，出价成功后不可撤销
              </span>
            </label>

            {bidError ? (
              <p className="mt-2 text-xs text-red-500">{bidError}</p>
            ) : null}

            <button
              type="button"
              className="mt-3 w-full rounded-md bg-orange-500 py-2.5 text-sm font-semibold text-white disabled:bg-orange-200"
              onClick={() => {
                const amount = Number(bidAmountInput);
                if (!Number.isInteger(amount) || amount <= 0) {
                  setBidError("请输入正确的整数金额");
                  return;
                }
                if (!agreed) {
                  setBidError("请先阅读并勾选竞拍协议");
                  return;
                }
                setBidError("");
                setConfirmOpen(true);
              }}
              data-testid="support-auction-bid-submit-btn"
            >
              确认出价
            </button>
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6"
          onClick={() => {
            if (!bidding) setConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-xs rounded-xl bg-white p-4 text-center shadow-lg"
            onClick={(event) => event.stopPropagation()}
            data-testid="support-auction-bid-confirm-dialog"
          >
            <p className="text-sm text-slate-700">
              确认以 ¥{Number(bidAmountInput || 0).toLocaleString("ja-JP")} 出价？
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border border-slate-200 py-2 text-sm text-slate-600"
                onClick={() => setConfirmOpen(false)}
                disabled={bidding}
              >
                取消
              </button>
              <button
                type="button"
                className="flex-1 rounded-md bg-orange-500 py-2 text-sm font-semibold text-white disabled:bg-orange-200"
                onClick={submitBid}
                disabled={bidding}
                data-testid="support-auction-bid-confirm-btn"
              >
                {bidding ? "提交中…" : "确认"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
