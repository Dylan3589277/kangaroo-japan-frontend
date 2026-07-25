# 独立站SEO优化 — 进度追踪

## Phase 1 ✅ 已完成

1.1-1.10 全部完成，build通过

## Phase 2 ✅ 已完成

首页/商品列表/商品详情meta + BreadcrumbList + Product schema + OG

## Phase 3 ✅ 已完成

next/image替换、字体优化(Inter+Noto Sans)、后端Cache-Control拦截器

## Phase 4 ✅ 已完成

Category多语言字段(nameKo/nameTh/nameId/nameVi)、多语言404页面、分类落地页/category/[slug]、slug API端点

## Phase 5 ⏳ 部分完成（待花哥操作3项）

- [ ] Google Search Console多国家配置（花哥操作）← 需花哥账号
- [ ] 百度资源平台提交（花哥操作）← 需花哥百度账号
- [ ] Naver Search Advisor提交（花哥操作）← 需花哥Naver账号
- [x] Vercel Analytics配置（花小妹 ✅ 已安装@vercel/analytics到根Layout）
- [x] 收录情况周报cron job（花小妹 ✅ 每周一9:00发飞书群）

## Phase 6 ✅ 已完成

Product多语言字段(titleTh/descriptionTh/descriptionVi/descriptionId + descriptionVi + descriptionId)
本地货币价格(PHP/MYR/SGD)
Accept-Language中间件
自动翻译框架(translateProductTitles方法预留)

## 花哥决策记录

- 日语：公开可访问+noindex
- 翻译：全部16个文件，当地语言习惯
- 明天10点提醒做Phase 5（cron已设）

## 关键文件位置

- SEO方案：docs/seo-plan.md
- i18n配置：src/i18n/routing.ts
- 翻译文件：src/i18n/locales/{ko,th,id,vi}/
- 中间件：src/middleware.ts
- 字体：src/app/fonts.ts
- 404：src/app/[lang]/not-found.tsx
- 分类落地页：src/app/[lang]/category/[slug]/page.tsx
- 后端Cache-Control：kangaroo-japan-backend/src/common/cache-control.interceptor.ts
- Accept-Language：kangaroo-japan-backend/src/main.ts
- 进度文件：docs/seo-progress.md

## 变更记录 2026-07-03 · SEO+GEO 优化包（中枢 Claude，commit 925e84a，已部署验证）

**为什么**：GEO 体检（2026-06-20 基线）en/zh 在 AI 搜索双双隐形；实测站内缺结构化数据、sitemap 只报 3 页/语言、zh 标题串台英文、无 llms.txt、无英文长文语料。
**改了什么**：

- JSON-LD 全站接入：Organization/WebSite（[lang]/layout）+ FAQPage（/faq 30 问）+ BreadcrumbList（faq/fees/how-it-works/pokemon-cards/yugioh-cards）；构造器集中在 `src/lib/seo.ts`，渲染组件 `src/components/seo/JsonLd.tsx`
- sitemap 18→70 条（`src/app/sitemap.ts`，新增页记得同步 enOnlyPages）；lastmod 手动拨（2026-07-03）
- `public/llms.txt`（AI 爬虫站点自述，中英）
- zh metadata 本地化：根 layout zh 标题改「日本代购代拍平台 - 煤炉Mercari代购·雅虎竞拍·日淘直邮」；6 个 zh 局部翻译文件只含 meta（正文靠 request.ts deepMerge 回退英文）
- /articles CMS 空壳 → noindex（`articles/layout.tsx`，有文章后按注释恢复）
- 英文 GEO 指南 `/en/guides/*`（共享壳 guide-shell.tsx；非 en noindex+canonical 指 en；TcgFooter 加硬编码英文入口——不进 tcg.json 避热文件冲突）：①2026 关税文 ②对比文（点名 Buyee/ZenMarket，费率与 /fees comparison 同源）③Mercari 教程；en/faq.json 19→30 问
  **🔴 跟进**：~~Section 122 关税 2026-07-24 到期，续接政策落地后必须更新关税指南 + FAQ tariff2026 条目 + llms.txt~~（✅ 2026-07-25 已办，见文末变更记录）；对比文点名竞品与 /fees 页匿名首字母口径不一致（花哥知情，未要求改回）。

