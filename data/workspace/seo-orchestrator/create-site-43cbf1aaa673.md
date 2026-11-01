# 新建独立站产品并生成站点规格

- 技能套件：总控与编排
- 任务：create-site
- 生成时间：2026/11/1 08:23:53
- 数据来源：无真实采集，结论为估算

## productProfile
> 产品档案一段话：做什么、给谁用、核心价值

Rhythm Trainer 是一个面向尤克里里初学者的网页节奏训练工具站，通过可视化节拍器、分步节奏型练习（strumming patterns）、跟拍打分与渐进式课程，帮助零基础用户在 4-8 周内建立稳定拍感并把节奏型应用到真实和弦进行中。核心价值是把抽象的'节奏感'拆成可练、可测、可反馈的小步骤，让自学尤克里里的人不再'会按和弦但弹不出歌'。

## targetUsers
> 目标用户画像数组，每项 {segment, pain, trigger}

- - segment: 零基础成人自学者（25-45 岁，刚买第一把尤克里里）
  - pain: 跟着视频会按和弦，但一换节奏就乱、跟不上原曲速度，不知道自己拍子对不对
  - trigger: 买琴后 1-2 周，搜索 'ukulele strumming patterns for beginners' 或 'how to keep time ukulele'
- - segment: 有基础但节奏不稳的业余玩家（弹唱爱好者）
  - pain: 能弹完整首歌但节奏忽快忽慢，跟伴奏/跟别人合奏时掉拍
  - trigger: 准备第一次和朋友合奏、录视频或参加线下 uke 聚会前
- - segment: 音乐老师/社团带领者（中小学、社区课）
  - pain: 需要给学生统一的节奏练习素材和可视化节拍参考，自己喊拍子太累
  - trigger: 备课或带社团活动时寻找可投屏的在线节拍器/节奏练习工具
- - segment: 从吉他转尤克里里的玩家
  - pain: 习惯吉他节奏型，尤克里里四弦定弦与扫弦手感不同，需要重新校准右手节奏
  - trigger: 换琴后搜索 'ukulele strumming vs guitar' 或 'ukulele rhythm exercises'

## differentiation
> 与竞品的差异化要点数组

- 专注尤克里里而非通用节拍器：内置尤克里里常用 strumming patterns（如 island strum、down-down-up-up-down-up）与四弦和弦进行示范
- 可视化+可打分：麦克风或点击跟拍检测，给出'提前/滞后/准确'反馈，而非只放节拍声
- 渐进式课程路径：从四分音符到切分、从单和弦到 I-V-vi-IV 进行，按难度分页面承载
- 零安装、浏览器即用，移动端优先（初学者多在手机/平板上看教程）
- 与教学内容深度绑定：每个节奏型页面配练习步骤、常见错误与内链到下一课

## complianceScope
> 面向地区带来的合规范围摘要（详细清单在第 4 步合规优化展开）

面向美国加州用户，主要涉及 CCPA/CPRA：需提供隐私政策（说明收集的个人信息类别、用途、出售/共享情况）、'Do Not Sell or Share My Personal Information' 入口、Cookie/追踪披露与选择机制；若使用麦克风做节奏检测，需明确音频处理方式（本地处理优先）并取得用户授权；若面向未成年人（学生用户）需注意 COPPA 边界（13 岁以下需家长同意，建议站点声明非面向 13 岁以下）；加州自动续费需遵循 ARL（若未来做订阅）。详细合规清单在第 4 步合规优化展开。

## domainAdvice
> 域名/命名建议与注意事项

rhythmtrainer.com 语义清晰、与产品强相关，利于品牌记忆与关键词联想；注意：'Rhythm Trainer' 可能与他人在先商标冲突，上线前需做 USPTO 商标检索（第 9/41/42 类）；建议同时注册 rhythmtrainer.app 作为工具站备用域名并做 301 统一；品牌名与域名一致，避免使用 'ukulele' 作为主域（限制未来扩展），可在子目录 /ukulele/ 承载尤克里里垂直内容。

