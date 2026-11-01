# 技术 SEO 审计

- 技能套件：技术 SEO / ASO
- 任务：audit
- 生成时间：2026/10/30 23:46:47
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
  - imgCount: 19
  - imgsMissingAlt: 16
  - jsonLdCount: 0
  - hasLlmsTxt: false
  - hasSitemapHint: false
  - textLen: 654505

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
- imgCount: 19
- imgsMissingAlt: 16
- jsonLdCount: 0
- hasLlmsTxt: false
- hasSitemapHint: false
- textLen: 654505

## findings
> 问题数组，每项 {severity(严重/中/低), area, issue, evidence, fix, effort}

- - severity: 严重
  - area: 移动端
  - issue: 页面缺少 viewport meta 标签，移动端无法按设备宽度渲染，直接影响移动优先索引下的体验与可读性
  - evidence: facts.viewport = "(缺失)"；facts.https = true 但无 viewport 声明
  - fix: 在 <head> 首部加入 <meta name="viewport" content="width=device-width, initial-scale=1">，并回归测试移动端首屏布局与输入框可用性
  - effort: 0.5 小时
- - severity: 严重
  - area: 索引
  - issue: 首页缺少 canonical 标签，无法向搜索引擎声明规范 URL，易产生参数化/多入口重复收录
  - evidence: facts.canonical = "(缺失)"
  - fix: 在 <head> 添加 <link rel="canonical" href="https://www.baidu.com/">，并确保与 hreflang、sitemap 中的 URL 完全一致（含协议与尾斜杠）
  - effort: 0.5 小时
- - severity: 严重
  - area: 内容
  - issue: 页面无任何 H1，且 H2 数量为 0，标题层级完全缺失，搜索引擎与辅助技术难以识别页面主题结构
  - evidence: facts.h1 = []，facts.h1Count = 0，facts.h2Count = 0，而 facts.textLen = 654505（正文体量巨大却无标题结构）
  - fix: 为搜索框主区域设置唯一 H1（如“百度搜索”），并为下方频道/服务区块补充 H2/H3 层级；避免用 div+CSS 模拟标题
  - effort: 1 天
- - severity: 中
  - area: 结构化数据
  - issue: 全站无 JSON-LD 结构化数据，未声明 WebSite/Organization/SearchAction，放弃站点级富结果与 AI 搜索可见性增益
  - evidence: facts.jsonLdCount = 0
  - fix: 在首页 <head> 注入 JSON-LD：WebSite（含 potentialAction SearchAction 指向 https://www.baidu.com/s?wd={search_term_string}）+ Organization（name/url/logo/sameAs）；用富结果测试工具校验
  - effort: 0.5 天
- - severity: 中
  - area: 页面资产
  - issue: 19 张图片中 16 张缺少 alt 属性，图片语义缺失，影响图片搜索收录与无障碍访问
  - evidence: facts.imgCount = 19，facts.imgsMissingAlt = 16（缺失率约 84%）
  - fix: 为 16 张图片补充描述性 alt（10–125 字，装饰性图片用 alt=""），并同步设置 width/height 防 CLS
  - effort: 0.5 天
- - severity: 中
  - area: 索引
  - issue: 未检测到 sitemap 引用提示，且页面无 llms.txt，抓取发现路径与 AI 爬虫指引不完整
  - evidence: facts.hasSitemapHint = false，facts.hasLlmsTxt = false
  - fix: 生成 XML Sitemap（≤5 万 URL/文件）并在 robots.txt 中以 Sitemap: 行声明；如需管理 AI 爬虫，在 robots.txt 区分 GPTBot/Google-Extended 与 OAI-SearchBot/PerplexityBot，并评估是否提供 llms.txt
  - effort: 1 天
- - severity: 中
  - area: 索引
  - issue: html 标签缺少 lang 属性，语言声明缺失，影响语言定向与屏幕阅读器发音
  - evidence: facts.lang = "(缺失)"
  - fix: 将根元素改为 <html lang="zh-CN">（如有多语言版本同步配置 hreflang 与 x-default）
  - effort: 0.2 小时
- - severity: 低
  - area: 内容
  - issue: title 仅 9 个字符，信息量偏低，未覆盖核心服务关键词，搜索结果点击吸引力有限
  - evidence: facts.title = "百度一下，你就知道"，facts.titleLen = 9
  - fix: 在保留品牌口号的前提下扩展至 50–60 字符，如“百度一下，你就知道 - 中文搜索引擎、网页/图片/视频搜索”，并保持每页唯一
  - effort: 0.5 小时
- - severity: 低
  - area: 内容
  - issue: meta description 仅 61 字符，低于 150–160 字符建议区间，摘要信息利用不充分
  - evidence: facts.metaDescLen = 61
  - fix: 扩写至 150–160 字符，突出搜索、百科、地图等核心能力，保持与页面内容一致
  - effort: 0.5 小时
- - severity: 低
  - area: 性能
  - issue: 真实 Core Web Vitals 字段数据无法从 HTML 判定，需实测
  - evidence: facts 中无 LCP/INP/CLS 数据；textLen = 654505 提示 DOM/文本体量大，存在 INP 与 DOM 规模风险（估算，需实测）
  - fix: 用 CrUX API 或 PageSpeed Insights 取 75 分位字段数据（LCP≤2.5s / INP≤200ms / CLS≤0.1）；若 DOM >1500 节点，拆分长任务至 <50ms
  - effort: 1 天（含实测与优化）

## scorecard
> 分项评分对象 {indexing, performance, structuredData, mobile, content}（0-100）

- indexing: 55
- performance: 60
- structuredData: 20
- mobile: 35
- content: 50

## quickWins
> 可立即修复的快赢项数组

- 添加 <meta name="viewport" content="width=device-width, initial-scale=1">
- 添加 <link rel="canonical" href="https://www.baidu.com/">
- 根元素补 lang="zh-CN"
- 为 16 张缺 alt 的图片补 alt（装饰图用空 alt）
- 首页注入 WebSite + SearchAction + Organization 的 JSON-LD
- title 扩展至 50–60 字符、meta description 扩至 150–160 字符

## structuredDataPlan
> 建议补充的结构化数据类型与理由

- - type: WebSite
  - reason: 站点级基础标记，配合 potentialAction SearchAction 可争取站内搜索框富结果，并帮助 AI 搜索识别站点实体
  - priority: 高
- - type: Organization
  - reason: 声明品牌实体（name/url/logo/sameAs），强化知识面板与 E-E-A-T 信号，是首页必备
  - priority: 高
- - type: WebPage
  - reason: 为首页声明 name/description/dateModified，与 canonical 对齐，明确页面级语义
  - priority: 中
- - type: BreadcrumbList
  - reason: 若存在频道/子站路径，提供面包屑结构化数据以改善搜索结果中的路径展示
  - priority: 中
- - type: SiteNavigationElement
  - reason: 标注顶部频道导航（新闻/地图/视频等），辅助搜索引擎理解站点信息架构
  - priority: 低

## 其他输出

### __missing


### __fieldCompliance
100%
