import crypto from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * 煤炉竞拍页服务端签名代理：绕开 NestJS mercari-auction 模块（未接线/写 PG，与执行器脑裂），
 * 直连老后台 PHP 的 h5* 端点（`app/api/controller/Mercari.php`）。
 *
 * 鉴权：h5Auth() 逐字一致算法——HMAC-SHA256(uid + '.' + ts, H5_UID_SIGN_SECRET)，
 * 表单字段 user_id/ts/sig，与 Yahoo.php h5Auth 同源（客服 bridge 也用这把密钥）。
 *
 * 身份来源：网站 JWT 的 sub 是 NestJS users.id(uuid)，不是老 uid；老 uid 存在
 * users.legacy_member_uid，本函数打 NestJS GET /api/v1/users/me 取一次。
 */

const DEFAULT_BACKEND_ORIGIN = "https://kangaroo-japan-backend.vercel.app";

function getBackendOrigin(): string {
  return (
    process.env.KANGAROO_JAPAN_BACKEND_ORIGIN ||
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
    DEFAULT_BACKEND_ORIGIN
  ).replace(/\/$/, "");
}

function getLegacyPhpBase(): string {
  return (process.env.LEGACY_PHP_BASE || "https://app.kangaroo-japan.com").replace(
    /\/$/,
    "",
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 从请求 Authorization 头拿 JWT，打 NestJS /users/me 换老后台 uid（legacyMemberUid）。
 * 返回 null 代表：未登录 / token 无效 / 该用户尚未绑定老后台会员（袋鼠君小程序）。
 */
export async function getLegacyUidFromRequest(
  request: NextRequest,
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  try {
    const res = await fetchWithTimeout(
      `${getBackendOrigin()}/api/v1/users/me`,
      { headers: { Authorization: authHeader } },
      8000,
    );
    if (!res.ok) return null;
    const user = await res.json().catch(() => null);
    const uid = user?.legacyMemberUid;
    if (uid === null || uid === undefined) return null;
    const uidStr = String(uid);
    return /^\d+$/.test(uidStr) ? uidStr : null;
  } catch {
    return null;
  }
}

/** h5Auth() 逐字一致：HMAC-SHA256(uid + '.' + ts, secret) */
export function signLegacyH5(uid: string, secret: string, ts = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac("sha256", secret).update(`${uid}.${ts}`).digest("hex");
  return { ts: String(ts), sig };
}

export interface LegacyEnvelope<T = unknown> {
  code: number;
  errmsg: string;
  errcode?: string;
  data?: T;
}

/**
 * 打老后台 h5* 端点（POST 表单）。secret 缺失时直接返回 fail，不发请求
 * （PHP 侧未配置密钥也会拒绝，这里提前短路，避免无意义网络调用）。
 */
export async function callLegacyH5<T = unknown>(
  h5Method: string,
  uid: string,
  extraParams: Record<string, string | number>,
): Promise<{ ok: true; body: LegacyEnvelope<T> } | { ok: false; status: number; message: string }> {
  const secret = process.env.H5_UID_SIGN_SECRET || "";
  if (!secret) {
    return { ok: false, status: 500, message: "H5_UID_SIGN_SECRET not configured" };
  }
  const { ts, sig } = signLegacyH5(uid, secret);
  const form = new URLSearchParams({
    user_id: uid,
    ts,
    sig,
    ...Object.fromEntries(Object.entries(extraParams).map(([k, v]) => [k, String(v)])),
  });

  try {
    const res = await fetchWithTimeout(`${getLegacyPhpBase()}/api/mercari/${h5Method}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const body = (await res.json().catch(() => null)) as LegacyEnvelope<T> | null;
    if (!body) {
      return { ok: false, status: 502, message: "legacy backend returned non-JSON" };
    }
    return { ok: true, body };
  } catch (error) {
    return {
      ok: false,
      status: 504,
      message: error instanceof Error ? error.message : "legacy backend unreachable",
    };
  }
}

/** goods_url → goods_no（mercari item id，形如 mNNNNNNNNNNN）。解不出返回 null。 */
export function parseGoodsNoFromUrl(url: string): string | null {
  const match = url.match(/\/item\/(m\d+)/) || url.match(/\b(m\d{9,13})\b/);
  return match ? match[1] : null;
}

/** 数字状态码 <-> 字符串状态名，与 app/common/model/MercariAuctionBids.php STATUS_CODE 逐字一致。 */
const STATUS_CODE: Record<string, number> = {
  pending_deposit: 0,
  bidding: 1,
  leading: 2,
  outbid: 3,
  won_unpaid: 4,
  won_paid: 5,
  lost: 6,
  ended_early: 7,
  cancel_requested: 8,
  cancelled: 9,
};
const STATUS_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(STATUS_CODE).map(([name, code]) => [code, name]),
);

export function legacyStatusCodeToName(code: number): string {
  return STATUS_NAME[code] ?? String(code);
}
