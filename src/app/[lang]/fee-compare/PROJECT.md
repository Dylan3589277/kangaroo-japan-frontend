# 三方比价费用页（/fee-compare）

## 背景

jp-buy zh 侧需要一个"费用透明对比"页，把袋鼠君的代购手续费/砍价代留言/拍照/仓储/
合并打包/纠纷售后，跟两家竞品（脱敏为「挖★姬」「乐★番」）摆在一起对比，配一个手续费
试算器，目标是给顾客建立"我们更便宜更透明"的信任，同时给 GEO（AI 搜索引擎）喂结构化
数据，让"日本代购 手续费 对比"一类问题能召回本站。

死蓝图来自花哥 2026-07-21 指示，原定路由是 `/zh/compare`。

## 方案

### 路由冲突与改路由决定（读码后发现，非猜测）

1. `/[lang]/compare` 已经是站内在用的功能——**三平台商品比价搜索**（源/煤炉/雅虎/乐天
   一起搜），首页导航栏 `HomePageClient.tsx` 直接链到它（`{ key: "compare", href:
"/compare", label: t("home.priceCompare") }`），数据模块是
   `src/components/compare/compare-data.ts`。铁律"不碰现有页面"，所以不能把这个路由
   改成费用对比页。
2. `/[lang]/fees` 也已被占用——是 **en/tcg 站**的英文费用估算页（深色"设计 A"主题，
   `src/app/[lang]/fees/page.tsx`），面向美国卡牌买家，跟本页"zh 对标国内友商"定位完全
   不同，也不复用。
3. 因此本页落在新路由 **`/[lang]/fee-compare`**（对应 zh 默认 locale 无前缀访问路径
   `/fee-compare`，en 为 `/en/fee-compare`）。语义上"fee compare"（费用对比）跟已占用
   的 `compare`（商品比价）、`fees`（英文费用估算）都不冲突。
4. 此改动只在报告里说明，未回头找花哥二次确认路由名——因为任务书本身写了"若路由约定
   不同，按约定放，报告里说明"，属于已授权的判断空间，不是需要停下确认的歧义。

### 页面结构

- `page.tsx`：服务端组件。`generateMetadata` 输出 title/description（含"日本代购
  手续费对比"关键词）；正文渲染对比表（桌面 `<table>`，移动端卡片，复用 `/fees` 页
  同款响应式模式）+ 试算器 + 页脚免责声明；JSON-LD 用 `breadcrumbJsonLd` +
  `faqPageJsonLd`（Q&A 从 `COMPARE_ROWS` 派生，不重复写数字）。
- `FeeCalculator.tsx`：`"use client"` 组件，纯前端算价，不发任何请求。
- `fee-compare-data.ts`：**唯一数据源**，见下。

### 视觉风格

zh 侧走全站消费端视觉语言：白底 + `rose-600` 品牌色（跟 `HomePageClient.tsx` 首页一致），
不是 `/fees`/`/faq`/`/how-it-works` 那套 en/tcg 深色"设计 A"。外层壳沿用
`[lang]/layout.tsx` 现有分支（非 en → `SiteHeader`，无 footer），未改该文件。

## 数据模块说明（`fee-compare-data.ts`）

- 所有数字（我方 + 竞品）集中在这一个文件，`page.tsx`/`FeeCalculator.tsx` 只从这里
  取数渲染，JSX 里不写死任何金额。
- 我方数字是**花哥拍板的目标值**（手续费 0 円 / 拍照 200 円 / 仓储 90 天），**不是**
  老后台 `st_value_added` 的当前实际值（旧值仍是 100 円等）。
- 试算器公式（`calculateFees`）：
  - 我方：恒 0
  - 挖★姬：`<7000→200`；`7000~10000→price×3%`；`>10000→300`（封顶）
  - 乐★番：`<7000→200`；`>=7000→min(price×3%, 1000)`（当前活动免费，页面按原价展示
    并加旁注）
- 每条数据带 `source` 注释（采集/拍板依据）与统一采集日期 2026-07-21。

### 探查结果：现有增值服务定价 API（只探查，未接入）

`src/lib/api.ts` 里有 `api.getMercariQuote(goodsNo)` → `GET /api/v1/mercari/quote?
goodsNo=...`，返回 `MercariQuote.valueAdded: { id, name, priceJpy }[]`。但这个接口是
**按单个商品号查询报价**时把当时生效的增值服务价格带出来（源头是老后台 `st_value_added`
表 + `proxyconfirm` 动态计算），**没有一个"直接查当前费用表"的通用端点**——想拿到"现在
拍照多少钱"必须先有一个 `goodsNo` 去查一次商品报价，语义不对口，而且老后台价格还没改到
目标值，接了反而会把 0 円/200 円的目标值覆盖成旧值。所以第一版按任务书要求**不接**，
仅在数据模块顶部留 TODO。

