# 新建独立站产品并生成站点规格

- 技能套件：总控与编排
- 任务：create-site
- 生成时间：2026/11/1 19:48:17
- 数据来源：无真实采集，结论为估算

## productProfile
> 产品档案一段话：做什么、给谁用、核心价值

Rythm trainer 是一个面向全球英语用户的尤克里里学习工具站，核心是帮助自学者通过节奏训练、和弦转换练习与跟弹节拍器，把「会按和弦但弹不成歌」的卡点打通。产品以浏览器端交互工具（节拍器/节奏闯关/和弦切换计时/简单曲谱跟弹）为主，配合结构化教学页与练习计划，让用户在 5-15 分钟碎片时间内完成可量化的练习。核心价值：把抽象的「节奏感」拆成可测量、可打卡、可进阶的训练单元，降低尤克里里自学者的放弃率。

## targetUsers
> 目标用户画像数组，每项 {segment, pain, trigger}

- - segment: 零基础成人自学者（18-40 岁，买琴 1-3 个月内）
  - pain: 会看和弦图但节奏不稳，跟原曲弹总是对不上拍，不知道每天该练什么
  - trigger: 搜索 how to strum ukulele in rhythm / ukulele strumming patterns for beginners 后进入
- - segment: 有基础但卡在「弹唱不同步」的进阶者
  - pain: 唱和弹节奏互相干扰，扫弦型一换就乱，缺少循序渐进的节奏训练路径
  - trigger: 搜索 ukulele strumming patterns chart / how to sing and play ukulele at the same time
- - segment: 教师/家长辅助场景（音乐老师、给孩子买琴的家长）
  - pain: 缺少可布置、可检查的节奏练习工具与进度记录
  - trigger: 搜索 ukulele practice routine / ukulele lesson plan for kids

## differentiation
> 与竞品的差异化要点数组

- 以「节奏」为单点切入，而非又一个综合和弦库站，避免与大型和弦站正面竞争
- 训练过程可量化：BPM 进度、和弦切换次数/分钟、连续打卡天数，形成可分享的练习记录
- 浏览器即用、无需下载 App，移动端优先适配（多数初学者用手机看谱）
- 每个长尾节奏/扫弦关键词对应一个独立教学页 + 内嵌可交互训练器，内容与工具一体
- 提供「练习计划」而非零散教程，按周给出可执行任务清单

## complianceScope
> 面向地区带来的合规范围摘要（详细清单在第 4 步合规优化展开）

面向全球英语市场（宽松基线）需覆盖：欧盟/英国 GDPR 与 UK GDPR（隐私政策、Cookie 同意横幅与分类管理、数据处理记录、数据主体请求通道）；美国加州 CCPA/CPRA（隐私政策中的出售/共享声明与 Do Not Sell 链接）；若接入广告或分析需遵守 Google 广告与同意模式要求；儿童用户场景需注意 COPPA（避免收集 13 岁以下个人信息，家长场景页面不做账号强制注册）；支付若涉及订阅需符合各支付渠道条款与退款政策。详细清单在第 4 步合规优化展开。

## domainAdvice
> 域名/命名建议与注意事项

建议品牌域名与产品名解耦：产品名 Rythm trainer 中 'Rythm' 为非常规拼写（常见为 Rhythm），直接注册易与拼写混淆且可能已被占用，建议注册 'rythmtrainer.com' 类品牌域名同时保护 'rhythmtrainer.com' 变体做 301；域名尽量短、全小写、避免连字符；.com 优先，其次 .app/.io；避免使用他人商标词（如具体乐器品牌名）入域名；上线前确认商标可注册性。

## successMetrics
> 成功指标数组，每项 {metric, target, window}

- - metric: 核心工具页自然搜索着陆的会话数（GSC + 分析）
  - target: 未知（首月建立基线后设定）
  - window: 上线后 90 天
- - metric: 工具页到「开始训练」的点击率
  - target: 估算基线后提升 20%（待埋点验证）
  - window: 上线后 60 天
- - metric: 被 Google 收录的页面数 / 规划页面数
  - target: ≥90%
  - window: 上线后 45 天
- - metric: 目标关键词进入前 100 名的数量
  - target: 未知（以 GSC 实际为准）
  - window: 上线后 120 天
- - metric: Core Web Vitals 达标率（LCP/INP/CLS 良好）
  - target: 100% 主要模板页
  - window: 上线即达标

## siteSpec
> 站点规格：定位、目标受众、核心差异化（一段话）