## successMetrics
> 成功指标数组，每项 {metric, target, window}

- - metric: 核心工具页（节拍器/节奏型练习）自然搜索展示量与点击量
  - target: 未知（需 GSC 接入后建立基线）
  - window: 上线后 30/60/90 天
- - metric: 目标关键词（如 ukulele strumming patterns、ukulele metronome）进入 Google 前 100/前 30 的页面数
  - target: 未知（估算，需关键词工具校准）
  - window: 上线后 90 天
- - metric: 工具页到'开始练习'的转化率（点击开始训练/完成一次练习）
  - target: 未知（首月建立基线）
  - window: 上线后 30 天起每月复盘
- - metric: 练习完成率（完成一次完整节奏练习会话的用户占比）
  - target: 未知（首月建立基线）
  - window: 上线后 30 天起
- - metric: Core Web Vitals 达标率（LCP<2.5s、INP<200ms、CLS<0.1 的页面占比）
  - target: 100% 核心页面达标
  - window: 上线即验收
- - metric: 结构化数据校验通过率（WebApplication/FAQPage/HowTo/BreadcrumbList）
  - target: 100% 无错误
  - window: 上线即验收

## siteSpec
> 站点规格：定位、目标受众、核心差异化（一段话）

Rhythm Trainer 是面向美国加州、英语单语的尤克里里节奏训练工具站，定位为'初学者节奏练习的一站式在线工具+课程'。目标受众为零基础成人自学者、节奏不稳的业余弹唱者、音乐老师与吉他转尤克里里玩家。核心差异化：尤克里里专用节奏型库+可视化跟拍反馈+渐进课程路径，浏览器即用、移动优先，每个节奏型/练习主题独立成页并互相内链，形成'工具+内容'双轮驱动的搜索入口。

## pages
> 页面清单数组（分门别类罗列：一个关键词一个页面），每项 {path, title, purpose, keySections[], targetQuery, priority}

- - path: /
  - title: Rhythm Trainer — Free Online Ukulele Rhythm & Strumming Trainer
  - purpose: 品牌首页与工具入口，承接品牌词与核心工具词，引导进入节拍器与节奏型练习
  - keySections: ["Hero+立即开始练习","核心工具入口（节拍器/节奏型/跟拍检测）","热门节奏型速览","初学者 4 周路径概览","用户场景与评价","FAQ 摘要"]
  - targetQuery: ukulele rhythm trainer
  - priority: P0
- - path: /ukulele-metronome/
  - title: Free Ukulele Metronome — Online Click Track with Visual Beat
  - purpose: 在线尤克里里节拍器工具页，承接高意图工具词
  - keySections: ["在线节拍器（BPM 调节/拍号/重音）","可视化节拍指示","常见 BPM 参考（练习/弹唱）","如何用节拍器练尤克里里","内链到节奏型与练习课程"]
  - targetQuery: ukulele metronome
  - priority: P0
- - path: /ukulele-strumming-patterns/
  - title: Ukulele Strumming Patterns for Beginners — With Practice Tool
  - purpose: 节奏型总览页（分类聚合），承接核心大词并作为子页内链枢纽
  - keySections: ["节奏型分类（基础/切分/岛屿节奏/三拍）","每个节奏型的难度与适用曲风","内链到各节奏型子页","练习顺序建议"]
  - targetQuery: ukulele strumming patterns
  - priority: P0
- - path: /ukulele-strumming-patterns/island-strum/
  - title: Island Strum Ukulele Pattern — Step-by-Step Practice
  - purpose: 岛屿节奏型单页，一个关键词一个页面
  - keySections: ["节奏型图示（D-DU-UDU）","分步慢速练习","常见错误","配套和弦进行","内链到下一节奏型"]
  - targetQuery: island strum ukulele
  - priority: P1
