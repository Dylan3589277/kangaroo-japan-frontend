# ADR · 架构决策记录

ADR 是 Architecture Decision Record，中文意思是“架构决策记录”。

## 什么时候写 ADR

只有同时满足以下条件才写：

1. 决策较难逆转。
2. 没上下文时，未来 AI 或开发者容易误判。
3. 存在明确取舍。

## 文件命名

使用：`0001-short-slug.md`

示例：

`0001-use-daishujundulizhan-for-kangaroo-japan.md`

## 模板

# 标题

状态：提议 / 已接受 / 已废弃
日期：YYYY-MM-DD

## 背景

为什么需要这个决策。

## 决策

最终选择是什么。

## 后果

带来的好处、成本和风险。

## 替代方案

考虑过但没有选择的方案。

## 项目边界提醒

这是 kangaroo-japan 前端，不是 kangaroo-shop。对应后端路径是 ~/workspace/kangaroo-japan-backend/，数据库是 Vercel Storage 的 daishujundulizhan 库。
