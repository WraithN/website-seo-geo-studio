---
name: seo-content-geo
description: 内容质量、E-E-A-T、人本位内容门、AI 痕迹检测、Google AI 搜索就绪、GEO（AI Overviews/ChatGPT/Perplexity 可见性）、llms.txt、AI 爬虫 robots、Markdown 预检与单页综合优化的合并技能。覆盖 seo-content、seo-content-brief、seo-eeat-audit、seo-helpful-content、seo-ai-content-check、seo-ai-optimization、seo-geo、seo-llms-txt、seo-robots-ai、seo-markdown-audit、seo-page 十一个原始技能。当你要审计内容、做内容简报、提升 AI 搜索引用、优化单页时，使用本技能。
---

# 内容质量与 GEO（seo-content-geo）

覆盖"写前简报 → 写中质量门 → 写后 E-E-A-T/AI 就绪 → 单页优化 → AI 爬虫与 llms.txt"。

## 0. 输入
- URL（页面级）或域名（站级），或本地草稿（md/html）
- 可选：关键词、本地内容草稿、GSC 站点以叠加真实排名数据

## 1. 内容简报（seo-content-brief）
- 基于 SERP 与（可选）GSC 真实位置，产出可复制给写手的结构化 brief：目标词、意图、必备小标题、竞品角度、E-E-A-T 要求、长度建议、内部链接建议。

## 2. 内容质量与 E-E-A-T（seo-content + seo-eeat-audit）
- **E-E-A-T**（Google 质量指南，Trust 最重要）：经验（一手数据/案例/原创图）、专业（作者资质/署名）、权威（外链引用/行业认可）、可信（联系信息/隐私政策/评价/HTTPS）。
- 评分 0–5 每维，给证据引文；先修最低分维（Trust 优先）。YMYL 主题提高标准。
- 对比页面类型最低字数；标记薄弱内容。

## 3. 人本位内容门（seo-helpful-content）
- 走 Google 官方自评问题（内容质量/专业/人本位/搜索引擎优先警示/垃圾政策）。结论：PUBLISH / REVISE / RETHINK，附优先级修订清单。AI 辅助内容额外套用 AI 规则。

## 4. AI 痕迹检测（seo-ai-content-check，纯本地文本分析）
- 六检查：句长均匀度、词汇多样性(TTR)、重复短语（"In conclusion"/"Leverage"/"Game-changer"…）、缓冲语、段落均匀度、一手经验信号。输出 0–100 AI 置信度 + 标记段落。无外部 API。

## 5. Google AI 搜索就绪（seo-ai-optimization）
- **关键事实（Google 官方）**：无需特殊标记即可进 AI Overviews/AI Mode；资格 = 已索引 + 可摘要；"AEO/GEO = SEO"；`nosnippet`/`max-snippet`/`noindex` 控制摘要；Google-Extended 控训练不控搜索；AI 点击在 GSC "Web" 类型内。
- 门禁：可索引 + 可摘要。再逐项查结构化数据、片段控制、AI 爬虫可达。

## 6. GEO / 多引擎 AI 可见性（seo-geo）
- 品牌提及 > 外链（Ahrefs 研究：YouTube/Reddit/Wikipedia 提及相关性强，Domain Rating 弱）。
- 可引用性（25%）：134–167 词自包含答案块、前 40–60 词直接作答、具体可溯源事实、"X 是…"定义式。
- 平台特异性：ChatGPT / Perplexity / Bing Copilot 各自优化；仅 11% 域名被两者同时引用。
- 检查 AI 爬虫可达、llms.txt 合规、段落级可引用评分。

## 7. llms.txt（seo-llms-txt）
- 审计/生成/校验 `/llms.txt`（Markdown 站点索引，H1 + 引言 + 文件/章节链接）。Lighthouse 已含 Agentic Browsing 审计。生成时爬结构产出 spec 合规文件。

## 8. AI 爬虫 robots（seo-robots-ai）
- 区分**训练爬虫**（GPTBot/ClaudeBot/Google-Extended/CCBot/Bytespider… 尊重 robots.txt）与**用户触发/搜索爬虫**（OAI-SearchBot/PerplexityBot/anthropic-ai… 阻断会失去 AI 搜索可见性）。按 `references/ai-crawlers-guide.md` 给策略。关键：阻断训练 ≠ 阻断 AI 搜索引用。

## 9. Markdown 预检（seo-markdown-audit）
- 发布前检查：H1 唯一、meta description(150–160)、标题层级、关键词出现于首 100 词与 H2、字数门槛、可读性、链接质量、图片 alt、frontmatter 完整。**不计算关键词密度百分比。**

## 10. 单页综合优化（seo-page）
- 页面元素（title 50–60 / meta 150–160 / H1 唯一 / URL / 内链 / 外链）+ 内容质量 + 技术元标签 + 结构化数据 + 图片(alt/尺寸/WebP-AVIF/尺寸防 CLS/懒加载) + CWV 潜在问题。**绝不推荐 HowTo（已弃用）或 FAQ（仅政府/医疗）。**

## 对接建站工具模块
- **`content_gen.py`**：indie_builder 的内容生成引擎。本技能的方法论（E-E-A-T 清单、GEO 可引用性、内容简报结构）应作为内容生成的质检门与 brief 模板；产出的内容 brief 直接喂给生成模块。
- 产品落地：对 `indie-site-builder` 生成的站点页面，用本技能做发布前 SEO/GEO 门禁。
- 产物落到 `seo-workspace/content/`。

## 参考
`references/` 含 eeat-framework、google-seo-guide、llms-txt-spec、ai-crawlers-guide、quality-gates、schema-types、markdown-guide、mcp-degradation 等。

## 11. 内容生产流水线（content-pipeline 任务）
四阶段：① 生成 blog 规划（支柱页/集群/编辑日历/页面清单）→ ② 内容生产（带**论文与权威博客引用**的成稿，需人工补的用 `[待人工补充：…]` 标识）→ ③ 去AI味（改写为自然、有细节与人称声音）→ ④ EEAT 验证（经验/专业/权威/可信四维评分与缺口）。
- 引用规范与待补充标识见 `references/citation-guide.md`。
- 去AI味手法见 `references/de-ai-humanize.md`。
- EEAT 评分细则见 `references/eeat-framework.md`。
- 上游可接第3步 SEO/GEO 架构规划的 pageMap，直接复用其关键词→页面结构（落实哥飞「一个关键词一个页面」）。
- 博客规划产出：pillarPages（支柱页/枢纽）、clusterPosts（集群文章，每篇一个长尾词）、editorialCalendar（发布顺序与节奏）、pageList（全部页面及 URL 建议）。
