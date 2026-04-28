# 📋 SEO优化方案设计任务

## 项目背景
袋鼠君独立站（kangaroo-japan，jp-buy.com）面向全球市场。

## 目标市场（排除日本）
**中国、美国、欧洲、大洋洲、东南亚、韩国**

**重点补充 —— 东南亚各国独立规划：**

| 优先级 | 国家 | 语言 | 搜索引擎 | 日本商品热度 |
|--------|------|------|---------|-----------|
| P0 | 泰国 🇹🇭 | 泰语 (th) | Google Thailand + LINE | 🔥动漫/化妆品/二手奢侈品 |
| P0 | 印尼 🇮🇩 | 印尼语 (id) | Google Indonesia | 🔥动漫/化妆品/时尚 |
| P1 | 越南 🇻🇳 | 越南语 (vi) | Google Vietnam + Cốc Cốc | 🔥游戏/电器/漫画 |
| P2 | 菲律宾 🇵🇭 | 英文(已覆盖) | Google Philippines | ✅性价比商品 |
| P2 | 马来西亚 🇲🇾 | 英文+中文(已覆盖) | Google Malaysia | ✅多语言 |
| P3 | 新加坡 🇸🇬 | 英文(已覆盖) | Google Singapore | ✅高端商品 |

## 技术方案要求

### 1. 多语言架构
- 是否新增 th / vi / id 作为 next-intl 正式语言？
- 路由结构：继续保持 [lang] 模式（/zh、/en、/ko、/th、/vi、/id）？
- hreflang 配置：全语言覆盖（含国家子代码：th-th、vi-vn、id-id）

### 2. 翻译策略
- 核心页面优先翻译：首页/商品列表/商品详情/关于我们/搜索
- AI自动翻译 + 人工review模式
- 商品数据多语言化：titleJa / titleZh / titleEn → 扩展titleTh/titleVi/titleId

### 3. 搜索引擎特殊适配
- Cốc Cốc（越南特有搜索引擎）：meta tags、结构化数据、sitemap
- LINE搜索（泰国）：LINE专用结构化数据
- Naver（韩国）：Naver Search Advisor + Naver结构化数据

### 4. SEO落地页策略
东南亚各国独立商品分类落地页：
- /th/cosmetics-japanese（日本のコスメ）
- /id/japanese-anime-merch（アニメグッズ）
- /vi/japanese-electronics（日本電機製品）
- /ko/japanese-used-luxury（日本中古ブランド品）

---

**请先阅读 `seo-plan-brief.md` 获取详细补充信息。**
**输出文件：`~/workspace/kangaroo-japan/docs/seo-plan.md`**