## 变更记录

- 2026-07-21：新建 `/fee-compare` 页面 + 数据模块 + 试算器（首次实现）。原定路由
  `/zh/compare` 因与站内在用的商品比价页冲突，改为 `/fee-compare`，理由见上文。

## 待办

1. **切动态取数**：老后台 `st_value_added` 改到目标价（手续费 0 円/拍照 200 円等）后，
   评估要不要把 `fee-compare-data.ts` 里 `ours.*` 字段换成动态取数；目前没有合适的
   "查费用表"端点，需要跟后端另开一个不依赖 `goodsNo` 的接口，或后端直接给一个公开的
   费用配置端点。
2. **补运费行**：当前对比表只覆盖代购环节费用（手续费/砍价/拍照/仓储/合并/售后），
   没有国际运费对比行——国际运费按重量/渠道浮动，需要花哥给一个可比的标准口径（比如
   "1kg 到中国"参考价）才能加。
3. **补汇率行/试算器人民币显示**：试算器目前只算日元手续费，没有换算成人民币；如果
   要加，需要接入站内现有汇率来源（避免脱离统一汇率口径），且要确认是否要接入实时汇率
   还是用固定展示汇率。
4. 我方"合单后仓储不缩水"的政策口径待运营最终确认（页面已加 `*` 脚注兜底，不是确定
   承诺）。
5. 竞品数据是一次性人工采集（2026-07-21），没有自动刷新机制，需要定期人工复核，否则
   随时间失真。

## 变更记录（追加）

- 2026-07-21 花哥拍板：手续费文案「0円 长期免」→「0円 现免」（保留调价灵活性，对手恢复收费时可跟进）。改动 fee-compare-data.ts 一处，build 复验通过。同日复核：乐★番现网仍挂 0 手续费，公测期到 2026-09-30——9月底需复查其是否续期并同步本页口径。

## 变更记录（追加 2)

- 2026-07-21 花哥看预览后微调：①名头改用小程序品牌 logo（~/.team/design-assets/原logo.png，预览已 base64 内联；真实页面沿用站内 layout 的站点 logo，不改共享 layout）②代购手续费文案「0円 现免」→「200円 现免」（名义 200 円、现免，口径与友商对齐、保留调价灵活性，不承诺永久）③试算器袋鼠君格加"现免 · 实收 0"标注（对比表名义价与试算器实收 0 的口径自洽）。build 通过；预览 artifact 已更新（同 URL）。

## 变更记录（追加 3）

- 2026-07-21 花哥二次反馈微调：
  ① 试算器改「名义费率对比」口径——消除"三家都免却只有竞品显示300"的矛盾：三家均显示名义价+各标现免状态（袋鼠君¥200 现免／挖★姬¥300 限时活动免／乐★番¥300 公测免），lead/note 说明"三家均在做全免活动，此为名义费率、看活动结束后差异"。calculateFees.ours 由 0 改为 oursFee()=200（名义封顶，与对比表「200円 现免」口径一致）。
  ② 图3「帮砍价·代留言」行拆分：改为「客服方式」行（真人客服／机器人客服／人工客服·限时段）+ 保留独立「帮砍价·代留言」行（免费／未单独标价／100~200円/次）。
  ③ 新增「国际运费（EMS）」行：我方「与日本邮政同价·不赚差价」，据中枢 curl 生产 API 核验 EMS 逐档与挖★姬完全相同（0.5kg 1450／5kg 6400）。运费对比只做传统 EMS 线路（专线我方为空白，不展示）。
  build 通过，预览 artifact 已更新。
  ⚠️ 待花哥确认：(a) 袋鼠君名义费率试算按固定 200 封顶（若实际分档需改 oursFee）；(b)「挖★姬 机器人客服」措辞基于第三方用户反馈非官方，对外发布前需评估法律风险（对抗审查已标，建议可软化为"以在线/自助客服为主"）。

## 变更记录（追加 4）

- 2026-07-21 花哥反馈三次微调：
  ① 对齐修复——CompareRow 加可选 oursSub/competitorASub/competitorBSub 小字字段；手续费行("现免/限时活动免/公测免")、运费行("不赚运费差价")的说明文字从主值里拆出做小字，移动端主值右对齐不再换行参差；page.tsx 桌面 td + 移动 dd 均渲染小字。
  ② 客服措辞软化：客服方式行 competitorA「机器人客服」→「以在线/自助客服为主」（规避对第三方口碑的诋毁法律风险）。
  build 通过；真实页面移动端截图验证对齐 OK；预览 artifact 同步。

