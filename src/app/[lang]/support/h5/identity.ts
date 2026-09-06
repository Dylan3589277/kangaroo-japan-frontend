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

export type H5App = "legacy" | "candy";

// 客服 H5 由两个小程序打开：老版（legacy）和 candy 版。老后台 getkefu 即将带
// `app=legacy|candy` 参数；缺省时按现有 `theme=candy` 换肤参数推断，其余（含无
// 参数的老小程序）一律按 legacy 处理，零回归。
export function getH5App(searchParams: SearchParamReader): H5App {
  const rawApp = searchParams.get("app")?.trim();
  if (rawApp === "legacy" || rawApp === "candy") return rawApp;
  return searchParams.get("theme") === "candy" ? "candy" : "legacy";
}
