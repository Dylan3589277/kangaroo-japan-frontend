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

## 变更记录 2026-07-25(5) · 翻译 401 定位 + 两处自身缺陷修复（已推 8f0211d）

**现象**：(4) 推上生产后 title 仍是日文，翻译没生效。

**先修自己的两个缺陷**（它们让故障既不可诊断、又会被长期钉死）：

1. 🔴 **失败被缓存 30 天**：`unstable_cache` 把返回值原样缓存，**包括表示失败的 `null`**——任何一次偶发失败（Azure 抖动/限流/超时）都会被钉住一个月，之后即使 Azure 恢复也不再重试，等于「一次失败 = 一个月不可用」。改为缓存层取不到译名就 **throw**（抛出的错误不进缓存，下次请求自然重试），外层捕获转 null 降级。
2. 🔴 **失败完全静默**：原来 `catch { return null }` 吞掉一切，违反「失败要大声」，导致线上不工作却查不到原因。改为四条失败路径各自 `console.warn`（无 key / 非 2xx 带 status+响应体片段 / payload 结构不符 / 译文等于原文），**日志不含任何密钥**。

**真因（`vercel logs --follow` 实测，多次请求稳定复现）**：

```
[translate:ja2en] HTTP 401 Unauthorized :: {"error":{"code":401001,
"message":"The request is not authorized because credentials are missing or invalid."}}
```

Azure 拒绝凭证。`AZURE_TRANSLATOR_KEY` / `AZURE_TRANSLATOR_REGION` 在前端项目里确实**存在**（`vercel env ls` 可见，Production+Preview，40 天前配置），但**前端代码此前从未调用过它们**——即这对值从来没被验证过能用。401001 的常见成因：key 已轮换/失效、region 与资源实际区域不匹配（Translator 的 `Ocp-Apim-Subscription-Region` 必须与资源区域一致）、或该 key 属于别的 Azure 服务而非 Translator。**值是 Encrypted，中枢拉不到，无法进一步自查**——需花哥在 Azure 门户核对后更新 Vercel 前端项目的这两个 env。

**当前线上状态：安全**。翻译不可用时完整降级为纯日文页面 = (3) 那版已上线的行为；SSR 正文 2100 字符、Product JSON-LD、价格、游客可浏览全部不受影响。401 是快速返回（非超时），对首屏延迟影响可忽略。

**key 修好后无需改代码**：失败不再被缓存，下一次请求即自动重试并生效。若长期不修，可考虑加 env 开关避免每次请求白打一次 Azure。

## 变更记录 2026-07-25(6) · en 体检清单第 5/6/7 条（中枢 Claude，待推）

**第 5 条 · 到手价试算**（`/en/fees` 底部，新增 `components/tcg/LandedCostCalculator.tsx`）

- 费率**取真实值不写死**：新增 `lib/server/exchange-rates.ts` 从公开 `/api/v1/exchange-rates` 取 `jpyToUsd` 与 `tcgServiceFeeJpy`（后台可调，`source: admin_override`）；取不到就**不渲染试算器**——宁可没有，也不给错数字。
- 🔴 **只算能算准的**：商品价、日本国内运费、代购费、12.5% 关税、$9.35 清关费。**国际运费按实重计价，站上没有权威的按卡数估重表，硬编一个就是骗人** → 不算，单独标出「到仓称重后另计」并说明它不进关税基数。
- 仅 en 渲染（zh 计价体系在老后台，口径不同）。实测 ¥3,000 → $34.64，与手算一致；`/zh/fees` 无试算器。

**第 6 条 · 竞品口径**：fees 页匿名表（K/B/Z/N/F）与 guides 点名长文并存导致买家无从判断。保留匿名表不动（避免把点名比较搬上定价页），在表下加一条通往 `/en/guides/kangaroo-japan-vs-buyee-vs-zenmarket` 的出口。

**第 7 条 · `/en/yahoo`**（部分）

