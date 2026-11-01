# 新建独立站产品并生成站点规格

- 技能套件：总控与编排
- 任务：create-site
- 生成时间：2026/11/1 23:12:43
- 数据来源：无真实采集，结论为估算

## productProfile
> 产品档案一段话：做什么、给谁用、核心价值

Rythm trainer 是一个面向全球英语用户的尤克里里节奏训练工具站：通过浏览器内的节拍器、节奏型（strumming pattern）跟练、拍号与 BPM 渐进练习、以及可选的麦克风节奏准确度反馈，帮助尤克里里自学者把「会按和弦但弹不准拍」的问题解决掉。核心价值是把抽象的节奏训练拆成可跟练、可量化、每天 5-10 分钟就能完成的练习单元，并用一个关键词一个落地页承接从「怎么扫弦」到「4/4 拍练习」的长尾搜索需求。

## targetUsers
> 目标用户画像数组，每项 {segment, pain, trigger}

- - segment: 零基础成人自学者（18-40 岁，用 YouTube/App 自学尤克里里 0-6 个月）
  - pain: 知道和弦指法但扫弦节奏乱、跟不上原曲，不知道每天该练什么
  - trigger: 搜「ukulele strumming patterns for beginners」「how to strum in time」时找不到能直接跟练的工具
- - segment: 有基础但节奏不稳的业余玩家（弹唱爱好者、社区/教会/校园乐队）
  - pain: 单独弹没问题，一跟伴奏或与人合奏就抢拍/拖拍，缺少客观的节奏准确度反馈
  - trigger: 准备演出或合奏前，搜「metronome for ukulele」「rhythm accuracy practice」
- - segment: 尤克里里老师与社团组织者
  - pain: 需要给学生布置可量化、可在家完成的节奏作业，但缺少统一练习材料
  - trigger: 搜「ukulele rhythm exercises pdf / online」寻找可分享的练习页
- - segment: 从吉他/其他乐器转来的节奏训练需求者
  - pain: 想用轻量工具练特定拍号（3/4、6/8）与切分节奏，不想装重型 DAW 或付费 App
  - trigger: 搜「6/8 strumming pattern ukulele」「syncopation practice online」

## differentiation
> 与竞品的差异化要点数组

- 专注尤克里里而非通用节拍器：内置尤克里里常见扫弦型（下上下上、D DU UDU 等）与四弦乐器适配的节奏提示
- 跟练 + 反馈闭环：节拍器只是起点，提供分 BPM 渐进练习与（可选）麦克风节奏准确度评分，把「练了」变成「练到什么程度」
- 零安装、浏览器即用：无需下载 App，移动端优先，适合碎片时间练习
- 一个关键词一个落地页：每个扫弦型/拍号/BPM 阶段都有独立可索引页面，直接命中长尾搜索意图
- 免费核心 + 轻付费进阶（估算方向，需后续验证）：基础节拍器与常见节奏型免费，进阶课程包/准确度报告作为转化点

## complianceScope
> 面向地区带来的合规范围摘要（详细清单在第 4 步合规优化展开）

面向全球英语市场（宽松基线）但需覆盖主要英语市场的强制项：欧盟/英国用户访问即可能适用 GDPR/UK GDPR——需隐私政策、Cookie 同意管理（非必要 Cookie 默认不加载）、数据处理记录与数据主体请求通道；美国加州需 CCPA/CPRA 的「不出售个人信息」声明与隐私政策披露；若接入麦克风做节奏检测，需明确告知音频处理方式（优先本地处理、不上传）并单独取得权限同意；面向未成年人（尤克里里学习者中可能有青少年）需避免定向广告与不必要的数据收集，COPPA 年龄门槛需在隐私政策中说明；网站需可访问性基本合规（WCAG 2.1 AA 方向）与清晰的退订/联系渠道。详细清单在第 4 步合规优化展开。

## domainAdvice
> 域名/命名建议与注意事项

建议优先考虑品牌型短域名（如 rythmtrainer.com / rythm.training / getrythm.com 方向），避免与现有节拍器/音乐教育品牌混淆；注意「Rythm」为非标准拼写（标准为 Rhythm），拼写变体有利于品牌唯一性但会损失「rhythm trainer」的精确匹配搜索与用户口输准确率，建议同时注册 rhythm 拼写的防御性域名或子域重定向；.com 优先，其次 .app/.io/.co；避免使用他人商标词（如具体乐器品牌名）作为域名；上线前做商标与域名可用性检索（估算：需 1-2 小时人工核查，结果未知）。

