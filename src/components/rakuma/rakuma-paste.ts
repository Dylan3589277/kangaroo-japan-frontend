/**
 * 从用户粘贴的内容中提取 ラクマ 商品 publicHash。
 * 详情上游为 https://item.fril.jp/{publicHash}。
 * 支持：item.fril.jp/xxxx、fril.jp/xxxx、fril.jp/item/xxxx、带/不带 https、
 * 带/不带 query、末尾斜杠、以及直接粘一串纯 hash。解析不出返回 null。
 *
 * 注：与原 [lang]/rakuma/page.tsx 的解析逻辑一致，抽到此处供搜索页粘链接入口复用。
 */
export function parseRakumaHash(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  // 纯 hash（无空格、无斜杠、无协议）→ 直接当 ID
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
  if (!host.includes("fril.jp") && !host.includes("rakuma")) {
    return null;
  }

  // 路径形如 /{hash} 或 /item/{hash}
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const last = segments[segments.length - 1];
  return last || null;
}