- **分类侧栏中文泄漏**：`/yahoo/categories` 由老后台提供、`name` 是中文（"计算机"/"玩具、游戏"）。新增 `yahoo-category-labels.ts`，按 **auccat 分类号**（`YahooCategory.value`）映射英文，未收录回退原名。注意不能按 `id` 映射——那是旧库自增主键，前端拿到的结构里根本没有。
- **搜索占位符**：`Search in Japanese or Chinese` → `Search in Japanese for best results — e.g. ポケモンカード`（说明原因 + 给可复制样例）。
- 🔴 **移除卡片上的剩余时间徽章**：线上原本显示裸时间戳 `1784950961`。查后端才发现 **`/yahoo/goods` 对整页所有商品返回同一个 `end_time`/`left_time`**（实测一页 20+ 件全是 `end_time=1784968173`、`left_time="49秒"`，且约等于当前时刻），根本不是每件拍卖各自的结束时间。**先做的"格式化成 Ends … JST"被推翻**——那只会把坏数据包装得更可信（用户会以为所有拍卖一分钟后结束）。故移除徽章，`formatRemainingLabel()` 留在 `yahoo-urgency.ts` 备用，**后端数据修好后恢复即可**。

**顺带修正的数据不符**：`/exchange-rates` 实测 `tcgServiceFeeJpy=400`，而 `fees.json` 与 `llms.txt` 都写 "~300–350 JPY"（对买家低报）→ 均改为 ~400。

**一条自我更正**：此前体检把 `/en/yahoo` 记为「商品图全裂」，本轮复查 `_next/image` 请求**全部 200**、图片源站也 200，是把懒加载未完成当成了裂图，**该条不成立，撤回**。

**仍未处理（含原因）**：`/en/yahoo` 列表全是非 TCG 商品（农机/汽配/垃圾桶）与橙白配色断裂——属产品方向，需花哥定；`/en/amazon` 空壳页；页脚 Privacy/Terms（缺公司主体信息）；品牌 JP-Buy vs Kangaroo Japan 统一；列表页卡名翻译（依赖 Azure key 修复）。

## 变更记录 2026-07-25(7) · 花哥拍板的四项（法律页 / amazon 占位 / 品牌统一 / yahoo 转 TCG）（待推）

**第 4 条 · Privacy Policy + Terms of Service**（`/en/privacy`、`/en/terms`，共用 `components/legal/legal-shell.tsx`）

- 运营主体取自公司官网 `nagatsuki-japan.com/contact/` 的会社概要表（⚠️ 该表 DOM 抓不到、只能截图读，故信息以人工核对为准）：株式会社長月商事 / Nagatsuki Corporation、〒550-0006 大阪市西区江之子島1丁目6番2号 奥内第八ビル905、06-6131-8337、contact@nagatsuki-japan.com、古物商許可 大阪府公安委員会 第62107R048268号。**代表者姓名官网未列，故未写**。
- 🔴 **条款只复述站上已有口径，不新增承诺**：没买成全额退（含押金）= buyer-protection；免费仓储 30–60 天按会员等级 = fees；不鉴真不评级 = buyer-protection；关税买家承担 + 诚实申报 = 关税指南。改这些数字前先对齐那几页。
- Privacy 同理只写实际在做的：密码哈希存储、卡号不过我们服务器（走支付处理方）、登录态 cookie 与 Turnstile、代购必须把收货信息交给承运商与海关、不卖数据不做广告共享。**未经证实的（如是否已建 GDPR/CCPA 专门流程）一律不写**。

**第 8 条 · `/en/amazon` 改 Coming soon**：原页是未改版浅色模板 + 英文/日文关键词都搜不出结果 + 排序下拉漏 `SORT_CREATED_TIME|ORDER_DESC`。因该页是 client component，条件 return 会破坏 hooks 顺序，故把搜索页整体挪到 `AmazonSearchPage.tsx`、`page.tsx` 重写为 server 分流壳：en → 占位页（导回 Mercari / Yahoo，**robots noindex**，保留路由避免导航断链与已收录地址 404），其它语言原样。

**第 11 条 · en 品牌统一为 Kangaroo Japan**：清掉 en 侧全部 JP-Buy——`tcg.json`（header 品牌 + 版权）、`contact.json`×4、`tcg-chat.json`×2、3 处硬编码 `document.title` 后缀、AI 客服 system prompt ×4（含自我介绍）。**保留 `seo.ts` 的 `alternateName: "JP-Buy"`**（品牌别名，搜这个词也能找到），其它 locale 的默认品牌不动。

**第 7 条 · `/en/yahoo` 转 TCG 视角**：英文站默认拉全站在售，首屏实测全是农业薄膜/汽车避震/垃圾箱，与「Built for U.S. TCG collectors」直接打架。改为 en 且 URL 未带 `keyword` 时默认「ポケモンカード」（不用「ポケカ」——`tcg-keywords.ts` 标注它返 0）；带 `?keyword=` 一律尊重用户输入（含显式空串看全站）。zh 维持全站浏览。

