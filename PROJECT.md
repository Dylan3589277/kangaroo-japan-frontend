# kangaroo-japan-frontend-cardC · 仓库级变更记录

jp-buy 前端（en/zh 双语站）在此仓的工作分支（cardC），本文件只记「为什么/逻辑/改动」的变更条目，不是完整功能文档。

## 变更记录

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
- 2026-08-23 | 客服报价卡不显示图片 | 生产 CSP img-src 缺新站图床；next.config.ts IMG_HOSTS+remotePatterns 加 *.techorus-cdn.com(animate)/*.amiami.jp/*.cardrush*.jp/www.suruga-ya.jp/*.imgz.jp | next.config.ts (commit a1ca5d1，已部署 ECS，回滚锚点镜像 0721a35e18fb)

### 2026-08-23 智能客服报价卡标题中文化 + 图片/标题点击跳商品详情（c7013b3）

- **为什么**：智能客服 H5 报价卡标题未翻译；图片点击不能跳商品详情。
- **逻辑**：`src/app/[lang]/support/h5/page.tsx` 解析 `goods_name_zh` 优先显示（日文原名作小字副标题）；封面图/标题可点击 → `platform==="yahoo"` 走 `navigateToMiniProgramYahooBid`，其余平台走 `navigateToMiniProgramGoodsDetail(platform,item_id)`，失败则提示在小程序内打开。
- **改动**：`src/app/[lang]/support/h5/page.tsx`，commit `c7013b3`。