## successMetrics
> 成功指标数组，每项 {metric, target, window}

- - metric: 被索引的落地页数量（GSC 已编入索引）
  - target: 页面矩阵中 P0/P1 页面 100% 被索引
  - window: 上线后 8 周
- - metric: 核心落地页的 GSC 平均排名（目标词进入前 3 页）
  - target: 至少 30% 的 P0 关键词进入前 30 名（估算基线，需 GSC 实测校准）
  - window: 上线后 12 周
- - metric: 自然搜索点击量环比增长
  - target: 连续 4 周环比正增长（绝对值未知，以 GSC 首月为基线）
  - window: 上线后 4-12 周
- - metric: 工具使用深度：单次会话完成的练习轮次
  - target: ≥2 轮/会话（需先接入分析工具取基线）
  - window: 上线后 4 周起持续观测
- - metric: Core Web Vitals 达标率
  - target: 移动端 LCP<2.5s、INP<200ms、CLS<0.1 的 URL 占比 100%
  - window: 上线即达标，每月复测
- - metric: 结构化数据有效率
  - target: 关键页面 Rich Results 测试 0 错误
  - window: 上线前验收 + 每月复测

## siteSpec
> 站点规格：定位、目标受众、核心差异化（一段话）

Rythm trainer 定位为「尤克里里节奏训练的一站式免费工具站」：面向全球英语自学的尤克里里学习者与教学者，用浏览器内节拍器 + 扫弦型跟练 + 节奏准确度反馈构成核心工具，用「一个关键词一个页面」的落地页矩阵承接从入门扫弦型、拍号、BPM 阶段到节奏理论的长尾搜索；差异化在于尤克里里专用（而非通用节拍器）、跟练与反馈闭环、零安装移动优先，并以免费核心工具 + 进阶练习包作为转化路径。

## pages
> 页面清单数组（分门别类罗列：一个关键词一个页面），每项 {path, title, purpose, keySections[], targetQuery, priority}

- - path: /
  - title: Rythm Trainer — Free Online Ukulele Rhythm & Strumming Trainer
  - purpose: 品牌首页与工具入口，承接品牌词与「ukulele rhythm trainer」类核心词，提供节拍器与扫弦跟练的即时可用入口
  - keySections: ["Hero：一句话价值 + 立即开始练习按钮","在线节拍器（BPM/拍号可调）","热门扫弦型快速入口（内链到各扫弦型页）","如何使用（3 步）","常见问题 FAQ（结构化数据）","内链区：按拍号/难度/场景分类的全部页面索引"]
  - targetQuery: ukulele rhythm trainer
  - priority: P0
- - path: /metronome/
  - title: Online Ukulele Metronome — Free Tap Tempo & Time Signature Tool
  - purpose: 承接通用节拍器搜索，提供 BPM、拍号、重音、tap tempo 功能，是站内流量与内链枢纽
  - keySections: ["在线节拍器控件（BPM 40-240、拍号 2/4 3/4 4/4 6/8）","Tap tempo 与预设速度","尤克里里练习建议（每个 BPM 区间练什么）","内链：各扫弦型页、BPM 渐进练习页","FAQ"]
  - targetQuery: ukulele metronome online
  - priority: P0
- - path: /strumming-patterns/
  - title: Ukulele Strumming Patterns — Complete List with Practice Player
  - purpose: 扫弦型总览页（分类母版），按难度与拍号分门别类罗列并内链到每个单独扫弦型页
  - keySections: ["扫弦型分类表（初级/中级/进阶 × 拍号）","每个扫弦型的卡片（含内链与一句话说明）","如何读扫弦记号（D/U/箭头图例）","练习顺序建议","FAQ"]
  - targetQuery: ukulele strumming patterns
  - priority: P0
- - path: /strumming-patterns/d-du-udu/
  - title: D DU UDU Strumming Pattern for Ukulele — Slow to Fast Practice
  - purpose: 单个高频扫弦型的独立落地页，含跟练播放器与分 BPM 练习
  - keySections: ["节奏图示与文字拆解","跟练播放器（可调 BPM）","常见错误与纠正","适合的歌曲示例（不涉及版权歌词）","内链：相邻扫弦型、节拍器页、BPM 练习页"]
  - targetQuery: d du udu strumming pattern ukulele
  - priority: P0
