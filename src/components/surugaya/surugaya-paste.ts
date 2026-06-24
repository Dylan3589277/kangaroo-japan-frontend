/**
 * 从用户粘贴的内容中提取 駿河屋 商品 shinaban（商品 ID）。
 * 详情上游为 https://www.suruga-ya.jp/product/detail/{shinaban}（id 为数字 604043986
 * 或字母数字 GN539361），列表缩略图走 database/photo.php?shinaban={id}。
 * 支持：完整 product/detail 链接、带 ?shinaban= 的 photo 链接、带/不带 https、
 * 带/不带 query、末尾斜杠、以及直接粘一串纯 id。解析不出返回 null。
 *
 * 对齐 rakuma-paste 的解析风格，供搜索页「粘贴商品链接」入口复用。
 */
export function parseSurugayaId(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  // 纯 id（无空格、无斜杠、无协议、且只含字母数字）→ 直接当 ID。
  if (!/[\s/]/.test(input) && !/^https?:/i.test(input)) {
    return /^[A-Za-z0-9]+$/.test(input) ? input : null;
  }

  // 容错补全协议，便于 URL 解析。
  const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withProto);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!host.includes("suruga-ya")) return null;

  // photo.php?shinaban=<id> 形态优先。
  const shinaban = url.searchParams.get("shinaban");
  if (shinaban && /^[A-Za-z0-9]+$/.test(shinaban)) return shinaban;

  // 路径形如 /product/detail/{id}。
  const segments = url.pathname.split("/").filter(Boolean);
  const detailIdx = segments.findIndex((s) => s.toLowerCase() === "detail");
  if (detailIdx >= 0 && segments[detailIdx + 1]) {
    const id = segments[detailIdx + 1];
    return /^[A-Za-z0-9]+$/.test(id) ? id : null;
  }

  // 兜底：取最后一段，仅当是合法 id。
  const last = segments[segments.length - 1];
  return last && /^[A-Za-z0-9]+$/.test(last) ? last : null;
}
