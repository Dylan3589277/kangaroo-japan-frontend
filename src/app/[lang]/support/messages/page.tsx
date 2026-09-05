"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import { getH5UidSignature, getNumericH5UserId } from "../h5/identity";

// ---------------------------------------------------------------------------
// 留言中心 H5（袋鼠君小程序 webview 内嵌页）。
// 顾客通过代留言服务给日本卖家发砍价/咨询留言，本页展示留言任务列表与进度。
// 身份约定与 support/h5 完全一致：URL query 的 uid|user_id + ts + sig，无登录墙；
// 数据走同源 BFF /api/support/seller-messages（action: list | detail），
// 由 BFF 中继到现代后端 visitor 端点并由后端验签。
// 金额一律 JPY 整数（数据库值即日元，不除以 100）。
// ---------------------------------------------------------------------------

type VisitorTask = {
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
};

type DetailState = {
  loading: boolean;
  error: string;
  data?: VisitorTask;
};

type FilterKey = "all" | "active" | "replied" | "closed";

const FILTER_TABS: { key: FilterKey; label: string; statuses?: string[] }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中", statuses: ["processing", "sent"] },
  { key: "replied", label: "已回复", statuses: ["replied", "agreed"] },
  { key: "closed", label: "已结束", statuses: ["rejected", "closed"] },
];

