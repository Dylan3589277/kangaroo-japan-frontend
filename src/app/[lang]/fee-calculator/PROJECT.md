# 费用试算器（/fee-calculator）

## 背景

花哥 2026-08-06 拍板：`/fee-compare` 页里原有的"到手价试算"（`LandedCostEstimator`）
只算商品款+手续费，明写"不含国际运费"，且埋在长页面下方没人看见。要一个独立的、
把国际运费也算进去的完整试算器：商品价格 → 选平台 → 自动显示当前活动 → 手续费
拆项 → 运费区（重量+运输方式+打包服务）→ 商品费+运费总和 → 关税提醒。

## 国际运费数据源（前置调研，做不成后面都是空壳）

只读调研结论（2026-08-06，读码+只读实测，未做任何写操作）：

- **数据源**：老后台公开只读端点 `POST https://app.kangaroo-japan.com/api/ships/datas`
  （`app/api/controller/Ships.php::datas()`，`noNeedLogin=['*']`，服务端 Redis
  缓存 3600s）。与小程序「运费计算」页（`pages/bundle/calcfreight/calcfreight.vue`，
  新老两版小程序共用同一份代码）同源同款，本页复用同一个端点，不重新发明。
- **形状**：`{ prices: [{method_code, area, weight_limit, ship_amount}], ships:
[{method_code, method_name, is_deleted}], countrys: [{id, name, area, is_show}],
rate }`。表 610 行，覆盖 method_code 1(EMS)/2(標準航空·AIR)/4(船运·SHIP)
  （3 号 code 有 100 行价格但对应方式已下线，表里是死数据，本页已过滤）× area
  1-5（1=中国大陆/台湾/韩国）× 重量梯度（EMS 从 500g 起 100g/250g/500g 不等
  阶梯到 30000g 共 42 档，AIR/SHIP 从 1000g 起 30 档），JPY 整数。
  实测 area=1 EMS：500g→1450／5000g→6400，与 `fee-compare` 页对比表里"中枢
  curl 生产 API 核验"的旧结论完全一致。
- **汇率**：`rate` 字段 = `st_config.SHIP_EXCHANGE_RATE`（人工每日更新），实测现值
  0.0460。本页直接用这个值做 JPY→RMB 乘数，**不在前端自行拼"实时汇率+0.003"**——
  0.003 是这个字段相对 `EXCHANGE_RATE`（商品款换算汇率）的差值，是两个各自维护
  的老后台配置，直接读最终值更准，避免两处口径分裂。
- **梯度查表逻辑**：正确语义是"取所有 weight_limit ≥ 输入重量的档位中最小的一档"。
  小程序原实现（`weightChange()`）是"遍历后最后一次 weight<=weight_limit 命中"，
  在非严格排序输入下有选错档的风险；本页 `src/lib/shipping-calc.ts` 的
  `lookupShippingCost()` 改用显式取最小值，更稳健（新写的展示层代码，未依赖、
  未修改小程序那份实现）。
- **CORS**：老后台响应没有 `Access-Control-Allow-Origin`，浏览器直连会被拦，
  所以拉取必须走 Next.js 服务端（`src/lib/server/shipping-rates.ts`，Server
  Component 渲染时 `await`，5s 超时 + 30 分钟 Next fetch 缓存 + fail-closed）。

### 已知缺口：打包/加固服务价格

老后台确有独立计价（`st_value_added` 表，出库申请页 `applyShipment.vue` 对已登录
用户按订单动态展示 `{name}({price}日元)`，客户可勾选），但：

1. 只在**已登录 + 有真实订单 ID**的出库申请场景暴露，没有匿名可查询的端点；
2. 沙箱只读 SSH 不允许直连老后台数据库核实当前价（`.env`/DB 直连被安全策略拦截，
   与本仓 `zh-fee-estimate.service.ts` 头部注释记录的限制一致）；
