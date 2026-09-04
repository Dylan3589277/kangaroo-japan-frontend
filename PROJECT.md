# kangaroo-japan-frontend-cardC · 仓库级变更记录

jp-buy 前端（en/zh 双语站）在此仓的工作分支（cardC），本文件只记「为什么/逻辑/改动」的变更条目，不是完整功能文档。

## 变更记录

### 2026-08-27 客服转人工从 53kf 切企业微信客服（b3aa103，已部署ECS，回滚锚点镜像 rollback-20260827，旧镜像 8aca676c68c2）

- **为什么**：客服团队 8/31 离职，统一切企业微信客服接待，不再用 53kf。
- **逻辑**：`TcgChatWidget` 的 `KF53_CHAT_URL_DEFAULT` 与 `/zh/support/h5` 的 `KF53_CHAT_URL` 默认值改为企业微信客服链接 `https://work.weixin.qq.com/kfid/kfcdd40f1f6c4b4b499`；`env NEXT_PUBLIC_KF53_CHAT_URL` 仍可覆盖。
- **改动**：`src/components/tcg/TcgChatWidget.tsx`、`src/app/[lang]/support/h5/page.tsx` 的 `KF53_CHAT_URL(_DEFAULT)` 默认值。
- **备注**：老后台 `api/index/kefu` 同日已全量下发 `corp` 字段（小程序 realkefu 用）。

### 2026-08-23 煤炉竞拍确认面板出价输入框前导0修复（f03375c，已部署ECS，回滚锚点镜像 sha256:4d7c04ed167b…）

- **为什么**：真机改出价时清空后显示 `0` 删不掉，再输入变 `02100`。
- **逻辑**：`support/h5/page.tsx` 的 `mercariBidAmountInputs` 原存 number，onChange `Number('')=0` 回写；改为存字符串（只留数字、允许空串），`bidAmount=Number(str||0)` 派生供 belowMin/overMax/按钮文案/提交使用。
- **改动**：仅 `src/app/[lang]/support/h5/page.tsx`（10+/8−）；tsc/eslint 通过；线上 chunk 含修复正则。

### 2026-08-23 注册页支持客服签名绑定链接参数（已于2026-08-23部署ECS（main f9a1541））

- **为什么**：配合后端 `feat/register-legacy-bind`：客服 bridge 给没账号的小程序用户发 `/zh/register?bindUid=&ts=&sig=`，注册时自动绑定小程序会员（原先靠手机号匹配，微信会员常没手机号绑不上）。
- **逻辑**：注册页用 `useSearchParams` 读 `bindUid/ts/sig`，格式校验（uid/ts 纯数字、sig 64 位 hex）通过才透传给 `api.register()`（字段 `legacyBindUid/legacyBindTs/legacyBindSig`）；页面顶部显示「将自动绑定小程序会员 {uid}」提示；注册响应 `data.legacyBound` 为 true 弹成功 toast、false 弹「未能自动绑定」提示（不阻断注册）。
- **改动文件**（分支 `feat/register-legacy-bind` commit `a0e4a8c`）：`src/app/[lang]/register/page.tsx`、`src/lib/api.ts`（register 加 3 个可选字段）、`src/components/auth/auth-tcg.tsx`（`legacyBindHint` 提示框）、`src/i18n/locales/{zh,en}/auth.json`（`legacyBindHint/legacyBoundSuccess/legacyBoundFailed`）。
- **验证**：`tsc --noEmit` 0 错、lint 0 错、`next build` 通过（中枢复跑 tsc 通过）。
- **未做**：只合 main **未部署 ECS**（等花哥「推」）；ja/ko/vi/id/th locale 未加文案（回退 en）。

### 2026-08-21 zh 站智能客服「转人工」对齐小程序 → 53kf