## 变更记录（追加 5）

- 2026-07-21 花哥澄清「对齐=数字本身一致」（中枢先前几轮误解为视觉排版，已认错纠正）：
  ① 数字矛盾修复——对比表「代购手续费」三家统一显示「现免」(挖★姬带"限时活动"、乐★番带"公测期"小字)，去掉具体名义价；名义价对比只留在试算器。根因：原对比表乐★番"200円起"与试算器同一家算出"300"打架，客户看着像出错。
  ② 客服行改对：袋鼠君「智能+真人客服/24小时」(花哥给的准确口径，原"真人客服"不全)；挖★姬「在线客服」(去掉没实锤的"以自助为主"，花哥质疑未确认就写)。
  ③ 导航入口——navItems 加「费用说明」项链 /fee-compare，i18n zh/en 加 nav.feeCompare，桌面+移动两端自动渲染，位置在"价格对比"之后。build 通过，真实页面截图确认。
- ⚠️ 小程序客服话术推链接方案被花哥否决（"一句话回一大串没人看"）。

## 变更记录（追加 6）

- 2026-07-21 花哥定：网页版 + 小程序版都做。
  · 网页版保留（对 GEO 有用），但必须符合 zh 站风格。真实 /fee-compare 页本就用 SiteHeader + rose zh 风格（无需改）；问题出在预览 artifact——之前误把 topbar 套成小程序 logo（"名头用小程序的"被误解），现已换回 zh 站真实 logo（public/brand/kangaroo-logo.png，纯袋鼠图标，缩 160px 内联）。
  · 小程序版 = 糖果皮风格，另做（daishujunApp），照糖果皮设计稿 v7。
- 🔴 教训：花哥一直说"小程序"，中枢却做在 jp-buy zh 网页 + 预览套小程序 logo，连环栽在"没跟花哥确认载体就闷头做 + 凭猜理解风格"。后续动手前先确认载体、先读真实风格。

## 变更记录（追加 7）

- 2026-07-21 网页版已推送上线：commit faacd22 → push origin main（fetch同步无撞车、本地 build 通过、pre-commit lint/prettier 已跑、staged 仅本功能 7 项无夹带），Vercel 自动部署。线上验证：`jp-buy.com/zh/fee-compare` 返回 200，内容关键词全中（费用透明对比 / 现免 / 挖★姬 / 乐★番 / 智能+真人客服 / 与日邮同价 / 试算器）；导航「费用说明」入口在 jp-buy.com/zh 已生效。

## 变更记录（追加 8）

- 2026-07-21 花哥定「网页版一并改」：
  ① 🔴修线上虚假承诺——免费仓储 90天 → 真实 30天（硬拉 90 天日本仓压力过大，花哥运营侧否）。
  ② 手续费、仓储移出对比表（三家都现免=都0、仓储30天不占优，比了没意义/自曝），合并成「袋鼠君亮点卡」：⭐10年代拍老店 + 代购手续费 200円限免（现0）+ 免费仓储 30天（BRAND_BADGE/HIGHLIGHTS in data，page.tsx 渲染，rose 风格非糖果粉）。
  ③ 对比表保留 客服/砍价/拍照/运费/合并打包/纠纷售后 六项；手续费名义价对比仍在试算器。
  网页版 = zh 站 rose 风格；build 通过、本地截图验亮点卡+对比表渲染 OK。

## 变更记录（追加 9）——到手价试算区块（2026-08-04）

- 花哥拍板加「到手价试算」区块，补上待办 3（试算器人民币显示）。**新组件**
  `LandedCostEstimator.tsx`，插在 `FeeCalculator`（代购手续费三方对比，纯前端）之后，
  两者互不影响、职责不同。

