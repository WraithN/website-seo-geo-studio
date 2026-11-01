---
name: seo-technical
description: 技术 SEO 审计、全站与多 MCP 综合诊断、Lighthouse、Core Web Vitals、页体验、结构化数据、富媒体、Sitemap、hreflang、图片、内链、迁移校验、日志分析、本地 SEO、程序化页面的合并技能。覆盖 seo-technical、seo-audit、seo-site-audit-pro、seo-lighthouse-audit、seo-core-web-vitals、seo-page-experience、seo-schema、seo-rich-results、seo-sitemap、seo-hreflang、seo-images、seo-internal-links、seo-migration-check、seo-log-analysis、seo-local、seo-programmatic 十六个原始技能。当你要查技术 SEO、做全站审计、修性能、加结构化数据、迁移保流、做本地或规模化页面时，使用本技能。
---

# 技术 SEO 与审计（seo-technical）

按"抓取/索引 → 性能 → 结构化数据 → 页面资产 → 迁移/日志 → 本地/规模化"组织。

## 0. 输入
- 域名或 URL（站级/页级）；可选本地日志文件、URL 映射 CSV、GSC 站点（叠加索引状态）

## 1. 抓取与索引（seo-technical 核心）
- robots.txt 有效性、XML Sitemap 存在且被引用、noindex 是否误用、点击深度（重要页 ≤3 跳）、JS 渲染是否阻断关键内容、抓取预算（>1 万页需关注）。
- **AI 爬虫管理**：在 robots.txt 区分训练爬虫（GPTBot/Google-Extended/CCBot…）与搜索/用户触发爬虫（OAI-SearchBot/PerplexityBot/anthropic-ai…）。阻断 Google-Extended 不影响 Google 搜索/AI Overviews（那用 Googlebot）。

## 2. 全站审计（seo-audit / seo-site-audit-pro）
- 静态审计：爬 ≤500 页，委派技术/内容/结构化数据/Sitemap/性能/视觉/AI 就绪子检查，输出 SEO 健康分(0–100) 与优先级行动。
- 多 MCP 版（site-audit-pro）：Ahrefs + GSC 三波次顺序执行（域权威/外链 → 词与竞争 → 内容与技术），每波可独立中断，始终完成。

## 3. 性能（seo-lighthouse-audit / seo-core-web-vitals / seo-page-experience）
- Lighthouse：CLI 优先，退化用 PageSpeed Insights API；四类分数(性能/可访问性/最佳实践/SEO)；PWA 类已在 v12 移除；Lighthouse 是实验室数据，需用 CrUX 字段数据(75 分位)校验；新增 Agentic Browsing 信息性审计。
- CWV 阈值(p75)：LCP ≤2.5s / INP ≤200ms / CLS ≤0.1；INP 已于 2024-03 取代 FID，勿再提 FID。抓字段数据用 CrUX API，不足则退化 PSI/origin 级。
- 页体验自评：HTTPS 单跳、移动端可用、避免侵入式插页、广告密度、主内容可辨识。

## 4. 结构化数据（seo-schema / seo-rich-results）
- 检测 JSON-LD（首选）/Microdata/RDFa；校验必备属性；标记过期类型：**绝不推荐 HowTo（2023-09 弃用）、FAQ（仅政府/医疗）、SpecialAnnouncement（2025-07 弃用）**。
- 富媒体资格：按页面原型（文章/产品/活动/食谱/招聘/本地/论坛）判定可赚取的富结果类型并给缺口报告。
- JS 注入的结构化数据可能延迟处理，时效标记（Product/Offer）放首屏服务端 HTML。

## 5. Sitemap / hreflang / 图片 / 内链
- Sitemap：≤5 万 URL/文件、均 200、lastmod 真实、无 noindex/重定向 URL、robots.txt 引用；>5 万用索引文件。
- hreflang：自引用、双向返回、x-default、ISO 639-1 + 3166-1 代码、与 canonical 对齐、协议一致。
- 图片：alt(10–125 字)、尺寸分级(缩略<50KB/内容<100KB/头图<200KB)、WebP/AVIF、`<picture>` 回退、设宽高防 CLS、`loading=lazy`。
- 内链：爬取建图，找孤儿页、弱链页(<3 入链)、断链，给 Top5 弱链页锚文本建议。

## 6. 迁移与日志（seo-migration-check / seo-log-analysis）
- 迁移：重定向链(301 优先、跳数≤1)、canonical 一致、title/meta 保留、HTTP 状态、内容相似度、schema 保留；支持单对或 CSV 批量（>50 对截断前 50）。
- 日志：本地 Apache/Nginx 访问日志，分类 bot vs 用户（Googlebot/Bingbot/AI 爬虫 GPTBot/ClaudeBot/PerplexityBot…），算总请求、Top 抓取 URL、抓取频率、抓取预算问题。

## 7. 本地 SEO（seo-local）
- NAP 一致性、LocalBusiness 结构化数据（name/address/telephone/geo/openingHours）、Google Business Profile 信号、本地内容、引用、评价、移动端。无需 MCP，用 WebFetch。

## 8. 程序化页面（seo-programmatic）
- 数据源评估（CSV/JSON/API/DB 唯一性、时效性）、模板引擎（变量注入/静态-动态块/条件逻辑/补充内容，禁"疯狂填词"）、URL 模式（/tools/[x]、/[city]/[service]… 小写连字符 ≤100 字符）、内链自动化（hub/spoke）。设质量门防薄内容与索引膨胀：30+ 地点页警告、50+ 硬停。

## 对接建站工具模块
- **`techseo.py`**：indie_builder 的技术 SEO 引擎。本技能的审计清单、CWV 阈值、schema 规则、迁移校验可直接作为该模块的检查项实现；全站审计输出可作为技术债务清单回填建站工具。
- 产品落地：对 `indie-site-builder` 产出的站点做发布前技术门禁（robots/sitemap/schema/CWV/图片）。
- 产物落到 `seo-workspace/reports/`、`techseo/`。

## 参考
`references/` 含 google-seo-guide、cwv-thresholds、schema-types、eeat-framework、quality-gates、ai-crawlers-guide、mcp-degradation 等。
