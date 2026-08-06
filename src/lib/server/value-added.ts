/**
 * 服务端取增值服务价目表（老后台 `st_value_added` 表），供 `/fee-calculator` 页
 * 下单可选服务（order）+ 出库打包服务（ship）两组多选 UI 使用。
 *
 * 端点 `GET https://app.kangaroo-japan.com/api/index/valueadded` 无需鉴权、纯只读，
 * `price` 已是 JPY 整数。老后台「系统配置-常量配置-增值服务价格」Tab 改价立即生效、
 * 后端自身无缓存。
 *
 * 缓存策略（花哥 2026-08-07 拍板）：**每天只刷新两次，卡在 JST 09:01 与 19:01**，
 * 不用 `no-store`、也不用固定间隔。原因是后台价目/汇率的人工变更就发生在这两个时刻
 * ——客服每天 JST 19:00 把会员汇率切成夜间价、次日早上再切回来（实测 `st_user_levels`
 * 三档改动时间戳 2026-08-06 19:00:30/:35/:40 JST，且老后台代码里没有任何自动切换逻辑）。
 * 既然一天只变两次，就没必要按固定间隔反复回源：**老后台是脆弱生产库**（阿里云老 PHP，
 * 历史上被压到 load 47，见团队规则「生产基建脆弱要轻测」），本页是服务端渲染，
 * `no-store` 等于每次页面访问都打一次生产库，被爬虫或分享刷量时压力直接落在上面。
 * 这里让缓存**正好在下一个变更时刻的后一分钟过期**，既保证变更后第一时间反映，
 * 又把日请求量压到个位数。（`shipping-rates.ts` 另有 30 分钟缓存，未纳入本次改动。）
 *
 * 三件套（rule external-call-resilience）里的"熔断"体现为 fail-open 兜底：任何失败
 * （超时/HTTP 非 2xx/`code!==0`/字段不齐/`price` 非有限数，任一不满足即整批当失败，
 * 不做部分采信）一律回落到 `src/lib/value-added-services.ts` 的硬编码快照（最后一次
 * 人工核实的已知良好值），并 `console.warn` 说明回落原因——不静默、不让试算器
 * 「增值服务」区因单次网络抖动整体消失。
 */

import {
  ALL_VALUE_ADDED_SERVICES,
  type ValueAddedService,
} from "@/lib/value-added-services";

const LEGACY_VALUE_ADDED_ENDPOINT =
  "https://app.kangaroo-japan.com/api/index/valueadded";
const TIMEOUT_MS = 5000;

/** 后台价目/汇率的人工变更时刻(JST 时钟的小时数);缓存卡在其后 1 分钟过期。 */
const REFRESH_HOURS_JST = [9, 19];
const REFRESH_MINUTE_JST = 1;
const JST_OFFSET_MINUTES = 9 * 60;

/**
 * 距离下一个刷新时刻(JST 09:01 / 19:01)还有多少秒。
 *
 * 用 UTC 分钟数做算术、不碰本地时区:Vercel 上跑的是 UTC,开发机是 JST,若用
 * `new Date().getHours()` 两边行为会不一致——这类"本地能跑线上不对"的时区坑
 * 最难查。返回值下限 60 秒,避免恰好卡在边界时算出 0 导致每次请求都回源。
 */
export function secondsUntilNextRefresh(now: Date = new Date()): number {
  const nowJstMinutes =
    (Math.floor(now.getTime() / 60000) + JST_OFFSET_MINUTES) % 1440;
  const targets = REFRESH_HOURS_JST.map((h) => h * 60 + REFRESH_MINUTE_JST);

  let deltaMinutes: number | null = null;
  for (const t of targets) {
    const d = t - nowJstMinutes;
    if (d > 0 && (deltaMinutes === null || d < deltaMinutes)) deltaMinutes = d;
  }
  // 今天的刷新点都过了 → 等明天第一个
  if (deltaMinutes === null) deltaMinutes = 1440 - nowJstMinutes + targets[0];

  return Math.max(60, deltaMinutes * 60);
}

interface RawValueAddedItem {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  type?: unknown;
}
interface RawValueAddedResponse {
  code?: number;
  errmsg?: string;
  data?: RawValueAddedItem[];
}

/** 任一条目字段不合规就返回 null（整批当失败），调用方回落硬编码快照，不做部分采信。 */
function normalize(data: RawValueAddedItem[]): ValueAddedService[] | null {
  if (data.length === 0) return null;

  const services: ValueAddedService[] = [];
  for (const item of data) {
    const { id, name, price, type } = item;
    if (
      typeof id !== "number" ||
      !Number.isFinite(id) ||
      typeof name !== "string" ||
      name.length === 0 ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      (type !== "order" && type !== "ship")
    ) {
      return null;
    }
    services.push({ id, name, priceJpy: price, type });
  }
  return services;
}

/**
 * 取实时增值服务价目表；任何失败都 fail-open 回落硬编码快照（见文件头注释），
 * 因此返回值永不为 null——调用方不需要为这个数据源单独处理"不可用"UI 状态。
 */
export async function fetchValueAddedServices(): Promise<ValueAddedService[]> {
  try {
    const res = await fetch(LEGACY_VALUE_ADDED_ENDPOINT, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: secondsUntilNextRefresh() },
    });
    if (!res.ok) {
      console.warn(
        `[value-added] HTTP ${res.status} ${res.statusText} — falling back to hardcoded snapshot`,
      );
      return ALL_VALUE_ADDED_SERVICES;
    }

    const json = (await res.json()) as RawValueAddedResponse;
    if (json?.code !== 0 || !Array.isArray(json.data)) {
      console.warn(
        `[value-added] legacy response code=${json?.code} errmsg=${json?.errmsg} — falling back to hardcoded snapshot`,
      );
      return ALL_VALUE_ADDED_SERVICES;
    }

    const services = normalize(json.data);
    if (!services) {
      console.warn(
        "[value-added] malformed payload — falling back to hardcoded snapshot",
      );
      return ALL_VALUE_ADDED_SERVICES;
    }

    return services;
  } catch (e) {
    console.warn(
      `[value-added] request failed :: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)} — falling back to hardcoded snapshot`,
    );
    return ALL_VALUE_ADDED_SERVICES;
  }
}
