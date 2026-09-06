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

type DepositRecord = {
  alipay_no?: string;
  alipay_realname?: string;
  status?: number | string;
  money?: number | string;
  result?: string;
  type?: string;
  create_time?: number | string;
  type_txt?: string;
  status_txt?: string;
};

function formatRmb(value: number | string | undefined): string {
  const n = Number(value ?? 0);
  return `¥${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function formatDepositTime(value: number | string | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(value);
  if (Number.isFinite(n) && String(value).trim() !== "" && /^\d+$/.test(String(value).trim())) {
    const d = new Date(n * 1000);
    if (!Number.isNaN(d.getTime())) {
      const pad = (x: number) => String(x).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
        d.getHours(),
      )}:${pad(d.getMinutes())}`;
    }
  }
  return String(value);
}

function maskAlipayNo(value?: string): string {
  if (!value) return "";
  if (value.length <= 4) return value;
  const head = value.slice(0, 2);
  const tail = value.slice(-2);
  return `${head}${"*".repeat(Math.max(3, value.length - 4))}${tail}`;
}

const WX_JSSDK_URL = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";

function loadJweixin(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if ((window as unknown as { wx?: unknown }).wx) return resolve();
    const script = document.createElement("script");
    script.src = WX_JSSDK_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("jweixin load failed"));
    document.head.appendChild(script);
  });
}