- - path: /ukulele-strumming-patterns/down-down-up-up-down-up/
  - title: Down Down Up Up Down Up Strumming Pattern for Ukulele
  - purpose: 最基础扫弦型单页
  - keySections: ["节奏图示","慢速到原速练习","与节拍器配合","内链到 island strum"]
  - targetQuery: down down up up down up ukulele
  - priority: P1
- - path: /ukulele-strumming-patterns/country-strum/
  - title: Country Strum Ukulele Pattern — How to Play It in Time
  - purpose: 乡村节奏型单页
  - keySections: ["节奏图示","练习步骤","适用歌曲示例","内链相关节奏型"]
  - targetQuery: country strum ukulele
  - priority: P2
- - path: /ukulele-rhythm-exercises/
  - title: Ukulele Rhythm Exercises for Beginners — Progressive Practice
  - purpose: 节奏练习课程聚合页，承接练习类长尾
  - keySections: ["练习分级（四分/八分/切分/三连音）","每级练习目标与时长","内链到各练习子页","跟拍检测入口"]
  - targetQuery: ukulele rhythm exercises
  - priority: P0
- - path: /ukulele-rhythm-exercises/quarter-notes/
  - title: Quarter Note Rhythm Exercises for Ukulele Beginners
  - purpose: 四分音符练习单页
  - keySections: ["练习说明","节拍器设置","跟拍检测","内链到八分音符练习"]
  - targetQuery: ukulele quarter note exercises
  - priority: P1
- - path: /ukulele-rhythm-exercises/eighth-notes/
  - title: Eighth Note Rhythm Exercises for Ukulele
  - purpose: 八分音符练习单页
  - keySections: ["练习说明","节拍器设置","跟拍检测","内链到切分练习"]
  - targetQuery: ukulele eighth note exercises
  - priority: P1
- - path: /ukulele-rhythm-exercises/syncopation/
  - title: Syncopation Rhythm Exercises for Ukulele
  - purpose: 切分节奏练习单页
  - keySections: ["切分概念","分步练习","跟拍检测","内链到三连音"]
  - targetQuery: ukulele syncopation exercises
  - priority: P2
- - path: /how-to-keep-time-on-ukulele/
  - title: How to Keep Time on Ukulele — Fix Rushing and Dragging
  - purpose: 问题解决型内容页，承接痛点长尾
  - keySections: ["为什么会掉拍","用节拍器校准","跟拍检测自测","练习计划","内链到工具页"]
  - targetQuery: how to keep time on ukulele
  - priority: P1
- - path: ukulele-strumming-vs-guitar/
  - title: Ukulele Strumming vs Guitar — Rhythm Differences Explained
  - purpose: 对比型内容页，承接转琴用户
  - keySections: ["定弦与手感差异","节奏型迁移","练习建议","内链到节奏型库"]
  - targetQuery: ukulele strumming vs guitar
  - priority: P2
- - path: /tools/rhythm-test/
  - title: Ukulele Rhythm Test — Check If You're On Beat
  - purpose: 跟拍检测工具页，承接测评类意图
  - keySections: ["麦克风/点击跟拍检测","准确度反馈","结果解读","内链到练习课程"]
  - targetQuery: ukulele rhythm test
  - priority: P1
- - path: /for-teachers/
  - title: Rhythm Trainer for Music Teachers — Classroom Rhythm Practice
  - purpose: 教师场景落地页，承接 B 端意图
  - keySections: ["课堂投屏用法","学生进度查看（如实现）","教学素材","内链到练习课程"]
  - targetQuery: ukulele rhythm practice for teachers
  - priority: P2
- - path: /about/
  - title: About Rhythm Trainer
  - purpose: 品牌与 E-E-A-T 页面
  - keySections: ["团队/作者背景","方法论","联系方式"]
  - targetQuery: rhythm trainer about
  - priority: P2
- - path: /privacy/
  - title: Privacy Policy
  - purpose: 合规必需页（CCPA/CPRA）
  - keySections: ["收集的信息类别","用途","Do Not Sell or Share 入口","Cookie 披露","麦克风数据处理说明"]
  - targetQuery: rhythm trainer privacy
  - priority: P0

