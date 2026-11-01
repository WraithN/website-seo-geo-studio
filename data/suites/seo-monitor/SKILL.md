---
name: seo-monitor
description: Google Search Console 监控、掉量与内容衰退、索引覆盖、时段对比、品牌词 vs 新客、AI 搜索品牌能见度与增长报告的合并技能。覆盖 seo-gsc-overview、seo-gsc-opportunities、seo-gsc-new-keywords、seo-gsc-content-decay、seo-gsc-cannibalization、seo-gsc-drops、seo-gsc-indexing、seo-gsc-compare、seo-gsc-brand-vs-nonbrand、seo-brand-radar、seo-report 十一个原始技能。当你要看 GSC 表现、排查掉量、找机会词、做周/月/审计/竞品报告时，使用本技能。
---

# GSC 监控与复盘（seo-monitor）

全部以 Google Search Console 真实数据为核心（需 GSC MCP 或导出 CSV）。无 GSC 时仅能提供静态替代，按 `references/mcp-degradation.md` 显式告知并停下，不编造数据。

## 0. 通用输入
- `site`：GSC 属性 URL。两种格式：`sc-domain:example.com`（域属性）或 `https://example.com/`（URL 前缀）。用户给裸域名时先 `list_sites` 确认格式。
- GSC 数据有 ~3 天延迟，所有日期窗口据此回算。

## 1. 总览（seo-gsc-overview）
- 近 28 天：总点击、展示、CTR、平均位置 + Top25 查询 + Top25 页面。

## 2. 机会词（seo-gsc-opportunities）
- 高展示低 CTR 词：已排名但标题/内容微调即可快速涨流量的"快赢"，无需新内容。

## 3. 新出现查询（seo-gsc-new-keywords）
- 上期零展示/零点击、本期出现的词，按当前点击排序，揭示新兴内容机会。

## 4. 内容衰退（seo-gsc-content-decay）
- 90 天窗口内**点击与展示同时下降**的页（过滤季节性波动），给衰退严重度评级。

## 5. 关键词自相残杀（seo-gsc-cannibalization）
- 同一查询出现在 ≥2 个页面，识别"赢家页"与"输家页"，建议归并或差异化。

## 6. 掉量/掉词（seo-gsc-drops）
- 近 28 天 vs 前 28 天，按损失排序页面与词；>50% 损失标 CRITICAL。

## 7. 索引覆盖（seo-gsc-indexing）
- 用 URL Inspection（上限 20 条/次防限流）查索引状态、覆盖状态、robots 状态、最后抓取日期；优先查最可能有索引问题的页。

## 8. 时段对比（seo-gsc-compare）
- MoM（默认近 28 vs 前 28）/ YoY / 自定义；按页面与查询给 top movers 与方向指示。

## 9. 品牌 vs 非品牌（seo-gsc-brand-vs-nonbrand）
- **必须先用用户确认品牌词**再调用（工具需 `brandTerms` 数组，不可臆测）。拆分品牌词流量占比，区分真实新客需求。

## 10. AI 搜索品牌能见度（seo-brand-radar）
- 监控品牌在 AI 回答中的可见度、提及趋势、声量份额、被哪些域名引用（Ahrefs Brand Radar，无降级——无 Ahrefs MCP 则明确停下，不估数据）。

## 11. 报告（seo-report）
- 四种：monthly / weekly / audit / competitor，生成完整 AI 分析并落盘为 markdown。需 Ahrefs（全类型）+ 可选 GSC。文件名 `seo-report-YYYY-MM-DD-{domain}-{type}.md`。

## 对接建站工具模块
- **`monitor.py`**：indie_builder 的 GSC 监控引擎。本技能的 11 项检查可直接作为该模块的监控项与告警规则；掉量/衰退/自相残杀结果回流建站工具形成"监控→诊断→修复"闭环。
- 建议把本技能产出的报告落到 `seo-workspace/reports/`，由建站工具定时读取并推送。

## 参考
`references/` 含 gsc-api-reference、ahrefs-api-reference、mcp-degradation。
