# 技术 SEO 审计

- 技能套件：技术 SEO / ASO
- 任务：audit
- 生成时间：2026/10/30 23:51:34
- 数据来源：**真实采集**（page-fetch）

## 采集证据
> 本次执行真实采集到的原始数据，产结论时以此为事实依据。

- 采集来源：page-fetch
- 页面抓取事实：
  - url: https://www.baidu.com
  - https: true
  - title: 百度一下，你就知道
  - titleLen: 9
  - metaDesc: 全球领先的中文搜索引擎、致力于让网民更便捷地获取信息，找到所求。百度超过千亿的中文网页数据库，可以瞬间找到相关的搜索结果。
  - metaDescLen: 61
  - canonical: (缺失)
  - robotsMeta: (无)
  - viewport: (缺失)
  - lang: (缺失)
  - h1Count: 0
  - h2Count: 0
  - imgCount: 18
  - imgsMissingAlt: 15
  - jsonLdCount: 0
  - hasLlmsTxt: false
  - hasSitemapHint: false
  - textLen: 649268

## facts
> 从真实 HTML 提取到的事实（原样回填，字段名与输入一致）

- url: https://www.baidu.com
- https: true
- title: 百度一下，你就知道
- titleLen: 9
- metaDesc: 全球领先的中文搜索引擎、致力于让网民更便捷地获取信息，找到所求。百度超过千亿的中文网页数据库，可以瞬间找到相关的搜索结果。
- metaDescLen: 61
- canonical: (缺失)
- robotsMeta: (无)
- viewport: (缺失)
- lang: (缺失)
- h1: []
- h1Count: 0
- h2Count: 0
- imgCount: 18
- imgsMissingAlt: 15
- jsonLdCount: 0
- hasLlmsTxt: false
- hasSitemapHint: false
- textLen: 649268

## findings
> 问题数组，每项 {severity(严重/中/低), area, issue, evidence, fix, effort}

- - severity: 严重
  - area: 移动端/索引
  - issue: 缺少 viewport meta 标签，移动端无法按设备宽度渲染，直接影响移动优先索引下的页面体验
  - evidence: facts.viewport = "(缺失)"；Google 自 2024-07-05 起 100% 使用移动 Googlebot 抓取与索引
  - fix: 在 <head> 首部加入 <meta name="viewport" content="width=device-width, initial-scale=1">，并回归测试首页在 320–414px 宽度下的布局与输入框可用性
  - effort: 0.5 小时
- - severity: 严重
  - area: 结构化数据
  - issue: 全站首页无任何 JSON-LD 结构化数据，无法获得 Organization / WebSite（含 SearchAction 站内搜索框）等富结果与实体信号
  - evidence: facts.jsonLdCount = 0
  - fix: 在首页服务端 HTML 中注入 JSON-LD：1) WebSite + potentialAction(SearchAction，target 指向 /s?wd={search_term_string})；2) Organization（name、url、logo、sameAs 指向官方社媒/百科）；3) 可选 WebPage。用 Rich Results Test 与 Schema.org Validator 双校验
  - effort: 2 小时
- - severity: 中
  - area: 索引
  - issue: 缺少 canonical 标签，首页存在多入口（http/https、带参、m./www. 等）时易产生重复与信号分散
  - evidence: facts.canonical = "(缺失)"
  - fix: 在 <head> 加入 <link rel="canonical" href="https://www.baidu.com/">，并确保与 hreflang、sitemap 中的 URL 完全一致（协议、大小写、尾斜杠统一）
  - effort: 0.5 小时
- - severity: 中
  - area: 页面结构
  - issue: 页面无 H1 且无任何 H2，标题层级完全缺失，主内容语义无法被机器识别
  - evidence: facts.h1Count = 0，facts.h2Count = 0，facts.h1 = []
  - fix: 为首页主内容区增加唯一 H1（如“百度搜索”或品牌主张），并为功能区块补充 H2；注意 Google 明确标题数量非排名因子，此项按可访问性与语义最佳实践处理，不夸大优先级
  - effort: 1 小时
- - severity: 中
  - area: 图片
  - issue: 18 张图片中 15 张缺少 alt 属性（缺失率 83%），图片语义与可访问性受损
  - evidence: facts.imgCount = 18，facts.imgsMissingAlt = 15
  - fix: 为内容性图片补写 10–125 字描述性 alt；纯装饰图标使用 alt="" 并配合 aria-hidden="true"；同时为图片设置 width/height 防 CLS，优先 WebP/AVIF 并加 loading="lazy"（首屏 logo 除外）
  - effort: 2 小时
