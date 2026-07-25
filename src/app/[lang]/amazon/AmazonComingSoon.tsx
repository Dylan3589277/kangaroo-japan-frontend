import Link from "next/link";

/**
 * Amazon Japan 的 en 占位页。
 *
 * 为什么不让英文访客进原来的搜索页：那页是未改版的浅色通用模板，实测**英文和日文
 * 关键词都搜不出任何结果**（"No items found"），排序下拉还直接漏出常量
 * `SORT_CREATED_TIME|ORDER_DESC`。首页早已把 Amazon 标成 Coming soon，
 * 这里必须给一致的预期，而不是把人放进一个永远搜不到东西的空页面。
 *
 * 保留这个路由（而不是 404）是为了：导航里的入口不至于断链，Google 已收录的
 * 地址也有内容可落；同时把人导回真正能用的 Mercari 搜索。
 */
export function AmazonComingSoon({ lang }: { lang: string }) {
  return (
    <main className="min-h-screen bg-[#0a0e16] text-slate-200 antialiased">
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-300">
            Coming soon
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Amazon Japan is not live yet
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            We&apos;re still wiring up Amazon Japan sourcing. In the meantime you can
            already buy from <strong className="font-medium text-slate-200">Mercari Japan</strong>{" "}
            and browse <strong className="font-medium text-slate-200">Yahoo! Auctions</strong> —
            that&apos;s where nearly all Japanese single cards trade anyway.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${lang}/cards`}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
            >
              Search cards on Mercari
            </Link>
            <Link
              href={`/${lang}/yahoo`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:text-white"
            >
              Browse Yahoo! Auctions
            </Link>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Want a specific Amazon Japan listing before then?{" "}
            <Link
              href={`/${lang}/contact`}
              className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
            >
              Ask our team
            </Link>{" "}
            — we can often source it manually.
          </p>
        </div>
      </section>
    </main>
  );
}