**验证（本地 dev 实测）**：`/en/privacy` 正文 4076 字符、`/en/terms` 4466 字符，均含公司主体与许可号；`/en/amazon` title「Amazon Japan — coming soon」+ noindex；en 页脚出现 `href="/en/privacy">Privacy Policy` 与 `href="/en/terms">Terms of Service`，版权为 `© 2026 Kangaroo Japan`；`/en/yahoo` 搜索框预填「ポケモンカード」，结果页 TCG 关键词命中 137 次、汽配/杂物类 0 次。tsc 0 errors + lint 0 errors + build 通过。

**待花哥确认**：法律页的公司信息是我从官网截图人工誊录的，**上线前请你核一眼地址与电话是否仍然现行**；代表者姓名官网没有，如需列入请提供。

## 变更记录 2026-07-25(8) · /en/yahoo 配色并入 TCG 深色壳（待推）

**为什么**：上一批把该页内容改成 TCG 专用后，视觉仍是浅色 + 橙色的通用模板，与整站深色 TCG 壳（`#0a0e16` + 电光青）割裂——从首页点进去像换了个网站。

**难点**：`yahoo-search-page.tsx`（535 行）是 **en 与中文站共用**，大量 shadcn 语义色（`bg-card`/`bg-muted`/`text-muted-foreground`）。直接改颜色会把中文站一起改深；复制一份深色组件又要长期同步两份逻辑。

**做法**：分两层，改动都很小。

1. `globals.css` 新增 `.tcg-surface`：在这个类的子树里重定义 shadcn 的 `--background` / `--card` / `--muted` / `--border` / `--primary` 等变量为 TCG 深色调。语义色本就走变量，**整棵子树自动变深，共用组件与中文站一行不用改**。
2. 硬编码的橙色（Search 按钮、分类选中态 ×2、价格）不走变量，故在组件内按 `locale` 分流：en 用电光青，中文站保持原橙色。

`/en/yahoo` 的 wrapper 挂 `.tcg-surface`，中文站维持 `bg-muted/20`。

**验证（本地 dev 实测）**：`/en/yahoo` 深色底、青色 Search 按钮、青色价格、分类选中青色高亮，与 header 深色壳连贯，商品全为宝可梦卡；`/zh/yahoo` 浅色底、橙色按钮与价格、中文分类名、全站浏览——**与改动前完全一致**。tsc 0 errors + build 通过。

**附带印证**：中文站截图里雅虎商品图正常显示，再次确认此前撤回的「yahoo 图全裂」判断不成立（是懒加载时序）。

## 变更记录 2026-07-25(9) · yahoo 列表时间字段 bug 的精确定位（结论修正，未改代码）

上一条把现象记成「后端对整页所有商品返回同一个 end_time」，**描述不准，现修正**。

**精确结论（生产实测，同一商品列表 vs 详情对照）**：

| 来源                    | 字段                          | 值（商品 s1183792426）                                    |
| ----------------------- | ----------------------------- | --------------------------------------------------------- |
| 列表 `/yahoo/goods`     | `end_time` / `left_time`      | `1784970552` / `50秒` —— 该时间戳**比当前时刻早 1075 秒** |
| 详情 `/yahoo/goods/:no` | `end_time` / `left_timestamp` | `07月26 18:09 竞拍结束` / `88997`（≈24.7 小时后）         |

三件商品列表一律 `left_time=50秒`，详情却各为 88997 / 88993 / 88989（各自递减，合理）。带关键词查询时 `left_time` 呈 49、50、51、52 秒**逐件递增 1 秒**，`end_time` 同步 +1。

→ **列表的 `end_time` 实为「抓取时刻 + ~50 秒」的快照**，抓完不再更新，所以同一批抓取的商品共享同一个值，且随时间推移变成过去时间。**详情接口的时间是准的**，说明上游数据源本身有真实结束时间，只是列表没带上。

**责任层**：后端 `yahoo.goods.service.ts:412` 是原样透传老后台 `goodsList`，不加工时间字段 → bug 在老后台的雅虎列表实现（阿里云 PHP）。

