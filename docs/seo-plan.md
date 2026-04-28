# 袋鼠君独立站 SEO 优化方案（面向全球市场，排除日本）

> 目标市场：中国、美国、欧洲、大洋洲、东南亚、韩国
> 项目：kangaroo-japan（jp-buy.com）
> 技术栈：Next.js 16 + next-intl + NestJS + TypeORM + PostgreSQL

---

## 一、多语言 SEO 架构

### 1.1 当前语言现状

| 语言 | 代码 | 状态 |
|------|------|------|
| 简体中文 | zh | ✅ 已有（defaultLocale） |
| 英文 | en | ✅ 已有 |
| 日文 | ja | ✅ 已有（保留界面用，不做SEO推广，加noindex） |

### 1.2 新增语言

| 语言 | 代码 | 目标市场 | 优先级 |
|------|------|---------|--------|
| 韩文 | ko | 韩国 🇰🇷 | P0 |
| 泰语 | th | 泰国 🇹🇭 | P0 |
| 印尼语 | id | 印度尼西亚 🇮🇩 | P0 |
| 越南语 | vi | 越南 🇻🇳 | P1 |

### 1.3 路由结构

保持现有 `[lang]` 路由模式：
- `/en/products` — 英文用户
- `/zh/products` — 中文用户
- `/ko/products` — 韩文用户
- `/th/products` — 泰语用户
- `/id/products` — 印尼语用户
- `/vi/products` — 越南语用户
- `/ja/products` — 日文用户（保留界面，加 noindex，不做SEO）

`localePrefix: 'as-needed'` 保持不变（root URL 不显示 locale，自动跳转默认语言）。

### 1.4 配置统一

⚠️ **重要修复**：当前存在两处 i18n 语言配置，必须统一为 routing.ts 唯一配置源。

- **config.ts**（当前写死 `['zh', 'en']`）→ 删除或废弃，所有引用改为 routing.ts
- **routing.ts** → 唯一语言配置源头
- **request.ts** → 去掉硬编码的 `"zh" | "en"` 类型守卫，改用 `routing.locales.includes()` 动态判断

### 1.5 hreflang 配置

在 `layout.tsx` 中根据当前语言的 locale 动态生成对应 hreflang 标签：

| 语言 | hreflang | 区域变体 |
|------|----------|---------|
| en | en, en-us, en-gb, en-au, en-ph, en-sg, en-my | 美国/英国/澳洲/菲律宾/新加坡/马来西亚 |
| zh | zh, zh-cn, zh-sg | 中国/新加坡 |
| ko | ko, ko-kr | 韩国 |
| th | th, th-th | 泰国 |
| id | id | 印尼 |
| vi | vi | 越南 |
| ja | ja | 日本（noindex，保留hreflang兼容） |
| x-default | x-default | 默认 |

### 1.6 区域自动检测（中间件增强）

在 `middleware.ts` 中根据用户IP检测国家/地区，自动推荐最佳语言：
- **有用户语言 cookie** → 跳过检测，用 cookie 值（防止用户主动切换后又被跳回）
- **无 cookie**（首次访问）→ IP检测自动跳转
- 中国（CN）→ `/zh`
- 美国/英国/澳大利亚等英语国家（US/GB/AU...）→ `/en`
- 韩国（KR）→ `/ko`
- 泰国（TH）→ `/th`
- 印尼（ID）→ `/id`
- 越南（VN）→ `/vi`
- 日本（JP）→ `/ja`（加 noindex）
- 其他 → `/en`（默认）

IP检测使用 Vercel Edge 运行时的 `request.geo.country`（免费可用）。
本地开发时 fallback 到浏览器 Accept-Language。

### 1.7 日语页面 noindex 策略

花哥决策：**日语页面公开可访问，但加 noindex, nofollow**

- 在 `src/app/[ja]/layout.tsx` 中动态注入 `<meta name="robots" content="noindex, nofollow" />`
- 日语页面仍可访问（已注册的日本用户能正常使用），但搜索引擎不收录
- sitemap 中不包含日语页面
- hreflang 仍保留 `ja` 标签（供已收录历史页面兼容）

### 1.8 多语言站点地图

每语言独立站点地图，在 `robots.txt` 中标注：

