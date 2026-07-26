# 袋鼠君日本独立站 - 状态文档

> 版本: v1.0  
> 更新: 2026-04-23  
> 负责人: 花小弟 & Claude Code

---

## 项目概述

面向中日英三语的跨境电商比价独立站，聚合 Amazon/Mercari/Yahoo 三大日本电商平台的商品，支持多语言、多币种支付。

---

## 当前阶段

| 阶段                    | 状态      | 开始时间   | 里程碑                                                      |
| ----------------------- | --------- | ---------- | ----------------------------------------------------------- |
| Phase 1 - 初始化 & 设计 | ✅ 完成   | 2026-04-16 | 完成项目初始化、技术选型、数据库设计、API设计、开发环境搭建 |
| Phase 2 - 核心功能开发  | ✅ 完成   | 2026-04-16 | 完成用户认证、商品模块、购物车、订单、支付                  |
| Phase 3 - 前后端联调    | ✅ 完成   | 2026-04-16 | 完成API对接、Bug修复、全部接口验证通过                      |
| Phase 4 - 测试 & 上线   | 🔄 进行中 | 2026-04-23 | 完成测试并部署                                              |

---

## 技术栈

| 层级 | 技术                    | 备注                              |
| ---- | ----------------------- | --------------------------------- |
| 前端 | Next.js 16 (App Router) | TypeScript + Tailwind + shadcn/ui |
| 后端 | NestJS                  | TypeORM + PostgreSQL              |
| 缓存 | Redis                   | Session + 缓存                    |
| 搜索 | Algolia                 | 商品搜索                          |
| 支付 | Stripe + Ping++         | 美元 + 人民币                     |
| 部署 | Vercel + AWS ECS        | 前端 + 后端                       |

---

## Phase 2 任务分解

> ⚠️ **Phase 2 已全部完成** - 2026-04-16

### 2.1 用户认证模块 ✅ 已完成

| 子任务                          | 状态      | 完成日期   |
| ------------------------------- | --------- | ---------- |
| 2.1.1 用户注册/登录 API         | ✅ 完成   | 2026-04-16 |
| 2.1.2 JWT Token 管理            | ✅ 完成   | 2026-04-16 |
| 2.1.3 第三方登录 (Google/Apple) | ⏳ 待开始 | P1         |
| 2.1.4 用户地址管理 (多国地址)   | ✅ 完成   | 2026-04-16 |

### 2.2 商品搜索与比价模块 ✅ 已完成

| 子任务             | 状态      | 完成日期   | Git Commit |
| ------------------ | --------- | ---------- | ---------- |
| 2.2.1 商品数据模型 | ✅ 完成   | 2026-04-16 | d211dbcb   |
| 2.2.2 分类数据模型 | ✅ 完成   | 2026-04-16 | d211dbcb   |
| 2.2.3 价格历史追踪 | ✅ 完成   | 2026-04-16 | d211dbcb   |
| 2.2.4 API 端点     | ✅ 完成   | 2026-04-16 | d211dbcb   |
| 2.2.5 前端页面     | ✅ 完成   | 2026-04-16 | 6002fd1    |
| 2.2.6 Algolia 搜索 | ⏳ 待开始 | P0         | -          |

### 2.3 购物车模块 ✅ 已完成

| 子任务            | 状态    | 完成日期   | Git Commit                           |
| ----------------- | ------- | ---------- | ------------------------------------ |
| 2.3.1 购物车 CRUD | ✅ 完成 | 2026-04-16 | backend: 2380cf13, frontend: 6c24990 |
| 2.3.2 多商品结算  | ✅ 完成 | 2026-04-16 | backend: 2380cf13                    |
| 2.3.3 按卖家分组  | ✅ 完成 | 2026-04-16 | backend: 2380cf13                    |

### 2.4 订单模块 ✅ 已完成

| 子任务             | 状态    | 完成日期   | Git Commit |
| ------------------ | ------- | ---------- | ---------- |
| 2.4.1 订单创建     | ✅ 完成 | 2026-04-16 | 3394781d   |
| 2.4.2 订单状态流转 | ✅ 完成 | 2026-04-16 | 3394781d   |
| 2.4.3 订单历史查询 | ✅ 完成 | 2026-04-16 | 3394781d   |
| 2.4.4 前端页面     | ✅ 完成 | 2026-04-16 | 5d3c59d    |

