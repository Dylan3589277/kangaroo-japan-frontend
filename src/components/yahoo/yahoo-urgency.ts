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