```
Sitemap: https://jp-buy.com/en/sitemap.xml
Sitemap: https://jp-buy.com/zh/sitemap.xml
Sitemap: https://jp-buy.com/ko/sitemap.xml
Sitemap: https://jp-buy.com/th/sitemap.xml
Sitemap: https://jp-buy.com/id/sitemap.xml
Sitemap: https://jp-buy.com/vi/sitemap.xml
<!-- ja 不加入站点地图，因为 noindex -->
```

站点地图包含：
- 首页
- 商品列表页（按分类、按平台）
- 商品详情页（只收录 high-priority 商品）
- 静态内容页（关于我们、使用指南、攻略文章）
- 分类落地页
- 文章/博客页

---

## 二、结构化数据（schema.org）

### 2.1 商品详情页（Product Schema）

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{当前语言的商品标题}",
  "description": "{当前语言的商品描述}",
  "image": "{商品首图URL}",
  "sku": "{平台商品ID}",
  "brand": { "@type": "Brand", "name": "{品牌名}" },
  "offers": {
    "@type": "Offer",
    "price": "{js-yen}",
    "priceCurrency": "JPY",
    "priceValidUntil": "{日期}",
    "availability": "https://schema.org/InStock",
    "url": "{商品页URL}"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{评分}",
    "reviewCount": "{评价数}"
  }
}
```

### 2.2 商品比价页（Product + MultiOffer）

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{商品名}",
  "offers": [
    {
      "@type": "Offer",
      "seller": { "@type": "Organization", "name": "Mercari" },
      "price": "2800",
      "priceCurrency": "JPY"
    },
    {
      "@type": "Offer",
      "seller": { "@type": "Organization", "name": "Rakuten" },
      "price": "3200",
      "priceCurrency": "JPY"
    }
  ]
}
```

### 2.3 首页（WebSite + Organization + SearchAction）

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "JP Buy - Japan Cross-border Shopping",
  "url": "https://jp-buy.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://jp-buy.com/{lang}/products?search={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### 2.4 文章页（Article Schema）

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{文章标题}",
  "description": "{文章摘要}",
  "image": "{文章封面图}",
  "datePublished": "2026-01-01",
  "author": {
    "@type": "Organization",
    "name": "JP Buy"
  }
}
```

### 2.5 BreadcrumbList（全站）

全站页面自动生成面包屑导航的 schema：

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "首页", "item": "https://jp-buy.com/en" },
    { "@type": "ListItem", "position": 2, "name": "商品", "item": "https://jp-buy.com/en/products" },
    { "@type": "ListItem", "position": 3, "name": "商品名", "item": "https://jp-buy.com/en/products/xxx" }
  ]
}
```

---

## 三、元数据策略

### 3.1 页面元数据模板

#### 首页
| 语言 | title | description |
|------|-------|-------------|
| en | JP Buy - Best Japan Shopping & Cross-border Price Comparison | Compare prices from Mercari, Rakuten, Amazon Japan. Save big on Japanese products with JP Buy's cross-border shopping service. |
| zh | JP Buy - 日本代购比价平台 | 比价 Mercari、乐天、亚马逊日本，一站式日本海淘代购，省钱省心。 |
| ko | JP Buy - 일본 직구 가격 비교 플랫폼 | 메루카리, 라쿠텐, 아마존 재팬 최저가 비교! 일본 직구 대행 서비스. |
| th | JP Buy - แพลตฟอร์มเปรียบเทียบราคาสินค้าญี่ปุ่น | เปรียบเทียบราคาจาก Mercari, Rakuten, Amazon Japan ช้อปสินค้าญี่ปุ่นราคาถูก |
| id | JP Buy - Platform Perbandingan Harga Belanja Jepang | Bandingkan harga dari Mercari, Rakuten, Amazon Japan. Belanja produk Jepang dengan harga terbaik. |
| vi | JP Buy - Nền tảng so sánh giá mua hảng Nhật | So sánh giá từ Mercari, Rakuten, Amazon Japan. Mua hảng Nhật giá rẻ. |

#### 商品列表页（动态生成）
```
title: "{关键词} | JP Buy"
description: "Compare prices of {关键词} from Mercari, Rakuten, Amazon Japan. Best deals on Japanese {关键词}."
```

#### 商品详情页（动态生成）
```
title: "{商品名} - Best Price ¥{价格} | JP Buy"
description: "{商品名} from {平台}. Compare prices, read reviews, and buy directly from Japan. ✓ Free shipping ✓ Secure payment."
```

