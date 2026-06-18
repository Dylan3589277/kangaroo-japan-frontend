import { api } from "@/lib/api";

/**
 * 设计 A 英文 TCG「上新提醒」订阅数据层。
 * 直接对接已锁死的后端契约（别改）：
 *   POST /api/v1/tcg-alerts/subscribe
 * 走 api.request（同 tcg-data.ts 里 searchMercariTcg 的 /api/backend 代理 + JWT 写法），
 * 后端再落库 + 发确认邮件 / 立即生效 Discord。
 *
 * 只做订阅；退订/确认是后端在邮件里带的 GET 链接，前端不做退订页。
 */

export type AlertChannelType = "email" | "discord";

export interface AlertFilters {
  rarity?: string;
  setName?: string;
  /** 最高价，JPY 整数（数据库值即日元，不除以 100）。 */
  maxPriceJpy?: number;
  condition?: string;
}

export interface SubscribeAlertInput {
  keyword: string;
  filters?: AlertFilters;
  channel: {
    type: AlertChannelType;
    email?: string;
    discordWebhook?: string;
  };
  /** 用户当前语言，便于后端发本地化确认邮件；en 站固定 "en"。 */
  locale?: string;
}

export interface SubscribeAlertData {
  subscriptionId: string;
  /** email 订阅 = true（需点邮件确认链接）；discord 立即生效 = false。 */
  requiresConfirm: boolean;
}

export interface SubscribeAlertResult {
  success: boolean;
  data?: SubscribeAlertData;
  /** 失败时的人类可读错误信息（来自后端 message/error，或网络兜底）。 */
  error?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/**
 * 提交一个上新提醒订阅。
 * - 成功：返回 { success:true, data:{ subscriptionId, requiresConfirm } }。
 * - 失败：返回 { success:false, error }（不抛异常，调用方据此展示友好错误）。
 *
 * filters 只发有值的字段（后端契约里 filters 整体可选，子字段也都可选），
 * 空对象不发，避免后端 ValidationPipe 对空串/0 误判。
 */
export async function subscribeAlert(
  input: SubscribeAlertInput,
): Promise<SubscribeAlertResult> {
  const keyword = (input.keyword || "").trim();
  if (!keyword) {
    return { success: false, error: "keyword_required" };
  }

  // 只保留有值的 filter 字段；全空则不发 filters。
  const filters: AlertFilters = {};
  if (input.filters?.rarity) filters.rarity = input.filters.rarity;
  if (input.filters?.setName?.trim()) filters.setName = input.filters.setName.trim();
  if (
    typeof input.filters?.maxPriceJpy === "number" &&
    Number.isFinite(input.filters.maxPriceJpy) &&
    input.filters.maxPriceJpy > 0
  ) {
    filters.maxPriceJpy = Math.round(input.filters.maxPriceJpy);
  }
  if (input.filters?.condition) filters.condition = input.filters.condition;

  const body: Record<string, unknown> = {
    keyword,
    channel: {
      type: input.channel.type,
      ...(input.channel.type === "email" && input.channel.email
        ? { email: input.channel.email.trim() }
        : {}),
      ...(input.channel.type === "discord" && input.channel.discordWebhook
        ? { discordWebhook: input.channel.discordWebhook.trim() }
        : {}),
    },
    locale: input.locale || "en",
  };
  if (Object.keys(filters).length > 0) {
    body.filters = filters;
  }

  try {
    const res = await api.request<SubscribeAlertData>(
      "/tcg-alerts/subscribe",
      { method: "POST", body },
    );

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error?.message || res.message || "subscribe_failed",
      };
    }

    const data = asRecord(res.data);
    const subscriptionId =
      typeof data.subscriptionId === "string" ? data.subscriptionId : "";
    // requiresConfirm 缺省按渠道兜底：email 需确认、discord 不需。
    const requiresConfirm =
      typeof data.requiresConfirm === "boolean"
        ? data.requiresConfirm
        : input.channel.type === "email";

    return {
      success: true,
      data: { subscriptionId, requiresConfirm },
    };
  } catch {
    return { success: false, error: "network_error" };
  }
}