## techStack
> 技术选型建议数组，每项 {choice, why, alternative}

- - choice: Next.js（App Router）+ TypeScript
  - why: SSG/SSR 兼顾 SEO 与工具交互，路由即页面矩阵，便于模板复用
  - alternative: Astro + React islands（内容页更轻）
- - choice: Tailwind CSS
  - why: 快速实现移动优先的响应式工具界面
  - alternative: CSS Modules
- - choice: Web Audio API + Tone.js
  - why: 浏览器内实现节拍器、节拍可视化与跟拍检测，无需后端
  - alternative: 原生 Web Audio API 手写调度
- - choice: Vercel 托管
  - why: 边缘 CDN、自动 HTTPS、预览部署，利于 CWV
  - alternative: Cloudflare Pages
- - choice: 结构化数据 JSON-LD（WebApplication/FAQPage/HowTo/BreadcrumbList）
  - why: 工具站与教程页的富结果基础
  - alternative: Microdata（不推荐）
- - choice: Plausible 或 GA4（二选一，隐私优先）
  - why: 轻量分析，配合 CCPA 披露
  - alternative: 自建 Umami

## seoBaseline
> SEO 基线要求数组（title/meta/结构化数据/性能/llms.txt 等必须满足项）

- 每个页面唯一 Title（≤60 字符）与 Meta Description（≤155 字符），包含目标关键词与利益点
- 每页唯一 H1，与 Title 语义一致但不重复堆砌；H2/H3 覆盖 keySections
- URL 采用小写、连字符、语义化层级（如 /ukulele-strumming-patterns/island-strum/），不带参数与日期
- canonical 标签自指；分页/筛选页正确 canonical
- 结构化数据：工具页 WebApplication、教程页 HowTo、FAQ 区块 FAQPage、全站 BreadcrumbList，Rich Results 测试零错误
- Core Web Vitals：LCP<2.5s、INP<200ms、CLS<0.1，移动端优先验收
- sitemap.xml 自动生成并提交 GSC；robots.txt 允许抓取工具页与内容页
- 提供 /llms.txt 描述站点结构与核心工具/内容，便于 AI 搜索引用
- 内链：相邻长尾词互相内链（节奏型子页↔总览页、练习子页↔课程页），每页至少 2 条上下文内链
- 图片/图示带 alt 文本；工具交互有可访问性标签（aria）
- hreflang 暂不需要（英语单语），但预留语言目录结构
- 404/301 规范；域名统一（rhythmtrainer.com 与 .app 301 归一）

## nextActions
> 下一步动作数组，每项 {action, owner, effort}

- - action: 完成 USPTO 商标检索并确认域名注册与 301 归一策略
  - owner: 创始人/法务
  - effort: 1-2 天
- - action: 按页面矩阵搭建 Next.js 站点骨架与母版模板（工具页模板/节奏型页模板/练习页模板/合规页模板）
  - owner: 前端开发
  - effort: 1-2 周
- - action: 实现节拍器与跟拍检测核心工具（Web Audio API），移动端优先
  - owner: 前端开发
  - effort: 2-3 周
- - action: 撰写 P0 页面内容（首页、节拍器、节奏型总览、练习课程、隐私政策），按 TDH 规范落地
  - owner: 内容/SEO
  - effort: 1-2 周
- - action: 接入 GSC 与轻量分析，建立 successMetrics 基线
  - owner: SEO
  - effort: 1 天
- - action: 上线前跑结构化数据与 CWV 验收，提交 sitemap 与 llms.txt
  - owner: SEO/开发
  - effort: 2-3 天
- - action: 进入第 4 步合规优化，展开 CCPA/CPRA 详细清单与 Cookie 同意实现
  - owner: 法务/开发
  - effort: 1 周

## 其他输出

### __missing


### __fieldCompliance
100%