## 变更记录 2026-07-04 · zh 品牌切「袋鼠君」+ zh GEO 内容包（中枢 Claude，代码已就绪待推）

**为什么**：花哥 2026-07-04 拍板 zh 对外品牌=袋鼠君（与小程序一致），并给了推广口径（现行活动汇率+收费标准）。
**改了什么（代码，待推）**：root layout zh meta（title/brand/og 全切袋鼠君，JP-Buy 作副名）、seo.ts brandForLocale zh→袋鼠君 + Organization 加 alternateName、llms.txt zh 段改袋鼠君并补实测费率（汇率0.0424/煤炉手续费200円/雅虎220+200/押金1元=200円额度——来源：小程序公开接口 api/goods/mdetail 实测+详情页展示口径）。
**站外内容（不进仓库，在 .team\artifacts\geo-zh-content-20260703\）**：小红书笔记×3+发布SOP、知乎对比长文、小红书自动维护方案（结论：不做全自动防封号，做半自动内容管线）、Trustpilot/Reddit 启动清单。

## 变更记录 2026-07-25 · en 站体检修复第一批：关税续接 + 平台口径 + sitemap 空壳页（中枢 Claude，待推）

**为什么**：花哥要求重审 en 页面。线上实测（浏览器 + curl）查出三类对外错误：①关税指南/FAQ/llms.txt 仍写「10% Section 122，2026-07-24 到期」，而该措施当天已到期，买家读到的是过期税率 ②首页/FAQ/llms.txt 宣称 Mercari+Yahoo+Amazon「live today」、hero 徽章写「4 Japanese marketplaces」，但 `/en/amazon` 英文与日文关键词搜索均返回 No items found ③`/en/products` 是未改版白色模板 + 空结果 + 暴露 `createdAt_desc` 字段，却被 sitemap 报给 Google。

**改了什么**：

- **关税续接（事实来源：CBP CSMS #69326983 + USTR 2026-07-23 公告）**：Section 122 的 10% 于 2026-07-24 到期未获延长；同日 00:01 ET 起 Section 301「强迫劳动」行动接替，日本适用 **12.5%**（HTS 9903.05.49 = 原税率低于 12.5% 者按合并 12.5% 征收；9903.05.48 = 原税率 ≥12.5% 者不叠加）。卡牌 MFN 为 Free，故实际按 12.5%。落到 4 处：`guides/japan-card-import-tax-us-2026/page.tsx`（TLDR/时间线新增 7-24 条目/费用表/实算例 $6.70→$8.38、合计 ≈$16→≈$18/迷你 FAQ/免责）、`guides/page.tsx` 卡片摘要、`en/faq.json` tariff2026、`public/llms.txt`。
- **guide-shell 支持 dateModified**：`articleJsonLd` 本就有该字段但 GuideShell 没透传，政策类时效文改稿后 Google 拿不到新鲜度信号。加可选 prop + hero 显示「Updated …」，关税文传 2026-07-25。向后兼容，其余 guides 不受影响。
- **平台口径按花哥 2026-07-25 拍板统一**：Amazon Japan =「暂时不能，标 Coming soon」→ `Marketplaces.tsx` status live→soon、hero subtitle、trustStrip「4 Japanese marketplaces」→「2 Japanese marketplaces live」、tcg.json FAQ、llms.txt Sources、`HomePageClient.tsx` en 分支、AI 客服知识条 `api/support/chat/route.ts` tcg-proxy-flow-001。**Yahoo 经花哥确认业务全量可买**，读码复核也证实详情页有在线出价 + 联系客服代拍两条 CTA（在线出价的闸在后端 fail-closed 白名单），故首页 Live 不改。
- **`/en/cards` 平台筛选的 Yahoo 不再灰置**：本页数据层只接 Mercari，但把 Yahoo 标成「coming soon」等于对买家否认雅虎业务。改为通往 `/yahoo` 的入口（`PLATFORM_OPTIONS` 加 href，文案 `yahooSoon`→`yahooBrowseHint` + 新增 `filters.browse`）。**Yahoo 在售接入本页数据层仍未做**，属下一批。
- **`/en/yahoo` 副标题**去掉 "read-only"（漏报了客服代拍能力），改为「可出价 / 也可由我们代拍」。`readonlyNotice`（"Online bidding is coming soon"）**未动**——在线出价是否对普通用户放开取决于后端白名单，未核实前不改。
- **sitemap 不再报 `/en/products`**：`staticPages` 加 `skipEn` 字段，只跳过 en。**zh 侧 `/zh/products` 是正常商品搜索页，照报不动**（en 改动不影响中文用户）。

