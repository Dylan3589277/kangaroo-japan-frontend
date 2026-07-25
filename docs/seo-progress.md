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