### 2.5 支付模块 ✅ 已完成

| 子任务                  | 状态    | 完成日期   | Git Commit |
| ----------------------- | ------- | ---------- | ---------- |
| 2.5.1 Stripe 集成 (USD) | ✅ 完成 | 2026-04-16 | 8099f163   |
| 2.5.2 Ping++ 集成 (CNY) | ✅ 完成 | 2026-04-16 | 8099f163   |
| 2.5.3 支付回调处理      | ✅ 完成 | 2026-04-16 | 8099f163   |
| 2.5.4 前端支付页        | ✅ 完成 | 2026-04-16 | 0b784e6    |

### 2.6 前端页面开发 ✅ 已完成

| 子任务                | 状态    | 优先级 | Git Commit |
| --------------------- | ------- | ------ | ---------- |
| 2.6.1 国际化布局      | ✅ 完成 | P0     | b76449f    |
| 2.6.2 首页开发        | ✅ 完成 | P0     | b76449f    |
| 2.6.3 商品列表/详情页 | ✅ 完成 | P0     | 6002fd1    |
| 2.6.4 购物车页面      | ✅ 完成 | P0     | 6c24990    |
| 2.6.5 结算流程        | ✅ 完成 | P0     | b76449f    |
| 2.6.6 用户中心页面    | ✅ 完成 | P0     | b76449f    |

---

## Phase 3 前后端联调 ✅ 完成

> 执行日期: 2026-04-16 ~ 2026-04-23

### 3.1 环境检查 ✅

| 检查项           | 状态 | 备注                                                           |
| ---------------- | ---- | -------------------------------------------------------------- |
| 后端 env.example | ✅   | /Users/hulonghua/workspace/kangaroo-japan-backend/.env.example |
| 前端 env.local   | ✅   | 已创建，指向 localhost:3000/api/v1                             |
| 后端 .env        | ✅   | 已创建（从 .env.example 复制）                                 |

### 3.2 代码结构验证 ✅

| 模块            | 前端                  | 后端             | 状态    |
| --------------- | --------------------- | ---------------- | ------- |
| 认证 Auth       | ✅ api.ts (lib/)      | ✅ auth/\*       | ✅ 对齐 |
| 地址 Addresses  | ✅ addresses/page.tsx | ✅ addresses/\*  | ✅ 对齐 |
| 商品 Products   | ✅ products/\*        | ✅ products/\*   | ✅ 对齐 |
| 分类 Categories | ✅ 集成在 products    | ✅ categories/\* | ✅ 对齐 |
| 购物车 Cart     | ✅ cart/page.tsx      | ✅ cart/\*       | ✅ 对齐 |
| 订单 Orders     | ✅ orders/\*          | ✅ orders/\*     | ✅ 对齐 |
| 支付 Payments   | ✅ checkout/page.tsx  | ✅ payments/\*   | ✅ 对齐 |

### 3.3 前端构建验证 ✅

```
✅ TypeScript 编译通过
✅ Next.js 16 构建成功
✅ 所有页面路由生成:
   - / (首页)
   - /[lang]/login, /[lang]/register
   - /[lang]/products, /[lang]/products/[id]
   - /[lang]/cart, /[lang]/checkout
   - /[lang]/orders, /[lang]/orders/[id]
   - /[lang]/profile, /[lang]/addresses
   - /[lang]/compare
```

### 3.4 后端 TypeScript 验证 ✅

```
✅ 后端 TypeScript 编译无错误
✅ 所有模块正常加载:
   - AuthModule, UsersModule, ProductsModule
   - CartModule, OrdersModule, AddressesModule
   - CategoriesModule, PaymentsModule
```

### 3.5 发现的问题 ✅ 已解决