- **为什么**：zh 网页客服点「转人工」跳站内 `/contact` 页，小程序人工客服是 53kf 托管的微信客服，两边不一致，花哥要求先对齐。
- **逻辑**：`src/components/tcg/TcgChatWidget.tsx` 新增 `KF53_CHAT_URL`（`process.env.NEXT_PUBLIC_KF53_CHAT_URL || "https://tb.53kf.com/code/client/8252b02b9d3316d5208582bc9dd052118/1"`），zh 的 transfer 链接改为新窗口打开 53kf；en 仍走 `/contact` 不变。
- **改动文件**：`src/components/tcg/TcgChatWidget.tsx`（zh transfer 链接改 `<a target="_blank" rel="noopener noreferrer">` 指向 `KF53_CHAT_URL`）、`src/i18n/locales/zh/tcg-chat.json`（`contactCta`「联系人工客服」→「转接人工客服」）。
- **commit**：`d4a951e`，已推 main；ghcr `docker-image` 绿；ECS `docker pull` + `run-frontend.sh` 部署，新镜像 `sha256:6d93e098b650…`。生产 jp-buy.com/zh 实测：转人工链接 href=53kf URL、target=\_blank、文案「转接人工客服」。
- **回滚锚点**：`ghcr.io/dylan3589277/kangaroo-japan-frontend:rollback-20260821`（= 旧镜像 `95376d8c…`，2026-08-17）。
- **后续计划**：网页与小程序一起统一切企业微信客服（花哥原话「先改称53kf，后面一起改为企业微信客服」）。
- **已知小坑**：本地 `/api/support/chat` 404 时 requestError 文案仍写「或在「联系我们」页找到人工客服」，与新链接微不一致，生产正常路径不触发，未改。

- 2026-08-23 | 客服 H5 白屏 | src/app/[lang]/support/h5/page.tsx 的 ASSISTED_PURCHASE_PLATFORMS 加入 amiami/animate/surugaya/zozotown 及对应显示名；未命中平台时改为提示转人工，不再直接崩溃 | src/app/[lang]/support/h5/page.tsx (commit 663ce9a)

### 2026-08-23 煤炉竞拍卡美化+出价前最终确认面板