Rythm trainer 是一个英语、全球面向的尤克里里节奏训练工具站：以「一个关键词一个页面」组织，工具页（节拍器、扫弦型训练、和弦切换计时、跟弹练习）与教学页（扫弦型、节奏型、练习计划、弹唱同步）成对出现，教学页内嵌对应工具入口；全站移动优先、轻量、无强制注册即可试用，通过练习记录与打卡形成回访。目标受众为英语区尤克里里自学者与辅助教学的老师家长，差异化在于把节奏训练做成可量化、可打卡的单一主线，而非综合和弦库。

## pages
> 页面清单数组（分门别类罗列：一个关键词一个页面），每项 {path, title, purpose, keySections[], targetQuery, priority}

- - path: /
  - title: Rythm Trainer — Ukulele Rhythm & Strumming Practice Tool
  - purpose: 首页：定位说明 + 核心工具入口 + 热门训练路径分流
  - keySections: ["价值主张与一句话定位","三大工具入口卡片","热门扫弦型速查","练习计划入口","用户练习记录示例（匿名）"]
  - targetQuery: ukulele rhythm trainer
  - priority: P0
- - path: /metronome/
  - title: Online Ukulele Metronome — Free Tap Tempo & BPM Trainer
  - purpose: 在线节拍器工具页，承接节拍器类搜索
  - keySections: ["BPM 调节与拍号","Tap tempo","重音与细分","与扫弦型联动","常见问题"]
  - targetQuery: online ukulele metronome
  - priority: P0
- - path: /strumming-patterns/
  - title: Ukulele Strumming Patterns — Charts & Practice Trainer
  - purpose: 扫弦型总览页（分类罗列入口，链向各具体扫弦型页）
  - keySections: ["扫弦型分类（4/4、3/4、切分）","每个扫弦型卡片与内链","如何配合节拍器练习","常见错误"]
  - targetQuery: ukulele strumming patterns
  - priority: P0
- - path: /strumming-patterns/island-strum/
  - title: Island Strum Ukulele Pattern — D DU UDU Tutorial & Trainer
  - purpose: Island strum 单关键词页，内嵌该扫弦型训练器
  - keySections: ["节奏图示","分步慢速演示","内嵌训练器","适用歌曲示例","相邻扫弦型内链"]
  - targetQuery: island strum ukulele
  - priority: P1
- - path: /strumming-patterns/country-strum/
  - title: Country Strum Ukulele Pattern — Step-by-Step Practice
  - purpose: Country strum 单关键词页
  - keySections: ["节奏图示","分步演示","内嵌训练器","与 island strum 对比","内链"]
  - targetQuery: country strum ukulele
  - priority: P1
- - path: /strumming-patterns/calypso-strum/
  - title: Calypso Strum Ukulele — Rhythm Breakdown & Trainer
  - purpose: Calypso strum 单关键词页
  - keySections: ["节奏图示","切分要点","内嵌训练器","常见错误","内链"]
  - targetQuery: calypso strum ukulele
  - priority: P1
- - path: /strumming-patterns/triplet-strum/
  - title: Triplet Strum Ukulele — 3/4 Rhythm Practice Tool
  - purpose: 三连音扫弦单关键词页
  - keySections: ["节奏图示","3/4 拍讲解","内嵌训练器","内链"]
  - targetQuery: triplet strum ukulele
  - priority: P1
- - path: /chord-change-trainer/
  - title: Ukulele Chord Change Trainer — Count Changes Per Minute
  - purpose: 和弦切换计时工具页
  - keySections: ["选择和弦对","计时与计数","历史记录","常见和弦对推荐","内链到练习计划"]
  - targetQuery: ukulele chord change trainer
  - priority: P0
- - path: /practice-plan/
  - title: Ukulele Practice Plan — 4-Week Rhythm Routine for Beginners
  - purpose: 练习计划页，串联工具与教学页
  - keySections: ["四周任务表","每日 10 分钟流程","打卡记录","内链到各工具与扫弦型页"]
  - targetQuery: ukulele practice plan for beginners
  - priority: P0
- - path: /how-to-strum-in-rhythm/
  - title: How to Strum a Ukulele in Rhythm — Beginner Guide
  - purpose: 节奏入门教学页
  - keySections: ["节奏感是什么","手部动作分解","配合节拍器练习","内嵌节拍器","内链"]
  - targetQuery: how to strum ukulele in rhythm
  - priority: P1
- - path: /sing-and-play/
  - title: How to Sing and Play Ukulele at the Same Time — Rhythm Method
  - purpose: 弹唱同步教学页
  - keySections: ["先弹后唱的顺序","节奏锚点法","内嵌训练器","练习曲示例","内链"]
  - targetQuery: how to sing and play ukulele at the same time
  - priority: P1
