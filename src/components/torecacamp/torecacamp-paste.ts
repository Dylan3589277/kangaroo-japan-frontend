/**
 * 从用户粘贴的内容中提取 トレカキャンプ 商品 handle。
 * 详情上游为 https://torecacamp-pokemon.com/products/{handle}。
 * 支持：torecacamp-pokemon.com/products/xxxx、带/不带 https、带/不带 query、末尾斜杠、
 * 以及直接粘一串纯 handle。解析不出返回 null。
 *
 * 注：与 rakuma-paste.ts 同形（搜索页粘链接入口复用）。Shopify handle 含字母/数字/_/-。
 */
export function parseTorecacampHandle(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  // 纯 handle（无空格、无斜杠、无协议）→ 直接当 ID
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
  if (!host.includes("torecacamp")) {
    return null;
  }

  // 路径形如 /products/{handle}（可能带末尾 .js/.json 后缀，去掉）
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const productsIdx = segments.indexOf("products");
  const picked =
    productsIdx !== -1 && segments[productsIdx + 1]
      ? segments[productsIdx + 1]
      : segments[segments.length - 1];
  const handle = (picked || "").replace(/\.(js|json)$/i, "");
  return handle || null;
}