**验证**：`npm run lint` + `npm run build` 通过；本地 dev 逐页复核 en 首页/关税文/`/en/cards` 渲染。**未推生产**，等花哥明确「推」。

**🔴 剩余未办（本轮范围外，见会话报告完整清单）**：商品详情页强制登录且服务端零内容（P0，最值钱）、无 PayPal/Apple Pay、页脚缺 Privacy Policy/Terms/公司主体、无到手价计算器、`/en/products` 与 `/en/amazon` 页面本身仍是未改版空壳（本轮只摘了 sitemap）、`/en/yahoo` 分类侧栏中文泄漏 + 商品图裂 + Unix 时间戳直显、四个平台页共用首页 title、品牌 JP-Buy/Kangaroo Japan 分裂。

## 变更记录 2026-07-25(2) · en 商品详情页对游客开放（拆登录墙，P0）（中枢 Claude，待推）

**为什么**：体检 P0 —— 游客点开任一商品详情（`/en/mercari/mXXX`）会被弹到 `/en/login`，从 Google/搜索进来的人一秒跳走，转化与 SEO 双杀。

**根因（浏览器 network 实测，连测三次一致）**：详情页加载时并发两个请求——`POST /integrations/mercari/detail` 未登录返 **201（商品信息本就免登录）**，`GET /mercari/quote` 返 **401**。后者命中 `api.ts` 的全局 401 拦截器 → `handleUnauthorized()` 刷新失败 → `window.location.href = /{lang}/login`。**不是有意加的登录墙，是一个报价请求把整页带走了**。而 `MercariDetailDesignA` 本来就写好了降级（`feeJpy=null` → 展示「结算时计算」），只是全局跳转抢在它前面执行，那段代码从来没机会跑。

**改了什么**：

- `ApiOptions` 新增 `skipAuthRedirect?: boolean`；`handleUnauthorized(redirectOnFailure = true)`；`request()` 把 `!skipAuthRedirect` 传下去。**token 刷新照常尝试**——已登录但 token 过期的用户仍自动续期并重试，只跳过「刷新失败后强制跳登录」那一步。
- `getMercariQuote(goodsNo, opts)` 增加 `opts.skipAuthRedirect`，**默认 false**；**只有 `MercariDetailDesignA`（en TCG 详情页）传 true**。
  🔴 **中途修正**：最初把豁免写死在 `getMercariQuote` 内部，但该函数有 **3 个调用点**——en 详情页、**zh 经典详情页 `MercariDetailClassic:106`**、**结账页 `mercari-checkout:127`**。那样等于把中文站详情页和结账页的登录守卫一起拆了（违反「en 改动不影响中文用户」铁规）。已改为由调用方传入，只豁免 en 详情页。
- 顺带修 `handleUnauthorized` 的 locale 判断：原来只列 `["zh","en","ja"]`，**ko/th/id/vi 用户 401 后被踢到中文登录页**；改为与 `src/i18n/routing.ts` 的 7 个 locale 一致。

**验证（本地 dev 实测）**：

| 场景                        | 期望                     | 实测                                                                                                             |
| --------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 游客访问 `/en/mercari/mXXX` | 停留、可见商品           | ✅ 停留，渲染出图片/`ITEM PRICE JPY 777 ≈ $5.21 USD`/Add to Cart/Buy Now，报价区降级为「Calculated at checkout」 |
| 游客访问 `/zh/mercari/mXXX` | **仍跳登录**（行为不变） | ✅ → `/zh/login`                                                                                                 |
| 游客访问 `/en/orders`       | 仍跳登录                 | ✅ → `/en/login`                                                                                                 |
| 游客访问 `/zh/orders`       | 仍跳登录                 | ✅ → `/zh/login`                                                                                                 |

