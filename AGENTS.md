<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# 花哥团队 AI 编码纪律

## 项目边界

本项目是 kangaroo-japan 前端：日本进货卖全球（不含日本）的代拍独立站前端。后端在 `~/workspace/kangaroo-japan-backend/`。不要混用 `kangaroo-shop` 的跨境电商业务。

## 执行前必读

1. `AGENTS.md`
2. `CONTEXT.md`
3. `STATE.md`（如存在）
4. 相关 README 或框架文档
5. Next.js 相关改动必须遵守上方 Next.js 版本提醒，必要时读 `node_modules/next/dist/docs/`

## AI 编码纪律

1. 新功能必须先澄清需求，形成 Agent Brief，再实现。
2. Bug 修复必须先复现和建立反馈环，不准直接猜改。
3. 涉及支付、订单、库存、积分、权限、安全时，优先使用 TDD（测试驱动开发）。
4. 重大技术取舍写入 `docs/adr/`，不要只留在聊天里。
5. 多 agent 交接必须写 handoff 摘要。
6. 不要修改生产配置、数据库、支付、客户资料或对外发布内容，除非花哥明确批准。

## 推荐流程

1. 需求澄清：确认目标行为、用户可见结果、不做什么。
2. 任务拆分：按端到端垂直切片拆，不按前端/后端/数据库横切。
3. 编码执行：最小改动，优先可验证。
4. 验证：运行相关测试、脚本或冒烟检查。
5. 交接：记录改动、验证结果、剩余风险和下一步。
