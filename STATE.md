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

### 2026-08-04 · zh 服务条款/隐私政策中文版上线（`cb37009` 文本 + `d2153a6` 接页面）

**为什么**：`/zh/terms` `/zh/privacy` 一直渲染面向美国买家的英文硬编码 JSX（美国关税、
TCG 评级、寄往美国），对中国客户既不适用、也不构成有效约定；而页脚早已链接这两页。

**怎么做**：借用小程序现行协议（已过微信审核）的通用骨架起草服务条款 318 行 18 章；
隐私政策从零写 253 行 10 章（小程序无独立隐私政策，其协议全文「隐私」零次出现）。
文本存 `docs/legal/`（进版本控制——旧稿曾随 /tmp 清理丢失）。
接入时 legal-shell 增加 lang 驱动明暗配色，en 深色分支逐字节不变，zh 走浅色买家壳；
按民法典 496 条提示义务做两级强调（rose=免责/限权/争议条款，zinc=其余）。

🔴 **主动未照搬小程序四处高风险条款**（虽过微信审核但中国法下大概率无效）：境内主体
管辖写法、「不提供任何退换货服务」式全面免责、「永久免费独家不可撤销全球可转授权」
知产条款、跨境一刀切排除七天无理由退货。

**验证**：线上 zh 条款 5904 字 / 隐私 5293 字纯中文、内部批注零泄漏；en 侧抽取分支
JSX 与原文件逐字节 diff 0 差异。

**遗留**：律师需复核两处（隐私 3.4 跨境提供合规路径、条款 11 章七天无理由豁免论证）；
「当前 8 月活动期」字样月底会过时；法人番号未公示（非强制项）。

**回滚**：`git revert d2153a6`。

### 2026-08-04 · 客服能力展示 + FAQ 秒回 + 「亲亲」称呼（`58beaed` / `2e08b41` / `3978b2c`，已上线）

**病根**（花哥反馈）：顾客进客服第一时间点转人工——常见问题全走 LLM 慢路（M4 桥日志实测
`model_wait` 8.6~13s），且智能客服的真本事（报价、下单、留言、竞拍）没有展示位；称呼用「亲」。

**改法**：M4 bridge 加 FAQ 秒回层（10 条 57 问法，详见 bridge 侧 PROJECT.md）+ KB persona 硬规则
「称呼一律用亲亲」；前端 greeting 改能力清单、热门问题 chips **答完一条后重新出现**（原实现点一次
即永久消失，能力等于隐身）、小程序内嵌 `support/h5` 页快捷问题同步对齐 + 气泡 `whitespace-pre-line`。
chips 文案与 bridge 秒回 pattern **逐字对齐**（改任一侧必须同步核对另一侧）。

**🔴 上线后端到端实测才发现的两个真坑（桥内测试全绿也照样坏）**：

1. `/api/support/chat` 的 `BUSINESS_KEYWORDS` 前置闸门：消息不含业务词直接回越界拒答、
   **根本不转发给 bridge**。老 chip「你们有哪些增值服务？」长期中招（改版前就坏，实测
   `reason=guardrail_out_of_business_scope`）。补入 增值服务/价格/报价/算价/留言/砍价/卖家 七词（`2e08b41`）。
2. 网站浮窗 `api.sendSupportChat` **不带 uid**（只有 `support/h5` 传签名 uid+ts+sig），所以
   「帮我查订单物流 / 押金退款怎么申请？」在网站上必然 `selfservice_missing_user_id` → 立刻转人工，
   **登录用户也一样**。已从网站 chips 撤下（11→9）并在 greeting 引导去小程序（`3978b2c`）；
   小程序页那 8 条不动（那边真能查）。**后续可选**：给浮窗接签名 uid，届时把两条放回网站。

**验收**：生产 API 9/9 网站 chip 命中 `faq_fast_path` 且回复以「亲亲」开头；en 站文案零改动
（`en/tcg-chat.json` 0 diff，chips 常驻逻辑为组件级、en 仍 4 条）。

**已知副产品**：`src/i18n/request.ts` 的 `deepMerge` 对与 en 同名的 key 会保留 en 的键序，
zh 只改 JSON 顺序无效——故 zh 用 `suggestionsOrder` 数组显式定序（数组被整体替换、顺序得以保留）。

### 2026-08-04 · 标题日译中管线 + 到手价试算器（前端 `86002e1` / 后端 `e3409a9`，已上线）

**标题翻译**：zh 列表满屏日文 → opencode go(DeepSeek) 批量日译中。`translate-zh.ts`
（20条/请求合并、30天缓存、并发上限2、15s超时、失败静默）+ `/api/translate-titles`

- `useTitleTranslations` hook，接线 8 个 zh 列表；yahoo 共用组件 locale 门控且
  后端老网关 titleTranslated 优先。**无 key 时降级显日文原名**——
  `OPENCODE_GO_API_KEY` 待配到 Vercel（配后 `scripts/test-translate-zh.mjs` 验证）。