- - path: /strumming-patterns/island-strum/
  - title: Island Strum Ukulele Pattern — How to Play It in Time
  - purpose: 承接 island strum 高搜索量长尾，独立页面 + 跟练
  - keySections: ["节奏图示与拆解","跟练播放器","与 D DU UDU 的区别（内链互链）","练习步骤","FAQ"]
  - targetQuery: island strum ukulele
  - priority: P1
- - path: /strumming-patterns/triplet-strum/
  - title: Triplet Strum Ukulele — 3/4 and 6/8 Practice Guide
  - purpose: 承接三连音扫弦长尾，覆盖 3/4、6/8 拍号需求
  - keySections: ["三连音节奏图示","跟练播放器（3/4 与 6/8 切换）","与普通扫弦的对比","练习建议","内链：6/8 拍号页"]
  - targetQuery: triplet strum ukulele
  - priority: P1
- - path: /strumming-patterns/beginner/
  - title: Beginner Ukulele Strumming Patterns — 5 Patterns to Learn First
  - purpose: 按难度分类的聚合页，承接「beginner strumming patterns」类词并内链各单页
  - keySections: ["5 个入门扫弦型卡片（内链）","学习顺序与每日 10 分钟计划","常见新手错误","FAQ"]
  - targetQuery: beginner ukulele strumming patterns
  - priority: P1
- - path: /time-signatures/4-4/
  - title: 4/4 Time Ukulele Practice — Metronome and Strumming Drills
  - purpose: 按拍号分类的落地页，承接 4/4 拍练习搜索
  - keySections: ["4/4 拍基础说明","节拍器嵌入（默认 4/4）","适合 4/4 的扫弦型（内链）","渐进练习计划","FAQ"]
  - targetQuery: 4/4 time ukulele practice
  - priority: P1
- - path: /time-signatures/3-4/
  - title: 3/4 Time Ukulele Practice — Waltz Strum and Metronome
  - purpose: 承接 3/4 拍与华尔兹扫弦搜索
  - keySections: ["3/4 拍说明","节拍器嵌入（默认 3/4）","华尔兹扫弦型（内链）","练习计划","FAQ"]
  - targetQuery: 3/4 time ukulele strumming
  - priority: P1
- - path: /time-signatures/6-8/
  - title: 6/8 Time Ukulele Practice — Strumming and Metronome Guide
  - purpose: 承接 6/8 拍搜索，与三连音页互链
  - keySections: ["6/8 拍说明与计数方式","节拍器嵌入（默认 6/8）","适合的扫弦型（内链）","练习计划","FAQ"]
  - targetQuery: 6/8 time ukulele
  - priority: P1
- - path: /practice/bpm-progression/
  - title: Ukulele BPM Progression — How to Build Speed Without Losing Time
  - purpose: 承接「练多快/怎么提速」类搜索，提供分阶段 BPM 练习方案
  - keySections: ["为什么慢练有效","60/80/100/120 BPM 分阶段练习表","跟练播放器","自测方法（可选麦克风反馈）","内链：节拍器页、各扫弦型页"]
  - targetQuery: how to practice ukulele with metronome bpm
  - priority: P1
- - path: /practice/rhythm-exercises/
  - title: Ukulele Rhythm Exercises — Daily 10-Minute Routine
  - purpose: 承接每日练习计划类搜索，提供可执行的 10 分钟节奏练习流程，并作为练习类页面的聚合入口
  - keySections: ["10 分钟练习流程（热身/扫弦型/拍号/自测）","每日打卡表","跟练播放器入口","内链：扫弦型页、拍号页、BPM 渐进页","FAQ"]
  - targetQuery: ukulele rhythm exercises
  - priority: P1

## techStack
> 技术选型建议数组，每项 {choice, why, alternative}

- - choice: 静态站点生成（Next.js SSG 或 Astro）
  - why: 工具页需要快速首屏与可索引的静态 HTML，同时保留交互组件（节拍器/播放器）的客户端能力
  - alternative: 纯静态 HTML + 轻量 JS，或 Vite + 预渲染