`npm run lint` 0 errors + `npm run build` 通过。

**已知代价 / 未验**：①游客每次进详情页会多打一次注定失败的 `/auth/refresh`（保留 token 刷新的副作用，不影响功能；要省这次请求可在 `handleUnauthorized` 开头对「无本地 token」直接返回 null）②**已登录用户路径未实测**（中枢不代注册/登录），仅靠读码保证：token 有效则 quote 200 不进 401 分支，token 过期则照常刷新重试。

**🔴 下一步（P0 的另一半，未做）**：详情页仍是 client component，服务端只吐 853 字符空壳，Google 抓不到商品内容。要 SEO 收录需把详情取数搬到 server component 预取 + Product JSON-LD，属独立一批。

## 变更记录 2026-07-25(3) · en 商品详情页 SSR + Product JSON-LD（P0 下半）（中枢 Claude，待推）

**为什么**：拆掉登录墙解决了「人能看」，但 Google 那边仍然一无所获——详情页正文是 client component，服务端只吐约 **853 字符**空壳，零卡名零价格，title 还是首页通用标题。长尾卡名搜索永远进不来。

**改了什么**：

- 新增 `src/lib/server/mercari-detail.ts`：服务端直连后端 `POST {BACKEND_ORIGIN}/api/v1/integrations/mercari/detail`（**该端点未登录可取，生产实测 `success:true`**，故不带任何凭证）。缓存走旧模型 `next: { revalidate: 300 }`（本项目未启用 `cacheComponents`）。**取数失败一律返回 null，绝不把整页打成 500**——拿不到就退回原来的纯客户端渲染。丢弃后端返回的 `raw` 字段（Mercari 原始响应，体积大且页面用不到，否则会被序列化进 HTML）。`MercariDetail` 类型移到这里作单一来源，组件改为 `import type`。
- `[id]/page.tsx`：新增 `generateMetadata`（真实卡名进 title/description/OG image，售罄与在售两套文案）+ **Product JSON-LD**（价格 JPY 整数、`InStock`/`OutOfStock`）+ 服务端预取结果作 `initialDetail` 传给正文组件。
- `MercariDetailDesignA`：接受可选 `initialDetail`，作为 `detail` 初始值、`loading` 初始为 `!initialDetail`；`fetchDetail` 在已有预取内容时不再回到 loading 态（那次请求只为补 `collect`/`cart` 用户态，不该把已渲染的商品换回骨架屏）。
- 🔴 **边界**：以上全部**只对 `lang === "en"`** 生效。其它语言分支仍是原样 `return <MercariDetailClassic />`——不预取、不出 metadata、不加 JSON-LD。

**踩到的坑**：根 layout 的 `titleTemplate` 是 `%s | Kangaroo Japan`，页面 title 里再写一遍品牌会渲染成「… – Kangaroo Japan | Kangaroo Japan」。现在页面 title 不带品牌（交给 template），`og:title` 不走 template 故单独带上。

**验证（本地 dev 实测）**：

| 项                              | 改动前                     | 改动后                                                                                                              |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| en 详情页服务端正文             | **853 字符**、无卡名无价格 | **2100 字符**，含卡名 + `777`                                                                                       |
| en `<title>`                    | 首页通用标题               | `ミネズミ AR SV11W ホワイトフレア 151/086 \| Buy from Japan \| Kangaroo Japan`                                      |
| en `og:title` / `og:image`      | 无                         | 有（含品牌）/ 商品首图                                                                                              |
| en `description`                | 无                         | `Buy … from Japan for ¥777. We buy it in Japan on your behalf…`                                                     |
| Product JSON-LD                 | 无                         | 有（sku/image/price 777 JPY/InStock）                                                                               |
| **zh 详情页 title**             | 站点默认                   | **站点默认（未变）**                                                                                                |
| **zh 详情页含商品名 / JSON-LD** | 无                         | **无（未变）**                                                                                                      |
| **zh 详情页服务端正文**         | 空壳                       | **256 字符空壳（未变）**                                                                                            |
| **zh 详情页游客访问**           | 跳 `/zh/login`             | **仍跳 `/zh/login`**                                                                                                |
| 浏览器 console                  | —                          | **无 hydration mismatch**                                                                                           |
| en 游客页面功能                 | —                          | 停留、卡图/JPY 777 ≈ $5.21 USD/TCG DETAILS/Add to Cart/Buy Now 全在，Service Fee 仍降级为「Calculated at checkout」 |

