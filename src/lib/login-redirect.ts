/**
 * 生成带回跳参数的登录页地址。
 *
 * 为什么要有它：登录墙原本一律把人甩到 `/{lang}/login`，登录成功后再甩回首页——
 * 从商品详情点「Buy Now」的访客，登录完得重新搜一遍那张卡。带上 `?next=` 后，
 * 登录页会回到被拦下的那一页。
 *
 * 安全由登录页的 `safeNextPath` 负责（只放行本站、当前 locale 下的路径，挡掉
 * `//evil.com` 这类开放重定向）。这里只负责把当前地址原样编码带上。
 */
export function loginPathWithNext(lang: string): string {
  const base = `/${lang}/login`;
  if (typeof window === "undefined") return base;

  const current = `${window.location.pathname}${window.location.search}`;
  // 已经在登录页就别把自己塞进 next，否则登录成功后原地打转。
  if (current.startsWith(base)) return base;

  return `${base}?next=${encodeURIComponent(current)}`;
}

/**
 * 校验 `?next=` 回跳目标，只放行本站、当前语言下的路径；不合规一律回落首页。
 *
 * 🔴 安全：绝不能把 next 原样交给 router.push——那是开放重定向（攻击者发
 * `/en/login?next=https://evil.com`，用户登录后被带到外站）。放行条件：
 * 单斜杠开头的站内路径、落在 `/{lang}` 之下、不是登录页自身（否则登录成功
 * 又跳回登录页形成死循环）。`//host` 与含反斜杠的变体都会被浏览器当外站，一并挡掉。
 */
export function safeNextPath(raw: string | null, lang: string): string {
  const home = `/${lang}`;
  if (!raw) return home;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return home;
  }
  // 必须正好是 /{lang} 或它的子路径——挡掉 `/enevil.com` 这类前缀混淆。
  if (raw !== home && !raw.startsWith(`${home}/`)) return home;
  if (raw === `${home}/login` || raw.startsWith(`${home}/login?`)) return home;
  return raw;
}