- **为什么**：煤炉竞拍卡片体验优化 + 花哥要求买家出价前再加一道最终确认（"再加一个最终确认按钮让买家确认出价金额"），避免误触发大额出价。
- **逻辑**：`QuoteRef` 新增 `default_bid_jpy`；点「确认竞拍」打开确认面板（状态 `mercariBidConfirmingItemId`），输入框默认值 `default_bid_jpy ?? current_bid`，下限=当前价+100，上限=`max_bid_allowed_jpy`，不合法禁用提交；点「确认出价 ¥N」才真正发送 `确认竞拍 ¥N`（金额用 `toLocaleString("en-US")` 固定千分位——对抗审查发现裸 `toLocaleString()` 在部分浏览器 locale 下会输出 `19.400` 之类被误读为小数点的格式）；押金不足时显示「去充押金」深链小程序 `pages/daishujun/index/pay?type=deposit&money=N`，不再弹注册打断；标签由「押金」改「可用押金」更准确对齐后端新口径。
- **改动**：`src/app/[lang]/support/h5/page.tsx`，commits `7135846`/`988e109`/`916e4e3`，已合入 main `6108728`。
- **验证**：`tsc` 0 错、`next build` 通过；线上包 `/_next/static/chunks/0~t9f.r50c~h3.js` 含「确认出价/去充押金/default_bid_jpy」字样确认已发布。已部署 ECS，回滚镜像锚点 `sha256:864535c12a610ccc77bb923022d46a9a94ea3dcaa86857222c8e8879f22e2b71`。
- **未做**：真机小程序内点击「去充押金」深链是否正确跳转支付页，待花哥实测确认。
- 2026-08-23 | 客服报价卡不显示图片 | 生产 CSP img-src 缺新站图床；next.config.ts IMG*HOSTS+remotePatterns 加 *.techorus-cdn.com(animate)/_.amiami.jp/_.cardrush\_.jp/www.suruga-ya.jp/*.imgz.jp | next.config.ts (commit a1ca5d1，已部署 ECS，回滚锚点镜像 0721a35e18fb)

### 2026-08-23 智能客服报价卡标题中文化 + 图片/标题点击跳商品详情（c7013b3）

- **为什么**：智能客服 H5 报价卡标题未翻译；图片点击不能跳商品详情。
- **逻辑**：`src/app/[lang]/support/h5/page.tsx` 解析 `goods_name_zh` 优先显示（日文原名作小字副标题）；封面图/标题可点击 → `platform==="yahoo"` 走 `navigateToMiniProgramYahooBid`，其余平台走 `navigateToMiniProgramGoodsDetail(platform,item_id)`，失败则提示在小程序内打开。
- **改动**：`src/app/[lang]/support/h5/page.tsx`，commit `c7013b3`。

### 2026-08-23 智能客服 H5 竞拍卡点图改为打开确认出价面板（commit f294c04）

- **为什么**：同上（小程序无法更新，煤炉竞拍商品进小程序详情页只显示"已售出"）。
- **逻辑**：`openQuoteDetail` 遇 `quote.kind==="auction"` 调 `openMercariBidConfirm` 并 return，其它平台照旧跳小程序详情。
- **改动**：`src/app/[lang]/support/h5/page.tsx`。ECS 已部署镜像 sha256:9c33b685…，回滚锚点 sha256:1eb396bc…。
- 2026-08-23 | fix(csp) 8cb92f8 | 骏河屋商品图实际在 cdn.suruga-ya.jp，CSP img-src 与 images.remotePatterns 白名单从 www.suruga-ya.jp 改通配 \*.suruga-ya.jp，H5 智能客服报价卡图片才能显示。

### 2026-08-23 · 智能客服 tgc 四站/cardrush 分站不出报价卡（bc3ce66，ECS 已部署 38c422606bc0）

- 为什么：bridge 出卡靠识别消息里的商品链接（`_parse_supported_purchase_link`），原只认 `cardrush.jp/product/数字`；H5 `page.tsx` 把 `cardrush-main` 的分站 gid（`db:6523`）拼成主站 URL 也无法识别。前面三道白名单（candy 映射/后端 DTO/bridge allowlist）都在这道门之后。
- 改动：bridge 加 cardrush 8 分站（→`cardrush-main`+`slug:digits`）、cardrush-pokemon.jp、card-museum.com `?pid=`、torecacamp-pokemon.com `/products/`、toretoku.jp `/item/details/` 解析；前端 `ITEM_URL_BUILDERS['cardrush-main']` 识别 `<slug>:<digits>` 拼分站域名，`ASSISTED_PURCHASE_PLATFORMS` 加 cardrush/cardmuseum/torecacamp/toretoku（防按钮落 mercari 分支白屏）。
- 回滚：前端旧镜像 e349ddeeed80；bridge 备份 `bridge.py.bak-20260823-tgc2`。

### 2026-08-24 · 雅虎竞拍客服出卡 H5 门 + 去出价跳老版小程序（eb21ac2，ECS 已部署 eb5ba813）

- 为什么：客户粘贴雅虎竞拍链接只得纯文字；老版煤炉供销社不能发版，出价入口由 H5 卡按钮跳老版详情页 `/pages/daishujun/index/yahoo_detail?id=`。
- 改动：`src/app/[lang]/support/h5/page.tsx`：渲染 bridge quote_ref kind:auction 竞拍卡；`purchasable !== false` 才出【去出价】按钮，否则红条 `support-quote-unpurchasable`（对抗审查修复 523c48e）。
- 回滚：旧镜像 4f8c46c6（已 tag rollback-20260824）。

### 2026-08-24 · 竞拍去出价按宿主分流：candy 跳中转页（ab23d27，ECS 已部署）

- 为什么：kefu H5 竞拍卡【去出价】原来写死跳老版煤炉供销社页面，在 candy（新版小程序）宿主里该路径不存在、点了没反应。
- 改动：`src/app/[lang]/support/h5/page.tsx` `navigateToMiniProgramYahooBid(itemId, useCandyTransfer)` 按 `isCandyTheme` 分流——candy 宿主跳 `/pages/bundle/transfer/auction?id=`（candy 新中转页，用户点按钮后 `navigateToMiniProgram` 跳老版），老版宿主 URL 字节不变。3 个调用点全部传 `isCandyTheme`。
- 回滚：旧镜像 eb5ba8133140（已 tag rollback-20260824b）。

### 2026-08-31 · 智能客服「留言给卖家」上线 + leaveMsgRef 直点卡（待推）

- 为什么：花哥令①煤炉留言移植进客服聊天页（报价卡可直接留言）；③否掉一来一回对话式收集，bridge 命中留言意图直接回结构化卡（价格输入+问题直点）。
- 改动A（**已部署**，c21f594+1a873cd，ECS 已上线）：`src/app/[lang]/support/h5/page.tsx` 报价卡加「留言给卖家」按钮（仅 mercari），弹窗砍价/咨询两模式；新增 `src/app/api/support/seller-messages/route.ts` 代理。回滚锚点：旧镜像 `60badac7c5a7`。
- 改动B（**未部署**，分支 `feat/h5-leave-msg-card` commit `f8c5528`，已推 origin）：渲染 bridge 回包 root/data 层 `leave_msg_ref`（7字段契约），出 `support-leavemsg-ref-card` 双按钮卡（帮我砍价/咨询卖家，mode_hint 决定高亮，price_jpy 缺失时砍价按钮置灰）+ 4 条预设问题 chips 直点填入；`openLeaveMsgModal` 加可选 opts（floorPriceJpy/link/initialType/prefillAmountJpy），原报价卡按钮不传 opts 行为不变。已知备忘：page.tsx:3363/:1969 文案硬编码「现价的80%」，当前与 floor_price_jpy 契约（ceil(price\*0.8)）恒等无实害，floor 定义变更时需同步文案。
- 验证：`npm run build` 绿 + `tsc --noEmit` 无错 + 对抗审查 7 攻击向量未攻破 [中枢自验]。改动B上线需花哥明确「推」令。

### 2026-09-04 · 客服H5雅虎竞拍闭环上线（merge feat/auction-h5 a8e3c09，ECS 已部署）

- 为什么：客服H5竞拍卡此前只能跳老版小程序详情页出价，无法在H5内直接看详情/出价/查我的竞拍；配合老后台新增 h5detail/h5bid/h5bids 三接口落地闭环。
- 逻辑：新增 `/zh/support/auction/[id]` 详情+出价页、`/zh/support/auction/mine` 我的竞拍页（竞拍中/已中标/已结束），`src/app/api/support/yahoo/[action]/route.ts` 透传到老后台 `${LEGACY_API_BASE_URL}/api/yahoo/h5{action}`（前端不持密钥）；h5 竞拍卡改 router.push 到详情页并带 user_id/ts/sig/theme。
- 改动：`src/app/[lang]/support/auction/[id]/page.tsx`、`.../auction/mine/page.tsx`、`src/app/[lang]/support/candy-theme.ts`、`src/app/api/support/yahoo/[action]/route.ts`、`h5/page.tsx`；ECS nginx `daishujun.conf` 同步新增 `location ^~ /zh/support/auction/` 代理（否则新页面 404，教训见下）。
- 教训：app.kangaroo-japan.com 只精确代理白名单路径，新增 H5 子页面必须同步加 nginx location；H5 page query 参数名是 `user_id` 不是 `uid`。
- 回滚：前端旧镜像 sha256:f6f0b0a0…；nginx 备份 `daishujun.conf.bak-auction-h5-20260904`。