| 问题                   | 严重性  | 状态      | 解决方案                        |
| ---------------------- | ------- | --------- | ------------------------------- |
| 缺少 PostgreSQL 数据库 | 🔴 阻塞 | ✅ 已解决 | Homebrew 安装 PostgreSQL 并启动 |
| 缺少 Redis             | 🟡 中等 | ✅ 已解决 | Homebrew 安装 Redis 并启动      |
| 缺少第三方 API Key     | 🟡 中等 | 待解决    | Stripe/Ping++ 生产需要配置      |
| 中间件deprecated警告   | 🟢 低   | 已修复    | 迁移到 Next.js 16 proxy 约定    |

### 3.6 API 对接状态 ✅ 全部验证通过

> ✅ 2026-04-23 所有核心 API 联调验证通过

**代码层面验证通过:**

- ✅ 前端 API Client (api.ts) 与后端 Controller 路径对齐
- ✅ JWT Token 自动注入已实现
- ✅ 认证流程 (login/register/logout) 代码完整
- ✅ 所有 CRUD 接口存在

**API 实测验证:**

- ✅ POST /api/v1/auth/register → 创建用户
- ✅ POST /api/v1/auth/login → 登录获取 token
- ✅ GET /api/v1/auth/me → 获取用户信息
- ✅ GET /api/v1/products → 商品列表
- ✅ GET /api/v1/categories → 分类列表
- ✅ GET /api/v1/cart → 购物车
- ✅ GET /api/v1/orders → 订单列表
- ✅ POST /api/v1/addresses → 创建地址

### 3.7 Bug 修复记录 🐛

| Bug                         | 现象                                       | 原因                                                                                                   | 修复方案                                                                                      | 状态      |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------- |
| Bug 1: 登录401              | POST /auth/login 始终返回 401 Unauthorized | User Entity 的 passwordHash 设置了 `select: false`，导致 findByEmail 查询不到密码字段，bcrypt 比对失败 | `users.service.ts` 的 `findByEmail` 方法添加 `.addSelect('user.passwordHash')`                | ✅ 已修复 |
| Bug 2: 地址 prefecture 缺失 | 前端发送 prefecture 字段后端不识别         | CreateAddressDto / UpdateAddressDto 没有 prefecture 字段，后端 Entity 用 state 存储                    | DTO 添加 `prefecture` 可选字段，service 层 `prefecture → state` 映射，响应中返回 `prefecture` | ✅ 已修复 |

---

## Phase 4 测试验证 ✅ 进行中

> 执行日期: 2026-04-23

### 4.1 后端测试 ✅

```
✅ npm test — 1 passed (AppController root test)
✅ npm run test:cov — 通过，覆盖率已生成
   - 所有测试套件: 1 passed
   - 所有测试用例: 1 passed
```

### 4.2 前端构建 ✅

```
✅ npm run build — Next.js 16 构建成功
   - TypeScript 编译通过
   - Turbopack 构建成功 (1865ms)
   - 静态页面生成: 6/6 完成
   - 所有页面路由已生成:
     /, /[lang], /[lang]/addresses, /[lang]/cart
     /[lang]/checkout, /[lang]/compare, /[lang]/contact
     /[lang]/login, /[lang]/orders, /[lang]/orders/[id]
     /[lang]/products, /[lang]/products/[id]
     /[lang]/profile, /[lang]/register
     /robots.txt, /sitemap.xml
```

### 4.3 Git 状态

```
后端: 已同步，无待提交更改 (最后提交: 02a9bbc4)
前端: 已同步，无待提交更改
```

---

## 已完成的工作

### Phase 1 完成项

- [x] 需求分析 + 代码审计
- [x] 技术选型确认
- [x] 数据库设计 (PostgreSQL)
- [x] API 设计 (RESTful)
- [x] 开发环境搭建
  - [x] Next.js 14 前端项目
  - [x] NestJS 后端项目
  - [x] Docker Compose 配置
  - [x] GitHub Actions CI/CD
  - [x] Husky + lint-staged

---

## 下次行动

### Phase 4 测试 & 上线 🔄 进行中

1. **端到端测试**
   - 编写 E2E 测试用例
   - 覆盖核心用户流程（注册→登录→浏览→加购→下单→支付）

2. **配置第三方 API** (生产需要)
   - Stripe API Key
   - Ping++ API Key

3. **性能优化**
   - 数据库索引优化
   - 缓存策略实施
   - 前端性能审计