- - choice: Web Audio API 实现节拍器与节奏播放
  - why: 浏览器原生、零依赖、延迟可控，适合 BPM 与拍号实时调整
  - alternative: Tone.js（封装更完善，体积略大）
- - choice: 麦克风节奏检测优先本地处理（Web Audio + 客户端算法）
  - why: 降低隐私合规风险（音频不上传），符合 GDPR 数据最小化原则
  - alternative: 服务端音频分析（需额外隐私披露与同意流程，不推荐首选）
- - choice: 结构化数据：FAQPage / HowTo / WebApplication / BreadcrumbList
  - why: 工具页与教程页可争取富结果，提升 CTR
  - alternative: 仅 FAQPage + BreadcrumbList 的最小集
- - choice: 分析工具：隐私友好的轻量分析（如 Plausible/Umami）+ GSC
  - why: 无需 Cookie 同意即可获得基础会话数据，降低合规负担
  - alternative: GA4（需完整 Cookie 同意管理）
- - choice: 托管：静态托管 + 全球 CDN（如 Vercel/Cloudflare Pages）
  - why: 移动端全球访问性能与 CWV 达标
  - alternative: 传统虚拟主机（性能与部署效率较低）

## seoBaseline
> SEO 基线要求数组（title/meta/结构化数据/性能/llms.txt 等必须满足项）

- 每个页面唯一 title（≤60 字符）与 meta description（≤155 字符），包含目标关键词与差异化卖点
- 每页唯一 H1，与 targetQuery 语义一致；标题层级不跳级
- URL 采用小写、连字符、语义化目录结构（/strumming-patterns/、/time-signatures/），不带参数与多余层级
- 全站 canonical 自引用；分页/聚合页与单页之间避免关键词自相残杀（聚合页面向分类词，单页面向具体节奏型词）
- 结构化数据：首页 WebApplication、教程页 HowTo、FAQ 区块 FAQPage、全站 BreadcrumbList，Rich Results 测试 0 错误
- Core Web Vitals：移动端 LCP<2.5s、INP<200ms、CLS<0.1；音频/播放器组件延迟加载，不阻塞首屏
- 移动端优先响应式；节拍器与播放器触控目标≥44px
- XML sitemap 自动生成并提交 GSC；robots.txt 允许抓取工具页与静态资源
- 内链：每个单页至少 3 条相关内链（相邻扫弦型、拍号页、节拍器页），聚合页内链全部子页
- 提供 llms.txt，说明站点用途、核心工具页与页面分类，便于 AI 搜索引用
- 隐私政策、Cookie 同意（非必要 Cookie 默认不加载）、可访问性基本合规（WCAG 2.1 AA 方向）
- 图片/图示使用 alt 文本描述节奏记号；音频示例提供文字替代说明

## nextActions
> 下一步动作数组，每项 {action, owner, effort}

- - action: 完成域名与商标可用性核查，确定主域名与 rhythm 拼写防御性域名
  - owner: 站长/产品负责人
  - effort: 1-2 小时人工核查（结果未知）
- - action: 用关键词工具验证页面矩阵中每个 targetQuery 的搜索量与难度，剔除无需求词并补充遗漏长尾
  - owner: SEO
  - effort: 2-4 小时（数据依赖工具，量级为估算）
- - action: 搭建站点骨架：目录结构、母版模板（工具页/单扫弦型页/拍号页/聚合页四类模板）与内链规则
  - owner: 前端
  - effort: 2-3 天
- - action: 实现节拍器与跟练播放器 MVP（BPM、拍号、预设扫弦型），确保移动端可用
  - owner: 前端
  - effort: 3-5 天
- - action: 接入 GSC 与轻量分析工具，建立首月基线（索引数、点击、排名、会话深度）
  - owner: SEO/前端
  - effort: 半天
- - action: 上线前验收：TDH 唯一性、结构化数据、CWV、sitemap、llms.txt、隐私与 Cookie 同意
  - owner: SEO/前端
  - effort: 1 天
- - action: 按 P0→P1 顺序发布页面，每页发布后 48 小时内提交索引并记录基线排名
  - owner: 内容/SEO
  - effort: 持续 4-8 周

## 其他输出

### __missing


### __fieldCompliance
100%
