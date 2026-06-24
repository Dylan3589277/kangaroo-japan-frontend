/**
 * 从用户粘贴的内容中提取 PayPayフリマ 商品 itemId。
 * 详情上游为 https://paypayfleamarket.yahoo.co.jp/item/{itemId}。
 * 支持：paypayfleamarket.yahoo.co.jp/item/xxxx、带/不带 https、
 * 带/不带 query、末尾斜杠、以及直接粘一串纯 itemId。解析不出返回 null。
 *
 * 注：与原 [lang]/yahoofrima/page.tsx 的解析逻辑一致，抽到此处供搜索页粘链接入口复用。
 */
export function parseYahoofrimaId(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  // 纯 ID（无空格、无斜杠、无协议）→ 直接当 ID
  if (!/[\s/]/.test(input) && !/^https?:/i.test(input)) {
    return input;
  }

  // 容错补全协议，便于 URL 解析
  const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withProto);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!host.includes("paypayfleamarket.yahoo.co.jp")) {
    return null;
  }

  // 路径形如 /item/{itemId}
  const segments = url.pathname.split("/").filter(Boolean);
  const itemIdx = segments.indexOf("item");
  if (itemIdx !== -1 && segments[itemIdx + 1]) {
    return segments[itemIdx + 1];
  }
  // 兜底：取最后一段（容错无 /item/ 前缀的分享链接）
  const last = segments[segments.length - 1];
  return last || null;
}