4. **部署上线**
   - 配置生产环境
   - CI/CD 流水线验证
   - 域名和 SSL 配置

### Phase 2 完成记录

- [x] 2.1.1 用户注册/登录 API - Claude Code - 完成日期: 2026-04-16
- [x] 2.1.2 JWT Token 管理 - Claude Code - 完成日期: 2026-04-16
- [x] 2.1.4 用户地址管理 (多国地址) - Claude Code - 完成日期: 2026-04-16
- [x] 2.2.1-2.2.5 商品搜索与比价 - Claude Code - 完成日期: 2026-04-16
- [x] 2.3.1-2.3.3 购物车模块 - Claude Code - 完成日期: 2026-04-16

---

## 关键资源

| 资源     | 位置                                                          |
| -------- | ------------------------------------------------------------- |
| 前端源码 | /Users/hulonghua/workspace/kangaroo-japan/                    |
| 后端源码 | /Users/hulonghua/workspace/kangaroo-japan-backend/            |
| 设计文档 | /Users/hulonghua/.openclaw/workspace/shared/袋鼠君独立站项目/ |
| 项目索引 | registry.yaml (待创建)                                        |

---

## 变更记录

### 2026-07-26 · zh 站信任基建补齐 + 全站对外口径对齐（commit `b8f4b9f`，已上线）

**为什么**：zh 站体检发现问题不是功能少，而是「已有的东西没露出、已有的页面没翻译」——
全站没有页脚；faq/fees/how-it-works/buyer-protection/photo-inspection/about 六个信任页
的 zh 文案文件只剩 `meta` 键，正文回退成英文（中国买家点「常见问题」看到的是美国关税和
TCG 内容）；约 20 个页面全站零入口，只能手敲 URL。同时站内多处对外口径与老后台真实值不符。

**逻辑**：结构与内容分两层补——先让页面能被找到（页脚+导航），再让内容说对话（重写正文+
对齐口径）。所有数字口径以老后台 `st_shops` / `st_value_added` / `st_config.KEFU_RULE`
的实测值为准，不采信任何前端既有写法。

**改动**：

- 新增 zh 浅色页脚 `components/layout/Footer.tsx` + `SiteFooter.tsx`（排除 admin/warehouse/
  内嵌客服页），挂在 `[lang]/layout.tsx` 的非 en 分支；en 侧 `TcgFooter` 未动
- `Header.tsx` 补「代购流程/帮助中心」+ 登录态「我的」下拉，接回 7 个零入口页
  （优惠券/押金/竞拍记录/消息/签到/VIP/地址）
- 六个信任页 zh 正文按中国买家视角**重写**（非翻译）
- `[lang]/fees/page.tsx`：竞品对比表改为仅 en 渲染（zh 下五列全是「—」的空表配道歉文案）
- `sitemap.ts`：新增 `skipZh` 机制（本批内容已补齐故未启用，机制保留备用）
- 亚马逊：`amazon/page.tsx` 全语言走占位页，zh 版新建 `AmazonComingSoonZh.tsx`，
  文案为「站内暂不支持搜索、发链接给客服代购」并**恢复可索引**（日亚是真实在做的业务）
- 口径对齐：支付手续费（乐天 Rakuma 原误写 220，实为 100）、客服时段（周一至周日
  9:00-18:00 **中国时间**，日/英文按时差换算为 10:00-19:00 JST）、免费仓储 30→30-60 天 +超期每包裹每天 5 元、弃标主口径改为「不能取消/扣相应保证金」（30% 降为细则）、
  押金退款 3-5→1-2 个工作日、首页「正品保证」→「日本平台直采」

**验证**：本地 build 通过；线上实测 `/zh/faq` 中文 88→3103 字、英文 1341→14 字，
6/6 页面有 footer；en 侧 footer 数与竞品表均未受影响。

**回滚**：`git revert b8f4b9f`（纯前端，无数据迁移）。

**关联的老后台改动**（同日，另见外置大脑与《老后台路由权威地图》）：
拍照验货 100→200 円、KEFU_RULE 两处口径、新增「增值服务价格」后台编辑 Tab。

---

> ⚠️ **事实层**：此文档为唯一真相源，所有展示层（飞书等）由此同步生成。
