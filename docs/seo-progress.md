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
  **🔴 跟进**：Section 122 关税 2026-07-24 到期，续接政策落地后必须更新关税指南 + FAQ tariff2026 条目 + llms.txt；对比文点名竞品与 /fees 页匿名首字母口径不一致（花哥知情，未要求改回）。

## 变更记录 2026-07-04 · zh 品牌切「袋鼠君」+ zh GEO 内容包（中枢 Claude，代码已就绪待推）

**为什么**：花哥 2026-07-04 拍板 zh 对外品牌=袋鼠君（与小程序一致），并给了推广口径（现行活动汇率+收费标准）。
**改了什么（代码，待推）**：root layout zh meta（title/brand/og 全切袋鼠君，JP-Buy 作副名）、seo.ts brandForLocale zh→袋鼠君 + Organization 加 alternateName、llms.txt zh 段改袋鼠君并补实测费率（汇率0.0424/煤炉手续费200円/雅虎220+200/押金1元=200円额度——来源：小程序公开接口 api/goods/mdetail 实测+详情页展示口径）。
**站外内容（不进仓库，在 .team\artifacts\geo-zh-content-20260703\）**：小红书笔记×3+发布SOP、知乎对比长文、小红书自动维护方案（结论：不做全自动防封号，做半自动内容管线）、Trustpilot/Reddit 启动清单。