- **计价口径先读码实证**（阿里云老后台只读 SSH，未做任何写操作）：
  - `app/api/controller/Orders.php::confirm()`/`proxyConfirm()`（Mercari/Yahoo/Amazon 走这条）
    与 `app/admin/controller/Orders.php::legacyQuote()`（rakuma/yahoofrima/cardrush/
    surugaya/torecacamp/cardmuseum/toretoku 走这条）算价逐行一致：
    `amount_jpy = price + shops.fee(平台) + user_levels.fee(会员等级"代拍手续费额外")`，
    `amount_rmb = amount_jpy × rate`，`rate = EXCHANGE_RATE(st_config,每日更新) + user_levels.rate`。
  - 只读 mysql 查询 `st_shops`：mercari 100 / yahoo(竞拍) 220 / yahoofrima 100 / rakuma 100
    / amazon 220 円；`st_user_levels` 四档（普通/黄金/白金/钻石）**当前 rate 统一 0.0025、
    fee 统一 0.00**（代拍手续费限时免费属实）。
  - 🔴 **口径分歧，已如实上报未擅自采信**：客服话术 `Chat.php` 里「非会员代拍汇率
    +0.006／会员代拍汇率 +0.003」这句，在当前 `st_user_levels` 实际值里查无实据（四档
    完全一样，不存在会员/非会员差异）；0.003 实为 `SHIP_EXCHANGE_RATE`（国际运费换算
    专用）与 `EXCHANGE_RATE` 之差，跟商品款换算汇率是两回事，客服文案把两者混为一谈了。
    据此**没做「会员/非会员」切换**（做了也是假选项，两个值算出来完全一样）。

- **后端**：新模块 `kangaroo-japan-backend/src/fee-estimate/`（service + controller +
  module，已注册进 `app.module.ts`）。公开只读端点 `GET /api/v1/fee-estimate?
platform=<mercari|yahoo|yahoofrima|rakuma|amazon>&priceJpy=<int>`，不需要登录。
  实现上**复用已有的老后台签名只读代理**（`DSR_LEGACY_READONLY_API_BASE_URL` +
  `ADMIN_READONLY_PROXY_SECRET`，即 `tcg-quote.service.ts` 在用的同一套基建）打
  `/admin/orders/rakuma-quote` 拿实时 `{rate, realrate, fee_level_jpy}` 快照（5 分钟
  内存缓存 + 5s 超时 + 失败/未配置返 `{available:false}`，不建单不写老后台），本地再按
  用户选的平台套静态 `shops.fee` 算出该平台的 `amount_jpy`/`amount_rmb`。mercari/yahoo/
  amazon 老后台没有公开 quote 路由，只能静态写死其 `shops.fee`（有漂移风险，见「待办」）。

- **前端**：`src/lib/api.ts` 加 `FeeEstimatePlatform`/`FeeEstimateResponse` 类型 +
  `api.getFeeEstimate()`；`LandedCostEstimator.tsx` 400ms 防抖调用，展示商品款/支付
  手续费/代拍手续费(现免)/小计(JPY) + 预估到手价(CNY，两位小数) + 汇率取数时间；
  显著注明「国际运费到仓称重后另计，不含在内」与「下单页实付以老后台按元向上取整为准
  （本页两位小数仅供参考）」。汇率接口不可用时显示「暂时无法估算」，不出 NaN。

- **验证**：后端 `nest build`/`eslint`/14 条单元测试全绿（覆盖 5 平台费率映射、5 分钟
  缓存、TTL 过期重取、env 未配/HTTP 错误/code≠0/畸形响应/网络错误/超时全部 fail-closed
  返 null）；另写一次性脚本直接实例化 `FeeEstimateService` 打生产老后台真实汇率验证
  （price=12345 全平台手算对照一致，用后即删，未入库未提交）。前端 `next build`/
  `eslint` 全绿。🔴 **未做浏览器可视化验证**——本机 `.next` 目录被另一并行会话的 dev
  server 占用（Next.js 单实例锁，换端口也拒绝，未 kill 对方 PID），未接触。

- 未改老后台、未 git 操作（按任务书边界）；`ref/php-api/Robot.php`（另一会话遗留的
  未提交修改）与标题翻译卡的文件（`translate-zh.ts`/`api/translate-titles/`/
  `useTitleTranslations.ts`/各 `Zh*List.tsx`/`yahoo-search-page.tsx` 等）全程未碰。

## 待办（追加）

6. mercari/yahoo(竞拍)/amazon 三个平台的 `shops.fee` 在新后端里是**静态写死**（见
   `fee-estimate.service.ts` 顶部 `PLATFORM_SHOP_FEE_JPY`），老后台若改这三个平台的
   支付手续费，这里不会自动同步——需要人工核对或后续给这三个平台也开一条
   `xxx-quote` 老后台路由（同 rakuma/yahoofrima）后切成动态取数。
7. 补一次真实浏览器截图验证（见上「未做浏览器可视化验证」），下次没有并行 dev
   server 占用时补跑。
8. 「会员/非会员」到底要不要在页面上出现，取决于花哥怎么定这个分歧：是客服话术该
   改（改成「所有会员汇率一致」），还是以后要真的给会员等级分层定价（那样再回来接
   `st_user_levels` 的差异化 rate/fee，现在预留了 `levelFeeJpy` 字段，加了也不用改
   接口形状）。