// 状态胶囊配色：processing/sent=琥珀（进行中）、replied=蓝、agreed=绿、
// rejected/closed=灰（已结束）。未知状态回落灰色，缺 status_text 用本地兜底文案。
// 本地兜底文案与后端 status_text 对齐（2026-09-05）：processing/sent/agreed 三条为
// 后端固定文案；closed 后端按原因下发多种文案，本地兜底保留通用「已结束」。
const STATUS_PILLS: Record<string, { label: string; className: string }> = {
  processing: {
    label: "审核中，待发出",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  sent: {
    label: "已发出，等待卖家回复",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  replied: {
    label: "卖家已回复",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  agreed: {
    label: "卖家已同意，可下单",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "未能发送",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
  closed: {
    label: "已结束",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
};

const FALLBACK_PILL = {
  label: "处理中",
  className: "border-slate-200 bg-slate-100 text-slate-500",
};

// 已结束且可转人工时展示的客服入口：与 support/h5/page.tsx 的
// WECOM_KEFU_CHAT_URL 保持同一 env 覆盖名与默认兜底链接，避免两处配置打架。
const WECOM_KEFU_CHAT_URL =
  process.env.NEXT_PUBLIC_KF53_CHAT_URL ||
  "https://work.weixin.qq.com/kfid/kfcdd40f1f6c4b4b499";

// 平台徽章：当前只有煤炉（mercari）走留言服务；其它平台展示原样兜底，零回归。
const PLATFORM_BADGES: Record<string, string> = {
  mercari: "煤炉",
  rakuma: "ラクマ",
  yahoofrima: "PayPayフリマ",
  yahoo: "雅虎",
};

const MESSAGE_TYPE_BADGES: Record<string, string> = {
  bargain: "砍价",
  question: "咨询",
};

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getId(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return getString(value);
}

// 单条留言任务解析：没有 id 的条目无法展开详情/去重，丢弃。
function parseTask(value: unknown): VisitorTask | null {
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
  };
}

function formatJpy(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

// yyyy-MM-dd hh:mm；解析不了的原样返回（别把后端给的文案吞成空白）。
function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 商品链接安全校验：只放行 http(s)，其它一律不渲染按钮（webview 内跳转用 location.href）。
function getSafeItemUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

// 同源 BFF 调用：BFF 已做 10s 硬超时与友好错误包装，页面只看 {code, data, errmsg}。
async function postSellerMessages(body: Record<string, unknown>): Promise<
  | { ok: true; data: unknown }
  | { ok: false; errmsg: string }
> {
  try {
    const response = await fetch("/api/support/seller-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload: unknown = await response.json().catch(() => null);
    const record = getRecord(payload);
    if (!response.ok || record.code !== 0) {
      return {
        ok: false,
        errmsg: getString(record.errmsg) || "网络开小差了，请稍后重试～",
      };
    }
    return { ok: true, data: record.data };
  } catch {
    return { ok: false, errmsg: "网络开小差了，请稍后重试～" };
  }
}

// 糖果橙皮（新版小程序 webview 用 ?theme=candy 拼进 URL 换肤，老小程序不带参数=零变化）。
// 页面固定用 Tailwind 默认 orange-* 调色板 + 品牌橙 hex(#FD7E3B/#F97E2F) + 页面底
// #f5f7fb；这里用 [data-theme="candy"] 祖先选择器覆盖这些 utility class 编译出的
// 固定颜色，不改任何组件结构/逻辑，老皮（无 data-theme 属性）零变化。
// 色值：主色 #EF8632 / 深 #D96E1E / 浅底 #FFF0E0 / 页面底 #FFFBF5 / 文字墨色 #4A3426。
const CANDY_SCENE_IMG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAABaKADAAQAAAABAAABaAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgBaAFoAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMABAQEBAQEBwQEBwkHBwcJDQkJCQkNEA0NDQ0NEBMQEBAQEBATExMTExMTExcXFxcXFxsbGxsbHh4eHh4eHh4eHv/bAEMBBQUFCAcIDQcHDSAWEhYgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIP/dAAQAF//aAAwDAQACEQMRAD8A+6c0lFIa8o6wzSE0hNFIYtGcU3NFIB2aQ0YpKYBSg0tIRQA7NFNpaYhaKTFFIAzQDRijFMAzRRRQAmDR0p1IaADNITRikpDGmnA02nUxD80hpuaXNACZpc0lJQhjs0ZpKM0AFLSUhpXGBozR1ptADiaSkzQKLgKabnFOpppAIaSl60HmgBM04HNMNKtMBx60oozRSATNJmnYoxQB/9D7opDS0V5NjrI6DTjTTQMbTqQU6gBaSikpiFNAooFIY6iiimIKDS000WASjNJRSAWlopaYCClptLSuAUlLSUAJS0mKKYAaKKSgYtBFLRQMbRS0ZoAKWkpaAEppp9MNIBtJTsUYpAIKcRTaWmA002n4oxSATbR0paCKYDaUUUtIBcUU4UtAH//R+6aSlppryjrA0winUlJjQ0CnUdKDQAUhopaAAU6m0tAMKKKTvQIcM0hpaKYDcUlPxSUgEp9NpwoAMUYp1eYeL/i34S8IXJ02Z5L2+Bwba1AZgfRj0B9uT7UpNRV2yoRlJ2ij03FJXztL+0NDZES6r4a1O2t/+epHb1+ZVH616V4S+KXgfxqVi0W+UXLf8u0/7uX8AeG/4CTSjUjL4WVKlOKvJHf4oxTiMU2qMxtJTiKTFMYdqMU6loAjopTSUXGGKKfSEUCG0mKxvEPiPQ/CunNquv3SWsC8AtyzH+6qjlj7Cvna7+MXjzxtNJa/C7SfJtEJVtRvNu0fi37tT7fOfasp1Iw1kzWFKU/hPqPaTSYr43vfDHxF1E+dr3jmeOU/8s7ISsg9shol/IVhy6t8Yvh6Dqeka63iCzi+aW3ulZm2jr8rlmx67HyPSuOGZYeUuRTVzseW1+Xm5fwZ9yYoxXm/ww+Jmj/E7QTqdgvkXUBCXdqTkxuRwQe6N/CfqDyK9JrvOBq2jGUlOopiG0vWjFGKQxMU4ClpaBABS4oo5pgf/9L7qpuKdTa8s60JikxSmkqGMKKWkNMBKKKSgB1FJmnAUAIaQUpFGKYhe1GKKKQC0lLRTASlopcUAeVfF/xtc+DfDKppWTqepSC1swv3gzdWA9RkAe5FcP4a0C08EWgihCzatIN17fN8zmQ8skZP3UU8cct1NZXxFuv7U+OWgaPLzFptobzaem8B5AfzVPyrqrfTZddmlsRM9v5kbEzR43rnjK5BGcnjINfL57ip+0jh6bs2fQ5Xh4Km6tTZalo67qgzmZmB6huQfwNeb+JvAXhPxUWuPJGlaj95LyzXapbsZIhhT9RhvesXxL4L+JvgRm1bwzqU2vWceXlsrwbpto6lCPvY/wBnB9jV/wAJeNdL8Y6ebuyzHNHxPbufnjb+qnsf68V5NSjisGva053j5fqj06Lw2J9zls/uJfCHxa8S/D3WIvBvxUJms34tdVGX+XoCW6unrn5175FfXEUsU8STwOskcihkdSCrKeQQRwQRXyb4h03TvEWlyaPqq74m5Rh96N+zoexH6jg8Vz3wg+JN/wDD7xB/wrPxtMDp8jf8S+7c4SPcfl5PSJ/f7je2cfS5VmixUeWWkkeJmeVyw/vx2PtamyvHDGZZmVEHVmIA/M18yeLvjpf6lezaD8L4UuDDxPqkwHkx/wC5u4PsTnPZT1rwLW5ba/mNz401271a4PWONysQ9hnJx9AtetzdFqeZGi95Ox9ueKviX4Q8J6XJqV1ewXLqQiW9vKjyO56AAE4HqTwK8NP7T4sb4DWtD2WRbDPbXCSyoD3Kjg/TIr5mvJvBYQpbacp/2mkkJ/8AQq465stCckrE0f8AuO39c1SjJ6jtBKx+tum39lrOm2+r6bIJrW7iWaGQdGRxkH8qt4r8ntF8TeJ/DDK/hXXLuz29IjIfL+m3lD+K19B+C/2p9VsJU0/4jWYniOB9utFCuPdox8jf8B2n2NU42M+Xsz7frhviB490j4f6I2qaiRJM+VtrcHDSOP5KP4j/AFNXk8ceFp/C0njS1vY59LiiaVpozn7v8ODgh88bTg5OK+YPDEN78SPEM3xP8YJmyikMelWTcoSh4JHdIz/30+T2rlxWJjQg5yZthsO6srWLOn+FdT8cXa+Ofiq7vHIN9lpQJQeWeVLjqkfoo+ZurH17u91HMSWsKrDBENsUMQCRoB0CqMAU3VdSeR2llbLHkk14Fe694m+IWtv4U8AHy4Y/+PvUeQqL0OGHQemPmY9OOa+PlUrZhUaTtFfcvU+sp0aWDgqlTfp/wDvNZ8ZeG9HmMGp38MMg6pncw+oXJH41ftL62v7dL2ylWWKQbkkQ5BHsa6LwV8GvB3hiJZZ7ZdSvTy9zdqH+bvtQ5VR+Z9TWp4y0+3s7qB7aNY1kjIKoAoyp9Bx0NZ4zBUqUOanJtmuDzF1avs5RsmeA+DtQPw5+OdpHbHy9P17EEiDhR55wOP8AZmAI9AcV9/NxX5v/ABWZrXWfD2oQ8SxXJ2kdfleNh+tfpE/LGvrctquphoTlv/lofM5rSVPEyjEiJpc0hFJ0ruPOHZopoNPFACiloooELS0gpcCmI//T+6TSE040yvKOtCUlOpppDCkoooGLmkoxS4oABTxTMUtAh1FIKWmISlpPaloAKKSloAUUtNpRRcGfJHjctZ/tFWjycC60vYnuTFIP5rXrHhNh/aMqnqYuPwIrzP8AaPtJ9D1fw18RbZSVsbgW9xj+7u8xQfqN4rttEvoINSgu4nDQS4ww6FJBwfpgg18nncOTFU6z22/r7z6TLn7TCzprex6hdQ+dEQPvDlfrXyN8WvCVz4S1Nfil4SjCFGC6pbLwsiMcGTA9Tw/vhuua+wM1ymuWNtcpNZ3kYkt7qNkkQ9GVhhh+RrZT5XdrR6Nd0cdBu9lv0Pne31qDVbKHUbFt0U6B1PcA9j7jofevIPGUkPivXYPDcAVRZZmu7sjJiQjlR+nH97HoafZXkngAeIvDl6xf+x5Wktt38aSf6v8AMlT+Jrh4bmTTtFCsxN3qB+0XLnrhuVU/gc/U08syzkxEp9Ft8/8AgHr5nmalhoQW8t/l/wAE39X8TR21quiaEv2ezi4VV6se7Me7HuTXEF5ZW3OSc1VMqZyxH409bmHpuFfVRilsfJyk3uSNxVKTNWGlQjg1WdhVozZWNMeQhdrfMp6qelSNUEnOBTBHS+DrfWNZ1aLwZpt3LDaapMhuYwx2bY8sXZehKKCQa+6pJLa0tYrCwQRWtrGsMEY6KijA/Hufevlz4DaWs2o6jr7j/UottEfeT5m/8dUD8a+htSvYbG0mvbltsUKNI59FUZNfCcQYl1K6w8Nl+bPsclwyVL20+p5b4/1bVNX1G18A+HDm/wBTIErA/wCriPXJHQEAk/7I96+h/BPg/S/BmiQ6Jpa8J80spGGlkI+Z2+vYdhxXi3wJ0ebVZtS+JOqrmfUZWgtc/wAMSn5iPqQFHsp9a+nLda6lSVCCw8em/m/+AcWIrutN1Xt09C7EmBXm/jmYNqEUA/5ZRc/Vjn+WK9MZ44Y2mlO1EBZiewFeF6vqBv7yW7bjexIz2Hb8hXnZhUtBQXU68opOVVz6I8J8ZW7a98RfC/huLlpLmMsPaSVQf/HUJr9F2OSTXwn8ENObxz8Y7/xkw3WWjRkQsehdgYosf8B3vX3XX1mBoujh4U3vY8LMqyq4ic1sNNNxTjSV1nCGKKKKAHiiiimIWlpKKAP/1Puk0lONNryjrQlNpaOKQxKSnYoxQACilApKAFpMUtJQAU6m0uaLgJS80UUwDNLTcUtSIWikpaYHKeOvClt438JX/hm4wDdRHynP8Eq/NG34MBn2zXx/8MfEF2lvP4G10GHU9HZovLf7xjVsEe5jPH+7ivusGvmL46/C3U725j+JvgZSusWIDXUMYyZ40GN4H8TqvDD+JeOo54swwSxdF03v0O/LsY8NVUuh6v4b1pNQthazN+/iGOf4lHQ/41xXxG+KPhHwen2C9ma61EkGOytRvlyf73Zc+5z6A18yal8YpbnQ7ceHibTVrhjHKeQLfaPmdT3B/h7jnuBXhd94iNq8kWmlmlkJM105zLIT1Jbrg+gP1yea83LsDUnD/aVa2nqduOnSp1eag731O18b3+oeN9fk1y/jt9FSWJImikkLyMsZypZEBbd06qo4FY/2Xwcz79b1XUbp+4t4o41/AyOT/wCOivPoV1PVJvItlknc/wAKD+eOB+NdbZfDrWbkB7uSK3B7E72/IcfrXsznRoRUZSt/X3nJTo18Q704X/r7jqoLb4QuNv8AxNFb+9J5b/okiVKfCHgfUeNG1K3DHpHdGW3b823J/wCPVmJ8MU2/Petn2jH/AMVTJPhxqMI3WF6pPo6lf5Fv5Vy/X8O3aNW39eh1vK8UleVK/wA/+CUta8EXmiYkuYp4I2+5KCHib6OuVP51yz2l9DzFIJR6Hg/5/Gurg1Dxz4LZjiQW7cOBiSBx/tLyp/EA1pxah4O8Tj98P7FvD/HCC9sx94/vJ/wEke1dcMQ0uZ6rvH/L/K5w1MNry/C+z/z/AM7HnYuyh2XClD79KezhlLKc8V3s/gPW5Rmza0voT0kgnjI/EMVI/EVzmseFH0K0a5ub60SbIAtElErtnr9zKjHua1WLpS0jK/5mTwlVauNj6F+CECweDZJh1mvJCf8AgKqo/lV74vajJZ+DJ4oj811IkAx3BO4j8QuKzfgjciXwc8I6w3cgP/Agrf1rS+J2javrVlp1tosXnTrfxsAcbRw2GfPAUHqTxiviJpf2o3U25j7Gnpl65P5T6E8GaGnh7wtpmiKADa2saOP9sruc/ixJrt4k4rh/Bnh0+FtHMV/dNd3k7tc313If9ZM+Nx56KAAFHYCotc8YpGjWmkNljw03Yf7v+P5V1V60YNyk/wDgnkUcPOs1CCJPGGvIEOk2zZ/57MPbov8AjXzN8S/FL6Xpw0TTsvf6j+6RE5ZUY7SQBzlvur+PpW54w8ZWHhezM9ywkuZAfJgz8zn1Poo7n8ua6f4DfCvUtT1QfFfx2hM8n7zTbeQYxxxMVPQAcRD/AIF6U8swUsTV+s1l7q2O7H4mGBo/VqT957nt3wZ+Hw+HPge30q4Ufb7k/ar5h/z1cDCZ9I1AX65PevVTSk02vq2z5HzENJSmkxzSAUUuKKKYC0UUlADxzS4oFLimSf/V+6TTaU0hryjrEzSUUUihaXIplLSEOoNJRTAM0lBoFIBaKKM0AOopuaWmIWkpaKACikzRQAVIOOlMpwpoTPjP4/fBDUbu/bxx4EtI23Rs2o2sWEJYZJmQHAOR98DnIzg5NfIvhTwTqHiq7YQo6WsRAlkAycnnYvqx/QcntX6CfHbxHqMtvZfDfw6c6hrrhJcH7sJOMH0DEEt/sqfWqcem+G/Afh+KyMkdvZafHh55MDe5+/I3qzt269AK8rNMweHjy0viex6+XYZVGpVtkeO6J8PTYW621tEtvGOoHLH3Y9z9TXWReDLdB+8LMfyroPDfj3wb4qunsdEvFlnQFvLZWRio6lQwGQO+K6+REFfHV5VlJ+1un5n1tPEppKna3kedDwtYL1j/AFNRy+F7Jh8oZfof8a7iQCq5WuT2kl1N1UbPNrnwo/PkuD7NxXnWtfC6wv2Mj2rQyH/lpb4GfqBkH8q+iWQGojGPSt6OOq0neDFUjCquWrFM+Tx8HtRdtsN9KF9GiOf/AEICu28NfBfRrKdbvWWe8ZTkJJwhPuo/qTXqF74y8I6feGwvdSt4p1OGQtnafRiMgH6muiikguIVntnWSNxlXQhlI9QRwa76+bY1wtNtJ+Vjjp4HCKV4RV153K0dvBbp5cEaxr6IAo/IVDKOOautVOUV4+rdz0UUb/WWhtP9PudlvEP+Wr4QfnxXkGs/EoXNyujeC7d9SvpjsjKIzLuP91QNzn8hXVeNfCtt4p0/7LKxSWLc8Dg8ByMfMOhB7/pXWfsq6loyW2p+Gbixgt9bsXLvOEAmlhJ2lS3X92/GBxgivpsnwVCuueo7tdDxc2xtbDLlpRsn1J/hf+z1dHUE8Z/FRhd3pIkisGIdVI5BmI+Ukdox8o756V9cUZor6vRKyPj5ScnzSeo2igmgUCCkp1NPNABmlpoFOoAUUtJRQIeKfimCnZpiP//W+6KSlNJXknWJim0+kIoGNooopDFooooAOtLSikoEFFFLRYBpoBpaKAFpaQUtMQlLRRTsAtOGByxwB1NNFch8QdWOheBtY1RTteO0dUP+042L+rCh6agldpI8B8FXJ8YePvEHxDuPmitj9hsM/wAO7jI9xGB/30a2/E/hjSvE81n/AGwHlhs5TMLfP7uRiMDzB3C9h+dUvhXaDTvh3ZNjDXsk123vubYv/jqitvVdV0/SbZ7/AFS4jtoE+9JKwVRnoMnufSvgsyxM5Yp+zeq00Pr8FRioNy2/yMweGvD0WowatBYW8V1bArFLEgQqGG0j5cA8Hv8AhW0XLVn6dqum6zaLf6TcR3UDEgSRMGGR1HHQj0NXCQK8qpOd7VL3Xc9SnCNrxGNyaibGKlYiomrO5okR8Gm8UpGKSi5Rw4+G3gVbdrc6XC4cks7lmkJPJO8nd+tZvhPwdd+DtTu7exujLo86h4oJCTJFLnnBxjbjv1PGRxmvQluLeWRoo5EZ0+8qsCw+oHIprA11PGVnGUJybT76mUMPT5lKKs12IHqpJVxqqyCsInUZUy5FeVS6kfh18WtG8aRkpaXr+TeY6bWxHLn/AICQ/wBRXrsq5FeYfFHS11HwfcSAZezdLhfpna36Nn8K9nKK/ssRHs9DhzOgquHku2p+gGQeQcjsRRivPPhNr7eJvhxomrytula0WKU/9NIcxMT9Sua9Er7g+B20GEUlPpuKBiUtAFOxQFxuKO9LRigAooFLTQmKKdxSAZpcUxH/1/uk02nGm15J1oOlJkUU2gYtFFFIYlKKKWgQtFJzSimAUYpaKdhCYoxS0UAFFKKKYCUoFLTqBXExXhf7Q+r21l8O59L81RdXssQjiB+dlRtzEDrgY6+tet+I9esvC+hXev6gf3VrGXx3ZuiqPdmIFeAeBdGl16Vvip43UXF1eMW062flIowflfaf/HPQfN1ORzYvERpQbkdOFpOUlLt+LN3SbJ9K8OaXpjDa1vYwRsD2YRgt+ua8Z1bU/hxrniXxFYfEe5C2+i6cv9n2zSMgkuJFLSSKFI3yrlFQc9zjrXu2p6kbuUvIRn2r4B+MWmXFh4+vpZgdl5suIm7FWUA4+jAivmMkcJY6dR66Nr7z6DHwnHCRjt3Ok/Z+1m7tvFNxopY+ReWzSFOwkiIIb67SQa+vWbnFfJn7P2iSza9e+Ipflt7O3MO88LvkIJ5/2VUk+mRXuPiH4j6Pog/doJyRkEuEyPUABmx9QKxznDTxGMcaEbuyv6/8MdGW1o0sOnVfV2PQDUdeCL8fdNjm2XemP5efvQyhj+TKufzr1rw74q0TxZYm/wBEm8xVO2RGG142PZl7ex5B7GvKxGXYihHmqwsj0aOLpVXywlqdBmuR12X+1Nc0bwNHenT2124eOW5QgSJDGhZxGTwHkOEU9s11BY18z/tAW9yt5pOoJkRiOWIMOzhlb88dPpW+TUoVMXBVFdb/AHIzzKcoYebhucR8T9Dtfhj8SrvSfCOoTSLZGN0mZgZEdlDMjsoAYgnnjpwR1r6k8H+IV8U+GbPW8BXmTEqjoJEO1wPbIyPavgV2Z2LuSzMcknkk+pNfaHwhs5rDwDZC4BUzvLOoP912+U/iBn8a+i4kpwdGNS2tzxsiqT9o4X0sekvVVzVgkmq7ivjUfVIrP0rndatheaVe2Z5E1tKn5qcfrW/JWXO4G7PQKc/lXVQdpKSCcbxaOr/ZR1Frv4bT2TnJs9RlUewkRH/mTX0yc18nfsiK3/CI6038J1FcfhEua+syK/SGj81l8TG0uKSnUrEjaKKWgBuKWijFMBaMUUooABTqKXinYk//0PukmkpaSvKOsbSYp9JSsO4mKKWigLgBS0UUxBRRRQAtBpKWmA2lopaQBiig0UCFFOptPFMTPm79ou+mlsND8KQsV/tS+AfHcKVQfrJn8K7TXJI7Xbp9qAkNsiwxqOgVBgD8hXmf7S5k0y68K+JiCYbO+YSexDRyD8wjV3mtSxyXbyRsGST50YdCrcg/iK+X4jlKMV2Z9Dk0FJxv0v8AmcxI7Fs1ia14Z0LxRAlvr1ol0sZJjLZDKT12spBGe4zzXQFVJrZ0G3jl1W3SQZUNuI/3Rn+lfKUXP2kfZuz7n1FeUFTk5q6SKOrfDdNK+F2qab4etxBcmyka2toRjn7xB7s7gEc+tfmxdXs88haViT71+ut94q0aw1yy8PXtwI77UVke2iIPziIZbnGAfQE89q8L+IX7OnhfxhqEutaRcPpF5OxeYIgkgdj1by8qVJ77Tg+ma+5wcqdBcr69e/mz4qdWpUbcv+GPzwLE19hfsteELu4bVPE+oRH7BLGtpCHziSRW3Mw9kxjPqSOxroPDn7KeiWd4tz4n1STUIkOfs8EfkK3szbmbHsuD719V2FjZaXZRadp0KW9vAgjiijG1VUdAAK1xeJhODpx1uRDmi+ZMwL3whps6k2paB+2DuX8jz+teSeNPA0Gq6e+i6/EWhkO6OWM8qw6Mh7MPQjp14rY+KnxA8SaFqul+Evh/FBe65fM00ltIu7bAik5J3KF3EHBJ6A16fbrc6tokH9t24t7iaFGngDB/KkIywDDg7T0NeHWy9RUa1L3ZdLHpYfMJr3KvvR8z4osPgLotpfC41C/mu7dTkQbBHu9mYMePXAFe1DZGixRKERAFVVGAABgADsAK2L23a1uJLaT7yMVNZbr6V4uKxlau0q8r2PpcJhqVJXpK1yMP60jtmkI9KjY1zrU6mV5eAa4vxNqA0/Q7++Jx5du+3/eI2r+pFdRd3AQYHU1438Q7q61aaw8EaQDJealPGCg922oD9W5PsK9PLsO6taMTDGVlRoTqM+mf2XNHfTfhZHeSDB1C8muB7quIh/6Aa+izWJ4Y0G18LeHbDw5Z8xWFukAP94qPmb/gRyfxrcr79n5u3d3GYpaWikA2ilpMUDClApKUUwFxS0UUyRaWkFLiiwj/0fuo0lPIpteXY6kNooopDENANIaBSGOopcUtUK4lGKWiiwriUUYpcUDuJRTsUYoFcbilxSilphcQU6mU8UCZ578UvBY8e+CL3QI8fadomtCe00fKj2DcqfY18zfDHxjJrWjDwxrGYtW0dfIeOTh3ijO0HB/ij+6w9ge5r7cHWvmX4z/BnUNYvf8AhYHw9Pka3B880MZC/aNo+8vbzMcEHhxweevBmOBji6Tpvfod2X4x4eopPYsBq0tIu1tdRhmY4UNg/Q8f1rwbwx8UrW+kOkeJl/s3Uom8uRZQURnHBHzco3qrfga9US7UgHPWvz+thquFqJVFZo+4hKniab5HdM9J8beB9L8cWMMVzJJaXtm/nWN9AcS28ox8ynuDgZXvjsea8zm8c/FPwEfsvjXQm16zThdU0n7zL6yQ4+VvX7o+tel+HvEMd1EtpcMBMgwuf4gP6iusFyD0NfS4fGRnBXV1+R8pWws6U3FnhSftIeAAv76DVIpR1ia2G7Pp9/FZ1x8XvHfjAGw+GPhq6QyfL/aGpKI4owf4gPukj3Y/7pr6GLox3EAn170NNnqa39tTWsYfiZcj6nlfw2+GR8Hz3XiPxBeNqviDUR/pV4+SFU87I884yBk8ZwAAAMV6wzVUa4UVm3+rQWNu1xMeF6DuT2Arnq13Juc2aU6Lb5Yo4TxK6HWZtvYLn67RXNO9LdXpuJnuJT8zsWP41lTXsadDXzE/fm5Jbn2dCm4QjDsi8WA5NZ9xdIowOtZc2oM2cV5t4g+ImlaUxtbE/b70nasURyoY8AMwzz7DJ+ldWHwdSrLlgrjq1YUY89WVkdJ4m8RWXh+wfUL1ssciKIH5pG7Ae3qewrsP2dfh3qF/fyfFnxYn764DDTY3HRWGGmAPQbflj9sn0NZPwz+BGu+LNTi8bfFcMkAIe30x+GcdR5i/wR/7H3m/ix3+10RI0WONQqqAqqowABwAAOgFfa5dl6wsbvWTPi81zR4qXLDSKHUUtJXonjiYopaKAExS0UUAJRS0lAwFOFJS00Ji07mkFOxTJP/S+7CKbTiabXlnSgpKWjFAxmKKWikMdRQKWmISiloxTELSUuKXFACUlOwKTFAAKKKKADFKKKKBBTlOKTFOAosDPMfiB8IfBPxHjMut23lXoXal7b4SYegY4IcD0YH2xXzJqvwS+MHgXc3gq9j1uxXlYGIWQD08uQ4/74f8K+6TmvNviD8UfD3w9tQL0m61CYf6NYQcyyE9Ceu1c9yPoDWdWlCorVVdeZvh69Wm/wB0z4om+Ivirw7L5XjHw/d2ToeXCvH+IDjH5NXdaN+0R4ewsWoPMo/vSRncPqV3A1498UfiD4u8ZO//AAlF6Yo85h0u1OIYvQyc/Mw98n6dK8xu9LW1jhiP/La3imz/ANdF3foa8x5Rhub3E16M9Z5pXlG1W0rf10sfoJD8VPCzwQ3LXLiOddyP5UjLj3KqQPxrfHi/R5I1mjuUZWAIIzyD+FfLnwVu9N8SxN4S1O5a31G2Utb5wRNCOwzj5k9M8rz2Neu+JtD0Xwfpratr+qx20AOF3oS7t/dRQSWb2H4149ejVhP2Sjr+Z303hZpTcrHXXvjW0QEWwMh9TwP8a4HVfEklwTcXsqqi9MkKq/nXzlr3xQvbt2h8M2/kw9BcXIG8j1CAlV/EtXmV/c6nqknmapdS3DejHgfQdB+ArenkletrWlZA81wuH/gx5mfSGq/Erw1Y5V7xZWH8MAMh/McfrXnmo/F8uSuk2TMezznj/vlf/iq8stdLmvJ0tbKFppXOFRAWYn2AravNN07w/wDutYlFxe/8+VswOw/9NZRkKf8AZXJ9xXoU8mwtJpS95/1/WpzTzrFVU3C0V3/4f9Cvq3ijxLroZb+6KQnrFH8ifiB1/Emn+CPE0vgzxbpviOxIJs7hGfcMqYycOPxUnkcjqKxpjcXzBpgscY+7FGMKv9Sfckn3qSKMRfKQNp6j1r2KdKMI8sVY8arXlUlzTk2fsppupadrVhDqukTx3VrcKHimiO5WU9wf5+h61dr84vgX8Ubj4ea/DomqTFvD+qShG3nItpm4Eg9ATw/qOeor9HqGjB6CUlOpKmwCUUtJSAKKKWmA2lFFFAC0UUUxDxTqjpc0Csf/0/u3immnEU015Z0iUUUUDCiikpAOpRSUuKoQtJTqSgQClpMUtACGilxRigBBS0UYoAMUAU6iiwXM3WbuWw0e9vrcAyW9tLKmeRuRCwz+IryLwrB438UaTa6mviuW2muLeO5MDWUDALIMgqeNy9s+vB5r1bxI0SeHtQ851RWtZlyxAGShHU1wfwzs01f4XeHpQ7QzxWSeTOn30Iyv4g4wQeCKyqXTubU2lBvz7XLbeFviUBiLxch/39Pi/o1eP3X7OviSe9udTPiOKa7uyTLczW7GU56gN5hwD7fTpX0XaazLb3CabrqrBcOcRSj/AFU3+6T91v8AYPPoTXR1MZRlrb8WKVSpDTT7kfC95+yT4gmZnTWrRywx86SL1/Omal+y/wCN72ytbT+0NOBtIfIWRGlDMgYld2Y8ZGccdq+5zRTdm07bAq8kmu5+fFn+y58TtFvoNS0m9s1uLaQSwyrMwZWU54yg/KrXjX4F/G7xpqzazrRtLiXG2JI5lWOJfREY8ep5yT1r79B7VzmoeI1SdtM0aP7ZeDhlBxHF7yOOn+6Mt9OtKUoxfPLcqE5y92KPzN8S/Bjx94E0xtX8Sxxx2oYLu82Nzk+gVyx/Ksq28L6dZWEWteKtQis7SZQ8UcJEtxMP9hVJA+p6d6+2Pj5pTwfC2/vtQlNxeST26vIeAq+YPkRf4V/U9STX5yf2fEr5YlgOgNC9pUVlK35/18mbxnTh7zjf77f5v8Drr/xjLLC+l+Drb+ybFhtklzuuZh/ty9QD/dXArmLS0jVzGg3MBlm+v+NOkdYYi2Og4Art7S50DwrYx214iX2py/vJkO5kjY9E2oRuZR1y2AcjFaKEaKtBf15tkucqzvN/15I5zyQi1SmTFdmfH4U+VPY2Gw/wTWaKPzUBv1p7f8Ip4hGyEf2Pdt9w7zJaOfQk5eLPrlh9KPbyjrOOnda/8EXsE9Iy189DkbJFvIpNPk6SD5c9m7Gv0l+AHjGXxj8N7Rr1i17pjHT7kk/MTEBsY+5Qrn3Br84XsL3RtV+xajGYpYyMg85B6EEcEEcgjg19W/su6v8AY/GniHwzu/d3dvHfRr/tRkBsfUSfpWraklKJjKLSae6PtuiloxUGYlJS0UDEpaXFJQFxKSnUGgLiUtJ3pwoBhijFLinc0xXP/9T7vIppFSkUwivMN0xuKSnUUhkeKUCn4ooHcAKXFFLVEiYoxzXNeMPFuleCdCl13VidifLHGv3pJD91F9z3PYc15dZaH8VfH0K6trerP4as5huhsrNf32w9C7EggkdiSfYdKXkkXGN1zN2R7vijFeA6h4K+LPhCI6r4O8Ry62IhufT9RXcZAOoRiTz6AFfrXoXw78fWHxA0Q6hBGba7t38m8tX+9DKOo5wcHsSPUHkGnrs0DhpzRd0d7SU44UZcgD3qreXtpYWU2o3cipb28bSySE8KqjJP5CnYzLGKFwRleR7V886TpniH4zF/EGu3lxpfhsuy2VlbNsknVTjzJG54J9j7YHJtah8GbPTQbz4daze6RqkQygkmMkMhH8MinnB9eR7GpV2rpGzppe63qe/YriPH/jODwP4fbVDH591M4t7O3HWWZ/ujjnA6n8u9c98LfiHeeLor7QPEsAsvEGiyCG/txwGB4WVB/dbHbjuOCK4r4pXZn+LHhHS7j/UQw3N4qnoZVVip+oKA1liKvs6UqnZFUKXPVUJGHqPgVtbtJL74galLe6vPGSItzC2tSw4VY0K7iv1Az2PU1vDfjXXfhNbafoevyW+o+HUdbYXcKNHPa72+VpFJIdMnkjkfodu9uXmkLMeSeteG/EvSvEMvhi8uZ9Uie2hAke3SDyy6hhxvLsc9+nNfGYHNq1TEJSkkm+tz62vlUFQfNdtL7j76u7Wz1O1a2u0WaGQcg8g+hH9DXNGfVPDCN5wkv9ORSVfrPCAOjf319/vD3qz4V1CG98NaffJlY5raJ0B5OGUED3OK6Ar5ylZR8jAqVPcH1r6l6+8tGfJxlyNwkrr+tjwR/iF4hkdtQtZo9qylPIcZVsdflC5Cg8A7txxn2qpb/FbV7LVkbUWMtsWXzU2qfkZgpZAoBBUkHBLZHGc81geL/Cep+E55JkO+xkYmOY52j0D8HawHGejex4NTwf4L1fxNqUF3NE8WnpIssk8g2mbYcqkankJnkseW/LHiRnifacl3c+6lh8s+rOvZWa/r5n0ARrviX7xfTbBv4VP+kSj/AGmH+rB9F59xXS2GnafpFr5FoiQxICT2GByST+pNWkxEqo3QDAPavAfjpq9zPPoHgGGZ7eDXbiQ3skZ2s0EChjGD23k4P0r2naCdSb2PiE5VZKlDRM5T47fEnwZ4h8HXnhHw/ff2hftPCStrG8qKEkBbLqNvAHYmvC3+CR1XRk1fwfqv20sD+5uojblmHUKW6H2YAe9fSVlLDo9qtho0MdnbxjCxwqFH445J9SeTTJdQuZTukcsfc18zX4im2nQVrfj6/wDDn0tDI0o8tTU+VtE+A/jnW5l/tKKPS4Fb5pLmRc8dwiFmPt0HvX014S+H3hLwDYvDp0Yu7yYfv724UF29kHOxfYcnuTWit/MRgsaikuHbqa5MXndfER5Xojpw+TwpO9zM13RdG1mJre+topUbsyivljx98OH8NF9V0Dc1qMtLAcnaO5Xvgdx2+lfVc02BzXL6w6T27xsARjoayy7MKuHmnF6dj0MRl9PEQ5JrXufLml3o8Q6WNJuTvuLVTLYyH721eXgJ7gjJX0IwOtdd8IvFMfhv4xaZqE7bYLhlsJmPAAnQICfo5U/hXnF1EfDXjB4Lc7UhnWaL2U4YD8uKzHf7VJeXVuSpMxliI6gKeMfQV+g0WmuaGz1Ph68bPkn8Sumfs+RikxXEfDXxUvjXwJpPiQnMtxbqJ/aaP5JP/HlJ+ldxWtjz9hlFOxRilYYlJ1p1JQAlLSc0tADacKSlFMBwp2KSlpiP/9X7xNJTzTK802EpKdTaQ0LS4pMU4U0AAUoFFOApibPnjxqqeIvjl4Z8LX/zWVjZy6mYj915VLbcjvgop/OvRfFGvtZtM8s3kW9sheV84AAG4kn0ArwD4jeKLnVfiZp3iL4cWM2o3nhtpLS/mJWO1kVs7oRIxGWG5gSPXPOKyPFXijxJ8UI9Q8N2FiuhKkKJfm+bfIzv8yrF5fGwheXPUdBXDicVTpqSc0rbnsYHDylKMnC+mnqd/o/xl8S/ZP7fGhST6ECWWVpwLxoR1mSAjle+C2SORVybwF4j13xZc+M/htrMOmaP4htIZri4jG53fJyY0GMEjBJ3Kckj1rzfwxrV9qVtI11DHam1lNqIIyWKGHCkEkAY6FcdsV6p+z3qLvY6/oEB32Wmao62jDlVWZRI0YPojk/nXFlWZPE1Z4etG1tVZ/qdWa5d9WpRxVN/Fvp+hpRfAPQ7geZ4g1fVNRmP3neUKM/TDH/x6ob39nfwnNbyQWOoapa+YpVgsyspB7MpXke2a97zRnFfQexpfynz/wBaq/zHznqPhX41+D/D8mleD9Ss9atY7cwW0U8Qt7mEBdqmNgdjFewY81peFYb6x0rTVnt7m0nEUYaO7/127+LecnJJySc85r3rdUM0MM+PMUEjkHuPpWVXDxlblZ0YfGum3zRvc+bWK237TFo2n8NfaA/24L32Mdhb3+VRUn7QuhapFYaX8RNCjMtz4dnMk8a9WtpMCT8Fxz6Ak9q5q1kuvhN8YbvWvH7G7tfEii2stYxtSAA5ELoOEGAoJHYA9N2PrBlSRCjgMrDBB5BB7H1BqZRUk4TW5nzuEozifHNr4gsdd0xdS0iYMky5RiM7W9GGRyD1Ga8t1zTfEPijxFpfg6bUEulvblWuLW2i8vbbocs8jbmbGOg6Z/CvojxH+zX4cvb+XVPB+pXfh6WYkyRW/wA8BJ9EypX6BsDsBXJeAfDvxJ+GVrLAvguPVbx5HM2pJfRCSYbiV4bLAAYwD+Wa+cw+RPDVeeDuummv3n0dbPIVqPIlaXrY+pNLsIdOsobSFcCJAijsABjA9AK0xXh4+JfxDgH+lfD/AFLj/njcRSfyFcxqH7S2maHqLaT4h8N6rY3SKHeF/L3hTyCQSODXsxptLVHz0oyk7n0nNDFPGYZlDo3BVhkGhI0jUJGAqjoBXzhB+1V8NZeJ4NRhPvHGf5SVrwftL/CebG67uYv9+3b/ANl3U+UXLLax75wRtYZB6g180ftJaXFJpPh/U972xt9XjiN4h+a3SZTk59Cyr17iuzh+P/wkn6ayqf78Mw/9ko1n4i/Bnxlo1z4f1bWrKa1u02SJIzJ7ggsowQeQexpSV00VT5oSUrHlGnWWsWb/AOn6qb2MDADQIjfUsp5/KtJ5kHevIvET6j8P7KS60PXdM8R6RCVWNfPX7Wik4UEKTvA9cfgK4SD40RySgXti6x9zHIGI/AqoP518ZVyPEyk2kmvKy/DQ+3o5pheVXlb1ufSouF9aR7pQOteOWnxO8JXCAm8aE/3ZY3H6gEfrUs/xG8JRrltQVvZEdj/6DXL/AGZXTt7N/czuWLoNX9ovvR6TcXo7GuF8U+I7LQdOe+vm65EcYPzSN6D+p7CvN9Z+LtkimPQ7d5n7ST/Ko99oOT+JFePalqepa7eG/wBWlaaQ8DPAUeigcAewr2cBkVSclKurL8f+AeZjs8pUouNB3l+C/wAyre6jd6rqM2o3BzNMSeOgB4wPYDgVo2GIyF7DiqCoB0FWoWCHcTgCvsoRUVZHxc5ucuaW59x/sleIy2n6z4KnbLWcy3kAP/POX5Hx7BlU/wDAq+w6/OX9mBr26+K/2jT/APUJp8wuySBlPlC4HU/Ptr9G6gme4lFFFIgKbinUUwG4p1FHWiwBSYp1FAAKWiigD//W+8zTSKkNNrzmapjKSnYoxSsUGKUUtFMVwpwPNJS4qkSz4n0uG58GeI9W+H+q5SRbuW/sXbpPbznO4Huy4wfx9K5a/wBC1KHxTpuleDLpxq2rs0c5uSZkaJAWM0gOSNnQYwO2K9V8O+DdH+NPiHxR4r8QGb7PHdrYaXNA5jeIW/JdGHcgr1BHJr1/wH8KfDngS5n1K0e4vb+4UJJeXj+ZLsH8IOAAvsB9a8F5Kp4p4nm92W67/wDA6n0kc69lhvYW99bPsedaV+zV4eWwVtd1PUZtQmYyXs9tM0KTOxyRsGQAOg74rv2m0j4V6fZ+E/BWgXl/JKGkW2slHCggNLNNKwUEngbmyT7CvVq53WPF3hnw9Hcya3qNvaCziWecSuAyRuSqNt6kMQQMA5PHWvfhSjD4VY+fnXqVPjdzegkeWBJZEaJnUMY2wSpIyVOCRkdDg4pxrgfB/wAU/AXj2eW08LanHdTwjc0JV45Nv94K4Uke4zjvXfmreuxlZp2Y0Vg+IrLXdQsVh8Pakul3AcMZmgW4DKAflKsVABOMkc1vYNeUfEP4g6r4b1Gx8K+EdL/tnXtRjknitmkESJDF96R2JHU8KMjPPPqikrvQ2/E/hKHxv4Ol8L+KfKeW4hAeaFSFSdR8ssYbJGG5AJ6ZBrgfgT4p1S+0i+8CeJz/AMTjwxN9jmJOTJCMiJ+evA257gA96zfhf8bG8f61c6Hqdn/Z99DmM2SB5HRod3nSySEBVjyVRF+9uBrP8SGPwR8ftC8TgiKz8T2smm3bE4XzowPLJPTJ/dj8DWb1NbOziz6axRTulFKxkNFfmh8e5Lmx+MGsz6rGypPFCLduoMfloFYe2VI+tfpiK+P/ABnp9pqn7Q72GoxrLFLo23a4DA4QnocjsaxxVX2VJ1LXsdWEhz1OW58ITwxSOWgYHPaqbQuvavuyb9n/AMG6+s8kMDWsiMMNbOU6/wCy25P0Fee6r+zJewEtperSKOy3EOf/AB5G/wDZa4sPm1CrFT1VzrrYGcJOKaZ8oMrDtTfn7E17xd/AHx5AT5E9jOP99lP5Mg/nWHN8FviTEcCyhk/3Jo/6kV2RxtB/bRg8NVX2TyQ7yOSfzpu016gfhF8SgcHSv/IsX/xdTR/B34kPwdPjT/emi/8AijT+tUV9tfeL6vVf2WeT+W3pThCx616W/wAMPGEUrQzrbxMhw2ZM8j6A1bg+FGtyn/Sb2JB6IrN/8TWUsyw0d5o6YZXip/DBnlyxKvNPEka9TXso+Fmj2SefrF/IEHUnbGPzOa6TRvDHgiAhrOze6I/5aGKWUfmV2/lXPUzmileCb+R108irt2qNL5ngthp+qaq/l6XayTH1A+UfU9B+deoaB8J7m4kSfxHPtTr5EJ5+hbt+A/GvdLe3t44l8iMRrjgbduPw4xU+MHNeHic+q1Pdprl/M9rC5DQp+9U95/gc1ows/h18X/C2p6ZGttZain9nTIvC/OfLyfXlkYn1Ga/QIgivzo+LZaLwzp2sxcS2N+jKfTKk/wA1FfofY3QvrGC+XpPEko/4Gob+te9lVV1MPFy3R85nVJU8Q+Ulop+KSvQPJuNopcUYoGJRTsUUBcSgUYpQKBXCnUmKdTEf/9f72am4qRqjrz2aITFFFFIYtFFNmmgtoXubl1jijUu7scKqgZJJPQAU0IeBXnvj3x9onhPSLhTMs+oSKYbezhYNM0jjC/KMkAE8kj6c4rhTr3iv4uXktj4NmfSPDsLmObVMETXJHVYBxge/5/3a5HwJ4R8M3PxivbfRkMtl4YhUNLIxkaa9ckF3Y8ZQ7hwAAVHFK8nbl69TojSiruo9un+Z6/8AB3wlf+DPANppGqqEu3eS4nUHOGkbIBPqFwD716Zg5qbNRuwRSx7Vu4pJJdDmc3KTfcMV+cX7V1vqVj4ys7K5vHu7aaCS8tvNRd8HmuVeFZQNzRgruVW+7nAr79udY8tslgi5xknHJryX4sfDbSfizpsNpcTiz1Ky3Na3IG7Af7ySLkEo2B05BGR3BwlVi/dR106E4++1ofGerfFbTb/XfCOp+D9Gj0W60Py4pmh2/vySilPlAyhAYfNkncc+/wCo1fGPw4/ZWn0LxHba94w1C3u4rKRZoba1VsSOhypkZwuFBwdoHPrivry41nSbTU7bRrq6ijvLxXe3gdgHkEeN5UHrtyM1pC+8jGs4uyiaG5d23Iz1x3r4Q/al/wCEo8L+PtI8c6HcT2gksjaRXMJKlJEZyyZ/2kfOD159K2NL8HeE/Df7QbPqPipnMUbalGs0oVvOdyPs0spbBwp3beCy8Y9fqS3vfB3xK06/08xQ6rYW1ybWXzUEkDyoqsTGxyG27sbl6MCO1G6sOyg01qfDX7Kq6rL491PWHMj232F1upWJO6WSRWQEnqxIY/nX2z4q8L+EviDpJ0LxLbebFu3xODtkifGN6MOh/Q9wRTD4a0jw1Yf2X4ZtINOgwWVIUCrvP8RA6n3PNQWyXYuUmaTI2BXQD5dw/iHpXJKq4S5bHoQw8akPaXseZ/DvXdf+HvjT/hT3jO5a8t7iMzaDqEnWSNc5hYnuADgdiMDgrX0rivmT9oeFrbwlpnjO2+W98Papb3MUg6hHYKy/QsF/KvpeCZbiFLiP7sihx9GGRXSrHnVV1JgK+TfilLBonx38NaozqBe2otZBnkbmkjUn2JcY+lfWYr4D+KGn3vjHXvGPia2d/O8OT26QBeyRllcj/d2l/wA65cdy+ycZddDfAJ+0cux9P6BJ5WoTWzfxrkfVT/ga6twK8T8L+LI9c0qw8TwY3TIGlUdpF+WRfzz+GK9ljuI7iJZ4TlHG4H618XgpcqlRlvFnv4+k+aNZbNEMsMb/AHgD9RVB7O3zzGv5CtNjVZzXW0csWzONjan/AJZr+VRmyth0jX8qvEimEilY0uzxfW7eKPU7kBQP3h7VyV2NQnP2bS0XzG+9LIPkjHqQPvH0X8yBXaayjXGtzwL1aU/lU3kxW8WxBwK8GU+WbfmfWU3anFeSOAtPCWn28ou7sG8uupmuPmOf9kfdUewFbrRAcVpyEVTkqZVZTd5M0iktjOkTFUnq/LVB+KuBqjhvikVbwFMrdrmH/wBCNfQ/7OnxOk8XeHm8Ka42NX0ZFT5uGltx8qPj+8nCt+B718x/Fq52+FrewX71zdqAPUKrH+ZFTaydT8Ba9pvxM8ND95Z7Ir6IcB1wE+b/AGXX5W9Dg9a+uynExpU4U5/ab/Cx8pnOEdadScfspfjc/SXFJiuf8K+J9J8ZaBa+I9EkEltdIGH95G/iRh2ZTwRXQV9DY+S20G4oxTqKB3G4op2KDQFxlLmiimAtLxQBS0Af/9D74NR1KaZXC0WhtFOoqbDuAFeA/Ei+vfHPi60+EGiytFAyC81udOqW4IKxZ9W4/Ne2a95uJ4rS3ku5ziOJGkc+iqMn9K8B/Z/gk1ex1n4kagM3XiDUJGQn+GCIlUUewJI/AU7J2izSm7Jz7fmeuazPYeBvBN5caZEkFvpNhK8Maj5R5SEqPxI/Gvnb9m7/AIluveLNHujm6VrSZi33mDK5Y/8AfTZ/GvavjCHb4XeIdnUafKfwAyf0r5Qh1+/8DfFSfxyEMmki3tLfUxGMskFyu1JiB1CyR9foO9c+IrtYinDo1L9P8zqw9Hnw9SXW6PvYNmorhS8RUdayrDU7a9t47u1lSaGZA8ciHKsrcggjqDWqJVI610qV1Y4+Vxd0cXeWEc0sZnUnym3qO2fUjvils9OjF691Gp8yXG9ic8DoB6CuveOKTlgDSKscf3QBWH1dXud/12XLyosJ8qgegrzv4p+BrHx74RvNNeCOS/jhkfT5m4eKfb8pV+q7iAD2x1rvjIKb5grov0OBXT5kfn0/hrwz4h0KHwf4etlXVbyRITZkZmgl3ATPMpG5PLG4sxx04JyK+/dJ0vT9C02DSdKhjt7a2QRxxxKFUAegHHPU+9KsVok7XSRRrM4CtIFAdgOgLYyRUhmWsaNJUk0ne53Y3GSxTi3G1lbQdcQxzrh6yzZwQHeKsSXSqK5nX/EelaBpsur63cx2trCMvJIcD6DuWPYDJNVJx3Zzw5krJ6Hjn7RF0bnwTb+FrX5rvXNTtrSBB1OH3kj6EKPxr6ctoFtbaK2XkRIqD6KMV8v/AA50zVPip44T4r65A9toumBotAtpRhpGPDXLD+R9cY+7k/Uxq4rTUzrS2igFfJWheXpXxa8aeF75QRqOLxEbo6N8zD3BEv6GvrWvmb47+H9Q0XUNO+LegRl5tKIhv41/jt2JGT7DcVJ7Ag9q48xoOtQlCO5vgKqhUtLqeF2Ekvwr8WT+GL9j/YupP5tlM3SNumCfbhW/4C1fQGheJRp8n2S6OYGPB/uH1+h71yHiLT9A+IfhlJ0Pm2t0vmwSr9+J+mfZlPDD6isaG3GnWsVlGWZYUWMFiSSFGMknJr4KviLyVTaa0fn5/wCZ91h8OqlN05ax6eR9Gi6jkUOjBlIyCOhFRtKDXz/H4xHhsRtdXKRQyvsUTH5Nx5xnopP1Fd5aeMrK5RXkBTcOGU7lP0IrrhiVJJyVjza2XTpyajqd40gqB5wK55dcsJBlZ1/Hj+dRSaxZL1mX8Dn+VaOrHuYLDz6owb5RFrlzM3dAw/4F1/lWdLLurz2XxffP8U73Qb2XdaT2kbWKkAYKjc2D1O47+vpXamSvIxlF0569dV8z38HLnhfqtPuFc5qpI2KlZgKpytWEUdliu5zVKTrVlzjiuf17WbXQdNm1W7I2xL8q93c/dUe5P6c100oOclGK1Y5TUIuUtkeaeLpRrvjzS9Aj+aKxAmm9MnDkH/gIUfjXrUXlSI8FyiywyqUkjbkMrcEGvG/ANnc3E8/iTUebi/ZmBP8Adzkn8T09gK9fiPFejmDUJRoxfwq3z6/iceChzQlWmvjd/l0/A57w14i8QfAfWpL6ySTUPC1+4M0OeYm6A56LIBwCeHHB56fb/hHx14U8c2K3/hq+juARl4s7ZYz6PGfmB/T0Jr5Vgn2I0MirJFINrxuAVYHqCDwRXI3Pwx8M3d0NQ0K7uNGuM5AhO5Af9kEhl/Bse1etgc9SioYn7zwMwyK8nOgfoPtNeN/Ef40eGPAULWduw1LVn+WGytzuIY8DzCudvPb7x7DvXz0ngbxLdRfZtU8Z3ktv0KASEkenzSkfzrpdB8O+DfBbfa9HgNzf4/4/Loh5Ae+wYCp+Az711189oQjeGrPOo5LVlK0jJv8A4p/Gzwatt4w8W/ZG06eZVm0wKqvEjcgHA3KxHTLNg/eFfZ1le2+pWMGo2h3Q3MSTRn1V1DL+hr89PjJrVzqGl2uiRkyXOo3SBEHJO3gfmzKK/QDQtN/sfQ7DSM5+x2sVvn18tAv9K6srxNTEUfa1Fu9DDNcLDD1FTjvbU06WiivRPLFpaSnUAf/R++jTKcaZXDIpBSim04VKGch8Q5ZIPAOvTQ/fXTLkjH/XJq5b4JRxW/wp8PpF0NrvP1d2Y/qa8m19tX8RfEbxB4O8ReKL3QjIqDTbVCgtrmzlj2sFD8M+7IbnPXHTjr/2fdVaX4ew6HcnF1otzPp86HqpSQsP0b9KOb3jp9name1a/pcevaDf6JLjbe2stuc/9NEK/wBa+SPh7eW0viHRE1uJJLfXNMm8P38Uoyv2i3O5VYH1KSL+NfYqSV8f+P8Aw7d6J4y1DSrN/s66vINc0aftHfQkNKn4uA+P7rGuDMHyezxK+w9fR6P7t/kdmXJT58M/tLT1WqOmbwR8QvhLcSz/AA8I1vQXcyHR7p9ssOTk+RIf5H8QTzXQaR8dPBk8osfEL3Hh++HD22qRtFg+0mNhHvkfSvTvA3jC08beG7fW4V8qVsxXVufvQ3CcSxsPZunqMHvW1qOg6PrERg1O1huEP8MqK6/kwIrs5b6xZyOdtKiMax8VaFqKCSw1C0uFPQxTRt/Jq0H1S3A3GWMD13D/ABrhbz4G/DC8cyPodmrHuibP/QCtfOHjT4UeGPCPje3tGtEl0vWkcWyszHyLmEBniznO10O5c8ggisMTVlQpyqtXSOjC0YYipGkpWb7n2QL+NwGRgwPIIORTWv1HevmL4feMdC8AWNz4Q8T/AGiOOyuGbT5o7eaZZLaX5wC0aMNyMSpz7V6E3xk+H2MwjUJz2EVhck/qgFTTxMZwU1JWZVTCyhNwcXdHqjaiO1eUeJvjLpWgan/Ylvp+o398VZhFDCUUqp2lg8u0FQeNy5FZ8/xgsH/5BXhvWbk9jLFHbr+cj5H5V5rqN7q2ueJJvGOuWkenhLJbO3tVlEzKiuZHd3AC5YkcD0rjxuZU6NNyjNOXRXO7AZXOvVUZwaj1Z1+neO/ir47sI9Q8KaXp+l2c5ZUur6Zp5BsYo2Io1AyCD14rmPCvgwa/8Xrnw38YLufWri3tVvtLVz5drKmfn/crwCp/hBx8pzmvR/2eXn1L4c2zyWxhgiklSKRjkzEyM7uBjhQzFV5OcE034kINJ+KPw/1m24mkv5rB8dWimVQQfYbj+depTT0bPMqSV3GJ9JRxxwxrDCoREAVVUYAA4AAHQCnUE0x5Y4kaWVgiICzMxwAByST2Ards88kqlqMumpavDqrwrBKpR1nKhWVhgg7uCCOtfMutfFPxf8QtYn8O/CwLbWNudlxq0vA+qnBxn+EAFyOeBWI/wj8OSk3Xi3VL7WLk8uxk8tM+2dz/APj1eZic2o0HaT1PRoZbUqbnH+JtOuPg/q8+o+FLiHV/Ct5JumtYpkkktWb0AJIA7N0I4bnBrZg1XTdcs01LSpRNDJ0I4IPdWHUMO4NJffCv4ZOpWCyniP8AfS4fP/j24fpXO6Z4B0jwzfNd6Te3mxhhoXZCh/3sKM47dD718rmOIwmJbqU9Jem59dllPEUbQmro0r61t762ks7uNZYpBtZHGQRXkFx4V1bQpmk8KajNZ858h2LRn6Zz+oNe0Sd6yL23EqZ/iFcmGxU6WkXo+nT7j16uGp1fjWvfr955U3j34gaDEZdWtbe5iTAMoGOvA5Qjr/u1rR/FnVlgS4utAuBHIoZJEL7WB7qTHgj6Gs7x5GU8Nzsv9+PP/fQr7/8AhOUX4YeGxGcr/Zdv0/3Bn9a+jwOEoYqm6lSCTv0uj5rNcVVwVRQpzbTXW3+R+bPijxrcatqdh4hs9Ons59ObJkfJVlyCFJ2jHOR+NfSGnazb6pYw6hbHMc6CRfoe31HQ19MfEjUPBUHhO90zxzewWdjfwvCfMPzEkcGNBlmZTgjAOCK/OHwR4vTRbe40WVZ72KKUm3e3jLZUk54OCAfvDPqanNsrjKjH2C1j+TFk+aN1Ze32f5n0p5wNRPJXndn460yWVYbmG8tSxABngZVyfcZx+Nd5hsc18tVoTpNKorH1EKkJ6wdxHOa8P+IqvqXi3SNDYtJE6h2iHQlmIJ477Vr2015Dc/v/AIzWCnpDCCPwjdv5mvRylfvZT7RbOHNZWpKPdo6rTYgjYUBVVcADoB6V0cfSup/sW0vQ0uPLkY/eXv8AUd6z5tA1GDJjUSr6oefyPNc1WEm7nRDF056XsZwepVkqFra6jOJIpFPupqWKzvZuIoZG+imsHFm3NHe5MJmHele6jhhe4ncJFGpd3Y4CqOSSfQVPPpg0yzfVPEFxFp9rGMs8rDP0AHUnsOvtXmFpaa/8btaHhfwdDJZ6DbuGvL2UfeA/ik7E/wById+T6juwWW1MTJaWj1Z5+MzOlh4uzuzrPgt4dn+J/wAS38dX0bDR9CYC1Djh5hzGPqM+Y3odor74JrlPCfhrRvBegW3hvQY/LtrZcDP3nY8s7nuzHkn+ldF5lfc0oRpwVOGyPgsRUlWm6kt2T0ZqLfShq0uY8pJmlzUYOaXNFxWP/9L75NMp5phNcMi0FANJSVI7HM+K/BHhLxxaLZ+KtPhvUjOY2fIdCe6OpDL+Br5m1nSU/Z78Xr4j0dHfwjq/l217EHMklrcDOyQbiWYHk9zgsOy19YXUVyzEp8y9gK8Z+KnhPX/Ellpt1oJhF9o9+l/DBeAmCYoCNj4+vB/l1rGdXWzR1UYab/I9A0zxDYatZRajpk6XFvMu6OWM5Vh9f5jqK5/x94ai8b+Hm09JBb31u4ubC5/55XCfdJ/2WGVcd1JryqTxf8VYk8lvBUaS85aG+jERJ6nGM81ylpqP7QGkvJeGGxuoHcstjcOzvGp6KJgFJx/tMazlUXwyeh0RotNSjuP8B+KbzRPE8tyy/YZ3cW+u6dJniRBhJo8fxejdHQ9cgV9O+C/HWg+N9Pa/0aUkxSGGeGQbZYpFOCsiZ4PcdiOlfGnjLXNZ8QNHqWr+FdR0zWLddkd/p7JcKy/885U+XfHnsTkdjXnWn+K/Euk6qPEenWt9pOrKuyVlt5Ht7lR0WVMZI/AkeveuPDe0w8uRO8OndeXmu3Y9DE06eLj7T4anXs/PyZ+pAwRXzV8cPhteXMsHxD8LpLLdafMlzfWEZOLlIwV8xV6eciEjjll46gZxPB37TWlTQxweO7G40eY/L55jdrZz6g43r9CDj1r6AtfHvhK80w6zbanayWa7Q06SKyLuIUbiM7eSOuMd69WThUi4S2Z4sFUozU47o+XNI8U6Zq1ot3p84eNh2PKn0YdiO4Nah1WL+/8ArWJ8StK8PeIviXZaN4Hb+zNbnuGi1NrZFkje1MQlW5ZV+TcD8vOGz17E9VbfATS8ga5rerXrd0SQQqf+AxqT+tfEYjhzlqNRqafifbUeIKbpqVSD5vwOfvdfsrZC00qJ7uwX+deUeLfGWnahFFo9jqEKNeTx20kiMG8qORtrucccCvqKy+B/w7tMSLoQuGH8d27Sfn5r/wBK6keAvDbWUmmR6bp6W0ymOSKKIMGU9iEUfzrowuS06M4zk27eVjnxHEHPCUKcbX631Oi8Oz+FtD0hfD+iyLHa6OYrDnhQ7KhRd3Rmbeucd29a+efE3jbwvrPxx0tNW1CC00zwusshmlJEcl84CiMPjbmMYJyRyCK7YfALwsqiGxvNY0+zEonNtBdtHB5gGA4VssDjuDkV6Z4f8G+EPDelLoelWsX2VckxlfN3E9WfO7cx7k19O6zdrI+VtCN3e50FjrmnanCLjTbiK5iPIeF1kX81JFeI/tHeK7rQ/hw9rYMUk1S5SzLDjCEM7j/gQXB9ia7i8+E3gC/mNza6W2mTnn7Tp7NaOD6/umUH8Vrzzx98C/EXivRP7DtfE01xbJKs0UWpxrI6OoIBE6BX6Eg5BovJ9RQdNNNnjN7dtp0Gj/DDQpGtoJIzc6lNEdsjxp9/5hyDK/BPYYHSux1nxNbaPpMt9KNsFrFkIvoowqj68AV5xqPw0+NfhPWE1y80tdaWG2NqZLNwzNHncCVA37h67Oa868W+OJ77S7jRb7TLqyuNylllHClWDYYEAjp6V8rXymvKdOM1ddX5t6v7j63D4/DKE5QevRfLQ950C51q40pLvXWUXFx+9ESDAiRuVT1JA6k96tyv6mvGv+Fy6SY1H2W634GVATGfY7v6VTf4m6jfHbpeiXc5PT7x/RUauN5TiZSbVO33HfHMsNCKTqX+89gkmQdTWdNcg9K82S8+LOq/8g/w+0APRplK/rIUH6VaTwD8X9U/4/r2CxQ9QrDI/wC/an/0KumGS1ftyS+ZEs6or4U38v8AMrePru0t/DtxDcMA8+FiTuWDA5A9BjmvfPDnxFf4bfBHSL7UCHnitFS3tycFnkLNGp7gBTlvQCvLNF+CFnbXa6h4iu5dTlUg7GBWMkeuSWYe2QPaqPxkH2a+8Orfj/QBcsZf7vDR5B/4Bn8M17mEpKhD2UXfqzw8fW+tT9rKNuiOn0HwRceLpv8AhYXxYna9uboebDZuSscUXVd4zwuOQgwAPvZOa9J0u90W605Ljw8sKWbZEfkIEQ7SVOAAMjI69685+JmuSTeGRbWkoC6hcRW3mIePLkPOCOxAx9K7WKS3s7eOytFCQwII41HQKowB+VfKY6vUrw9rVb1bsuiS/wCHPcweFjSlyQWy39S1f3lrawme8mSKPIG6RgoyTgDJ7mqEyqM15vq8p1v4iWGk3PNrp1sb4xno0pO1SR328EV3c1yOgrlnh/Zxhrq1f/I7qU3NyS2TsVpODXhPjDULvw78RLTW7GD7TKbYERcndw6EfLz05r1nWPEej6JEZtUuEi4yEJy5+ijk15z4QF/4/wDH8XiWKF4dP0xSqO3c4O0Z6biW3EDoBXt5NQnzyqSj7tmvU87OKsPZqkpe9dHRaX8c/D2BFqtnc2rjrt2yDP5q36V18Xxl8Asu43rr7NDJn9FNdjceENM1Pm/t4ps95I1Y/mRVNfhP4Mc7n02DPsij+Qr1vqlB62a+Z4bq1F9pP5HJXPx28D2qnyXubg+kcWP1crXOy/GXxb4gY23gfQnYtwJ58uB74G1B+LEV7Zp3ww8KWzBrbTrdCO4jUH88Zrt7bwjYxqAqgAdBzVxwlJbRv6sylWk95fcfNuifCbWfF1/HrHxW1d5wpytjbt0H90sAEQeoQE+9fWehXGkeHdNi0fQbSG0tIRhIohge5Pck9yck96hg8P2sXQfkBWrFpdqv8Ofqa64uey0Rzz5HuaUOuCQ4KkGtFb7d2rMjt4YxhFA+lWVUCtY36nPJR6Git1mplnzWetWEFaJmTSLolp/m1XUU+quQ0f/T++DUZqU1Ga4GWhKKKKkoKDg8GiimBXe1t3+9Gp/Cq76ZaP1TH0NaFFS4J7opTktmYkmgWMnUfng/0qjJ4S05/wCED8BXU0uah0YPoWq9RbM8F8TfAfRtd1P+3LW8mtb0D5WIWaIYGP8AUzK6D8AK8z1P4I+ILCdrm60HRPEUZ+95Bl0ydh7iFvKJ+qivsbNGaPYx6FfWZ9T5e8LeL/APw4VrbUfBt94VZ+JLgQG5jb63Ee5iPqK9v0Lxx4I8VoBoGr2tyT/yzilCyfihw4/KuxdY5VKyKGB6gjNedeIPhL8O/EpMupaRbiU/8toV8qQH13Jg0OmTzxlvdfid21nEPuKu71cF/wCZp4t2xh5GPsuFH6c/rXi8fws8T+HDv8CeKb62Rfu2moYu4Pph/mUfQ5pJfBfxd11v+J54sXT4j1i0qBYzj2kbL1DXkPkv9tHsVwNOsozcXjRxIOskzAAf8CY1wOr/ABj+GWhkxXWt2skg/wCWVsTO2fTEQauZh/Z+8FTyi58Ry32szdS99cPJz9MgfpXoWj+APBmgKF0jSrWDHdI1B/PFCjLogtT6ybPN5fjgb/5fCPhnV9Tz92SWMWsR/wCBSEnH4VUOu/H/AF3jT9L0rRYm6PO73EgH4YT9K9/jhhiGI0VfoAKfin7OXVh7SC2j9588n4b/ABP1s7vFHjO9VW+9Fp6par9MoCa6fw98JtB8NyS3Vs0tzdTqEluLqRpZHAOcEuTxmvXCtNxSdJPctV5L4dDgn8J2ynKQxZ9lA/pUbaDIowqce2K9AIzTCgNQ8OjRYqXU84fRJB1jP5VXbRm7xn8q9MMS0wwr6VLoFrEs8ubRz/zzP5Vyvij4faZ4s0x9J1aJ2iY7lKjDIw6Mp7Ef/rr3nyR6U0wipVC2qK+tdD4G1T9m3xNBEYPD+s+Zb7g6wXKumCOhym5cj12io28A/tBWXyRG2ugO+6I/+hKpr778hfSl8gUTw8Z/xIp+qLhjJw+BtfM/Otvhp8epdXXXPscSXSxeRvDwgbM5wRkg81rp8HvjlrB26nqMNnGeoRzn8okH86+/vJFH2daFhoKzUFp5A8dUd1zPXzPizQf2Y9PtZRd+I7ifU5c5K/6uMn35Ln/voV7ppvguHTLdLSygjgijGFRAAoHsBXsHkL6Un2dfStHSct2ZrEW2PPY9BYfeIH0FXU0aNeuTXbfZh6UfZ1oVETxDOUWwCD5VxVhbZh2rojbij7OKpUyHWMMQNUqwNWv5FOEOKfIS6hnLbmn+QRWkEpdgquQlzKKQirKxgCpgtPxVcpLkRbKXYKmAp2BVWJcj/9T75NRVIajrgZaEopaKkoUUGkopiCiikNAxaKSikAtFFFABRSUUAOopKKYBRRSUALSUUlIApMUtFAxuKTFPpOtIdxtJin4oxRYLkeKQqKkptFh3GbRS7afikosO43AowKdilIosK43FGBTqSgBMUlPxTSKYxuKbn3/Qn+QqTFRlZGUYUkZOCCR1/pVRVxNibhkgkD68U4cjPBHTIOaX5yz5yGI7cnr2zSNuORtI3NkZ+mKrlVieYdggAnoelJ82doGSRmlbbhypOeCM9OOOKa43YAG75RwKHFBcdhl5YY96XDn7o7Z5NNkXHzbCPlHP4dKQgeZuIAwwXPqMc0ciuFyUU7FMUYGPTin5qGB//9X75NNxTjS1wlEeKbipKSpKQzFFOooAQCjFOFKadguR4oxTjS1IxuKMUtL3oEMxS4paKYBikxTqDQIbilxS0CmFxmKTFPptSUGKTFPFIadgG4oxThRSAbilxS96dTC5Him4qSkpDG4oxTqKAuNxSYp9FADcUYp1FAXG4oxTxSUwuR4pCi+lSd6WkMi2LjpQEX0qWkoEM2jpik2L6VJSCgBgQelLsX0qSimAwDHAp1FJQB//2Q==";

const CANDY_THEME_CSS = `
main[data-theme="candy"] { background-color: #FFFBF5 !important; }
[data-theme="candy"] .candy-scene { display: block; margin: 0 auto; width: 112px; height: 112px; border-radius: 16px; object-fit: contain; animation: candyBob 3.4s ease-in-out infinite; }
@keyframes candyBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
[data-theme="candy"] [class~="bg-[#f5f7fb]"] { background-color: #FFFBF5 !important; }
[data-theme="candy"] [class~="text-[#FD7E3B]"] { color: #EF8632 !important; }
[data-theme="candy"] [class~="text-[#F97E2F]"] { color: #D96E1E !important; }
[data-theme="candy"] [class~="bg-[#FD7E3B]"] { background-color: #EF8632 !important; }
[data-theme="candy"] [class~="bg-[#FD7E3B]/10"] { background-color: rgba(239, 134, 50, 0.12) !important; }
[data-theme="candy"] .border-orange-100,
[data-theme="candy"] .border-orange-200 { border-color: #F7CDA0 !important; }
[data-theme="candy"] .text-orange-300 { color: #F0B27E !important; }
[data-theme="candy"] .text-slate-900 { color: #4A3426 !important; }
`;

export default function SellerMessagesH5Page() {
  const searchParams = useSearchParams();
  const userId = getNumericH5UserId(searchParams);
  const uidSignature = getH5UidSignature(searchParams);
  // 新版小程序换肤参数：?theme=candy。缺省/其它值一律按原皮渲染，零回归。
  const isCandyTheme = searchParams.get("theme") === "candy";

  const [tasks, setTasks] = useState<VisitorTask[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [detailByKey, setDetailByKey] = useState<Record<string, DetailState>>(
    {},
  );
  // StrictMode 双挂载防重复拉取（与 support/h5 的 ref 防抖同款思路）。
  const initialLoadRef = useRef(false);

  const loadList = useCallback(
    async (targetPage: number, mode: "replace" | "append") => {
      if (!userId) return;
      if (mode === "replace") {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setListError("");

      const result = await postSellerMessages({
        action: "list",
        user_id: userId,
        ts: uidSignature.ts,
        sig: uidSignature.sig,
        page: targetPage,
      });

      if (!result.ok) {
        // 加载更多失败不清空已有列表，只提示；首页加载失败进错误态（带重试按钮）。
        setListError(result.errmsg);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const data = getRecord(result.data);
      const rawList = Array.isArray(data.list) ? data.list : [];
      const parsed = rawList
        .map((item) => parseTask(item))
        .filter((item): item is VisitorTask => item !== null);

      setTotal(getNumber(data.total));
      setPage(getNumber(data.page) ?? targetPage);
      if (mode === "replace") {
        setTasks(parsed);
      } else {
        setTasks((current) => {
          const seen = new Set(current.map((task) => String(task.id)));
          return [
            ...current,
            ...parsed.filter((task) => !seen.has(String(task.id))),
          ];
        });
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [userId, uidSignature.ts, uidSignature.sig],
  );

  useEffect(() => {
    if (!userId) return;
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    // 用 0ms 定时器把首拉挪出 effect 同步体（react-hooks/set-state-in-effect），
    // 行为等价：挂载后立刻拉第一页。
    const timer = window.setTimeout(() => void loadList(1, "replace"), 0);
    return () => window.clearTimeout(timer);
  }, [userId, loadList]);

  const loadDetail = useCallback(
    async (task: VisitorTask) => {
      if (!userId) return;
      const key = String(task.id);
      setDetailByKey((current) => ({
        ...current,
        [key]: { loading: true, error: "", data: current[key]?.data },
      }));

      const result = await postSellerMessages({
        action: "detail",
        id: task.id,
        user_id: userId,
        ts: uidSignature.ts,
        sig: uidSignature.sig,
      });

      if (!result.ok) {
        setDetailByKey((current) => ({
          ...current,
          [key]: { loading: false, error: result.errmsg },
        }));
        return;
      }

      const detail = parseTask(result.data);
      setDetailByKey((current) => ({
        ...current,
        [key]: {
          loading: false,
          error: "",
          // 详情解析失败（缺 id 等）回落列表里的这条，时间线至少能画出提交节点。
          data: detail ?? task,
        },
      }));
    },
    [userId, uidSignature.ts, uidSignature.sig],
  );

  function toggleExpand(task: VisitorTask) {
    const key = String(task.id);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    const cached = detailByKey[key];
    if (!cached?.data && !cached?.loading) {
      void loadDetail(task);
    }
  }

  // 商品链接：小程序 webview 安全跳转 —— 一律当前页跳转（location.assign），绝不 window.open。
  function openItemUrl(url: string) {
    window.location.assign(url);
  }

  const activeTab =
    FILTER_TABS.find((tab) => tab.key === filter) ?? FILTER_TABS[0];
  const visibleTasks = activeTab.statuses
    ? tasks.filter(
        (task) =>
          task.customer_status &&
          activeTab.statuses!.includes(task.customer_status),
      )
    : tasks;
  const hasMore =
    total !== undefined && tasks.length < total && tasks.length > 0;

  // ── 身份缺失：不发任何 API，只给回小程序的指引占位。 ──
  if (!userId) {
    return (
      <main
        className="fixed inset-0 overflow-y-auto bg-[#f5f7fb] text-slate-900"
        data-theme={isCandyTheme ? "candy" : undefined}
      >
        {isCandyTheme ? <style>{CANDY_THEME_CSS}</style> : null}
        <header className="border-b border-orange-100 bg-white px-4 py-3">
          <div className="flex items-center gap-1.5 text-base font-semibold">
            <MessageCircle className="h-4 w-4 text-[#FD7E3B]" />
            我的留言
          </div>
          <div className="mt-0.5 text-xs text-slate-500">帮你用日语问卖家</div>
        </header>
        <section className="px-4 py-10">
          <div
            className="rounded-lg border border-orange-100 bg-white p-5 text-center shadow-sm"
            data-testid="seller-messages-missing-identity"
          >
            {isCandyTheme ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={CANDY_SCENE_IMG} alt="" className="candy-scene" />
            ) : (
              <MessageCircle className="mx-auto h-8 w-8 text-orange-300" />
            )}
            <p className="mt-3 text-sm font-medium text-slate-700">
              暂时认不出你是哪位买家
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              请从袋鼠君小程序的客服或商品页进入本页，袋鼠君才能帮你查留言进度哦～
            </p>
          </div>
        </section>
      </main>
    );
  }

  const renderTaskCard = (task: VisitorTask) => {
    const key = String(task.id);
    const pill =
      (task.customer_status && STATUS_PILLS[task.customer_status]) ||
      FALLBACK_PILL;
    const pillLabel = task.status_text || pill.label;
    const platformBadge = task.platform
      ? PLATFORM_BADGES[task.platform] || task.platform
      : undefined;
    const typeBadge = task.message_type
      ? MESSAGE_TYPE_BADGES[task.message_type] || task.message_type
      : undefined;
    const itemUrl = getSafeItemUrl(task.item_url);
    const expanded = expandedKey === key;
    const detail = detailByKey[key];
    // 详情接口拿到的字段更全，展开后优先用详情数据渲染时间线。
    const view = detail?.data ?? task;
    const isAgreed = task.customer_status === "agreed";
    const isRejected = task.customer_status === "rejected";
    const canTransferHuman =
      task.customer_status === "closed" &&
      Boolean(task.status_text?.includes("可转人工"));

    return (
      <div
        key={key}
        className="rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
        data-testid={`seller-messages-card-${key}`}
        onClick={() => toggleExpand(task)}
      >
        {/* 徽章行：平台 + 留言类型 + 状态胶囊 */}
        <div className="flex items-center gap-1.5">
          {platformBadge ? (
            <span className="rounded bg-[#FD7E3B]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#F97E2F]">
              {platformBadge}
            </span>
          ) : null}
          {typeBadge ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
              {typeBadge}
            </span>
          ) : null}
          <span
            className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] font-medium ${pill.className}`}
            data-testid={`seller-messages-status-${key}`}
          >
            {pillLabel}
          </span>
        </div>

        {task.goods_no ? (
          <div className="mt-1.5 text-xs text-slate-500">
            商品编号：{task.goods_no}
          </div>
        ) : null}

        {/* 竞买队列徽章（P1 静态排位展示，无倒计时）：统一渲染后端下发的 queue_state_text
            ——它已经按角色分好文案（negotiator="已为您发出，等待卖家回复"、
            queued="已为您加入该商品的讲价队列（当前第 N 位）"、watcher="该问题已有顾客问过…"），
            前端不再按 queue_rank 猜测角色（曾把 rank=1 的 negotiator 误标成"排队中·第 1 位"）。 */}
        {task.queue_state_text ? (
          <div
            className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-[#F97E2F]"
            data-testid={`seller-messages-queue-${key}`}
          >
            {task.queue_state_text}
          </div>
        ) : null}

        {/* 砍价价格行：标价 → 目标价（JPY 整数） */}
        {task.message_type === "bargain" &&
        (task.listing_price_jpy !== undefined ||
          task.target_price_jpy !== undefined) ? (
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-sm">
            {task.listing_price_jpy !== undefined ? (
              <span className="text-slate-500">
                标价 {formatJpy(task.listing_price_jpy)}
              </span>
            ) : null}
            {task.target_price_jpy !== undefined ? (
              <span className="font-semibold text-[#F97E2F]">
                → 目标 {formatJpy(task.target_price_jpy)} 日元
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 砍价成功横幅：显眼绿色，agreed_price 为准 */}
        {isAgreed ? (
          <div
            className="mt-2 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"
            data-testid="seller-messages-agreed-banner"
          >
            {task.agreed_price_jpy !== undefined
              ? `砍价成功 ${formatJpy(task.agreed_price_jpy)} 日元`
              : "卖家已同意降价"}
            <span className="mt-0.5 block text-xs font-normal text-emerald-50">
              卖家已同意，请回小程序按新价格下单～
            </span>
          </div>
        ) : null}

        {task.customer_request_zh ? (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-700">
            {task.customer_request_zh}
          </p>
        ) : null}

        {/* 卖家回复块 */}
        {task.reply_zh ? (
          <div
            className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2"
            data-testid={`seller-messages-reply-${key}`}
          >
            <div className="mb-0.5 text-[11px] font-medium text-blue-700">
              卖家回复
            </div>
            <p className="text-xs leading-5 text-slate-700">{task.reply_zh}</p>
          </div>
        ) : null}

        {/* 未能发送：友好说明（信息态，不吓人） */}
        {isRejected && task.reject_reason_zh ? (
          <div
            className="mt-2 flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600"
            data-testid={`seller-messages-reject-${key}`}
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>这条留言没有发出：{task.reject_reason_zh}</span>
          </div>
        ) : null}

        {/* 卖家未回复已结束：给一个转人工入口，别让顾客卡在这里没办法 */}
        {canTransferHuman ? (
          <a
            href={WECOM_KEFU_CHAT_URL}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-[#F97E2F]"
            data-testid={`seller-messages-human-kefu-${key}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            联系人工客服
          </a>
        ) : null}

        {/* 底部行：时间 + 商品链接 + 展开指示 */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            {formatTime(task.created_at)}
          </span>
          <span className="flex items-center gap-2">
            {itemUrl ? (
              <button
                type="button"
                className="flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-medium text-[#F97E2F]"
                onClick={(event) => {
                  event.stopPropagation();
                  openItemUrl(itemUrl);
                }}
                data-testid={`seller-messages-item-link-${key}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                商品链接
              </button>
            ) : null}
            <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
              {expanded ? "收起" : "详情"}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </span>
          </span>
        </div>

        {/* 内联展开详情：简单时间线（提交 → 已发给卖家 → 卖家回复） */}
        {expanded ? (
          <div
            className="mt-2 border-t border-slate-100 pt-2"
            data-testid={`seller-messages-detail-${key}`}
            onClick={(event) => event.stopPropagation()}
          >
            {detail?.loading ? (
              <p className="text-xs leading-5 text-slate-400">
                正在加载详情…
              </p>
            ) : detail?.error ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs leading-5 text-slate-500">
                  {detail.error}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-medium text-[#F97E2F]"
                  onClick={() => void loadDetail(task)}
                  data-testid={`seller-messages-detail-retry-${key}`}
                >
                  重试
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {renderTimeline(view)}
                {view.minimum_bargain_price_jpy !== undefined ? (
                  <p className="text-[11px] leading-4 text-slate-400">
                    小提示：本单砍价下限约{" "}
                    {formatJpy(view.minimum_bargain_price_jpy)}{" "}
                    日元（低于标价八折的留言不代发）。
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  // 时间线：提交（created_at）→ 已发给卖家（sent_at）→ 卖家回复（reply_detected_at + reply_zh）。
  // rejected 单：第二步换成「未能发出」并展示原因，后续步骤不再画。
  const renderTimeline = (view: VisitorTask) => {
    type Step = {
      label: string;
      time?: string;
      done: boolean;
      body?: string;
      pendingNote?: string;
    };
    const steps: Step[] = [
      {
        label: "提交留言",
        time: view.created_at,
        done: true,
        body: view.customer_request_zh,
      },
    ];
    if (view.customer_status === "rejected") {
      steps.push({
        label: "未能发出",
        done: true,
        body: view.reject_reason_zh
          ? `原因：${view.reject_reason_zh}`
          : undefined,
      });
    } else {
      steps.push({
        label: "已发给卖家",
        time: view.sent_at,
        done: Boolean(view.sent_at),
        pendingNote: "客服正在为你翻译成日语并发送",
      });
      steps.push({
        label: "卖家回复",
        time: view.reply_detected_at,
        done: Boolean(view.reply_detected_at || view.reply_zh),
        body: view.reply_zh,
        pendingNote: "等待卖家回复，有动静会同步到这里",
      });
    }

    return (
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-2">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                step.done ? "bg-[#FD7E3B]" : "border border-slate-300 bg-white"
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-xs font-medium ${
                    step.done ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                {step.time ? (
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {formatTime(step.time)}
                  </span>
                ) : null}
              </span>
              {step.done && step.body ? (
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {step.body}
                </span>
              ) : null}
              {!step.done && step.pendingNote ? (
                <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">
                  {step.pendingNote}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <main
      className="fixed inset-0 overflow-y-auto bg-[#f5f7fb] text-slate-900"
      data-theme={isCandyTheme ? "candy" : undefined}
    >
      {isCandyTheme ? <style>{CANDY_THEME_CSS}</style> : null}
      <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="flex items-start justify-between px-4 pt-3">
          <div>
            <div className="flex items-center gap-1.5 text-base font-semibold">
              <MessageCircle className="h-4 w-4 text-[#FD7E3B]" />
              我的留言
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              帮你用日语问卖家
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#F97E2F] disabled:opacity-50"
            onClick={() => void loadList(1, "replace")}
            disabled={loading}
            data-testid="seller-messages-refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
        <div className="mt-1 flex gap-5 px-4" data-testid="seller-messages-tabs">
          {FILTER_TABS.map((tab) => {
            const active = tab.key === filter;
            return (
              <button
                key={tab.key}
                type="button"
                className={`relative pb-2 text-sm ${
                  active
                    ? "font-semibold text-[#F97E2F]"
                    : "text-slate-500"
                }`}
                onClick={() => setFilter(tab.key)}
                data-testid={`seller-messages-tab-${tab.key}`}
              >
                {tab.label}
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#FD7E3B]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <section className="space-y-3 px-3 pb-10 pt-3">
        {listError && tasks.length === 0 && !loading ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center"
            data-testid="seller-messages-error"
          >
            {isCandyTheme ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={CANDY_SCENE_IMG} alt="" className="candy-scene" />
            ) : (
              <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
            )}
            <p className="mt-2 text-sm text-amber-800">{listError}</p>
            <button
              type="button"
              className="mt-3 rounded-md bg-[#FD7E3B] px-4 py-2 text-sm font-medium text-white shadow-sm"
              onClick={() => void loadList(1, "replace")}
              data-testid="seller-messages-retry"
            >
              重试
            </button>
          </div>
        ) : null}

        {loading && tasks.length === 0 && !listError ? (
          <div className="rounded-lg border border-orange-100 bg-white px-3 py-4 text-center text-xs leading-5 text-slate-500 shadow-sm">
            正在加载留言记录，请稍等…
          </div>
        ) : null}

        {!loading && !listError && tasks.length === 0 ? (
          <div
            className="rounded-lg border border-orange-100 bg-white p-5 text-center shadow-sm"
            data-testid="seller-messages-empty"
          >
            {isCandyTheme ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={CANDY_SCENE_IMG} alt="" className="candy-scene" />
            ) : (
              <MessageCircle className="mx-auto h-8 w-8 text-orange-300" />
            )}
            <p className="mt-3 text-sm font-medium text-slate-700">
              还没有留言记录
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              去商品页点「留言」发起第一条，袋鼠君帮你用日语向卖家砍价、问细节～
            </p>
          </div>
        ) : null}

        {tasks.length > 0 && visibleTasks.length === 0 ? (
          <div
            className="rounded-lg border border-orange-100 bg-white p-4 text-center text-xs leading-5 text-slate-500 shadow-sm"
            data-testid="seller-messages-filter-empty"
          >
            这个分类下暂时没有留言，切到「全部」看看吧～
          </div>
        ) : null}

        {visibleTasks.map((task) => renderTaskCard(task))}

        {/* 加载更多失败时列表还在，用一条轻提示 + 重试，不清空已有内容 */}
        {listError && tasks.length > 0 ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-xs text-amber-800">{listError}</span>
            <button
              type="button"
              className="shrink-0 rounded-md bg-[#FD7E3B] px-3 py-1.5 text-xs font-medium text-white"
              onClick={() => void loadList(1, "replace")}
              data-testid="seller-messages-retry-inline"
            >
              重试
            </button>
          </div>
        ) : null}

        {hasMore && !listError ? (
          <button
            type="button"
            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-sm font-medium text-[#F97E2F] shadow-sm disabled:opacity-50"
            onClick={() => void loadList(page + 1, "append")}
            disabled={loadingMore}
            data-testid="seller-messages-load-more"
          >
            {loadingMore ? "正在加载…" : "加载更多"}
          </button>
        ) : null}
      </section>
    </main>
  );
}