`npx tsc --noEmit` 0 errors + `npm run lint` 0 errors + `npm run build` 通过（路由为 `ƒ` 按需服务端渲染）。

**已知不足 / 下一步**：①卡名是**日文原名**——型号（SV11W、151/086）是美国买家的真实搜索词所以有价值，但纯日文 title 对英文用户不友好，翻译是独立一块（站上已有 Azure 翻译能力，用于 zh）②zh 详情页同样没有 metadata，本次按边界纪律**刻意没碰**，要不要一并做由花哥定 ③售罄商品仍 index（JSON-LD 报 OutOfStock），暂不加 noindex。

## 变更记录 2026-07-25(4) · en 详情页卡名日→英翻译（Azure）（中枢 Claude，待推）

**为什么**：SSR 上线后 title 和正文标题仍是日文原名（「ミネズミ AR SV11W ホワイトフレア 151/086」），美国买家读不懂，英文长尾搜索也拿不到。

**为什么不走后端 `/translate/jp2zh`**：那条链是「后端转发 → 老后台 PHP `/api/trans2zh/jp2zh`」，**目标语言写死中文**，而老后台是脆弱的生产库。查 `vercel env ls` 发现**前端项目本身早已配好** `AZURE_TRANSLATOR_KEY` + `AZURE_TRANSLATOR_REGION`（Production/Preview，40 天前），服务端直连更短也更安全，且不需要新配任何 env。

**改了什么**：

- 新增 `src/lib/server/translate.ts`，`translateTitleJaToEn()`。外部调用三件套（`~/.claude/rules/external-call-resilience.md`）：
  - **超时** 3s `AbortSignal.timeout`，绝不让翻译拖慢首屏
  - **缓存** `unstable_cache` **30 天**（同一商品标题不会变；`unstable_cache` 默认已把入参计入 cache key，不同标题各自成条不互串）。本项目未启用 `cacheComponents`，故用 `unstable_cache` 而非 `use cache`——不为一个功能改全局配置
  - **降级** 任何失败（无 key/超时/非 2xx/结构不符/译文与原文相同）一律返回 null，调用方回退日文原名。serverless 无常驻状态做不了真正的连续失败熔断，以「快速超时 + 全路径降级 + 长缓存」达到同等效果
- `[id]/page.tsx`：title/og:title 用英文译名，**日文原名进 description**（`(Japanese title: …)`）兼顾英文可读与日文精确匹配；译名为 null 时全套回退。
- `MercariDetailDesignA`：新增 `nameEn` prop——**英文译名作 h1**（英文站的主标题该让买家一眼看懂），日文原名降为 `<p lang="ja">` 副标题保留（跟 Mercari 原页核对的依据）。

**验证**：

- 本地无 key（降级路径）实测：title 整体回退日文、description **不出现** `Japanese title:` 段、正文仍 2100 字符、Product JSON-LD 仍在——**翻译挂掉 = 完全回到上一版已上线行为，零风险**。
- `npx tsc --noEmit` 0 errors + `npm run lint` 0 errors + `npm run build` 通过。
- ⚠️ **真实翻译质量本地无法验**：key 是 Encrypted，`vercel env pull` 拉不到值（见私有记忆 `verify-config-existence-not-pull`）。只能推上生产后立即验；不合格就 revert 这一个 commit。

**成本/性能**：每个商品标题**最多翻一次**（30 天缓存），缓存命中后零延迟；未命中时首屏最坏 +3s（Azure 正常 200–500ms）。