#### 文章/攻略页（动态生成）
```
title: "{文章标题} | JP Buy Blog"
description: "{文章摘要}"
```

### 3.2 Open Graph / Twitter Card

全站页面统一生成：

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="JP Buy" />
<meta property="og:title" content="{当前语言的页面标题}" />
<meta property="og:description" content="{当前语言的页面描述}" />
<meta property="og:image" content="{当前语言的OG图片}" />
<meta property="og:url" content="{当前页面URL}" />
<meta property="og:locale" content="{zh_CN|en_US|ko_KR|th_TH|id_ID|vi_VN}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{标题}" />
<meta name="twitter:description" content="{描述}" />
```

### 3.3 多语言 OG 图片策略

按语言生成不同文字的 OG 图片：
- `og-image-en.jpg` — 英文版本
- `og-image-zh.jpg` — 中文版本
- `og-image-ko.jpg` — 韩文版本
- ...

使用 `next/og`（Vercel Edge OG Image Generation）动态生成。

---

## 四、性能优化（Core Web Vitals）

### 4.1 目标指标

| 指标 | 目标 | 当前（预估） |
|------|------|-------------|
| LCP (最大内容绘制) | < 2.5s | ~3-4s（需改善） |
| FID (首次输入延迟) | < 100ms | ✅ 良好 |
| CLS (累计布局偏移) | < 0.1 | ~0.15（需改善） |
| TTFB (首字节时间) | < 800ms | ~1.2s（需改善） |

### 4.2 图片优化

- Sharp 已在 dependencies 中 ✅
- 使用 `next/image` 替代 `<img>` 标签
- 商品图片自动 WebP/AVIF 转换
- 实现图片懒加载（`loading="lazy"`）
- 设置明确的 `width` 和 `height` 防止 CLS
- CDN：Vercel Edge Network 自带优化

### 4.3 渲染策略

| 页面类型 | 策略 | 原因 |
|---------|------|------|
| 首页 | ISR（revalidate: 3600） | 内容变化不频繁，需要缓存 |
| 商品列表页 | SSR | 搜索结果需要实时 |
| 商品详情页 | ISR（revalidate: 3600） | 价格变化不算特别快 |
| 静态文章/攻略 | SSG | 内容不变 |
| 文章列表 | SSG | 内容不变 |
| 用户页面(登录/注册) | SSR/CSR | 用户交互 |
| 关于我们/FAQ | SSG | 静态内容 |

### 4.4 字体优化

- 使用 `next/font` 加载 Google Fonts（Noto Sans SC/Noto Sans KR/Noto Sans Thai...）
- 预加载关键字体
- font-display: swap（防止FOIT）

### 4.5 缓存策略

- 后端 NestJS 添加 Cache-Control 头
- 静态资源（图片/CSS/JS）长期缓存（1年）
- API 响应添加 ETag
- Vercel Edge Cache 配置

---

## 五、中国市场 SEO

### 5.1 百度优化

| 项目 | 说明 |
|------|------|
| 百度站长平台 | 站点验证（文件验证或meta验证）、sitemap提交 |
| 百度收录 | 提交 sitemap.xml 到百度搜索资源平台 |
| 百度结构化数据 | 百度 B2B/商品结构化数据（基于schema.org扩展） |
| 百度MIP | 可选，移动端加速。先不搞，看收录情况 |
| 百度熊掌号 | 目前不是必须，后续考虑 |
| 百度收录检测 | 定期用 `site:jp-buy.com` 检查收录情况 |

### 5.2 中文内容策略

SEO内容优先做以下方向（中日跨境购物相关）：
- 「日本代购攻略」类（怎么买、关税、运费）
- 「日本商品比价」类（日本PS5多少钱、日本化妆品值得买吗）
- 「日本商家评测」类（Mercari怎么用、乐天怎么买）
- 「日淘指南」类（从日本买东西完整流程）

### 5.3 中文社交分享

- 微信内分享优化（微信JSSDK卡片预览）
- 小红书内容引流（攻略型内容）
- 微博/知乎内容互动

---

## 六、韩国市场 SEO

### 6.1 Naver 优化

| 项目 | 说明 |
|------|------|
| Naver Search Advisor | 站点验证 + sitemap提交 |
| Naver 结构化数据 | Naver专用 schema（产品/文章/购物） |
| Naver 爬虫 | `NaverBot` 和 `Yeti` 爬虫在 robots.txt 中放行 |
| Naver 购物搜索 | 如果未来做Naver Shopping，需要商品feed |

### 6.2 韩文内容策略

- 「일본 직구 비교」类（日本代购比价）
- 「일본 중고 명품」类（日本二手奢侈品）
- 「일본 한정판」类（日本限定商品）
- 「메루카리/라쿠텐 해외 직구 가이드」类（各平台使用指南）

---

## 七、东南亚市场 SEO

### 7.1 泰国市场

| 项目 | 说明 |
|------|------|
| 搜索引擎 | Google Thailand（99%份额） |
| 特殊平台 | LINE搜索（LINE在泰国70%+渗透率） |
| 语言 | 泰语（新增） |
| 搜索趋势 | 日本コスメ、アニメグッズ、ブランド品 |
| LINE搜索优化 | 标准schema.org即可兼容，无需特殊meta标签 |
| 内容方向 | 「วิธีซื้อสินค้าญี่ปุ่น」「เปรียบเทียบราคาสินค้าญี่ปุ่น」 |

### 7.2 印度尼西亚市场

| 项目 | 说明 |
|------|------|
| 搜索引擎 | Google Indonesia |
| 特殊平台 | TikTok搜索（Z世代热门） |
| 语言 | 印尼语（新增） |
| 搜索趋势 | 日本アニメ、ファッション、コスメ |
| 内容方向 |「Cara Belanja dari Jepang」「Perbandingan Harga Jepang」「Anime Merch Jepang」|

### 7.3 越南市场

| 项目 | 说明 |
|------|------|
| 搜索引擎 | Google Vietnam（~85%）+ Cốc Cốc（~10%） |
| 特殊平台 | Zalo搜索 |
| 语言 | 越南语（新增） |
| Cốc Cốc适配 | 标准schema.org即可兼容，无需特殊meta标签 |
| 内容方向 |「Hướng dẫn mua hàng Nhật」「So sánh giá điện tử Nhật Bản」|

### 7.4 菲律宾 / 马来西亚 / 新加坡

三市场英文可覆盖，但内容需要本地化：
- 菲律宾：添加菲律宾比索（PHP）价格显示
- 马来西亚：添加马币（MYR）价格显示
- 新加坡：添加新币（SGD）价格显示
- 创建各自国家的独立SEO落地页：「Shipping to Philippines」「Best Japanese Deals for Philippines」

> 注：本地货币价格显示属于 Phase 6 后端扩展 + Phase 4 落地页的交叉任务，需要同步推进。

---

## 八、URL 结构优化

### 8.1 SEO友好URL

| 当前 | 优化后 |
|------|--------|
| /products?search=ps5 | /products/ps5（静态落地页） |
| /products?category=1 | /{lang}/category/{slug} |
| 无独立搜索页 | /{lang}/search |
| 无攻略页面 | /{lang}/guides/{slug} |

### 8.2 分类落地页

自动生成多语言分类落地页（依赖 Category 实体的 slug 字段）：
- 当前 `category.entity.ts` 已有 `slug` 字段，可用于路由
- 分类名称有 `nameZh/nameEn/nameJa` 多语言字段
- 新增语言后需同步扩展：`nameKo/nameTh/nameId/nameVi`

落地页示例：
- /en/category/japanese-cosmetics
- /zh/category/日本化妆品
- /th/category/เครื่องสำอางญี่ปุ่น
- /id/category/kosmetik-jepang
- /ko/category/일본화장품
- /vi/category/mỹ-phẩm-nhật-bản

### 8.3 平台指南页

- /en/mercari-guide
- /zh/乐天购物指南
- /th/วิธีใช้ Rakuten

---

## 九、Technical SEO

### 9.1 robots.txt

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /*?sort=       （禁止排序参数URL）
Disallow: /*?page=       （禁止分页参数URL）
Allow: /*?search=        （允许搜索参数URL）
Allow: /*?category=      （允许分类参数URL）

# 爬虫友好
User-agent: Googlebot
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: NaverBot
Allow: /

User-agent: Yeti
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: https://jp-buy.com/sitemap.xml
Sitemap: https://jp-buy.com/en/sitemap.xml
Sitemap: https://jp-buy.com/zh/sitemap.xml
Sitemap: https://jp-buy.com/ko/sitemap.xml
Sitemap: https://jp-buy.com/th/sitemap.xml
Sitemap: https://jp-buy.com/id/sitemap.xml
Sitemap: https://jp-buy.com/vi/sitemap.xml
```