- - path: /bpm-guide/
  - title: Ukulele BPM Guide — What Tempo Should Beginners Practice At
  - purpose: BPM 与速度选择教学页
  - keySections: ["BPM 含义","初学者速度建议（标注为经验建议）","逐步提速方法","内链到节拍器"]
  - targetQuery: what bpm should beginners practice ukulele
  - priority: P2
- - path: /about/
  - title: About Rythm Trainer
  - purpose: 关于页（E-E-A-T：作者/团队背景）
  - keySections: ["团队与音乐背景","方法论来源","联系方式"]
  - targetQuery: rythm trainer about
  - priority: P2
- - path: /privacy/
  - title: Privacy Policy
  - purpose: 隐私政策（合规必需）
  - keySections: ["收集的数据","Cookie 与同意","数据主体权利","联系方式"]
  - targetQuery: privacy policy
  - priority: P0
- - path: /terms/
  - title: Terms of Use
  - purpose: 使用条款
  - keySections: ["服务范围","免责声明（非专业音乐教学承诺）","知识产权"]
  - targetQuery: terms of use
  - priority: P1

## techStack
> 技术选型建议数组，每项 {choice, why, alternative}

- - choice: 静态站点生成（Astro 或 Next.js SSG）
  - why: 工具站页面多、内容更新频繁但交互在客户端，SSG 保证首屏快与可抓取
  - alternative: Hugo / Eleventy
- - choice: 原生 JS + Web Audio API 实现节拍器与训练器
  - why: 节拍精度要求高，Web Audio 时钟比 setInterval 稳定，且无需重框架
  - alternative: Tone.js
- - choice: Tailwind CSS + 移动优先布局
  - why: 初学者多用手机，快速实现响应式与轻量样式
  - alternative: 纯 CSS / UnoCSS
- - choice: Cloudflare Pages 或 Vercel 托管
  - why: 全球 CDN、免费额度、易配自定义域名与 HTTPS
  - alternative: Netlify / GitHub Pages
- - choice: Plausible 或 GA4（配 Consent Mode）
  - why: 轻量分析且需与 Cookie 同意联动满足 GDPR
  - alternative: Umami 自托管

## seoBaseline
> SEO 基线要求数组（title/meta/结构化数据/性能/llms.txt 等必须满足项）

- 每页唯一 title（≤60 字符）与 meta description（≤155 字符），含目标关键词且不堆砌
- 每页唯一 H1，与 title 语义一致；标题层级不跳级
- URL 全小写、连字符分隔、语义化、无参数；工具页与教学页路径分层清晰
- 结构化数据：首页与工具页用 WebApplication/SoftwareApplication，教学页用 HowTo 或 Article，全站 Organization + BreadcrumbList，FAQ 区块用 FAQPage（仅在有真实问答时）
- Core Web Vitals：LCP ≤2.5s、INP ≤200ms、CLS ≤0.1（移动端 4G 模拟）
- 提供 /sitemap.xml 与 /robots.txt，sitemap 仅含可索引页
- 提供 /llms.txt 描述站点结构与工具入口，便于 AI 搜索引用
- canonical 自引用，分页/筛选无重复内容
- 图片带 alt、懒加载；音频/交互组件不阻塞首屏
- 内链：相邻扫弦型页互链、教学页链到对应工具页、工具页链回教学页
- hreflang 暂不需要（单语言英语），但预留目录结构
- 404/500 自定义页；隐私与条款页可索引

## nextActions
> 下一步动作数组，每项 {action, owner, effort}

- - action: 确认域名可用性并注册主域名 + 拼写变体 301
  - owner: 站长
  - effort: 0.5 天
- - action: 用关键词工具验证页面矩阵中各 targetQuery 的真实搜索量与难度，剔除无需求词、补充长尾（标注估算）
  - owner: SEO
  - effort: 1 天
- - action: 搭建 Astro 骨架 + 母版模板（工具页模板、教学页模板、列表页模板）
  - owner: 开发
  - effort: 3-5 天
- - action: 实现节拍器与和弦切换计时两个 P0 工具的最小可用版本
  - owner: 开发
  - effort: 5 天
- - action: 按页面矩阵产出 P0 页面内容初稿（首页、扫弦型总览、练习计划、隐私）
  - owner: 内容
  - effort: 3 天
- - action: 接入分析埋点与 Cookie 同意，配置 GSC 并提交 sitemap
  - owner: 开发/SEO
  - effort: 1 天
- - action: 上线后 45 天做首次收录与 CWV 验收，按 GSC 数据调整页面优先级
  - owner: SEO
  - effort: 0.5 天/次

## 其他输出

### __missing


### __fieldCompliance
100%
