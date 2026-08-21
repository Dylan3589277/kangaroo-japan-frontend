# kangaroo-japan-frontend-cardC · 仓库级变更记录

jp-buy 前端（en/zh 双语站）在此仓的工作分支（cardC），本文件只记「为什么/逻辑/改动」的变更条目，不是完整功能文档。

## 变更记录

### 2026-08-21 zh 站智能客服「转人工」对齐小程序 → 53kf

- **为什么**：zh 网页客服点「转人工」跳站内 `/contact` 页，小程序人工客服是 53kf 托管的微信客服，两边不一致，花哥要求先对齐。
- **逻辑**：`src/components/tcg/TcgChatWidget.tsx` 新增 `KF53_CHAT_URL`（`process.env.NEXT_PUBLIC_KF53_CHAT_URL || "https://tb.53kf.com/code/client/8252b02b9d3316d5208582bc9dd052118/1"`），zh 的 transfer 链接改为新窗口打开 53kf；en 仍走 `/contact` 不变。
- **改动文件**：`src/components/tcg/TcgChatWidget.tsx`（zh transfer 链接改 `<a target="_blank" rel="noopener noreferrer">` 指向 `KF53_CHAT_URL`）、`src/i18n/locales/zh/tcg-chat.json`（`contactCta`「联系人工客服」→「转接人工客服」）。
- **commit**：`d4a951e`，已推 main；ghcr `docker-image` 绿；ECS `docker pull` + `run-frontend.sh` 部署，新镜像 `sha256:6d93e098b650…`。生产 jp-buy.com/zh 实测：转人工链接 href=53kf URL、target=\_blank、文案「转接人工客服」。
- **回滚锚点**：`ghcr.io/dylan3589277/kangaroo-japan-frontend:rollback-20260821`（= 旧镜像 `95376d8c…`，2026-08-17）。
- **后续计划**：网页与小程序一起统一切企业微信客服（花哥原话「先改称53kf，后面一起改为企业微信客服」）。
- **已知小坑**：本地 `/api/support/chat` 404 时 requestError 文案仍写「或在「联系我们」页找到人工客服」，与新链接微不一致，生产正常路径不触发，未改。
