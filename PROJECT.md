# kangaroo-japan-frontend-cardC · 仓库级变更记录

jp-buy 前端（en/zh 双语站）在此仓的工作分支（cardC），本文件只记「为什么/逻辑/改动」的变更条目，不是完整功能文档。

## 变更记录

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