**当前前端处理正确**：(6) 已移除列表时间徽章。若当时按原计划把它格式化展示，现在页面会显示「还剩 50 秒」或「18 分钟前已结束」，全是假的。`formatRemainingLabel()` 保留在 `yahoo-urgency.ts`，**上游修好后解开即可**。

**未修原因**：属老后台（脆弱生产库）改动，超出 en 前端优化范围，需单独排期与授权。验收标准：列表返回的 `end_time` 与同商品详情的 `end_time` 一致（或列表直接给 `left_timestamp`）。

## 变更记录 2026-07-25(10) · yahoo 列表时间字段修复（前后端一批，待推）

**根因（生产快照实锤，非推断）**：老后台每次抓取都会把雅虎原始 HTML 存到 `runtime/api/yahoo_search.html`。对比两份快照：2025-04 的快照里 `Product__time` 是真值（`7時間`/`2日`）；**今天的快照里雅虎返回的就是占位假值**（`js-countDown" data-timeleft="53">53秒`，整页 50 件全在 50~100 秒），是雅虎改版后留给浏览器 JS 接管的骨架。**老后台解析忠实、无 bug；bug 在数据源，谁也修不了雅虎**。

**修法（NestJS 透传层，老后台零改动）**：后端 `bdc5d27`——①列表剥假时间+用详情链路写入的真时间补 `end_timestamp`（一次 IN 查询，历史污染记录被 `> now` 天然过滤）②列表不再把假时间写库（此前全靠 goodsNo 唯一键冲突静默失败才没大面积污染详情）③详情缓存加骨架回源与按 `lastSyncedAt` 动态计时（顺手修掉「缓存倒计时永不衰减」老雷）。新增 3 条单测，26/26 绿，全量 103 套件过。

**前端本批**：`YahooItem.endTimestamp` 接后端 `end_timestamp`（`normalizeEndTimestamp` 本就支持，一行接线）；列表时间徽章基于可信时间恢复渲染（`formatTimeLeftLabel`，en/zh 文案分流），**只对有值的商品显示，宁缺毋假**。后端未部署时字段缺失 → 徽章不渲染 = 与当前线上行为一致，前端可先行。

**预期效果与边界**：徽章覆盖率 = 详情缓存里有该商品且未结束的比例（详情被访问过才有），不是 100%——这是雅虎断供后能拿到的最好结果。tsc 0 errors + lint 0 errors + build 通过。

## 变更记录 2026-08-17 · zh 侧中文 GEO 长文指南首批 5 篇（中枢 Claude，本地已 commit，**未推**）