> 注：`Disallow: /*?*` 太激进会阻止搜索结果页收录。改用精确规则——只禁排序/分页参数，保留搜索和分类参数可收录。

### 9.2 Canonical URL

每个页面必须设置 `<link rel="canonical" href="..." />`，防止参数化URL造成重复内容。

### 9.3 404页面

友好的多语言404页面，包含搜索框和推荐商品。

### 9.4 HTTP 状态码

- 404 正确返回 404
- 已下架商品返回 410（Gone）
- 重定向使用 301（永久）而非 302

### 9.5 JSON-LD 全局注入

在 `layout.tsx` 全局注入 `Organization` + `WebSite` + `SearchAction` schema，其他页面级schema在各页面的 async generateMetadata 中生成。

---

## 十、翻译策略

### 10.1 翻译范围

花哥决策：**全部16个翻译文件全部翻译**，且必须符合当地语言使用习惯，不能有机器翻译味。

当前翻译文件列表：
| 文件 | 中文内容量 | 说明 |
|------|----------|------|
| common.json | ~230行 | UI通用（导航/首页/商品/购物车等）⭐核心 |
| auth.json | ~50行 | 登录/注册/密码相关 ⭐核心 |
| mercari.json | ~40行 | Mercari平台商品页面专用 |
| yahoo.json | ~40行 | Yahoo平台商品页面专用 |
| amazon.json | ~40行 | Amazon平台商品页面专用 |
| bids.json | ~40行 | 竞拍管理 |
| deposit.json | ~50行 | 充值相关 |
| vip.json | ~30行 | VIP会员 |
| shop.json | ~30行 | 积分商城 |
| coupons.json | ~30行 | 优惠券 |
| sign.json | ~20行 | 每日签到 |
| messages.json | ~50行 | 消息通知 |
| community.json | ~40行 | 社区/动态 |
| articles.json | ~30行 | 文章/资讯 |
| orders.json | ~80行 | 订单管理 ⭐核心 |
| warehouse.json | ~60行 | 仓库管理 |
| mnp.json | ~30行 | MNP相关 |

