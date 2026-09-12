type SearchParamReader = {
  get(name: string): string | null;
};

const NUMERIC_UID_PATTERN = /^\d+$/;

export function getNumericH5UserId(searchParams: SearchParamReader) {
  const rawUserId = searchParams.get("user_id") || searchParams.get("uid") || "";
  const userId = rawUserId.trim();
  return NUMERIC_UID_PATTERN.test(userId) ? userId : undefined;
}

export function getH5UidSignature(searchParams: SearchParamReader) {
  const ts = searchParams.get("ts")?.trim() || undefined;
  const sig = searchParams.get("sig")?.trim() || undefined;
  return { ts, sig };
}

export type H5App = "legacy" | "candy" | "ripai";

// 客服 H5 由三个小程序打开：老版（legacy）、candy 版、袋鼠君日淘（ripai，皮肤/
// 审核开关按 candy 走，但包是旧包，没有 candy 的 /pages/pay/cashier 押金充值页，
// 只有 legacy 那套 /pages/daishujun/mine/deposit）。老后台 getkefu 带
// `app=legacy|candy|ripai` 参数；缺省时按现有 `theme=candy` 换肤参数推断，其余
// （含无参数的老小程序）一律按 legacy 处理，零回归。
export function getH5App(searchParams: SearchParamReader): H5App {
  const rawApp = searchParams.get("app")?.trim();
  if (rawApp === "legacy" || rawApp === "candy" || rawApp === "ripai") return rawApp;
  return searchParams.get("theme") === "candy" ? "candy" : "legacy";
}

// 皮肤/审核开关等按 candy 换肤逻辑判断的地方用这个：candy 和 ripai（日淘）都算
// candy 皮肤，但押金充值页跳转不算（ripai 没有 cashier 页，见下）。
export function isCandySkinApp(h5App: H5App): boolean {
  return h5App === "candy" || h5App === "ripai";
}

// candy 包没有 legacy 那个押金充值页，充值页是 /pages/pay/cashier（uni-app 页，
// onLoad 读 from/type/money，type=deposit 为押金充值）；legacy 包没有 cashier 页。
// ripai（日淘）虽然皮肤/审核开关按 candy 走，但包是旧包，也没有 cashier 页，
// 押金充值要走 legacyPath。
// 两页（auction/mine、h5）押金充值跳转按 h5App 二选一，legacy 分支的具体 path/兜底
// 各页自己算（历史默认值不同），这里只统一 candy 分支。
export const CANDY_DEPOSIT_RECHARGE_PAGE_PATH =
  process.env.NEXT_PUBLIC_CANDY_DEPOSIT_RECHARGE_PAGE_PATH || "/pages/pay/cashier";

export function getDepositRechargePagePath(h5App: H5App, legacyPath: string): string {
  return h5App === "candy" ? CANDY_DEPOSIT_RECHARGE_PAGE_PATH : legacyPath;
}
