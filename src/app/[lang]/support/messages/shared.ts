// 留言中心共用类型 + 解析函数：Client 组件 (MessagesClient.tsx) 与 SSR 外壳
// (page.tsx，Server Component) 都要用同一套 VisitorTask 解析逻辑；不能放在
// "use client" 文件里（Server Component 不能 import 客户端文件的普通函数），
// 所以单独抽到这个无指令的纯模块。

export type VisitorTask = {
  id: string | number;
  platform?: string;
  goods_no?: string;
  item_url?: string;
  message_type?: string; // 'bargain' | 'question' | ...
  customer_status?: string; // 'processing'|'rejected'|'sent'|'replied'|'agreed'|'closed'
  status_text?: string; // 后端下发的中文状态文案（优先展示）
  customer_request_zh?: string;
  target_price_jpy?: number;
  listing_price_jpy?: number;
  agreed_price_jpy?: number;
  minimum_bargain_price_jpy?: number;
  reject_reason_zh?: string;
  reply_zh?: string;
  created_at?: string;
  sent_at?: string;
  reply_detected_at?: string;
  // 竞买队列骨架（P1）：仅当本客户是排队/去重参与者时非空。
  queue_rank?: number;
  // negotiator/queued/watcher，后端已透传（对抗审查修复），本页只统一渲染
  // queue_state_text 徽章，不按 role/rank 再分支。
  queue_role?: string;
  queue_state_text?: string;
  // 后端下发的转人工判定（新版后端才有）；undefined 时（老后端）退回按
  // status_text 文案子串判断。
  can_transfer_human?: boolean;
  // 隐藏时间（ISO 时间戳），仅"已隐藏"tab（hidden_only:true）下的条目会有值；
  // 未隐藏或后端未下发时为 undefined。
  hidden_at?: string;
};

export function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getId(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return getString(value);
}

// 单条留言任务解析：没有 id 的条目无法展开详情/去重，丢弃。
export function parseTask(value: unknown): VisitorTask | null {
  const record = getRecord(value);
  const id = getId(record.id);
  if (id === undefined) return null;
  return {
    id,
    platform: getString(record.platform),
    goods_no: getString(record.goods_no),
    item_url: getString(record.item_url),
    message_type: getString(record.message_type),
    customer_status: getString(record.customer_status),
    status_text: getString(record.status_text),
    customer_request_zh: getString(record.customer_request_zh),
    target_price_jpy: getNumber(record.target_price_jpy),
    listing_price_jpy: getNumber(record.listing_price_jpy),
    agreed_price_jpy: getNumber(record.agreed_price_jpy),
    minimum_bargain_price_jpy: getNumber(record.minimum_bargain_price_jpy),
    reject_reason_zh: getString(record.reject_reason_zh),
    reply_zh: getString(record.reply_zh),
    created_at: getString(record.created_at),
    sent_at: getString(record.sent_at),
    reply_detected_at: getString(record.reply_detected_at),
    queue_rank: getNumber(record.queue_rank),
    queue_role: getString(record.queue_role),
    queue_state_text: getString(record.queue_state_text),
    can_transfer_human:
      typeof record.can_transfer_human === "boolean"
        ? record.can_transfer_human
        : undefined,
    hidden_at: getString(record.hidden_at),
  };
}
