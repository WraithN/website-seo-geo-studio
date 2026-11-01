# 技术 SEO 清单与审计

- 技能套件：技术 SEO 与合规
- 任务：audit
- 生成时间：2026/11/1 07:48:01
- 数据来源：无真实采集，结论为估算

## facts
> 从真实 HTML 提取到的事实（原样回填，字段名与输入一致）

未上线，无抓取事实

## findings
> 问题数组，每项 {severity(严重/中/低), area, issue, evidence, fix, effort}

- - severity: 严重
  - area: 抓取与索引 / title 与 meta
  - issue: 每页 title 与 meta description 的规则未定义，上线后易出现重复或缺失
  - evidence: 站点未上线，无抓取事实；上游 pageMap 共 12 个页面（1 个枢纽首页 + 11 个长页/落地页），均需独立 title/meta
  - fix: 建立模板：title 50–60 字符，格式『主关键词 + 价值点 | MandarinName』，每页唯一；meta description 150–160 字符，含主关键词与行动号召，每页唯一。首页 title 用『Chinese Name Generator — Get Your Chinese Name & Meaning』；工具页突出『Generate/Translate』，信息页突出『Guide/List』。禁止模板化堆词，禁止同一 description 复用到多页。
  - effort: 0.5 人日（模板 + 12 页文案）
- - severity: 严重
  - area: 抓取与索引 / canonical
  - issue: canonical 策略未定义，工具页带参数（如 ?gender=boy&style=poetic）易产生重复内容
  - evidence: pageMap 含 4 个转化落地页（/、/english-to-chinese-name、/chinese-business-name-generator、/chinese-name-generator-for-characters），生成器结果页天然带查询参数
  - fix: 所有页面输出自引用绝对 canonical（https 协议、无尾斜杠或统一带尾斜杠，全站一致）；生成器结果参数页统一 canonical 到无参工具页；分页（如姓氏列表分页）用 rel=prev/next 或 canonical 指向自身并确保可索引；canonical 与 hreflang（若做多语言）对齐。检查方法：curl 抓 HTML 看 <link rel="canonical">，Screaming Frog 批量比对 canonical 与最终 URL 一致性。
  - effort: 0.5 人日