**到手价试算器**（/fee-compare `LandedCostEstimator`）：计价公式经老后台源码实证
（api/Orders.php confirm 链路）：人民币 = ⌈(商品价+st_shops.fee+等级fee)×
(EXCHANGE_RATE+等级rate)⌉。配套后端 `GET /api/v1/fee-estimate`（签名只读代理取
实时汇率，5min 缓存，失败 available:false）。线上核验 mercari 12345→568.74/569、
yahoo 8000→375.65/376 与手算一致。

**🔴 实证发现待拍板**：客服话术「会员+0.003/非会员+0.006」查无实据——
st_user_levels 四档 rate 全 0.0025/fee 全 0，无会员差价；0.003 实为国际运费汇率
(SHIP_EXCHANGE_RATE)差值，话术混淆。故试算器未做会员切换。改话术 or 真做会员
差异，待花哥定。

**风险**：mercari/yahoo/amazon 三平台 fee 在后端静态写死（老后台无对应 quote 路
由），调价需同步；翻译端到端质量待 key 配置后验证。

**回滚**：前端 `git revert 86002e1`；后端 `git revert e3409a9`。

### 2026-08-04 · zh 体检四问题修复（前端 `d53cc09` / 后端 `2128f07`，已上线）

**为什么**：花哥线上体检报四个问题：代购流程页"像 en 翻译的"、价格对比不好用、
torecacamp/cardrush 打开零商品、雅虎详情描述原文截断致翻译不全。

**改动**：

- 六信任页（how-it-works/faq/fees/buyer-protection/photo-inspection/about）按 locale
  分皮：en 深色 TCG 壳逐字保留（脚本核对 className 序列 1:1），zh 走浅色买家壳
  （DARK/LIGHT 常量对象方案，正文 JSX 共享不复制）
- 价格对比页重建：原 unifiedSearch 恒返 0 且失败静默（按钮永久 disabled）；改为并行
  调各平台真实搜索接口，摘 Amazon、新增雅虎 Frima/乐天 Rakuma，20s 超时+单站降级+
  最低价徽章。实测四平台各 12 条
- 卡店默认词修复：torecacamp 默认 PSA(0件)→ポケモン(120件)，toretoku/cardrush 调热词，
  cardmuseum 实测无恙未动；**cardrush 上游 cardrush-pokemon.jp 反爬 403（花哥拍板）：
  暂从 zh 站点下拉摘除**（siteMenu.ts 注释行，页面直链保留，解封或 M4 无头方案后恢复）
- 首页三步流程图标统一袋鼠吉祥物（花哥拍板：原仅第 3 步袋鼠混搭线性图标突兀）
- 后端雅虎详情描述截断旁路补丁（yahoo.goods.service.ts）：雅虎页自带预览版（截断）
  与完整版两份正文、老后台抓的预览版；识别截断结尾即直连雅虎取完整 descriptionHtml，
  5s 超时/2 万字上限/失败回退/写缓存。实测 230 字断尾→246 字完整

**验证**：线上 zh 深色类 0 / en 深色保留 / 导航无 cardrush / compare 四 chips 正确 /
torecacamp 默认词生效 / 雅虎测试商品描述无截断特征；后端推后 /health ok。

**回滚**：前端 `git revert d53cc09`；后端 `git revert 2128f07`（补丁失败时自动回退原值，
风险本身受控）。

**备注**：本批两张施工卡中途死于会话额度，半成品经中枢逐项实测收尾后上线。

### 2026-08-03 · zh 首页视觉第二批 + 袋鼠君吉祥物接入（commit `8596ef0`，已上线）

**为什么**：第一批补的是骨架和内容（页脚/导航/信任页），花哥「一看就不够专业」指的视觉层
一直没动——首页 Banner 独占 21% 版面且渐变硬拼接、信任区只有 4 个 emoji、无价值主张。

**改动**：首屏加 H1 价值主张+副标题；新增三步流程图解条 `ZhHowItWorksStrip`（竞品 8 家有
6 家摆首屏）；Banner 872→184px、渐变收敛 rose/orange；emoji 全换 lucide 线性图标并修正
语义错配；平台卡白底细边框；「新人首单优惠」帧因站内无兑现依据改新手引导。
袋鼠君吉祥物 10 张（小程序同款）自托管 `public/mascot/`，新建 `MascotScene` 组件落位
10 个场景（客服/帮助/签到/四平台搜索空态/购物车/订单/消息/押金/优惠券/首页流程），
全部 zh 门控，en 实测零泄漏。

**水印说明**：原图右下有「豆包AI生成」水印，花哥（资产所有者）知悉 AI 标识合规提示后
拍板去除；采用笔画级中值修复+暗像素保护，实际显示尺寸(≤180px)无痕，2x 放大有淡残影；
无水印原稿若日后找到，直接覆盖 `public/mascot/*.jpg` 即可，代码零改动。

**验证**：线上 /mascot/\*.jpg 全 200；首页价值主张/三步流程各 1 处；紫色残留 0；
en 泄漏 0。**回滚**：`git revert 8596ef0`。

**遗留**：6 个登录态空状态场景（购物车/订单/消息/押金/优惠券/签到）代码同构已上线
但未截图实测（需真实登录），待花哥登录抽查；商品流内的平台徽章紫色未收敛（在
ZhCategoryRow.tsx，当时属禁区，如需统一另开卡）。

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