### 10.2 翻译方法

- **第一阶段**：使用 Claude/Batch API 批量AI翻译，覆盖所有文件
- **第二阶段**：核心文件（common、auth、orders、mercari、yahoo、amazon）人工审核
- **第三阶段**：根据实际使用反馈持续优化

### 10.3 翻译质量标准

翻译风格要求：
| 语言 | 风格要求 |
|------|---------|
| 韩文 | 正式亲切，类似 쿠팡/지마켓 风格 |
| 泰语 | 年轻活力，类似 Shopee Thailand 风格 |
| 印尼语 | 轻松自然，类似 Tokopedia 风格 |
| 越南语 | 简洁友好，类似 Tiki 风格 |

---

## 十一、实施计划

### Phase 1 — 基础设施（5-7天）

| 任务 | 内容 | 负责 |
|------|------|------|
| 1.1 | 统一i18n配置源：config.ts废弃→routing.ts唯一；request.ts动态判断类型 | Claude Code |
| 1.2 | 新增ko/th/id/vi到routing.ts | Claude Code |
| 1.3 | 使用Claude批量AI翻译16个JSON文件到ko/th/id/vi | Claude Code |
| 1.4 | 拓展 middleware.ts：IP检测+用户语言cookie逻辑（防止已选用户被跳回） | Claude Code |
| 1.5 | 日语layout.tsx加 noindex, nofollow | Claude Code |
| 1.6 | 动态hreflang标签生成 | Claude Code |
| 1.7 | 动态多语言sitemap.xml生成（不含ja） | Claude Code |
| 1.8 | robots.txt配置（修复激进通配符） | Claude Code |
| 1.9 | canonical URL全站注入 | Claude Code |
| 1.10 | 扫描所有 generateStaticParams 更新为动态读取 routing.locales | Claude Code |

### Phase 2 — 内容优化（3-5天）

