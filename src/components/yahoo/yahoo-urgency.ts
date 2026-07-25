// Pure presentational helpers for the Yahoo auction UI.
// No data fetching, no types from the API layer — purely visual classification.

export type UrgencyLevel = "normal" | "soon" | "urgent";

const HOUR = 3_600;
const DAY = 86_400;

/**
 * Classify auction urgency from an absolute end timestamp (seconds) and the
 * current time (seconds). Three tiers drive the accent color:
 *  - normal:  > 24h remaining (neutral)
 *  - soon:    1h – 24h remaining (amber)
 *  - urgent:  < 1h remaining (red)
 */
export function urgencyFromTimestamp(
  endTimestamp: number | undefined,
  nowSeconds: number,
): UrgencyLevel {
  if (endTimestamp === undefined) return "normal";
  const left = endTimestamp - nowSeconds;
  if (left <= 0) return "urgent";
  if (left < HOUR) return "urgent";
  if (left < DAY) return "soon";
  return "normal";
}

/**
 * Best-effort urgency classification from a pre-formatted "remaining" string
 * when no absolute timestamp is available (list items only expose the string).
 * Recognizes the day/hour/minute markers used across the supported locales.
 * Falls back to "normal" when the unit cannot be determined.
 */
export function urgencyFromRemainingText(
  remaining: string | undefined,
): UrgencyLevel {
  if (!remaining) return "normal";
  const text = remaining.toLowerCase();

  const hasDay = /天|日|\bday/.test(text);
  if (hasDay) return "normal";

  const hasHour = /小时|時間|시간|hour|giờ|jam|ชั่วโมง/.test(text);
  if (hasHour) return "soon";

  const hasMinute = /分|분|min|phút|menit|นาที/.test(text);
  if (hasMinute) return "urgent";

  return "normal";
}

/**
 * 列表接口的 `remaining` 有时给的是**绝对结束时间的 Unix 秒**（如 "1784950961"），
 * 而不是已经排版好的「剩余 2 天」。原样渲染就会把一串裸时间戳摆在卡片上（线上实测
 * en 列表 4 张卡片全显示 1784950961）。
 *
 * 这里把这种情况转成固定 JST 的绝对结束时间（「Ends Jul 27, 14:22 JST」）：
 * - 绝对时间**不依赖"现在几点"**，服务端与客户端渲染结果一致，不会触发 hydration 不匹配
 *   （倒计时式的「还剩 X」做不到这点，除非改成纯客户端计算）。
 * - 时区固定东京：雅虎拍卖按日本时间结束，也避免两端时区不同导致的文案漂移。
 *
 * 非时间戳（后端已给好文本）原样返回；空值返回 undefined 交给调用方兜底。
 */
export function formatRemainingLabel(
  remaining: string | undefined,
): string | undefined {
  if (!remaining) return undefined;

  const trimmed = remaining.trim();
  // 只认 9–11 位纯数字（秒级 Unix）；毫秒级或带单位的文本都不在此列。
  if (!/^\d{9,11}$/.test(trimmed)) return remaining;

  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds <= 0) return remaining;

  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(seconds * 1000));
    return `Ends ${formatted} JST`;
  } catch {
    return remaining;
  }
}

/**
 * 由可信的结束时刻（Unix 秒，后端 `end_timestamp`，源自详情链路）生成剩余时间
 * 文案。已结束/无值返回 null——调用方不渲染徽章。
 * 组件 en/zh 共用，文案按 locale 分流；列表在客户端 fetch 后才渲染，无 hydration 顾虑。
 */
export function formatTimeLeftLabel(
  endTimestamp: number | undefined,
  locale: string,
): string | null {
  if (!endTimestamp) return null;
  const totalSeconds = endTimestamp - Math.floor(Date.now() / 1000);
  if (totalSeconds <= 0) return null;

  const days = Math.floor(totalSeconds / DAY);
  const hours = Math.floor((totalSeconds % DAY) / HOUR);
  const minutes = Math.floor((totalSeconds % HOUR) / 60);

  if (locale === "en") {
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${Math.max(minutes, 1)}m left`;
  }
  if (days > 0) return `剩${days}天 ${hours}小时`;
  if (hours > 0) return `剩${hours}小时 ${minutes}分`;
  return `剩${Math.max(minutes, 1)}分`;
}

/** Tailwind classes for the remaining-time pill, by urgency tier. */
export const URGENCY_PILL_CLASS: Record<UrgencyLevel, string> = {
  normal: "bg-muted text-muted-foreground",
  soon: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  urgent: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
};

/** Tailwind classes for the large countdown block on the detail page. */
export const URGENCY_COUNTDOWN_CLASS: Record<UrgencyLevel, string> = {
  normal: "bg-muted/60 text-foreground",
  soon: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  urgent:
    "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
};