function isInMiniProgram(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __wxjs_environment?: string };
  if (w.__wxjs_environment === "miniprogram") return true;
  return /miniProgram/i.test(navigator.userAgent);
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
  const rawApp = searchParams.get("app");
  const h5App = rawApp === "candy" || (rawApp !== "legacy" && isCandyTheme) ? "candy" : "legacy";

  const originalQuery = useMemo(() => {
    const qs = new URLSearchParams();
    if (userId) qs.set("user_id", userId);
    if (ts) qs.set("ts", ts);
    if (sig) qs.set("sig", sig);
    if (isCandyTheme) qs.set("theme", "candy");
    qs.set("app", h5App);
    return qs.toString();
  }, [userId, ts, sig, isCandyTheme, h5App]);

  const [activeTab, setActiveTab] = useState<string>(STATUS_TABS[0].key);
  const [depositBalance, setDepositBalance] = useState<number>(0);
  const [depositRefundCount, setDepositRefundCount] = useState<number>(0);
  const [depositTipList, setDepositTipList] = useState<string[]>([]);
  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refundMsg, setRefundMsg] = useState("");
  const [refundAlipayNo, setRefundAlipayNo] = useState("");
  const [refundAlipayName, setRefundAlipayName] = useState("");
  const [refundMoney, setRefundMoney] = useState("");
  const [rechargeMsg, setRechargeMsg] = useState("");
  const [items, setItems] = useState<BidItem[]>([]);
  const [yahooState, setYahooState] = useState<SourceState>(INITIAL_SOURCE_STATE);
  const [mercariState, setMercariState] = useState<SourceState>(INITIAL_SOURCE_STATE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

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
      const mapped: BidItem[] = list.map((raw) => {
        const image = raw.goods_image;
        const cover =
          typeof image === "string" && /^https?:\/\//.test(image) ? image : undefined;
        return {
          source: "mercari" as const,
          id: raw.id as number | string | undefined,
          status: raw.status as number | undefined,
          status_txt: raw.status_txt as string | undefined,
          order_id: raw.order_id as string | undefined,
          goods_no: raw.goods_no as string | undefined,
          goods_name: raw.goods_name as string | undefined,
          cover,
          price: raw.max_bid_jpy as number | undefined,
          create_time: raw.create_time as string | undefined,
        };
      });
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
    if (activeTab === "deposit") return;
    void loadTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchDepositBalance = useCallback(async () => {
    const res = await fetch("/api/support/deposit/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ts, sig }),
    });
    const payload = await res.json().catch(() => null);
    const root = getRecord(payload);
    if (root.code === 101) throw new SignatureError();
    if (root.code !== 0) throw new Error((root.errmsg as string) || "押金信息加载失败");
    const data = getRecord(root.data);
    const balance = Number(data.deposit ?? 0);
    setDepositBalance(Number.isFinite(balance) ? balance : 0);
    setDepositRefundCount(Number(data.refund_count ?? 0));
    setDepositTipList(Array.isArray(data.tipList) ? (data.tipList as string[]) : []);
    return Number.isFinite(balance) ? balance : 0;
  }, [userId, ts, sig]);

  const fetchDepositRecords = useCallback(async () => {
    const res = await fetch("/api/support/deposit/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ts, sig }),
    });
    const payload = await res.json().catch(() => null);
    const root = getRecord(payload);
    if (root.code === 101) throw new SignatureError();
    if (root.code !== 0) throw new Error((root.errmsg as string) || "押金明细加载失败");
    const data = getRecord(root.data);
    const list = Array.isArray(data.list) ? (data.list as DepositRecord[]) : [];
    return list;
  }, [userId, ts, sig]);

  const loadDepositTab = useCallback(async () => {
    setDepositLoading(true);
    setDepositError("");
    try {
      const [balance, list] = await Promise.all([
        fetchDepositBalance(),
        fetchDepositRecords(),
      ]);
      setDepositRecords(list);
      if (!refundMoney) setRefundMoney(balance ? balance.toFixed(2) : "");
    } catch (err) {
      if (err instanceof SignatureError) {
        setDepositError("身份已过期，请从小程序重新打开");
      } else {
        setDepositError(err instanceof Error ? err.message : "押金信息加载失败");
      }
    } finally {
      setDepositLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDepositBalance, fetchDepositRecords]);

  useEffect(() => {
    if (activeTab !== "deposit") return;
    void loadDepositTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "deposit") return;
    function onVisible() {
      if (document.visibilityState === "visible") void loadDepositTab();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function submitRefund() {
    setRefundSubmitting(true);
    setRefundMsg("");
    try {
      const res = await fetch("/api/support/deposit/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          ts,
          sig,
          alipay_no: refundAlipayNo,
          alipay_realname: refundAlipayName,
          money: refundMoney,
        }),
      });
      const payload = await res.json().catch(() => null);
      const root = getRecord(payload);
      if (root.code === 101) {
        setRefundMsg("身份已过期，请从小程序重新打开");
      } else if (root.code === 0) {
        const data = getRecord(root.data);
        setRefundMsg(
          (data.msg as string) || (root.errmsg as string) || "退款申请已提交",
        );
        void loadDepositTab();
      } else {
        setRefundMsg((root.errmsg as string) || "申请失败，请稍后重试");
      }
    } catch {
      setRefundMsg("网络异常，请稍后重试");
    } finally {
      setRefundSubmitting(false);
      setRefundConfirmOpen(false);
    }
  }

  async function handleRecharge() {
    setRechargeMsg("");
    if (!isInMiniProgram()) {
      setRechargeMsg("请在小程序内打开后充值");
      return;
    }
    try {
      const w = window as unknown as {
        wx?: { miniProgram?: { navigateTo: (opts: { url: string }) => void } };
      };
      if (!w.wx?.miniProgram) {
        await loadJweixin();
      }
      const w2 = window as unknown as {
        wx?: { miniProgram?: { navigateTo: (opts: { url: string }) => void } };
      };
      if (w2.wx?.miniProgram) {
        w2.wx.miniProgram.navigateTo({ url: "/pages/pay/cashier?from=h5deposit" });
      } else {
        setRechargeMsg("请在小程序内打开后充值");
      }
    } catch {
      setRechargeMsg("请在小程序内打开后充值");
    }
  }

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
        <button
          type="button"
          className={`flex-1 py-2.5 text-sm font-medium ${
            activeTab === "deposit"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-slate-500"
          }`}
          onClick={() => setActiveTab("deposit")}
          data-testid="support-auction-mine-tab-deposit"
        >
          押金
        </button>
      </div>

      {activeTab === "deposit" ? (
        <div className="space-y-3 px-3 py-3">
          {depositLoading ? (
            <div className="flex justify-center py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">押金余额</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">
                  {formatRmb(depositBalance)}
                </p>
                {depositRefundCount ? (
                  <p className="mt-1 text-xs text-slate-400">
                    已退款次数 {depositRefundCount}
                  </p>
                ) : null}
                {depositTipList.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-amber-600">
                    {depositTipList.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                ) : null}
                {depositError ? (
                  <p className="mt-2 text-xs text-red-500">{depositError}</p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-orange-500 py-2 text-sm font-medium text-orange-600 disabled:opacity-50"
                    onClick={() => void handleRecharge()}
                    data-testid="support-deposit-recharge-button"
                  >
                    充值
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-md bg-orange-500 py-2 text-sm font-medium text-white disabled:opacity-50"
                    onClick={() => setRefundConfirmOpen(true)}
                    disabled={refundSubmitting || !depositBalance}
                    data-testid="support-deposit-refund-button"
                  >
                    申请退款
                  </button>
                </div>
                {rechargeMsg ? (
                  <p className="mt-2 text-xs text-slate-500">{rechargeMsg}</p>
                ) : null}
                {refundMsg ? (
                  <p className="mt-2 text-xs text-slate-500">{refundMsg}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="px-1 text-xs text-slate-400">明细</p>
                {depositRecords.length === 0 ? (
                  <div className="rounded-lg bg-white px-4 py-8 text-center text-sm text-slate-400 shadow-sm">
                    暂无记录
                  </div>
                ) : (
                  depositRecords.map((record, idx) => (
                    <div
                      key={`${record.alipay_no || ""}-${record.create_time || idx}`}
                      className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                      data-testid="support-deposit-record-item"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800">
                          {record.type_txt || "记录"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDepositTime(record.create_time)}
                        </p>
                        {record.alipay_no ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {maskAlipayNo(record.alipay_no)}
                          </p>
                        ) : null}
                        {record.result ? (
                          <p className="mt-1 text-xs text-slate-400">{record.result}</p>
                        ) : null}
                      </div>
                      <div className="flex-none text-right">
                        <p className="text-sm font-semibold text-orange-600">
                          {formatRmb(record.money)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {record.status_txt || ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {refundConfirmOpen ? (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-6">
              <div className="w-full max-w-xs rounded-lg bg-white p-4">
                <p className="text-sm font-medium text-slate-800">申请退还押金</p>
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    inputMode="text"
                    placeholder="支付宝账号"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={refundAlipayNo}
                    onChange={(e) => setRefundAlipayNo(e.target.value)}
                    data-testid="support-deposit-refund-alipay-no"
                  />
                  <input
                    type="text"
                    placeholder="支付宝实名"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={refundAlipayName}
                    onChange={(e) => setRefundAlipayName(e.target.value)}
                    data-testid="support-deposit-refund-alipay-name"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={depositBalance}
                    placeholder="退款金额"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={refundMoney}
                    onChange={(e) => setRefundMoney(e.target.value)}
                    data-testid="support-deposit-refund-money"
                  />
                </div>
                <p className="mt-3 text-sm text-slate-800">
                  确认申请退还押金 {formatRmb(refundMoney)}？
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-slate-200 py-2 text-sm text-slate-600"
                    onClick={() => setRefundConfirmOpen(false)}
                    disabled={refundSubmitting}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-md bg-orange-500 py-2 text-sm text-white disabled:opacity-50"
                    onClick={() => void submitRefund()}
                    disabled={
                      refundSubmitting ||
                      !refundAlipayNo ||
                      !refundAlipayName ||
                      !refundMoney ||
                      Number(refundMoney) <= 0 ||
                      Number(refundMoney) > depositBalance
                    }
                    data-testid="support-deposit-refund-confirm"
                  >
                    {refundSubmitting ? "提交中…" : "确认申请"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-slate-400">
          {loadError || "暂无记录"}
        </div>
      ) : (
        <div className="space-y-2 px-3 py-3">
          <p className="px-1 pb-1 text-xs text-slate-500">
            <a href={`/${lang}/mnp`} className="underline underline-offset-2">
              绑定公众号可免费收到被超提醒
            </a>
          </p>
          {loadError ? (
            <p className="px-1 text-xs text-amber-600">{loadError}</p>
          ) : null}
          {items.map((item) => {
            const itemKey = `${item.source}-${item.id ?? item.order_id ?? item.goods_no}`;
            const showCover = Boolean(item.cover) && !brokenImages.has(itemKey);
            return (
            <button
              key={itemKey}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left shadow-sm"
              data-source={item.source}
              onClick={() => {
                if (item.source === "yahoo") {
                  if (!item.goods_no) return;
                  router.push(
                    `/${lang}/support/auction/${encodeURIComponent(item.goods_no)}${
                      originalQuery ? "?" + originalQuery : ""
                    }`,
                  );
                  return;
                }
                if (!item.id) return;
                router.push(
                  `/${lang}/support/auction/mercari/${encodeURIComponent(String(item.id))}${
                    originalQuery ? "?" + originalQuery : ""
                  }`,
                );
              }}
              data-testid="support-auction-mine-item"
            >
              <div className="relative h-14 w-14 flex-none">
                {showCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.cover}
                    alt={item.goods_name || "商品图片"}
                    className="h-14 w-14 rounded-md object-cover"
                    onError={() =>
                      setBrokenImages((prev) => new Set(prev).add(itemKey))
                    }
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
            );
          })}

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
