---
name: seo-research
description: 关键词研究、SERP 意图分析、竞品格局与单竞品拆解、外链/引用机会挖掘的合并技能。覆盖 keyword-research、keyword-clustering、keywords、seo-serp、competitive-landscape、competitor-analysis、competitors、seo-competitor-pages、link-prospecting 九个原始技能。当你要找关键词机会、判断搜索意图、研究竞争对手、寻找外链或做对比/替代页面时，使用本技能。
---

# SEO 研究与竞品（seo-research）

按"找词 → 聚类 → 看 SERP → 拆竞品 → 挖外链"的顺序工作。可直接运行，也可在 `seo-orchestrator` 路由下被调用。

## 0. 输入
- `projectId`（若用 OpenSEO MCP）/ 站点或产品
- 种子词 / 产品 / 竞品 / 受众问题
- 可选：目标市场·语言、已知竞品、已有页面清单

若无 MCP，用网页搜索 + 公开页面完成，标记"估算"。

## 1. 关键词发现与排序（keyword-research）
- 从种子词扩展，优先用 GSC 真实查询做"临近排名（striking distance，位置 5–20）"机会集。
- 给每个词补：搜索量、难度 KD、意图、CPC、趋势。
- 优先级看"实用机会"而非纯量：匹配产品、意图清晰、难度可控、可竞争 SERP。
- 输出：最佳主题 + Top 词 + 建议保存标签（`topic:`/`intent:`/`page:`）。

## 2. 按意图聚类并映射页面（keyword-clustering）
- 围绕"同一 SERP 意图 + 相似排名页"建簇，不同意图/购买阶段/SERP 形态要拆分（近义词≠同簇）。
- 每簇指定：现有 URL / 新建页 / 暂缓。
- 用 `query,page` 维度查 GSC 识别自相残杀（同词多页分流点击）。
- 输出表：`簇 | 主词 | 副词 | 意图 | 目标页 | 优先级 | 备注`。

## 3. SERP 意图与竞争（seo-serp）
- 分析目标词的排名页：DR/流量估算、内容角度、页面类型（商业/信息/对比/工具）。
- 判断用户意图与"用户能否竞争"。模糊意图时只看 Top 3–5 个 SERP。

## 4. 市场格局（competitive-landscape）
- 识别市场中谁在赢得流量：直接竞品、媒体、市场/目录、社区、文档。
- 用排名域名重叠找出反复出现的赢家，看其内容主题与反向链接模式，定位空白。
- 本地市场加查 Maps/商家问答。

## 5. 单竞品深度拆解（competitor-analysis）
- 对指定域名：概览流量与词数 → 排名词与 URL/位置/意图 → 外链概览 → 主题分组。
- 产出：值得学/规避/反定位/超越的具体动作。

## 6. 三表面竞品情报（competitors）
- 社交（TikTok/IG/LinkedIn 关注、频率、主题、互动）+ 网页（定价/功能/案例/博客/落地页分级）+ SEO（排名词、SERP 特性：精选摘要/AI 概览/PAA）。
- 聚焦"最近在动的变化"与可本周利用的空白、定位角度。

## 7. 竞品引流页与对比页（seo-competitor-pages）
- 找出竞品真正获流的页面类型，据此产出：X vs Y 对比页、alternatives 页、best [类] 工具盘点页、对比表页。
- 数据须可核验、定价标"截至[日期]"；附 Product + AggregateRating 等结构化数据建议。

## 8. 外链/引用机会（link-prospecting）
- 从资产/主题构造查询：`<主题> resources`、`best <类> tools`、`<竞品> alternatives`、`<主题> statistics/guide/examples/templates`。
- 从 SERP 找资源页/盘点/对比/出版商；用网页搜索或浏览器抓取找作者署名页、联系页、社媒资料、公开邮箱、Person/Organization 结构化数据。**只记录真实找到的联系方式并标注来源。**

## 短视频搜索词（keywords）
- 若目标含 TikTok/IG：按意图分布产词（信息 50% / 商业 25% / 交易 15% / 导航 10%）， concrete evergreen，无 # 标签。先判断该渠道是否值得（见 `seo-social-search`）。

## 对接建站工具模块
- **`research.py`**：indie_builder 的关键词调研引擎已能自动化产出关键词机会、六维雷达与长尾词建议。运行于该引擎时优先用其出数；本技能提供方法论、意图判断与竞品维度补充。
- **`backlink.py`**：`link-prospecting` 的外链机会清单可直接作为外链模块的输入。
- 产物建议落到 `seo-workspace/keywords/`、`competitors/`、`outreach/` 供后续模块复用。

## 参考
`references/` 下含 OpenSEO/Ahrefs/GSC MCP 说明与降级策略（`mcp-degradation.md`）。无 MCP 时全部以网页搜索+公开页面执行，不编造数据。
