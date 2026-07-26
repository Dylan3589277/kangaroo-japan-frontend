import { Link } from "@/i18n/navigation";

/**
 * /[lang]/amazon 的非 en 落地页（2026-07-26 花哥拍板）。
 *
 * 口径（花哥确认）：**日亚一直能买，只是网站没接通自动搜索**——客服接单人工代购，
 * 老后台 `st_shops` 里 amazon 是 `is_show=1`、手续费 220 円的正常在用平台。
 * 所以这页**不能写成「暂未开通」**（会把本来能成交的客户赶走），要写成
 * 「站内暂不支持搜索，但可以联系客服代购」，把人导向客服而不是导走。
 *
 * 为什么需要这页：后端 `/integrations/amazon/search` 实测返回空数组，
 * 而 zh 侧此前渲染的是真实搜索页 `AmazonSearchPage`，搜不出任何东西，
 * 首页还写着「亚马逊日本真实在售商品」——搜不到却宣称有在售商品是虚假陈述。
 *
 * 为什么不复用 en 的 `AmazonComingSoon`：那份是 TCG 深色皮肤 + 英文文案，CTA 还指向
 * en 专属的 `/cards`（zh 下会回退到 /products）。zh 站是浅色买家外壳，另起一份更干净。
 */
export function AmazonComingSoonZh() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium tracking-wider text-emerald-700">
          可人工代购
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          亚马逊日本：站内暂不支持搜索
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-600">
          日本亚马逊的商品<strong className="font-medium text-zinc-900">我们可以代购</strong>，
          只是站内还没接通自动搜索。把商品链接发给客服，确认价格后即可下单，
          代购手续费 <strong className="font-medium text-zinc-900">220 円/件</strong>。
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            发链接给客服代购
          </Link>
          <Link
            href="/mercari"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
          >
            逛煤炉 Mercari
          </Link>
        </div>

        <p className="mt-8 text-sm text-zinc-500">
          煤炉 Mercari、雅虎竞拍、雅虎 Frima、乐天 Rakuma 支持站内直接搜索下单。
        </p>
      </section>
    </main>
  );
}