- - severity: 中
  - area: 国际化
  - issue: html 标签缺少 lang 属性，语言声明缺失影响可访问性与多语言信号
  - evidence: facts.lang = "(缺失)"
  - fix: 将根元素改为 <html lang="zh-CN">（如存在多语言版本，配合 hreflang 自引用与 x-default）
  - effort: 0.2 小时
- - severity: 低
  - area: 抓取
  - issue: 未检测到 sitemap 引用提示，且无 llms.txt；抓取入口的机器可读性不完整
  - evidence: facts.hasSitemapHint = false，facts.hasLlmsTxt = false
  - fix: 确认 /robots.txt 存在并包含 Sitemap: 绝对地址；生成 XML Sitemap（≤5 万 URL/文件，均 200、lastmod 真实、无 noindex/重定向 URL）。llms.txt 属实验性约定，可作为可选项，非排名因子
  - effort: 1 小时
- - severity: 低
  - area: 内容
  - issue: title 仅 9 字符，未覆盖核心搜索意图词，且与 meta description（61 字符）均偏短，摘要信息量有限
  - evidence: facts.titleLen = 9，facts.metaDescLen = 61
  - fix: title 扩展至 50–60 字符并前置核心词（如“百度搜索 - 中文搜索引擎，瞬间找到相关结果”）；meta description 扩至 150–160 字符，突出差异化价值并保持每页唯一
  - effort: 0.5 小时
- - severity: 低
  - area: 性能
  - issue: Core Web Vitals 真实字段数据无法从 HTML 判定，需实测
  - evidence: 输入事实中不含 LCP/INP/CLS 数据；facts.textLen = 649268 提示 DOM/文本体量较大，可能影响 INP 与渲染
  - fix: 用 CrUX API 或 PageSpeed Insights 取 75 分位字段数据（LCP≤2.5s / INP≤200ms / CLS≤0.1），并用 Lighthouse 做实验室诊断；重点排查长任务（>50ms）、DOM 节点数（>1500 需关注）与首屏资源阻塞
  - effort: 2 小时（需实测）
- - severity: 低
  - area: 索引
  - issue: robotsMeta 为空属正常，但需确认服务端未通过 X-Robots-Tag 误加 noindex
  - evidence: facts.robotsMeta = "(无)"；HTML 层无法看到 HTTP 响应头
  - fix: 用 curl -I 检查响应头中是否存在 X-Robots-Tag: noindex，并核对 robots.txt 未屏蔽 /s 等关键路径
  - effort: 0.5 小时

## scorecard
> 分项评分对象 {indexing, performance, structuredData, mobile, content}（0-100）

- indexing: 72
- performance: 60
- structuredData: 20
- mobile: 45
- content: 65

## quickWins
> 可立即修复的快赢项数组

- 添加 <meta name="viewport" content="width=device-width, initial-scale=1">
- 添加 <link rel="canonical" href="https://www.baidu.com/">
- 根元素补 lang="zh-CN"
- 为 15 张缺 alt 的图片补写描述或置空装饰图 alt
- 首页注入 WebSite(SearchAction) + Organization 两段 JSON-LD
- 确认 robots.txt 内含 Sitemap 绝对地址

## structuredDataPlan
> 建议补充的结构化数据类型与理由

- - type: WebSite
  - reason: 站点级实体声明，配合 potentialAction(SearchAction) 可争取站内搜索框富结果，是搜索引擎首页最高性价比的结构化数据
  - priority: 高
- - type: Organization
  - reason: 建立品牌实体与 logo、sameAs 关联，强化知识面板与实体消歧，当前 jsonLdCount=0 完全缺失
  - priority: 高
- - type: WebPage
  - reason: 页面级基础声明（name、description、dateModified、inLanguage=zh-CN），与 WebSite 形成层级
  - priority: 中
- - type: BreadcrumbList
  - reason: 若首页之外存在频道/结果页层级，可输出面包屑富结果；首页本身可省略
  - priority: 低
- - type: SearchAction（作为 WebSite.potentialAction 内嵌）
  - reason: 声明站内搜索 URL 模板，是获取 sitelinks search box 的前置条件
  - priority: 高
- - type: 不推荐：HowTo / FAQPage / SpecialAnnouncement
  - reason: HowTo 富结果已于 2023-09 移除；FAQPage 仅限政府/医疗权威站点；SpecialAnnouncement 已于 2025-07-31 弃用，均不应添加
  - priority: 不适用

## 其他输出

### __missing


### __fieldCompliance
100%
