# 袋鼠君独立站前端 — 代码质量审计与测试方案报告

> **审计日期:** 2026-04-26  
> **项目路径:** `/Users/hulonghua/workspace/kangaroo-japan/`  
> **当前分支:** main (最新提交: `6e18c02`)  
> **技术栈:** Next.js 16 + App Router + shadcn/ui + TypeScript  
> **构建状态:** ✅ TypeScript 编译通过, Next.js 构建成功 (45 routes)

---

## 目录

1. [代码结构审计](#1-代码结构审计)
2. [API 调用模式审计](#2-api-调用模式审计)
3. [TypeScript 类型问题](#3-typescript-类型问题)
4. [安全隐患与代码异味](#4-安全隐患与代码异味)
5. [测试覆盖缺口分析](#5-测试覆盖缺口分析)
6. [建议的测试用例优先级表](#6-建议的测试用例优先级表)
7. [总结与行动建议](#7-总结与行动建议)

---

## 1. 代码结构审计

### 1.1 `"use client"` 指令覆盖

| 检查项 | 结果 |
|--------|------|
| 页面文件总数 (`page.tsx`) | 45 个 |
| 使用 `"use client"` 的页面 | 42 个 ✅ |
| **缺少 `"use client"` 的页面** | **3 个 ❌** |

**缺少 `"use client"` 的页面:**  
（这些文件是客户端组件但未声明指令，由于使用了 hooks/state，会在运行时抛出错误）

| 文件 | 路径 | 严重程度 |
|------|------|---------|
| `page.tsx` | `src/app/[lang]/amazon/[id]/` | 🔴 **高** |
| `page.tsx` | `src/app/[lang]/mercari/[id]/` | 🔴 **高** |
| `page.tsx` | `src/app/[lang]/yahoo/[id]/` | 🔴 **高** |

**发现:** 这三个文件都使用了 `useState`, `useEffect`, `useParams`, `api.request()` 等客户端 API，但没有 `"use client"` 指令。虽然 Next.js 在某些情况下会自动推断为客户端组件（当使用 `useParams` 等服务端兼容的 hooks 时），但依赖 `useState` 的页面会抛出运行时错误。`Next.js 16` 中 `page.tsx` 的 `"use client"` 是**必须显式声明**的。

### 1.2 国际化 i18n 实现模式

**问题:** 所有新迁移页面均使用内联三元表达式进行国际化，而非 `next-intl` 的标准方式。

```tsx
// 当前模式（遍布所有新页面）
{lang === "zh" ? "签到中心" : lang === "ja" ? "チェックイン" : "Check-in"}

// 建议模式（使用 next-intl）
import { useTranslations } from 'next-intl';
const t = useTranslations('sign');
t('title')
```

| 影响面 | 严重程度 |
|--------|---------|
| 约 30+ 个页面, 2000+ 行硬编码翻译文本 | 🟡 **中** |
| 维护困难，翻译分散在各文件中 | |
| 所有新迁移的 Phase 1-6 页面 | |

### 1.3 组件库混用

**问题:** 管理后台 (`/admin/*`) 同时混用了 `antd` 组件和 `shadcn/ui` 组件。

```tsx
// 同一文件混用两种设计系统
import { Row, Col, Select, Spin } from 'antd';                    // antd
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';  // shadcn
```

| 文件 | 严重程度 |
|------|---------|
| `src/app/[lang]/admin/page.tsx` | 🟡 **中** |
| `src/app/[lang]/admin/alerts/page.tsx` | 🟡 **中** |
| `src/app/[lang]/admin/module/[module]/page.tsx` | 🟡 **中** |

**影响:** 两个 UI 框架的 CSS 可能冲突，包体积增大，设计语言不一致。

---

## 2. API 调用模式审计

### 2.1 核心 API 客户端

```tsx
// src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
// exports: api.request<T>(endpoint, options)
```

### 2.2 统一使用 `api.request()` 的页面 ✅

以下 23 个页面正确使用 `api.request()`：

- `/amazon/page.tsx` — `/amazon/cats`, `/amazon/goods`
- `/amazon/[id]/page.tsx` — `/amazon/detail`, `/users/docollect`, `/carts/addcart`, `/translate/jp2zh`
- `/mercari/page.tsx` — `/integrations/mercari/categories`
- `/yahoo/[id]/page.tsx` — `/yahoo/goods/{id}`, `/yahoo/bid`, `/users/docollect`, `/translate/jp2zh`, `/yahoo/bid/history/{id}`
- `/sign/page.tsx` — `/sign/index`, `/sign/sign`
- `/deposit/page.tsx` — `/deposit/balance`, `/deposit/create`, `/deposit/refund`
- `/deposit/history/page.tsx`
- `/bids/page.tsx`
- `/coupons/page.tsx`
- `/shop/page.tsx` — `/shops/buy`
- `/vip/page.tsx` — `/levels/buy`
- `/warehouse/*` (9 pages) — `/stores/*`
- `/orders/daipay/page.tsx`

### 2.3 使用 `fetch()` 而非 `api.request()` 的页面 ❌

| 文件 | 直接 fetch 的 API 端点 | 问题 |
|------|----------------------|------|
| `community/page.tsx` | `fetch("/api/community/index")` | ❌ **无 token 注入、无 401 拦截** |
| `community/create/page.tsx` | `fetch("/api/community/submit")` | ❌ **同上** |
| `articles/page.tsx` | `fetch("/api/articles/index")` | ❌ **同上** |
| `articles/[id]/page.tsx` | `fetch("/api/articles/detail")` | ❌ **同上** |
| `messages/page.tsx` | `fetch("https://app.kangaroo-japan.com/api/users/messageindex")` | ❌ **硬编码生产域名、无 token 注入** |

### 2.4 API 端点路径不一致的问题 🔴

`api.request()` 在内部拼接 `API_BASE_URL + endpoint`，即 `http://localhost:3001/api/v1/products`。

但以下端点使用了**非标准路径**（不符合 RESTful 风格或与后端 Controller 不匹配）：

| 页面 | 使用的端点 | 预期后端路径 | 问题 |
|------|-----------|-------------|------|
| 所有 warehouse 页面 | `/stores/*` | `/api/v1/stores/*` | 需确认后端 `/stores` 路由是否存在 |
| amazon/[id] | `/carts/addcart` | `/api/v1/cart/items` | 路径与 `api.ts` 中的标准 `cart` 端点不同 |
| amazon/[id], yahoo/[id] | `/users/docollect` | `/api/v1/users/favorites` | 猜测是收藏功能，非标准命名 |
| yahoo/[id] | `/translate/jp2zh` | `/api/v1/translate` | 需要额外确认 |
| shop | `/shops/buy` | `/api/v1/shops/buy` | 需确认后端对接 |
| vip | `/levels/buy` | `/api/v1/membership/purchase` | 需确认后端对接 |
| deposit | `/deposit/balance` | `/api/v1/deposit` | 需确认 |

**严重程度:** 🔴 **高** — 这些端点路径可能来自旧的后端（PHP/uni-app 时代），与当前 NestJS 后端 (`/api/v1/xxx`) 不匹配。

### 2.5 messages 页面的严重问题

```tsx
const res = await fetch("https://app.kangaroo-japan.com/api/users/messageindex", {
  credentials: "include",
});
```

| 问题 | 严重程度 |
|------|---------|
| **硬编码生产环境域名** — 本地开发/测试环境也会请求生产环境 API | 🔴 **严重** |
| **直接 fetch 绕过 api.request** — 无 token 自动注入、无 401 重试/刷新 | 🟡 **中** |
| **Credentials 用的是 cookie，不是 JWT** — 可能是与旧 PHP 后端的 session 通信 | 🟡 **中** |

---

## 3. TypeScript 类型问题

### 3.1 构建状态

```
✅ npm run build — 成功 (无 TypeScript 错误)
✅ npx tsc --noEmit — 成功
```

由于 `strict: true` 在 `tsconfig.json` 中启用，基础类型检查较强。

### 3.2 `any` 类型滥用

共发现 **34 处** `: any` 或 `as any` 使用，集中在以下文件：

| 文件 | 次数 | 使用场景 |
|------|------|---------|
| `products/page.tsx` | 6 | `const params: any = { ... }` — 构建 API 参数 |
| `yahoo/[id]/page.tsx` | 5 | `bidHistory.map((bid: any, ...)`, `catch (error: any)` |
| `admin/module/[module]/page.tsx` | 4 | Table column `record: any` 和 `_: unknown` 参数 |
| `mercari/page.tsx` | 4 | `catList.map((cat: any, ...)` |
| `amazon/page.tsx` | 3 | 列表数据 map 时使用 `any` |
| `page.tsx` (首页) | 3 | `getPriceByCurrency = (product: any)` |
| `products/[id]/page.tsx` | 2 | `category: any` 接口定义 |
| `amazon/[id]/page.tsx` | 2 | 类似场景 |
| `cart/page.tsx` | 1 | |
| `profile/page.tsx` | 1 | |
| `trend-chart.tsx` | 1 | `data: any[]` |

**重点问题:**

```tsx
// products/page.tsx line 103 — 本应使用具体类型
const params: any = { lang, page, limit, platform, categoryId };

// products/[id]/page.tsx line 37 — 接口定义中使用 any
interface ProductDetail {
  category: any;  // 应该定义为 Category 类型
}

// yahoo/[id]/page.tsx — catch 语句中使用 any
catch (error: any) {
  setBidError(error.message || "Bid failed");
}
```

### 3.3 `dangerouslySetInnerHTML` 使用

6 处使用，存在 XSS 风险：

| 文件 | 用途 | 风险 |
|------|------|------|
| `articles/[id]/page.tsx` | 文章内容渲染 | 🟡 **中** — 内容来自 CMS / API |
| `yahoo/[id]/page.tsx` | 商品描述 | 🟡 **中** — 来自第三方平台 |
| `mercari/[id]/page.tsx` | 商品描述 | 🟡 **中** — 来自第三方平台 |
| `amazon/[id]/page.tsx` | 商品描述 | 🟡 **中** — 来自第三方平台 |
| `products/page.tsx` | JSON-LD 结构化数据 | 🟢 **低** — 仅含结构化数据 |
| `products/[id]/page.tsx` | JSON-LD 结构化数据 | 🟢 **低** — 仅含结构化数据 |

---

## 4. 安全隐患与代码异味

### 4.1 Mock Data 回退机制

5 个新页面有 mock 数据回退逻辑（catch 后使用本地 mock 数据），这在生产环境是**危险的**：

| 页面 | 现象 |
|------|------|
| `community/page.tsx` | API 失败后静默降级为 mock 数据，用户无法感知错误 |
| `community/create/page.tsx` | API 失败后 alert "发布成功！" 并跳转，**制造假象** |
| `articles/page.tsx` | API 失败后降级为 mock 数据列表 |
| `articles/[id]/page.tsx` | API 失败后展示本地硬编码文章内容 |
| `messages/page.tsx` | API 失败后展示 mock 消息列表 |

```tsx
// community/create/page.tsx — 最危险样例
catch {
  // Mock success fallback
  alert("发布成功！");
  router.push(`/${lang}/community`);
}
```

**严重程度:** 🔴 **严重** — 用户以为自己发布了内容，实际数据并未保存。

### 4.2 代码重复

- **国际化翻译重复:** 每个页面都有一份 `lang === "zh" ? ... : lang === "ja" ? ... : ...` 的逻辑，没有抽取为公共函数。
- **加载骨架屏重复:** 每个列表页面独立编写 `Skeleton` 加载态。
- **分页/加载更多逻辑重复:** 6+ 个页面复用了几乎相同的 "加载更多" 模式。
- **认证守卫重复:** 多个页面手动检查 `useAuthStore().isAuthenticated` 并重定向。

### 4.3 架构问题

| 问题 | 说明 | 严重程度 |
|------|------|---------|
| **没有数据层抽象** | 每个页面直接在组件中调用 API，无 React Query/SWR 层 | 🟡 **中** |
| **没有错误边界** | 全局无 `ErrorBoundary`，页面级没有异常 UI 回退 | 🟡 **中** |
| **没有 loading 状态统一处理** | 每个页面独立实现 loading/skeleton/error 状态 | 🟢 **低** |
| **`useCallback` 滥用** | 部分简单函数不必要地包裹 `useCallback` | 🟢 **低** |

---

## 5. 测试覆盖缺口分析

### 5.1 现有 Playwright 测试覆盖

共 **4 个 spec 文件, 15 个测试用例**（全是烟雾测试）：

| Spec 文件 | 测试数 | 覆盖的页面 |
|-----------|--------|-----------|
| `auth.spec.ts` | 4 | `/zh/login`, `/en/login`, `/zh/register` |
| `cart.spec.ts` | 3 | `/zh/cart`, `/en/cart` |
| `home.spec.ts` | 4 | `/zh`, `/en` |
| `products.spec.ts` | 4 | `/zh/products`, `/en/products` |

**已覆盖的页面: 7 个**（首页、登录、注册、购物车、商品列表）

### 5.2 未被任何测试覆盖的页面

共 **38 个页面未覆盖**，按优先级分组：

#### P0 — 核心用户流程（竞拍、支付、下单）
- `/[lang]/checkout`
- `/[lang]/orders`
- `/[lang]/orders/[id]`
- `/[lang]/orders/daipay`
- `/[lang]/bids`
- `/[lang]/deposit`
- `/[lang]/deposit/history`

#### P1 — 商品详情页（三大平台）
- `/[lang]/mercari`
- `/[lang]/mercari/[id]`
- `/[lang]/yahoo`
- `/[lang]/yahoo/[id]`
- `/[lang]/amazon`
- `/[lang]/amazon/[id]`
- `/[lang]/products/[id]`
- `/[lang]/compare`

#### P2 — 用户中心
- `/[lang]/profile`
- `/[lang]/addresses`
- `/[lang]/coupons`
- `/[lang]/vip`
- `/[lang]/sign`
- `/[lang]/shop`
- `/[lang]/messages`

#### P3 — 内容/社区
- `/[lang]/community`
- `/[lang]/community/create`
- `/[lang]/articles`
- `/[lang]/articles/[id]`
- `/[lang]/mnp`
- `/[lang]/contact`

#### P4 — 管理后台
- `/[lang]/admin`
- `/[lang]/admin/alerts`
- `/[lang]/admin/module/[module]`

#### P5 — 仓库管理（9个页面）
- `/[lang]/warehouse`
- `/[lang]/warehouse/orders`
- `/[lang]/warehouse/instore`
- `/[lang]/warehouse/photos`
- `/[lang]/warehouse/pick`
- `/[lang]/warehouse/print`
- `/[lang]/warehouse/printers`
- `/[lang]/warehouse/confirm-ship`
- `/[lang]/warehouse/shipments`

---

## 6. 建议的测试用例优先级表

### 6.1 Phase 1 — 关键用户流程 (E2E, 必须)

| 优先级 | 用户流程 | 核心页面 | 建议用例数 | 说明 |
|--------|---------|---------|-----------|------|
| **P0** | 用户注册 → 登录 → 浏览商品 | login, register, products | 已有4个 | 可补充会话过期/刷新 token |
| **P0** | 商品搜索 → 筛选 → 查看详情 | products, products/[id] | 3 | 价格筛选、平台切换、详情渲染 |
| **P0** | 加入购物车 → 购物车管理 → 结算 | cart, checkout | 3 | 增删改商品、数量调整、下单流程 |
| **P0** | 下订单 → 支付 → 查看订单 | checkout, orders, orders/[id] | 3 | 完整支付闭环 |
| **P0** | 押金充值 → 竞拍出价 → 竞拍记录 | deposit, bids, deposit/history | 3 | 资金流转核心链路 |

### 6.2 Phase 2 — 平台商品列表+详情 (E2E, 高)

| 优先级 | 用户流程 | 页面 | 建议用例数 | 说明 |
|--------|---------|------|-----------|------|
| **P1** | 三大平台商品列表加载 | mercari, yahoo, amazon | 3 | 列表渲染、分页、分类筛选 |
| **P1** | 商品详情与收藏 | mercari/[id], yahoo/[id], amazon/[id] | 3 | 详情渲染、收藏功能、关注 |
| **P1** | 竞价流程 | yahoo/[id] → bids | 2 | 出价、历史查看 |
| **P1** | 商品对比 | compare | 1 | 添加/移除对比项 |

### 6.3 Phase 3 — 用户中心功能 (E2E, 中)

| 优先级 | 页面 | 建议用例数 | 关键测试点 |
|--------|------|-----------|-----------|
| **P2** | profile | 2 | 个人信息显示、编辑 |
| **P2** | addresses | 2 | 地址CRUD、设为默认 |
| **P2** | coupons | 2 | 优惠券列表、状态切换、复制券码 |
| **P2** | vip | 2 | VIP等级展示、购买升级 |
| **P2** | sign | 2 | 签到打卡、连续签到奖励 |
| **P2** | shop | 2 | 积分商城列表、兑换 |
| **P2** | messages | 2 | 消息列表、加载更多、已读未读 |

### 6.4 Phase 4 — 内容/社区 (Smoke, 低)

| 优先级 | 页面 | 建议用例数 | 关键测试点 |
|--------|------|-----------|-----------|
| **P3** | community | 2 | 帖子列表、加载更多 |
| **P3** | community/create | 1 | 发布表单、图片上传 |
| **P3** | articles, articles/[id] | 2 | 分类切换、文章详情渲染 |
| **P3** | mnp | 1 | 页面渲染、复制微信号 |
| **P3** | contact | 1 | 客服联系方式展示 |

### 6.5 Phase 5 — 仓库管理 (Smoke, 低)

| 优先级 | 页面 | 建议用例数 | 说明 |
|--------|------|-----------|------|
| **P4** | warehouse 主页 | 1 | 各功能入口渲染 |
| **P4** | warehouse/orders | 1 | 入仓订单列表 |
| **P4** | warehouse/instore | 1 | 确认入库 |
| **P4** | warehouse/photos | 1 | 照片上传 |
| **P4** | warehouse/pick | 1 | 拣货列表 |
| **P4** | warehouse/print | 1 | 打印任务 |
| **P4** | warehouse/printers | 1 | 打印机管理 |
| **P4** | warehouse/confirm-ship | 1 | 确认发货 |
| **P4** | warehouse/shipments | 1 | 运单列表 |

### 6.6 Phase 6 — 管理后台 (Smoke, 低)

| 优先级 | 页面 | 建议用例数 | 说明 |
|--------|------|-----------|------|
| **P5** | admin | 1 | 总览面板 |
| **P5** | admin/alerts | 1 | 告警中心 |
| **P5** | admin/module/[module] | 1 | 模块详情 |

### 6.7 总计建议用例

| 优先级 | 用例数 |
|--------|-------|
| P0 (关键) | 16 |
| P1 (高) | 9 |
| P2 (中) | 14 |
| P3 (低) | 7 |
| P4 (低) | 9 |
| P5 (低) | 3 |
| **总计** | **约 58 个** |

---

## 7. 总结与行动建议

### 🔴 立即修复 (阻塞级别)

| # | 问题 | 修复建议 |
|---|------|---------|
| 1 | 3 个商品详情页缺少 `"use client"` | 在 `amazon/[id]`, `mercari/[id]`, `yahoo/[id]` 的 `page.tsx` 顶部添加 `"use client";` |
| 2 | community/create mock 回退"制造假发布" | 移除 catch 中的 mock 成功提示，改为显示真实错误信息 |
| 3 | 5 个页面使用 `fetch()` 而非 `api.request()` | 统一替换为 `api.request()`，获得 token 注入和 401 拦截 |
| 4 | messages 页面硬编码生产域名 | 替换为环境变量 `NEXT_PUBLIC_API_URL` 或通过 api.request |

### 🟡 一周内修复

| # | 问题 | 修复建议 |
|---|------|---------|
| 5 | API 端点路径不一致 (37+ 个调用点) | 对照后端 controller 统一路径映射 |
| 6 | `any` 类型滥用 (34处) | 逐步替换为具体类型定义 |
| 7 | 危险 HTML 渲染 (4处) | 考虑使用 DOMPurify 消毒 |
| 8 | 国际化内联编码 | 使用 `next-intl` 的翻译文件 |

### 🟢 优化建议

| # | 建议 |
|---|------|
| 9 | 引入 React Query 做数据获取层，统一 loading/error 状态 |
| 10 | 引入全局 ErrorBoundary |
| 11 | 抽离公共 Skeleton 组件和分页逻辑 |
| 12 | 解决 antd + shadcn/ui 混用问题 |

### 测试实施建议

1. **先覆盖 P0 关键流程** — 注册→登录→商品浏览→加购→下单→支付的核心链路
2. **再覆盖 P1 平台商品页** — 三大平台的列表和详情
3. **最后覆盖 P2-P5 功能页** — 用户中心、社区、仓库等
4. **每个页面至少 1 个烟雾测试**（200 状态 + 内容非空）
5. **关键流程增加交互测试**（点击、填写、提交、验证结果）
6. **使用 Playwright 的 `page.route()` 拦截 API 请求**，不依赖真实后端

---

*报告生成由 Hermes Agent 自动完成。*  
*建议在修复 🔴 级别问题后重新运行 `npm run build` 验证。*