3. `GET /api/v1/mercari/quote?goodsNo=...`（现代后台已有的 value-added 探查口）
   是"按具体商品号查询"，不是通用目录端点，且是购买场景（拍照等），未必和出库
   打包是同一批 SKU。

按任务书要求**没有编数字**——本页把"加固/打包服务"做成信息提示 checkbox（勾选后
提示"费用由仓库按需人工核定，出库时另行告知，未计入下方总计"），不计入总价。
花哥给出当前价格后可接成 `promo-config.ts` 同款"人工同步常量 + asOf 标注"模式。

## 实现

- **路由**：`/[lang]/fee-calculator`（zh 默认 locale 无前缀 `/fee-calculator`，
  en 为 `/en/fee-calculator`）。`/fee-compare`、`/fees` 均已被占用（见
  `fee-compare/PROJECT.md`），此路由未冲突。内容同 `/fee-compare` 一样是 zh 侧
  中文内容，`lang` 只影响 metadata/indexable/alternates，不做多语言文案。
- **不重写计价**：商品款/支付手续费/代拍手续费/小计这段，直接调用既有
  `api.getFeeEstimate()`——与 `fee-compare/LandedCostEstimator.tsx` 完全同一个
  函数、同一条后端公式（`kangaroo-japan-backend/src/fee-estimate/`），零重复
  实现。国际运费是本页新增能力（上面的数据源）。两者在父组件
  `FeeCalculatorApp.tsx` 里做状态提升，好让"商品费+国际运费总计"能一目了然地
  合并展示——这是没法通过原样内嵌 `LandedCostEstimator` 组件达成的新要求
  （它是自包含状态，拿不到内部结果给外部求和），所以展示层是新写的，计价公式
  本身没有重写。
- **活动配置单一源**：`src/lib/promo-config.ts` 的 `CURRENT_PROMO` + 按日期区间
  自动判断是否显示的 `getActivePromo()`。8 月活动（8/1-8/31）：代拍手续费全免、
  代拍汇率实时+0.0025、运费汇率实时+0.003、夜间 18:00-次日9:00 汇率仅+0.0023
  （仅限煤炉自助支付/自动下单）。横幅"代拍手续费是否全免"优先读实时
  `getFeeEstimate()` 结果（`levelFeeJpy===0`），配置里的 `agencyFeeWaived` 只做
  实时数据未到位时的兜底，跟现有取数逻辑打通了一部分；汇率加点数字老后台没有
  可查询"当前加点是多少"的端点，仍是人工同步文案。夜间时段时区未经花哥明确
  （本任务书没写 JST 还是中国时间，本站曾在这类问题上出过错——见记忆
  `kefu-hours-copy-baseline`），所以没做自动按时段切换计算，只做静态文案展示。
- **数据文件**：`src/lib/shipping-calc.ts`（纯类型+纯函数，client/server 都能
  import）+ `src/lib/server/shipping-rates.ts`（网络请求，server-only 按仓内
  `src/lib/server/` 目录惯例）。
- **fee-compare 页联动**：移除内嵌的 `LandedCostEstimator`（功能已被本页超集
  覆盖，两处维护同一套"按平台+价格算到手价" UI 没有意义），改成引导 CTA 卡片
  链到本页；`FeeCalculator`（三家名义费率对比）保留不动，跟本页是不同问题
  （比价 vs 这单多少钱）。另把友商数据采集日期拆成显式常量
  `COMPETITOR_DATA_COLLECTED_DATE`，脚注文案从它派生，以后复核只改一行。
- **首页入口**：`ZhHowItWorksStrip.tsx` 底部链接行加一条"费用试算 →"
  （已有"查看完整流程 →"/"费用说明 →"两条，样式对齐），花哥定为次要入口
  （小程序是主力）。

## 小程序入口调研结论（只读，未改小程序仓）

`daishujunApp` 首页 `top-menus`（新手必读/运费计算-国际运费/费用对比 三个快捷
入口）**在新老两个分支都是 Vue 模板里硬编码**，不是 `st_urls` 驱动（后者驱动的
是再往下一段的"金刚区" `icons`/`funcList`，是两个不同的 UI 区块）：