- - severity: 严重
  - area: 抓取与索引 / robots.txt 与 sitemap.xml
  - issue: robots.txt 与 sitemap.xml 未部署，且未区分训练型与搜索型 AI 爬虫
  - evidence: 站点未上线；需在根目录提供 /robots.txt 与 /sitemap.xml 并在 robots.txt 中声明 Sitemap
  - fix: 部署本回复给出的 robotsTxt 与 sitemapXml；robots.txt 放行 Googlebot/Bingbot 及搜索型 AI 爬虫（OAI-SearchBot、PerplexityBot、Claude-SearchBot），对训练型爬虫（GPTBot、Google-Extended、CCBot、ClaudeBot）按合规策略选择放行或阻断（阻断 Google-Extended 不影响 Google 搜索与 AI Overviews）；屏蔽 /api/、/search?、/*?* 结果参数。sitemap.xml ≤5 万 URL、全部 200、lastmod 真实、不含 noindex/重定向 URL。检查方法：GSC 提交 sitemap、robots.txt 测试工具、curl -I 校验状态码。
  - effort: 0.5 人日
- - severity: 严重
  - area: 结构化数据
  - issue: 结构化数据方案未落地，工具站与信息页缺少可赚取的富结果类型
  - evidence: pageMap 页面原型为工具落地页与 SEO 长页；当前无任何 JSON-LD
  - fix: 全站输出 WebSite（含 SearchAction）+ Organization（name/url/logo/sameAs）；首页与工具页输出 WebApplication（name、applicationCategory=UtilitiesApplication、offers、browserRequirements、featureList）；信息长页输出 Article/BlogPosting（headline、author、datePublished、dateModified、image、publisher）+ BreadcrumbList；作者页/团队输出 Person + ProfilePage 强化 E-E-A-T。全部用 JSON-LD，@context 为 https://schema.org，URL 绝对、日期 ISO 8601。禁止 HowTo（2023-09 弃用）、FAQPage（仅政府/医疗可用）、SpecialAnnouncement（2025-07 弃用）。检查方法：Rich Results Test + Schema.org Validator。
  - effort: 1 人日
- - severity: 中
  - area: 图片与媒体
  - issue: 图片 alt、尺寸、格式与懒加载规则未定义，易造成 CLS 与可访问性问题
  - evidence: 站点未上线；工具站通常含示例名字卡片、国旗/书法配图
  - fix: 所有 <img> 必须有描述性 alt（10–125 字符，自然含关键词，装饰图 alt=""）；显式设置 width/height 防 CLS；首屏以下 loading="lazy"，首屏 LCP 图用 fetchpriority="high" 且不懒加载；格式优先 AVIF/WebP，用 <picture> 提供回退；体积分级：缩略图 <50KB、内容图 <100KB、头图 <200KB。检查方法：Lighthouse 图片审计 + 手动抽查 alt。
  - effort: 0.5 人日
- - severity: 严重
  - area: HTTPS 与安全
  - issue: HTTPS、HSTS、HTTP→HTTPS 单跳重定向未配置
  - evidence: 站点未上线，域名 mandarinname.com 需在托管层配置证书
  - fix: 全站强制 HTTPS，HTTP 301 单跳到 HTTPS（跳数 ≤1）；启用 HSTS（max-age≥31536000）；无混合内容；www 与非 www 二选一并 301 统一；证书有效且自动续期。检查方法：curl -I http://mandarinname.com 看 301 到 https，SSL Labs 评级 ≥A。
  - effort: 0.5 人日
- - severity: 中
  - area: 性能预算 / Core Web Vitals
  - issue: 性能预算与 CWV 目标未设定，工具页 JS 交互易拖累 INP
  - evidence: pageMap 含生成器工具页，需前端 JS 交互；未上线无字段数据
  - fix: 设定预算：LCP ≤2.5s、INP ≤200ms、CLS ≤0.1（p75）；首屏 JS <170KB gzip、总 JS <300KB、CSS <100KB、字体 ≤2 个字重且 font-display:swap + preload；生成器逻辑拆分为 <50ms 小任务、事件处理防抖、避免同步 localStorage；第三方脚本 defer/async。上线后用 CrUX/PSI 校验字段数据（实验室数据仅调试用）。检查方法：Lighthouse CI 设预算门禁 + PSI API。
  - effort: 1 人日（预算配置 + 优化）
- - severity: 中
  - area: 移动端与可访问性
  - issue: 移动优先索引要求移动版含全部内容与结构化数据，未做验收
  - evidence: Google 自 2024-07 起 100% 用移动 Googlebot 抓取
  - fix: 响应式设计 + viewport meta；移动版与桌面版内容、结构化数据、meta 完全一致；点击目标 ≥48px、字体 ≥16px；避免侵入式插页；对比度达 WCAG AA。检查方法：Chrome DevTools 设备模拟 + Lighthouse 可访问性 ≥90。
  - effort: 0.5 人日
- - severity: 中
  - area: 内链与点击深度
  - issue: 内链矩阵未落地，重要页可能超过 3 跳或成孤儿页
  - evidence: 上游 internalLinkSkeleton 要求每页至少链向 2 个同簇相邻页 + 1 个上级枢纽页
  - fix: 按 internalLinkSkeleton 实现：生成器工具簇以 / 为 hub，信息长页互链；锚文本用目标页关键词，避免全站页脚堆链；确保 12 页均在首页 3 跳内可达；用真实 <a href> 而非 JS 点击。检查方法：Screaming Frog 爬取看点击深度与孤儿页。
  - effort: 0.5 人日
- - severity: 低
  - area: llms.txt 与 AI 就绪
  - issue: llms.txt 未提供，AI 引用入口缺失
  - evidence: 站点未上线；需在根目录提供 /llms.txt
  - fix: 部署本回复给出的 llmsTxt；保持单一 H1、至少一个 H2、链接格式 - [Name](URL): 描述；上线后随页面增减同步更新。检查方法：用 llms-txt 解析器校验格式。
  - effort: 0.2 人日
- - severity: 低
  - area: URL 结构
  - issue: URL 规则未统一（大小写、尾斜杠、参数）
  - evidence: pageMap 已给出小写连字符路径，需在路由层强制
  - fix: 全站小写、连字符、≤100 字符、无多余参数；统一尾斜杠策略并 301 归一；避免中文/大写 URL。检查方法：路由中间件 + 爬虫比对。
  - effort: 0.2 人日

## scorecard
> 分项评分对象 {indexing, performance, structuredData, mobile, content}（0-100）

- indexing: 40
- performance: 45
- structuredData: 30
- mobile: 50
- content: 55

## quickWins
> 可立即修复的快赢项数组

- 部署本回复的 robots.txt、sitemap.xml、llms.txt 三个文件到根目录
- 为 12 个页面各写唯一 title（50–60 字符）与 meta description（150–160 字符）
- 全站加自引用 canonical，生成器参数页 canonical 到无参工具页
- 全站加 WebSite + Organization JSON-LD，工具页加 WebApplication
- 所有 <img> 补 alt 并设 width/height
- 配置 HTTP→HTTPS 301 单跳 + HSTS

## structuredDataPlan
> 建议补充的结构化数据类型与理由

- - type: WebSite
  - reason: 全站级，声明站点名与 SearchAction，利于品牌与站内搜索展示
  - scope: 全站
- - type: Organization
  - reason: 建立品牌实体（name/url/logo/sameAs），支撑 E-E-A-T 与知识面板
  - scope: 全站
- - type: WebApplication
  - reason: 生成器工具页（/、/english-to-chinese-name、/chinese-business-name-generator、/chinese-name-generator-for-characters）为浏览器应用，可声明 applicationCategory、offers、featureList
  - scope: 4 个工具落地页
- - type: Article / BlogPosting
  - reason: 7 个信息长页（如 /chinese-names-for-boys、/how-to-choose-a-chinese-name）为文章型内容，可赚取富结果并强化作者信号
  - scope: 信息长页
- - type: BreadcrumbList
  - reason: 层级导航，提升 SERP 展示与爬虫理解站点结构
  - scope: 全站（首页除外）
- - type: Person + ProfilePage
  - reason: 作者/团队页强化 E-E-A-T，AI 搜索中提升可信度
  - scope: 作者页（如有）

## robotsTxt
> 可直接部署的 robots.txt 文件内容

User-agent: *
Allow: /
Disallow: /api/
Disallow: /search
Disallow: /*?*sessionid=
Disallow: /*?*utm_

# 搜索引擎爬虫
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# 搜索/用户触发型 AI 爬虫（放行，利于 AI 搜索引用）
User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

# 训练型 AI 爬虫（按合规策略：默认放行，如需限制训练可改为 Disallow: /）
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: https://mandarinname.com/sitemap.xml

## sitemapXml
> 可直接部署的 sitemap.xml 文件内容（基于规划页面或抓取到的 URL）

<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mandarinname.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/english-to-chinese-name</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/chinese-business-name-generator</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/chinese-name-generator-for-characters</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/chinese-names-for-boys</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/chinese-names-for-girls</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/how-to-choose-a-chinese-name</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/chinese-surnames-list</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/chinese-name-meaning</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/pinyin-guide</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/chinese-name-taboos</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://mandarinname.com/about</loc>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
</urlset>

## llmsTxt
> 可直接部署的 llms.txt 文件内容

# MandarinName

> MandarinName 是一个免费的在线中文名字生成器，帮助英语用户生成带拼音、汉字与含义解释的中文名字，并提供起名指南、姓氏列表与拼音说明。

MandarinName 面向希望获得地道中文名字的英语用户，提供生成器工具与配套的起名知识长页。所有工具免费使用，无需注册。

## Tools

- [Chinese Name Generator](https://mandarinname.com/): 首页生成器，输入性别与风格即可生成中文名字、拼音与含义
- [English to Chinese Name](https://mandarinname.com/english-to-chinese-name): 将英文名转换为对应的中文名字与汉字
- [Chinese Business Name Generator](https://mandarinname.com/chinese-business-name-generator): 为品牌与公司生成中文商业名称
- [Chinese Name Generator for Characters](https://mandarinname.com/chinese-name-generator-for-characters): 为小说、游戏角色生成中文名字

## Guides

- [How to Choose a Chinese Name](https://mandarinname.com/how-to-choose-a-chinese-name): 起中文名字的完整步骤与注意事项
- [Chinese Names for Boys](https://mandarinname.com/chinese-names-for-boys): 常见男孩中文名字与含义
- [Chinese Names for Girls](https://mandarinname.com/chinese-names-for-girls): 常见女孩中文名字与含义
- [Chinese Name Meaning](https://mandarinname.com/chinese-name-meaning): 如何理解中文名字的字义与文化含义
- [Chinese Name Taboos](https://mandarinname.com/chinese-name-taboos): 起名时应避免的字与禁忌

## Reference

- [Chinese Surnames List](https://mandarinname.com/chinese-surnames-list): 常见中文姓氏列表与拼音
- [Pinyin Guide](https://mandarinname.com/pinyin-guide): 拼音发音与声调基础说明

## Optional

- [About MandarinName](https://mandarinname.com/about): 站点介绍与联系方式

## 其他输出

### __missing


### __fieldCompliance
100%