**为什么**：①2026-07-21 中文 AI 引用源实测（秘塔 + Perplexity）显示，被 AI 引用的是小红书帖 / App Store 页 / **官网** / 公众号横评文，袋鼠君零提及 ②小红书账号 2026-08 再度封禁一个月（代购导流是平台明确打击类目），站外单点依赖风险已兑现两次 ③**自己的站没人能封**，而 5 篇中文横评长文早已写好躺在 `.team\brain\tmp\geo-guides-draft\`。en 侧 `/en/guides/*` 一年前就走通了这条路，zh 侧一直是空白。

**架构选择（方案 B：新建 zh 专用壳，不动英文壳）**：`guide-shell.tsx` 有 5 处 en-only 焊死（canonical/hreflang/品牌/面包屑/CTA 落 `/cards`）。改造它会动到已上线的 6 篇英文 TCG 长文；en/zh 本就是两套业务体系，且 sitemap 既有 `skipEn`/`skipZh` 证明分流是本仓成熟模式。故新建 `zh-guide-shell.tsx`，**排版原子（GuideH2/GuideP/GuideTable…）直接 re-export 英文壳的导出，不复制粘贴**。英文壳 `git diff --stat` 为空。

**改了什么**：

- 新增 `src/app/[lang]/guides/zh-guide-shell.tsx`：`buildZhGuideMetadata`（zh → index + canonical/hreflang 只声明 zh；非 zh → `noindex, follow` + canonical 指回 zh）、`ZhGuideShell`（Article + BreadcrumbList JSON-LD，深色壳对齐英文版，CTA 落 `/{lang}/products` `/fees` `/faq`）。
- 新增 5 篇 zh 长文（`src/app/[lang]/guides/<slug>/page.tsx`）：`mercari-daigou-fee-comparison-2026`（手续费横评，含 4 列真 `<table>`）、`japan-daipai-platforms-2026`（七维度平台横评，含真 `<table>`）、`japan-daigou-shipping-cost-guide`（国际运费/合箱）、`japan-daigou-newbie-guide`（7 个隐藏费用）、`daigou-human-vs-bot-service`（人工 vs 自助客服）。每篇带 FAQPage 结构化数据（3–5 问）。
- `guides/page.tsx` hub 加 `GUIDES_ZH` 列表 + zh 分支（en 分支功能零改动）。
- `sitemap.ts` 新增 `zhOnlyPages`（hub + 5 篇），`LAST_MODIFIED` 拨到 2026-08-17。

**内容纪律（写进施工单并逐条复核）**：竞品一律代称（挖★姬 / 乐★番），**不出现真名**；只用已核实数字，notebook 中标「存疑/未证实/降级」的一律不用（乐★番「3% 封顶 1000 円」「90 天仓储」未采用，现网公示 30 天照写；樱花日淘任何数字均未引用）；我方口径严格限于白名单 5 项（手续费现免 / 拍照 200 円 3 张实拍 / 真人客服 / 免费代砍价代留言 / 费用透明），其余一律「以官网当日公示为准」；不贬低同行，主动写自己短板（如物流/仓储查询的响应速度自动化平台有时更快）。

**🔴 一个我自己犯的错**：施工单里我把白名单写成「三项」，源稿实为**五项**。分身没盲从卡、按源文件纠正并主动标出来要我复核——核验后**分身对、我错**，已按五项口径定稿。

**验证（中枢自跑，非采信分身自述）**：

| 项              | 结果                                                                              |
| --------------- | --------------------------------------------------------------------------------- |
| `npm run build` | EXIT=0；`.next` 下 11 个 guides 路由全部产出（6 en + 5 zh）                       |
| 5 篇 HTTP 状态  | 全 200                                                                            |
| 结构化数据      | 5 篇全含 Article + BreadcrumbList + **FAQPage**（Question 3–5 个）                |
| canonical       | 5 篇全指向 `https://jp-buy.com/zh/guides/<slug>`                                  |
| 非 zh 分流      | `/en/`、`/ja/`、`/ko/` 同 slug 全部 `noindex` + canonical 指回 zh                 |
| sitemap.xml     | 含 6 条 zh guides URL（hub + 5 篇），总条数 70→77                                 |
| hub 链接        | 5 条全部指向真实路由，**零 404**（Next.js 不校验 Link 目标，上一版曾留 4 条死链） |
| 真表格          | 横评页渲染出 `<table>`，表头「维度/挖★姬/乐★番/袋鼠君」，单元格与源稿逐字一致     |
| 正文完整性      | 5 篇各 2.2k–3.0k 字，h2 5–10 个                                                   |
| 泄漏扫描        | 竞品真名（Buyee/ZenMarket/樱花日淘）0 命中；内部审稿说明 0 命中；新造数字 0 处    |
| console         | 仅 `/api/backend/*` 404（本地 dev 未连 ECS 后端，与静态长文页无关）               |

**已知小瑕疵（不改，与英文壳同款行为）**：非 zh locale 的页面虽 `noindex`，`ZhGuideShell` 仍按 `isIndexable(lang)` 输出 Article JSON-LD（en/ko 会输出，ja 不会）。英文壳 `guide-shell.tsx:190` 是同一写法，属对称复制而非新引入偏差；JSON-LD 内 `mainEntityOfPage` 写死 zh URL，noindex 页的结构化数据 Google 不会采用，实际影响≈0。

**🔴 未推**：只做本地 commit（`4cd0c65`），等花哥明确「推」。

**🔴 更正（同日，花哥指出「现在不用 vercel 了」后实测）**：本文档此处原写「push main = Vercel 自动部署 = 直接上线」，**是错的**。前端已于 2026-08-10 切到阿里云 ECS 容器，与后端同链路：

- 实测 `curl -I https://jp-buy.com/zh` → `Server: nginx` + `X-Powered-By: Next.js`（Vercel 会是 `server: Vercel` + `x-vercel-id`）。
- `.github/workflows/docker-image.yml` 的 `on: push: branches:[main]` 只做一件事：构建 amd64 镜像推 `ghcr.io/dylan3589277/kangaroo-japan-frontend:latest`。**它不碰 ECS。**
- 上线还差第三步：ECS 上 `docker pull ...:latest` + `bash /opt/kangaroo-backend/run-frontend.sh`，再打 jp-buy.com 验活。

所以**推 main ≠ 上线**，前后端现在是同一套规矩。原判断的错因是拿 `.vercel/repo.json` 文件存在当托管证据——**配置文件残留 ≠ 链路还在用**。正确判据只有两个：① `.github/workflows/` 里实际跑什么 ② 打生产域名看 `Server` 响应头。完整四步见 skill `deploy-backend`。

**⚠️ 推之后的副作用（不碰生产但要知道）**：本 commit 含 8 个 tsx/ts，会触发镜像构建，把 `:latest` 标签指向含本次改动的新镜像。若此时别的会话上 ECS `docker pull latest` 部署他们自己的东西，会**连带**把这 5 篇 guides 一起带上生产。所以推之前最好确认没有别人正在部署。

**下一步（未做）**：一稿两投——同 5 篇发微信公众号「煤炉供销社」（`wx76cffc295c3fae23`，zh 线唯一对外号，至今只当推送管道用、从未发过内容）。公众号三个不可替代优势：不会因代购导流被封 / 文章有独立 URL 可被微信搜一搜与中文 AI 抓全文 / 闭环最短。待花哥确认是订阅号还是服务号（决定发文频率）。

---

## 变更记录 · 2026-08-17 ✅ 5 篇 zh guides 已上线生产

**为什么**：花哥明确下「上线」令，执行前端四步的最后一步（ECS `docker pull` + `run-frontend.sh`）。上文「🔴 未推」状态到此结束。

**改动**：无代码改动。上线的是已在 main 的 `4cd0c65`（5 篇 zh guides）+ `8205f4a`（本文档更正）两个 commit。

**逻辑（四步全走完，每步留实测输出）**：

| 步骤             | 证据                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ① 记回滚锚点     | 旧镜像 `sha256:ada3fe8af806…`（容器 `Up 2 days`）。**锚点必须是实测镜像 ID，不能用 git sha**——生产跑 `:latest` 浮动 tag，用 sha 会滚到从没上过生产的版本                                          |
| ② 抓上线前基线   | `/zh` 200、`/zh/guides` 200、**5 篇子页全 404**                                                                                                                                                   |
| ③ 核现网真实版本 | 镜像 `CREATED=2026-08-14T08:56:04Z` → 现网 = `755777c`。`gh run list --workflow docker-image` 显示 `755777c`(08-14) 与 `8205f4a`(08-17) 之间**无其它构建**，故这趟只带我自己的两个 commit，零夹带 |
| ④ 拉镜像         | `Status: Downloaded newer image`，新 ID `sha256:95376d8cde1d…`，Digest `sha256:427fce36…`                                                                                                         |
| ⑤ 重启容器       | `bash /opt/kangaroo-backend/run-frontend.sh` → `kangaroo-frontend \| Up 10 seconds`，运行镜像 = `95376d8cde1d`（新），本机 `3200/zh=200`                                                          |
| ⑥ 生产验活       | 5 篇子页 **404 → 200 全翻绿**；`/zh` `/zh/guides` `/en` `/en/guides` `/sitemap.xml` 全 200；`/` 307 → `/en/`（根路径重定向，正常）；响应 0.2–0.6s                                                 |
| ⑦ 内容验证       | 5 篇 `<title>` 逐条比对与源稿一致（非空壳）；英文 6 篇 guides 真实 slug 全 200，英文站零回归                                                                                                      |

**回滚命令（锚点保留中，勿清理该镜像）**：

```bash
docker tag ada3fe8af806 ghcr.io/dylan3589277/kangaroo-japan-frontend:latest && bash /opt/kangaroo-backend/run-frontend.sh
```

**🔴 验活踩的坑（教训）**：我在验活清单里手写了 `/en/guides/buyee-review-2026` 想证明"没搞坏英文站"，结果 404，一度以为上线引发回归。查 `sitemap.xml` 才发现**这篇的真实 slug 是 `is-buyee-legit-2026`，我猜的 URL 根本不存在**。教训：**验活清单里的 URL 必须来自 sitemap 或源码，不能凭记忆手写**——手写 URL 的 404 会伪装成生产事故，浪费排查时间，也可能反过来让人对真事故脱敏。

**`run-frontend.sh` 的危险点（下次上线仍适用）**：脚本是 `docker rm -f` **在前**、`docker run` 在后，env 全写死在脚本里（拉新镜像不影响 env）。所以**必须 pull 成功之后才能跑**——先删后建意味着新镜像起不来时前端全站挂，只能靠锚点回滚。

---

## 变更记录 · 2026-08-19 ⏸ 小红书管线加停发开关 + 推送文案改可核验

**为什么**：小红书账号被封禁 1 个月（通知日 2026-08-17，起算日待确认，预估 9/17 解封）。管线是 launchd 定时的，**封禁期它照样每周一 09:00 推草稿给客服**——客服发不出去，等于白白烧掉仅剩的存稿（现在只剩 `15-seller-rating`、`16-offer-culture` 两篇）。同时补上一个老毛病：客服回传的常是创作者后台链接，访客打不开、没法核验发布效果（详见私有记忆 `xhs-verify-needs-share-link`）。

**改动**（M4 `~/.kangaroo/xhs-pipeline/xhs_weekly_send.py`，三处，备份 `.bak-1786956425`）：

| #   | 位置     | 内容                                                                                                                            |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ①   | `:27`    | 加 `PAUSE = BASE / "PAUSE"` 常量                                                                                                |
| ②   | `:96-99` | `main()` 最早期检查哨兵，存在则记日志 + `return 0`                                                                              |
| ③   | `:115`   | 推送文案改成要求客服做两件事：App 内【分享→复制链接】回群（**别用创作者后台链接**）、自查笔记顶部有无「可能含 AI 生成内容」灰字 |

**逻辑（为什么用哨兵文件而不是改 plist / 注释代码）**：哨兵是**完全可逆的单文件开关**——`rm` 一下就恢复，不用改 launchd、不用重新加载 plist、不留半截被注释的代码。而且**停发这件事本身会留痕**（日志写 `PAUSED, skip this run: <原因>`），比"定时任务被人默默关掉了"好排查得多。

**自验（代码对 ≠ 运行时对，四项都实测）**：

| 验什么               | 输出                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 语法                 | `SYNTAX OK`                                                                                                                                                    |
| 三处改动落位         | grep 命中 `:27` / `:96` / `:115`；**旧文案 `发完把链接回群` 残留计数 = 0**                                                                                     |
| 哨兵**真的拦住**     | 实跑一次 → `2026-08-17 17:48:29 PAUSED, skip this run: 小红书账号被封禁 1 个月…`，`exit=0`                                                                     |
| 新文案**真的渲染对** | 临时移开哨兵跑 `--dry-run` → `[dry-run] would send 2137 bytes: '📕 …①在 App 里点【分享→复制链接】…'`，跑完哨兵立即归位（`ls -la PAUSE` 确认 220 bytes 回来了） |

跑 `--dry-run` 之前先 `grep -n 'dry'` 确认过 `post_markdown:56` 的 `if dry:` 只打印不发、`:119` 的 `if not dry:` 才标记草稿已发——**验证手段本身要先验证是安全的**，否则"试跑"会把仅剩的存稿标记成已发。

**代码传 git 怎么落的**：M4 上 `~/.kangaroo/` 和 `~/kangaroo-scripts/` **都不是 git 仓**，脚本本来就困在单机。新建 `scripts/ops/xhs-pipeline/` 存**灾备快照**（脚本 + 补丁 + README），并在 README 头部写死「权威副本在 M4，改这里不会生效」——防的是"仓里有一份、机器上跑另一份"的漂移假象。同时加 `.gitattributes` 对该目录锁 `eol=lf`：本仓 `core.autocrlf=true`，带 CRLF 的脚本传回 macOS 会让 shebang 变 `python3\r` 直接炸（教训见私有记忆 `crlf-kills-prod-scripts`）。

**⚠️ 副作用**：本 commit 只改 `docs/` 与新增 `scripts/ops/`，**运行时代码零变化**（`.dockerignore` 忽略 `docs`，最终镜像只 `COPY --from=build /app/.next/standalone`，scripts 不进镜像）。但 push main 仍会触发 `docker-image` 构建让 `:latest` 指向新镜像——别的会话此时 `docker pull latest` 部署，拿到的功能与现网一致。

**恢复发送**：`ssh macmini "rm ~/.kangaroo/xhs-pipeline/PAUSE"`，下周一 09:00 自动继续。