| 任务 | 内容 | 负责 |
|------|------|------|
| 2.1 | 各语言首页meta title/description优化 | Claude Code |
| 2.2 | 各语言商品列表页动态meta生成 | Claude Code |
| 2.3 | 各语言商品详情页动态meta + structured data | Claude Code |
| 2.4 | BreadcrumbList schema全站 | Claude Code |
| 2.5 | WebSite + SearchAction schema首页 | Claude Code |
| 2.6 | Open Graph / Twitter Card全站 | Claude Code |
| 2.7 | OG图片动态生成（next/og） | Claude Code |

### Phase 3 — 性能优化（3-4天）

| 任务 | 内容 | 负责 |
|------|------|------|
| 3.1 | next/image替换所有img标签 | Claude Code |
| 3.2 | 首页ISR改造（revalidate: 3600） | Claude Code |
| 3.3 | 商品列表页SSR缓存策略 | Claude Code |
| 3.4 | Noto Sans多语言字体优化 | Claude Code |
| 3.5 | 后端API Cache-Control头 | Claude Code |
| 3.6 | 商品详情页ISR改造 | Claude Code |

### Phase 4 — 内容落地页（3-5天）

| 任务 | 内容 | 负责 |
|------|------|------|
| 4.1 | Category扩展多语言名称字段（nameKo/nameTh/nameId/nameVi） | Claude Code |
| 4.2 | 多语言分类落地页（利用slug路由） | Claude Code |
| 4.3 | 多语言平台指南页（Mercari/Rakuten使用指南） | Claude Code |
| 4.4 | 静态攻略框架（日本代购指南类，各语言单独） | Claude Code |
| 4.5 | 多语言404页面 | Claude Code |
| 4.6 | SEO友好slug生成 | Claude Code |
| 4.7 | 菲律宾/马来西亚/新加坡独立SEO落地页 | Claude Code |

### Phase 5 — 搜索引擎提交 + 监控（1-2天）

| 任务 | 内容 | 负责 |
|------|------|------|
| 5.1 | Google Search Console多国家配置 | 花哥（需操作权限） |
| 5.2 | 百度资源平台提交 | 花哥（需百度账号） |
| 5.3 | Naver Search Advisor提交 | 花哥 |
| 5.4 | 配置Vercel Analytics | Claude Code |
| 5.5 | 收录情况周报cron job | 花小妹 |

### Phase 6 — 后端扩展（穿插进行）

| 任务 | 内容 | 负责 |
|------|------|------|
| 6.1 | Product entity新增titleTh/titleVi/titleId | Claude Code |
| 6.2 | Category entity新增nameKo/nameTh/nameId/nameVi | Claude Code |
| 6.3 | 商品同步时自动翻译多语言标题（调用翻译API） | Claude Code |
| 6.4 | 后端API添加Accept-Language驱动内容 | Claude Code |
| 6.5 | 本地货币价格支持（PHP/MYR/SGD） | Claude Code |
| 6.6 | SEO分析API（各语言收录统计） | Claude Code |

---

## 十二、效果评估指标

| 指标 | 当前（预估） | 1个月目标 | 3个月目标 |
|------|-------------|----------|----------|
| Google 收录页面数 | ~50 | ~500 | ~5000 |
| 百度收录页面数 | ~10 | ~200 | ~1000 |
| Naver 收录页面数 | 0 | ~100 | ~500 |
| 自然搜索月流量 | ~100 | ~1000 | ~5000 |
| Core Web Vitals 达标率 | ~40% | ~90% | ~95% |
| 商品详情页 LCP | ~4s | <2.5s | <2s |

---

## 十三、关键注意点

1. **不要创建重复内容**：不同语言页面内容必须不同（翻译过的），相同内容不同URL会被降权
2. **不要急**：SEO是长线，内容质量比数量重要
3. ✅ **日语处理**：加 noindex, nofollow，公开可访问但不收录
4. ✅ **翻译质量**：AI翻译后核心文件需人工审核，符合当地语言习惯
5. **优先英文和中文**：这两个语言带来最多的商业价值，先把它们做完美
6. **东南亚国家用独立价格页**：不是简单的翻译，还要展示当地货币价格和运费
7. **监控爬虫行为**：通过 Vercel Analytics / Logs 观察Googlebot/Baiduspider/NaverBot的爬取频率和覆盖
8. **统一配置源**：routing.ts 是唯一的语言配置来源，config.ts 废弃
9. **Cookie优先于IP检测**：已主动选择语言的用户不会被IP检测覆盖