- **candy 新版**（`wx4496935bdcce605e`，可发版）：三个入口是 `<view class="menu-item">`
  - 独立 `<text>` 标签（图标图不含文字），当前中间一项文案"运费计算"、点击跳
    `/pages/bundle/calcfreight/calcfreight`（老的原生运费计算页）。**改法**（未执行，
    供后续派卡）：① 该 `<text>` 改成"费用试算"（纯文案改动，图标图不用重做，因为
    文字不在图里）；② 新增一个通用 webview 页（同仓已有 `pages/daishujun/index/broswer.vue`
    的 `<web-view :src="...">` 模式，但那个页面 src 是写死的抽奖链接，需要新建
    一个页面而不是改它），`src` 指向线上 `https://jp-buy.com/zh/fee-calculator`；
    ③ `_jump()` 目标从 `calcfreight` 改成新页面路由，`pages.json` 里注册新页面。
- **老版**（`wx208645d960d3f104`，**当前因雅虎竞拍功能卡在微信审核发不了新版**）：
  三个入口是纯 `<image>`（**文字直接画在图片里**，没有独立文本节点），且同样是
  模板硬编码、点击直接跳原生 `calcfreight.vue` 页。**结论：这个入口在老版上现在
  改不了**——换文案要重做图片素材，换跳转目标要改代码，两者都需要新版本，而
  老版发不出新版本。
  - **不可行的"曲线救国"**：金刚区虽是 `st_urls` 驱动、改配置不用发版，但要让
    它跳到新的外部计算页仍然需要一个"能打开任意 URL 的 webview 页"存在于已发布
    的客户端代码里——老版现有的两个 webview 用法（`broswer.vue` 抽奖链接、
    `kefu.vue` 客服链接）src 都是写死的，不是从路由参数读的通用跳转页，所以
    金刚区加条目也没有能落地的目的地。
  - **可落地的替代方案**（无需发版）：`calcfreight.vue`（国际运费原生页）和
    "费用构成"文章（`article/detail?id=11`）都是走 CMS 内容渲染（`api/articles/detail`
    / `api/index/feeinfo`），后台改文案/说明即可更新，不用发版——可以把当前活动、
    打包服务提示等补充说明塞进这两处已有内容，但拿不到新页面那套"重量+方式+
    打包一起算的交互计算器"，只能做静态说明层面的补强。
  - 根治方案是等老版下一次成功发版时把 candy 同款改法一起带上，在此之前只能
    接受"老版用户看不到新计算器"这个现实。

## 待办

1. 打包/加固服务当前价格——花哥提供后接入 `promo-config.ts` 同款常量模式。
2. candy 小程序入口改法（本页面已给出具体 diff 思路）按派卡纪律执行 + 真机/
   开发者工具截图验证，本次未改小程序仓。
3. 老版小程序入口保持现状，等下次成功发版时一并处理；期间可选做 CMS 内容层
   补强（见上）。
4. 夜间折扣时段时区待花哥明确（JST 还是中国时间），明确后再考虑要不要做成
   自动生效的价格切换。

## 变更记录

- 2026-08-06：新建 `/fee-calculator` 页 + 运费数据源接入（`api/ships/datas`）+
  活动配置单一源（`promo-config.ts`）+ `fee-compare` 页联动（移除内嵌
  `LandedCostEstimator`，改 CTA；友商数据日期拆显式字段）+ 首页引导链接。
  `npm run build`/`eslint` 全绿；本地 dev 服务器（独立 git worktree，避免
  与并行会话的 dev server 抢 `.next` 锁）截图验证桌面端+移动端渲染、平台/
  重量/运输方式交互、超重降级文案均正确，且与生产 API 实测数值逐项核对一致
  （EMS 1000g→2200円、SHIP 1000g→1800円、总计 JPY+RMB 求和）。小程序改法只
  调研未改动。
