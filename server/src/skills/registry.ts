// 技能执行注册表：把「SKILL.md 文档」变成「可执行的任务」。
//
// 执行单元 = 5 个合并技能套件（seo-research / seo-technical / seo-content-geo /
// seo-monitor / seo-orchestrator），每个套件下挂若干具体任务。
// 53 个原始技能按 suite 归属到这 5 个套件，作为「能力清单」注入 prompt。
//
// 每个任务定义：输入字段、需要的真实采集、注入哪些 references、输出结构（给 LLM 的硬性约束）。
// 流程对齐「独立站产品」9 步：需求调研 → 创建站点(含建档) → SEO·GEO → 合规 → 技术SEO·GEO
//   → 内容生产 → 部署上线 → 外链推广 → 线上监控。
// 哥飞方法论贯穿：KDROI 选词、分门别类罗列、外链质量排序、养网站防老。

export interface TaskInput {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  default?: string;
  hint?: string;
}

export interface TaskDef {
  key: string;
  name: string;
  desc: string;
  /** 该任务主要服务的增长流程步骤（1..9） */
  step: number;
  inputs: TaskInput[];
  /** 需要哪种真实采集 */
  collect: 'suggest' | 'page' | 'none';
  /** 注入的 references 文件名（相对套件 references/ 目录） */
  refs: string[];
  /** 输出字段说明（字段名 -> 说明），用于约束 LLM 输出结构 */
  outputFields: Record<string, string>;
  /** 生成给 LLM 的用户 prompt */
  prompt: (v: Record<string, any>, ctx: TaskContext) => string;
}

export interface TaskContext {
  /** 真实采集到的联想词 */
  realTerms: string[];
  /** 采集来源说明 */
  provenance: string[];
  /** 是否有真实数据 */
  hasRealData: boolean;
  /** 抓取的页面事实（collect=page 时） */
  pageFacts?: any;
  /** 上游任务的产物（回流） */
  upstream?: any;
  /** 用户上传截图的 OCR 文本（需求调研步骤用于指标分析），每项 {name, ocrText} */
  images?: { name: string; ocrText: string }[];
  /** 站点上下文（来自建档）：建档字段统一带下，无需引用上一步 */
  siteContext?: string;
}

export interface SuiteDef {
  slug: string;
  name: string;
  desc: string;
  /** 主要流程步骤 */
  step: number;
  /** 该套件覆盖的原始技能数量说明 */
  covers: string;
  tasks: TaskDef[];
}

// ---------- seo-research：关键词评估 / SERP / 竞品 / 外链 ----------
const researchTasks: TaskDef[] = [
  {
    key: 'keyword-evaluate',
    name: '关键词评估（值不值得做）',
    desc: '对种子词做长尾扩展、意图判断、竞争度与机会评估；用 Google 及免费工具（Trends/Keyword Planner/Ahrefs·Semrush 免费版）初步验证商业价值，再结合上传的 SimilarWeb、Semrush 指标截图（OCR 提取）做进一步分析。产出可决策的优先级清单。',
    step: 1,
    collect: 'suggest',
    refs: ['google-seo-guide.md', 'quality-gates.md'],
    inputs: [
      { key: 'seed', label: '种子关键词', type: 'text', required: true, placeholder: '如 ukulele chord trainer', hint: '英文优先，采集源对英文更准' },
      { key: 'market', label: '目标市场/语言', type: 'text', default: '全球/英语', placeholder: '如 美国/英语' },
      { key: 'product', label: '产品/站点描述', type: 'textarea', placeholder: '一句话说明你卖什么、给谁用' },
      { key: 'goal', label: '本次目标', type: 'select', options: ['判断是否值得做', '找可排名长尾', '找内容选题'], default: '判断是否值得做' },
    ],
    outputFields: {
      verdict: '结论：值得做 / 谨慎 / 不值得，一句话',
      score: '0-100 总评分（整数）',
      rationale: '3-5 条判断理由，每条一句话',
      kdroi: '商业价值初判：基于「KDROI = 搜索量 × CPC ÷ 竞争难度」的优先级排序，标注哪些是估算',
      toolsChecked: '用到的免费工具与初步验证结论（Google Trends 趋势方向、Keyword Planner 免费额度的量/CPC 信号、Ahrefs/Semrush 免费版的 KD/流量估算；指标截图已 OCR 提取），逐项标注真实数据 vs 估算',
      longtail: '长尾词数组，每项 {term, intent, difficulty(1-100), volume(估算整数或"未知"), opportunity(高/中/低), why}',
      clusters: '意图簇数组，每项 {cluster, primary, intent, targetPage, priority}',
      risks: '风险数组，每项一条字符串',
      nextActions: '下一步动作数组，每项 {action, owner, effort}',
    },
    prompt: (v, ctx) => `请对一个关键词机会做评估。

【种子词】${v.seed}
【目标市场】${v.market || '未指定'}
【产品描述】${v.product || '未提供'}
【本次目标】${v.goal || '判断是否值得做'}

【真实采集到的联想词】（来源：${ctx.provenance.join('、') || '无'}，共 ${ctx.realTerms.length} 条）
${ctx.realTerms.length ? ctx.realTerms.slice(0, 60).map((t, i) => `${i + 1}. ${t}`).join('\n') : '（未采集到真实联想词）'}

${ctx.images && ctx.images.length
      ? `【用户上传的指标截图（已用 OCR 提取文本，请据此做进一步分析，注意 OCR 可能含噪点，关键信息以数字为准）】
${ctx.images.map((im, i) => `— 截图 ${i + 1}（${im.name}）—
${im.ocrText || '（OCR 未提取到文本）'}`).join('\n\n')}`
      : ''}

要求（贯穿哥飞选词逻辑）：
1. 优先基于上面**真实采集**的联想词做扩展与判断；真实数据不足时再补充你自己的扩展，并自行标注为估算。
2. 用 KDROI 思路判断商业价值：${''/* 搜索量 × CPC ÷ 竞争难度 */}量越大、CPC 越高、竞争越低，越值得抢先做。把候选词按 KDROI 排优先级。
3. 明确列出用到的免费验证工具（Google Trends 看趋势方向、Google Keyword Planner 免费额度的量/CPC 信号、Ahrefs/Semrush 免费版的 KD/流量估算），并区分「真实信号」与「模型估算」。搜索量/难度若无可靠来源，用 volume:"未知"、difficulty 给 1-100 的**估算**并说明依据，不要编造精确数字。
4. 若提供了 SimilarWeb/Semrush 等截图，结合 OCR 文本中的搜索量、CPC、竞争度、流量/外链数做交叉验证，并指出与免费工具结论是否一致。
5. 意图分为：信息 / 商业 / 交易 / 导航。结论必须可执行：给出「值得做/谨慎/不值得」及关键理由。
${ctx.upstream ? `\n【上游产物参考】\n${JSON.stringify(ctx.upstream).slice(0, 3000)}` : ''}`,
  },
  {
    key: 'serp-intent',
    name: 'SERP 意图与竞争分析',
    desc: '判断目标词的用户意图、SERP 形态与「能否竞争」，给出内容角度建议。',
    step: 1,
    collect: 'suggest',
    refs: ['google-seo-guide.md', 'mcp-degradation.md'],
    inputs: [
      { key: 'keyword', label: '目标关键词', type: 'text', required: true, placeholder: '如 best ukulele app' },
      { key: 'competitors', label: '已知竞品（逗号分隔）', type: 'text', placeholder: 'site1.com, site2.com' },
    ],
    outputFields: {
      intent: '主意图：信息/商业/交易/导航',
      intentMixed: '是否混合意图（布尔）',
      serpFeatures: 'SERP 特性数组，如 ["精选摘要","AI 概览","PAA","视频"]',
      canCompete: '能否竞争：能 / 有条件能 / 难',
      contentAngle: '建议的内容切入角度（2-4 条）',
      pageType: '建议页面类型：指南/对比/工具/列表/评测',
      titles: '建议标题 3 条',
    },
    prompt: (v, ctx) => `分析关键词的 SERP 意图与可竞争性。

【关键词】${v.keyword}
【已知竞品】${v.competitors || '未提供'}
【真实联想词】${ctx.realTerms.slice(0, 40).join(' | ') || '（无）'}

要求：判断主意图与是否混合意图、列出可能出现的 SERP 特性、给出能否竞争的判断和理由、推荐内容角度与页面类型。不要编造具体的搜索量数字。`,
  },
  {
    key: 'competitor',
    name: '竞品拆解',
    desc: '拆解指定竞品的流量来源、内容策略与外链模式，找出可借鉴与可反超的点。',
    step: 1,
    collect: 'suggest',
    refs: ['ahrefs-api-reference.md', 'ai-crawlers-guide.md'],
    inputs: [
      { key: 'domain', label: '竞品域名', type: 'text', required: true, placeholder: 'competitor.com' },
      { key: 'mySite', label: '我的站点/产品', type: 'text', placeholder: '用于对比定位' },
    ],
    outputFields: {
      overview: '竞品概览：定位、主要获流页面类型、内容主题',
      strengths: '值得学习（3-5 条）',
      weaknesses: '可反超的缺口（3-5 条）',
      contentThemes: '内容主题分布数组',
      linkPatterns: '外链/引用模式观察',
      counterPosition: '反定位建议（2-3 条）',
    },
    prompt: (v, ctx) => `拆解竞品：${v.domain}。我的站点/产品：${v.mySite || '未提供'}。
真实联想词线索：${ctx.realTerms.slice(0, 30).join(' | ') || '（无）'}
要求：基于公开可推断的信息与你的行业知识，给出概览、值得学习点、可反超缺口、内容主题、外链模式、反定位建议。无法核实的数据必须标注"估算"。`,
  },
  {
    key: 'link-prospecting',
    name: '外链/引用机会挖掘',
    desc: '按主题构造查询，找出资源页、盘点页、对比页等可争取引用的机会。哥飞外链质量排序：流量 > 品牌 > 活跃。',
    step: 8,
    collect: 'suggest',
    refs: ['ahrefs-api-reference.md'],
    inputs: [
      { key: 'topic', label: '主题/产品', type: 'text', required: true, placeholder: '如 ukulele learning app' },
      { key: 'competitors', label: '竞品域名（逗号分隔）', type: 'text' },
    ],
    outputFields: {
      queries: '构造的查询词数组',
      opportunities: '机会数组，每项 {type(资源页/盘点/对比/出版商), query, targetType, howToApproach, priority, qualityScore(流量/品牌/活跃 综合)}',
      note: '关于只记录真实联系方式、外链是中长期资产的提醒',
    },
    prompt: (v, ctx) => `为主题「${v.topic}」挖掘外链/引用机会。竞品：${v.competitors || '未提供'}。
真实联想词：${ctx.realTerms.slice(0, 30).join(' | ') || '（无）'}
要求：构造 <主题> resources / best <类> tools / <竞品> alternatives / <主题> statistics 等查询；列出机会类型与接近方式；按哥飞外链质量排序打分（真实流量 > 品牌权重 > 站点活跃度）；只记录真实能找到联系方式的机会，找不到的标注"需自行核实"。`,
  },
];

// ---------- seo-technical：技术 SEO 与合规 ----------
const technicalTasks: TaskDef[] = [
  {
    key: 'compliance-check',
    name: '面向地区合规优化',
    desc: '按产品面向地区输出上线前合规清单：隐私政策、Cookie 同意、数据处理、未成年人保护、无障碍、邮件营销规则等。海外产品上线前必须过这一关。',
    step: 4,
    collect: 'none',
    refs: ['quality-gates.md', 'eeat-framework.md'],
    inputs: [
      { key: 'region', label: '面向地区', type: 'select', required: true, options: ['全球/英语（宽松基线）', '欧盟/EEA（GDPR）', '英国（UK GDPR）', '美国加州（CCPA/CPRA）', '美国（含儿童 COPPA）', '日本（APPI）', '韩国（PIPA）', '巴西（LGPD）'], default: '全球/英语（宽松基线）' },
      { key: 'productType', label: '产品类型', type: 'select', options: ['工具/SaaS', '内容/博客', '电商', '社区/UGC', '移动 App 官网'], default: '工具/SaaS' },
      { key: 'dataCollection', label: '数据收集范围', type: 'select', options: ['仅匿名统计', '统计+邮箱订阅', '账号体系+个人数据', '含支付/敏感数据'], default: '统计+邮箱订阅' },
      { key: 'siteName', label: '产品名', type: 'text', placeholder: '如 Rhythm Trainer' },
    ],
    outputFields: {
      applicableLaws: '适用法规数组，每项 {law, region, why}',
      mustHave: '上线前必须具备的合规件数组（隐私政策/Cookie 横幅/ToS 等），每项 {item, requirement}',
      cookieConsent: 'Cookie 同意方案：要什么横幅、拒绝按钮、同意记录',
      privacyPolicyOutline: '隐私政策大纲数组（按数据收集范围裁剪）',
      dataProcessing: '数据处理要求：存储地、保留期、第三方共享、删除权',
      accessibility: '无障碍要求（如 EAA/WCAG 级别）与落地建议',
      marketingRules: '邮件/营销规则：双重确认、退订链接、发件人身份',
      riskLevel: '总体风险：高/中/低 及一句话解释',
      checklist: '上线前合规检查表数组，每项 {item, priority(必做/建议), how}',
    },
    prompt: (v, ctx) => `对「${v.siteName || '该产品'}」做面向地区的合规优化。

【面向地区】${v.region}
【产品类型】${v.productType}
【数据收集范围】${v.dataCollection}
${ctx.upstream ? `【上游产品档案】\n${JSON.stringify(ctx.upstream).slice(0, 2000)}` : ''}

要求：
1. 严格按面向地区列适用法规（欧盟=GDPR+ePrivacy+DSA 相关义务；加州=CCPA/CPRA；美国含儿童=COPPA；日本=APPI；韩国=PIPA；巴西=LGPD；全球基线=隐私政策+Cookie 披露+退订权）。
2. mustHave 与 checklist 是上线门禁：每项给具体做法，不写「咨询律师」这类空话；法律不确定性用「建议法务复核」标注。
3. 数据收集范围越大，隐私政策大纲与数据处理要求越细（含支付/敏感数据时加 PCI 与加密要求）。
4. 不要编造法规条文编号；不确定的用「待核实」标注。`,
  },
  {
    key: 'audit',
    name: '技术 SEO 清单与审计',
    desc: '产出技术项验收清单（上线前照单落实）；站点已上线可填 URL 真实抓取 HTML，提取确定性事实（title/meta/canonical/h1/结构化数据）并给出修复清单。同时生成可直接部署的 robots.txt / sitemap.xml / llms.txt。',
    step: 5,
    collect: 'page',
    refs: ['cwv-thresholds.md', 'schema-types.md', 'google-seo-guide.md', 'llms-txt-spec.md'],
    inputs: [
      { key: 'url', label: '站点 URL（已上线可填）', type: 'text', placeholder: 'https://example.com', hint: '未上线留空：输出上线前技术验收清单 + 默认文件；已上线填写则真实抓取诊断' },
      { key: 'focus', label: '审计重点', type: 'select', options: ['全面', '索引与抓取', '性能 CWV', '结构化数据', '移动端', '多语言'], default: '全面' },
      { key: 'domain', label: '主域名（未上线时用于生成文件）', type: 'text', placeholder: 'example.com' },
    ],
    outputFields: {
      facts: '从真实 HTML 提取到的事实（原样回填，字段名与输入一致）',
      findings: '问题数组，每项 {severity(严重/中/低), area, issue, evidence, fix, effort}',
      scorecard: '分项评分对象 {indexing, performance, structuredData, mobile, content}（0-100）',
      quickWins: '可立即修复的快赢项数组',
      structuredDataPlan: '建议补充的结构化数据类型与理由',
      robotsTxt: '可直接部署的 robots.txt 文件内容',
      sitemapXml: '可直接部署的 sitemap.xml 文件内容（基于规划页面或抓取到的 URL）',
      llmsTxt: '可直接部署的 llms.txt 文件内容',
    },
    prompt: (v, ctx) => `对站点做技术 SEO ${v.url ? '审计（已上线，真实抓取诊断）' : '上线前验收清单（站点尚未上线）'}，重点：${v.focus || '全面'}。

【站点】${v.url || v.domain || '未上线（用 domain 生成默认文件）'}

【从真实 HTML 提取的确定性事实】${v.url ? '（这是抓取到的真实数据，不是推测）' : '（未上线无抓取事实）'}
\`\`\`json
${JSON.stringify(ctx.pageFacts || {}, null, 2)}
\`\`\`

要求：
${v.url ? `1. 严格基于上面的**真实事实**判断问题（例如 title 缺失/过长、meta description 缺失、canonical 缺失、h1 数量异常、图片缺 alt、无 JSON-LD、非 HTTPS 等），每个问题引用事实作证据（evidence）。
2. 无法从 HTML 判断的项（如真实 CWV 数值），标注"需实测"。` : `1. 输出建站时要落实的技术项验收清单（title/meta 规则、canonical、robots/sitemap、结构化数据、图片 alt、HTTPS、性能预算、llms.txt），每项给出验收标准与检查方法。
2. facts 字段填"未上线，无抓取事实"；findings 按清单项组织（issue=要落实的技术项，fix=具体做法）。`}
3. 输出可执行的建议与预估工作量。
${ctx.upstream ? `\n【上游产物参考（架构规划 pageMap/页面清单）】\n${JSON.stringify(ctx.upstream).slice(0, 2000)}` : ''}

**robotsTxt / sitemapXml / llmsTxt 三个字段必须作为同一个 JSON 对象的字符串字段返回（与 facts/findings 等并列），字段值即为文件完整内容，注意对换行与双引号做 JSON 转义：**
- robotsTxt：标准 robots.txt，含 Sitemap 指令指向 /sitemap.xml，并按面向地区/AI 爬虫给出合理规则（参考上游合规范围）。
- sitemapXml：标准 XML sitemap，列出站点主要页面 URL（${v.url ? '优先用真实抓取到的 URL' : '用 domain 与上游 pageMap/页面清单生成占位 URL'}），含 lastmod。
- llmsTxt：llms.txt，列出可被 AI 引用的页面与其一句话摘要（参考上游 llmsTxtStructure）。`,
  },
  {
    key: 'geo-audit',
    name: 'GEO / AI 搜索可见性审计',
    desc: '检查站点对 AI 爬虫的友好度、llms.txt、结构化数据与可被引用性（技术SEO·GEO 阶段）。',
    step: 5,
    collect: 'page',
    refs: ['ai-crawlers-guide.md', 'llms-txt-spec.md', 'schema-types.md'],
    inputs: [
      { key: 'url', label: '站点 URL', type: 'text', required: true, placeholder: 'https://example.com' },
    ],
    outputFields: {
      aiCrawlerAccess: 'AI 爬虫可访问性判断（robots/robots.txt 线索）',
      llmsTxt: 'llms.txt 建议（给出可直接使用的文本草案）',
      citability: '可被引用性评分与改进点',
      schemaPlan: '为提升 AI 引用建议补充的结构化数据',
      contentStructure: '内容结构建议（如何让 AI 易于抽取答案）',
    },
    prompt: (v, ctx) => `审计站点的 GEO（AI 搜索可见性）。站点：${v.url}

【真实抓取事实】
\`\`\`json
${JSON.stringify(ctx.pageFacts || {}, null, 2)}
\`\`\`

要求：判断 AI 爬虫可访问性、是否已有 llms.txt（事实见 hasLlmsTxt）、给出**可直接落地的 llms.txt 草案**、为提升被 AI 引用给出结构化数据与内容结构建议。`,
  },
  {
    key: 'deploy-plan',
    name: '部署上线计划',
    desc: '产出上线前检查、部署步骤、上线后收录与验证动作（Cloudflare Pages 等）。',
    step: 7,
    collect: 'none',
    refs: ['google-seo-guide.md', 'cwv-thresholds.md'],
    inputs: [
      { key: 'siteName', label: '站点名', type: 'text', required: true },
      { key: 'domain', label: '域名', type: 'text' },
      { key: 'platform', label: '部署平台', type: 'select', options: ['Vercel', 'Netlify', 'Cloudflare Pages', '自有服务器'], default: 'Cloudflare Pages' },
    ],
    outputFields: {
      preLaunch: '上线前检查清单数组，每项 {item, why, done(false)}',
      deploySteps: '部署步骤数组，每项 {step, command, note}',
      postLaunch: '上线后动作数组（验证、提交收录、监控配置）',
      indexingPlan: '收录推进方案（sitemap、GSC 提交、内链、外链信号）',
      risks: '上线风险与回滚预案数组',
    },
    prompt: (v, ctx) => `为站点制定部署上线计划。
【站点名】${v.siteName}【域名】${v.domain || '未提供'}【平台】${v.platform || 'Cloudflare Pages'}
${v.scaffoldSummary ? `【已生成的站点工程（真实文件清单）】\n${v.scaffoldSummary}` : '（尚未生成站点工程）'}
${ctx.siteContext ? `【站点上下文】${ctx.siteContext}` : ''}
要求：
1. 以「已生成的站点工程」为准：直接说明这个目录怎么部署（命令、输出目录、自定义域名绑定、HTTPS），不要假设需要构建步骤（它是纯静态文件）。
2. preLaunch 必须包含：替换 ${v.scaffoldSummary && /待补充/.test(String(v.scaffoldSummary)) ? '工程中剩余的 [待补充] 文案' : '[待补充] 文案'}、核对 canonical/sitemap 域名、按收费模式检查定价页与广告位（AdSense ID 是否已替换）。
3. postLaunch 与 indexingPlan 给出具体可点的动作：提交 sitemap.xml 到 Google Search Console / Bing Webmaster、验证 robots.txt 与 llms.txt 可访问、用 URL 检查工具请求编入索引。
4. risks 覆盖：域名未解析、占位文案误上线、广告位违规（如放在隐私页）、隐私政策缺失导致拒审。
5. 不要编造真实部署结果（是否已上线只能写进「待确认」）。`,
  },
];

// ---------- seo-content-geo：内容生产 / GEO 优化 ----------
const contentTasks: TaskDef[] = [
  {
    key: 'content-pipeline',
    name: '内容生产流水线（blog规划→生产→去AI味→EEAT验证）',
    desc: '四阶段流水线：① 生成 blog 规划（支柱页/集群/编辑日历/页面清单）；② 内容生产（带论文与权威博客引用的成稿，需人工补的用 [待人工补充：…] 标识）；③ 去AI味（改写为自然、有具体细节与人称声音）；④ EEAT 验证（经验/专业/权威/可信四维评分与缺口）。',
    step: 6,
    collect: 'suggest',
    refs: ['content-pipeline.md', 'de-ai-humanize.md', 'citation-guide.md', 'eeat-framework.md'],
    inputs: [
      { key: 'topic', label: '主题/目标词', type: 'text', required: true, placeholder: '如 chinese names for boys' },
      { key: 'intent', label: '意图', type: 'select', options: ['信息', '商业', '交易', '导航'], default: '信息' },
      { key: 'audience', label: '目标读者', type: 'text', placeholder: '如 在中国的外国人' },
      { key: 'pageKind', label: '页面类型', type: 'select', options: ['博客文章（SEO长页）', '博客支柱页（集群枢纽）', '博客索引页', '转化落地页', '两者都要'], default: '博客文章（SEO长页）', hint: '哥飞：一个关键词一个页面；博客文章走长而全，转化页走短而直接' },
      { key: 'cluster', label: '所属集群/支柱页（可选）', type: 'text', placeholder: '如 中文名大全' },
      { key: 'tone', label: '语气/人称', type: 'select', options: ['第一人称经验分享', '专业中立第三方', '对话式友好'], default: '第一人称经验分享' },
      { key: 'citationsWanted', label: '引用要求', type: 'select', options: ['尽量引用论文+权威博客', '仅权威博客', '不强制引用'], default: '尽量引用论文+权威博客' },
    ],
    outputFields: {
      blogPlan: '博客规划对象：{pillarPages, clusterPosts, editorialCalendar, pageList}（非博客类型给简化版）',
      draft: '阶段②成稿（Markdown，含 [^n] 引用与 [待人工补充：…] 标识）',
      citations: '引用清单数组：{type:paper|blog|authority, title, source, url, confidence:confirmed|needs-human, note}',
      humanized: '阶段③去AI味版本（更自然、有细节与人称声音，保留引用与标识）',
      eeatReport: '阶段④EEAT验证：{experience, expertise, authoritativeness, trust, score(0-100), gaps[], flags[]}',
      checklist: '发布前人工核对清单（汇总全部 [待人工补充] 项与 EEAT 缺口）',
    },
    prompt: (v, ctx) => `执行内容生产四阶段流水线。
【主题】${v.topic}【意图】${v.intent}【读者】${v.audience || '未指定'}【页面类型】${v.pageKind || '博客文章'}
【语气】${v.tone || '第一人称经验分享'}【引用要求】${v.citationsWanted || '尽量引用论文+权威博客'}【所属集群】${v.cluster || '（无）'}
【真实联想词】${ctx.realTerms.slice(0, 40).join(' | ') || '（无）'}
${ctx.upstream ? `【上游产物（第3步 SEO/GEO 架构规划，含 pageMap）】\n${JSON.stringify(ctx.upstream).slice(0, 2500)}` : ''}

必须严格按以下四个阶段产出，最终只输出一个 JSON 对象（字段名见下）：

## 阶段1 · 生成 blog 规划（blogPlan）
- 若 pageKind 含"博客"，给出 pillarPages（支柱页/枢纽页）、clusterPosts（该支柱下的集群文章清单，每篇一个长尾词）、editorialCalendar（建议发布顺序与节奏，如每周 2 篇、先发支柱页）、pageList（本规划涉及的全部页面及 URL 建议）。
- 若上游有 pageMap，直接复用其关键词→页面结构，不要另起炉灶。
- 非博客类型（如转化落地页）给简化版：仅 pageList 与内链建议。

## 阶段2 · 内容生产（draft）
- 产出完整 Markdown 成稿（标题用 #，小节用 ##，列表用 -）。
- 引用要求（${v.citationsWanted}）：**必须给出至少 3 条真实、可核验的引用**，混合 paper 与 blog/authority 两类；优先引用你确实知道真实存在的来源（SEO/营销类：Google Search Central、Ahrefs Blog、Moz、Backlinko、Search Engine Journal；学术类：你记得的真实论文/期刊，尽量带作者/年份/DOI 或 arXiv 编号）。正文用 [^n] 上标，并在 citations 字段给出对应条目。
- citations 条目中 confidence=confirmed 表示你确定该来源真实存在；仅当完全记不清具体文章时才标 needs-human，且 source 必须给"可核验的检索方向"（如 "Google Scholar: Chinese naming conventions"），**citations 字段的 title/source 不得出现 [待人工补充]**。引用真实来源是硬性要求，不得用占位敷衍。
- **凡需要真人补充、模型不应编造的内容，只能在 draft 正文用 [待人工补充：具体说明] 标识**，例如：[待人工补充：插入你给 10 位用户起的中文名真实案例]、[待人工补充：补充本站真实转化率数据]。不要编造真实人名、数据、案例。
- 落实哥飞"分门别类罗列"：一个关键词一个页面；相邻长尾词在文末互相内链。

## 阶段3 · 去AI味（humanized）
- 把 draft 改写为自然、有"人味"的版本：句长有起伏、少用排比与"首先/其次/最后"、加入具体细节与恰当的口语/第一人称（按语气）、去掉空泛套话（"在当今时代""需要注意的是"）。
- 保留全部 [^n] 引用与 [待人工补充：…] 标识，不得删除或伪造。

## 阶段4 · EEAT 验证（eeatReport）
- 按 eeat-framework 给 Experience/Expertise/Authoritativeness/Trust **各一个 0–5 的数字**（不要返回对象，只返回数字），并在 gaps/flags 里写证据与说明；综合 score(0–100)。
- gaps：当前缺失的 EEAT 信号；flags：发布前必须处理的风险（如缺作者署名/资质、无隐私政策链接）。
- checklist：发布前人工核对清单（汇总所有 [待人工补充] 项与 EEAT 缺口）。

字段（必须全部返回，命名为）：blogPlan, draft, citations, humanized, eeatReport, checklist。`,
  },
  {
    key: 'geo-optimize',
    name: '站点 SEO/GEO 架构规划',
    desc: '上线前规划「一个关键词一个页面」的 SEO/GEO 架构：关键词→页面映射、分门别类罗列、内链骨架、title/description 模板、llms.txt 结构与答案块规划。不依赖正文，作为第 6 步内容生产的蓝图。',
    step: 3,
    collect: 'suggest',
    refs: ['ai-crawlers-guide.md', 'llms-txt-spec.md', 'eeat-framework.md', 'google-seo-guide.md'],
    inputs: [
      { key: 'topic', label: '核心主题/产品', type: 'text', placeholder: '如 chinese name generator', hint: '可留空，自动带入建档信息' },
      { key: 'siteName', label: '站点/产品名', type: 'text', placeholder: '如 MandarinName' },
      { key: 'market', label: '目标市场/语言', type: 'text', default: '全球/英语' },
      { key: 'pageCount', label: '计划页面数（参考）', type: 'text', default: '12' },
    ],
    outputFields: {
      pageMap: '关键词→页面映射数组，每项 {keyword, pageUrl, pageType, intent}（哥飞：一个关键词一个页面，分门别类罗列）',
      internalLinkSkeleton: '内链骨架：相邻长尾词页面互链矩阵（落实分门别类罗列）',
      metaTemplate: 'title/description 模板（含变量，便于母版复用）',
      llmsTxtStructure: 'llms.txt 结构草案（哪些页面可被 AI 引用及其摘要）',
      answerBlockPlan: '每个核心页面应包含的「可独立引用答案块」规划',
      checklist: '上线前 SEO/GEO 架构验收清单',
    },
    prompt: (v, ctx) => `为站点做上线前 SEO/GEO 架构规划（站点尚未上线，不依赖正文，产出给内容生产当蓝图）。

【站点/产品名】${v.siteName || '未指定'}
【核心主题】${v.topic || '未指定'}
【目标市场】${v.market || '全球/英语'}
【计划页面数】${v.pageCount || '12'}

【真实联想词】${ctx.realTerms.slice(0, 40).join(' | ') || '（无）'}
${ctx.upstream ? `【上游产物（建档/调研）】\n${JSON.stringify(ctx.upstream).slice(0, 2500)}` : ''}

要求（哥飞方法论）：
1. 分门别类罗列——一个关键词一个页面，产出 pageMap：每个目标词对应一个 URL、页面类型（SEO长页/转化落地页）、搜索意图。
2. 内链骨架：相邻长尾词页面互相链接形成矩阵，给出 internalLinkSkeleton。
3. metaTemplate：给出可被母版复用的 title/description 模板（含关键词/品牌变量）。
4. llmsTxtStructure：规划 llms.txt，列出可被 AI 引用摘要的页面。
5. answerBlockPlan：每个核心页面应放哪些「可独立被 ChatGPT/Perplexity/AI Overviews 引用的答案块」。
6. checklist：上线前架构验收清单。
所有结论基于真实联想词与上游建档信息，不得编造数据。`,
  },
];

// ---------- seo-monitor：GSC 监控 ----------
const monitorTasks: TaskDef[] = [
  {
    key: 'gsc-monitor',
    name: 'GSC 监控与机会识别',
    desc: '基于 GSC 检查清单识别临近排名机会、点击下滑、自相残杀等问题；结合 UV/PV、跳出率、AdSense 覆盖率判断「这个站值不值得继续养」（养网站防老）。',
    step: 9,
    collect: 'suggest',
    refs: ['gsc-api-reference.md', 'quality-gates.md'],
    inputs: [
      { key: 'site', label: '站点', type: 'text', required: true, placeholder: 'example.com' },
      { key: 'period', label: '对比周期', type: 'select', options: ['7 天 vs 上 7 天', '28 天 vs 上 28 天', '3 个月同比'], default: '28 天 vs 上 28 天' },
      { key: 'data', label: '已有 GSC 数据（可选，CSV 粘贴）', type: 'textarea', placeholder: 'query,clicks,impressions,ctr,position' },
    ],
    outputFields: {
      checklist: 'GSC 检查项数组，每项 {item, howToCheck, whyItMatters}',
      strikingDistance: '临近排名机会（位置 5-20）识别方法与筛选条件',
      cannibalization: '自相残杀检测方法与处理建议',
      healthSignals: '站点健康度信号：UV/PV、人均访问页(≥3.29 较好)、跳出率、平均停留、AdSense 覆盖率(<60% 表示被限流)；据此判断「继续养 / 重点养 / 该撤」',
      alerts: '应配置的告警数组',
      actions: '本周期建议动作数组',
    },
    prompt: (v, ctx) => `为站点 ${v.site} 制定 GSC 监控与养站决策，对比周期：${v.period}。
${v.data ? `【已有 GSC 数据】\n${String(v.data).slice(0, 4000)}` : '（未提供实际数据，请给出方法而非编造结论）'}
【真实联想词】${ctx.realTerms.slice(0, 20).join(' | ') || '（无）'}

要求：给出可执行的检查清单、临近排名机会的筛选条件（位置 5-20、高曝光低点击）、自相残杀检测方法、告警配置；并给出「养站决策」——结合 UV/PV、人均访问页数(≥3.29)、跳出率、平均停留、AdSense 覆盖率(<60% 可能被限流) 判断这个站「继续养 / 重点养 / 该撤」。若没有真实数据，明确说明"需导入 GSC 数据后执行"，不要编造指标。`,
  },
];

// ---------- seo-orchestrator：总控 ----------
const orchestratorTasks: TaskDef[] = [
  {
    key: 'plan',
    name: '全流程增长规划',
    desc: '基于目标站点/产品，产出覆盖 9 步增长流程的阶段性路线图。',
    step: 1,
    collect: 'suggest',
    refs: ['quality-gates.md', 'google-seo-guide.md'],
    inputs: [
      { key: 'product', label: '产品/站点', type: 'text', required: true, placeholder: '如 尤克里里节奏训练 App' },
      { key: 'seed', label: '核心种子词', type: 'text', placeholder: '如 ukulele chord trainer' },
      { key: 'stage', label: '当前阶段', type: 'select', options: ['还没开始', '已有站点', '有内容缺流量', '有流量要变现'], default: '还没开始' },
      { key: 'budget', label: '每周可投入时间', type: 'text', default: '10 小时' },
    ],
    outputFields: {
      positioning: '定位与差异化建议',
      roadmap: '路线图数组，每项 {step(1-9), phase, goal, actions[], deliverable, exitCriteria}',
      priorityNow: '当前最该做的 3 件事',
      metrics: '应跟踪的指标数组',
      risks: '主要风险与规避',
    },
    prompt: (v, ctx) => `为产品「${v.product}」制定增长路线图。
【种子词】${v.seed || '未提供'}【当前阶段】${v.stage}【每周投入】${v.budget}
【真实联想词】${ctx.realTerms.slice(0, 40).join(' | ') || '（无）'}

要求：按增长流程 9 步（需求调研→创建站点→SEO·GEO 优化→合规优化→技术SEO·GEO→内容生产→部署上线→外链推广→线上监控）给出阶段性目标、动作、交付物与**退出标准**（什么条件下进入下一步）。结合每周投入给出务实的优先级。`,
  },
  {
    key: 'create-site',
    name: '新建独立站产品并生成站点规格',
    desc: '根据调研结论建立独立站产品档案（定位/面向地区/语言），再产出站点规格与页面矩阵（哥飞「分门别类罗列」：一个关键词一个页面，规划 TDH、URL 结构、母版模板复用）。建档信息作为后续所有步骤的统一上下文。',
    step: 2,
    collect: 'none',
    refs: ['quality-gates.md', 'schema-types.md', 'google-seo-guide.md', 'cwv-thresholds.md'],
    inputs: [
      { key: 'siteName', label: '产品名', type: 'text', required: true, placeholder: '如 Rhythm Trainer' },
      { key: 'domain', label: '域名（可选）', type: 'text', placeholder: '如 example.com' },
      { key: 'region', label: '面向地区（决定合规策略）', type: 'select', required: true, options: ['全球/英语（宽松基线）', '欧盟/EEA（GDPR）', '英国（UK GDPR）', '美国加州（CCPA/CPRA）', '美国（含儿童 COPPA）', '日本（APPI）', '韩国（PIPA）', '巴西（LGPD）'], default: '全球/英语（宽松基线）', hint: '第 4 步合规优化会按这里选的地区出清单' },
      { key: 'positioning', label: '产品定位', type: 'textarea', required: true, placeholder: '给谁用、解决什么问题、和竞品的差异（可直接用调研结论）' },
      { key: 'language', label: '站点语言', type: 'select', options: ['英语', '英语+小语种', '中文+英语'], default: '英语' },
      { key: 'siteType', label: '站点类型', type: 'select', options: ['落地页', '博客/内容站', '工具站', '文档站'], default: '工具站' },
      { key: 'monetization', label: '收费模式', type: 'select', options: ['免费 + 广告（AdSense）', '订阅制（月付/年付）', '一次性买断', '免费增值（Freemium）', '联盟营销', '混合（订阅 + 广告）', '暂不变现'], default: '免费 + 广告（AdSense）' },
      { key: 'price', label: '目标定价（可选）', type: 'text', placeholder: '如 $9/月、$49 一次性' },
      { key: 'requirement', label: '需求描述', type: 'textarea', placeholder: '想做什么站、核心页面有哪些、风格偏好' },
    ],
    outputFields: {
      productProfile: '产品档案一段话：做什么、给谁用、核心价值',
      targetUsers: '目标用户画像数组，每项 {segment, pain, trigger}',
      differentiation: '与竞品的差异化要点数组',
      monetizationPlan: '变现方案：为什么这个收费模式适合它、付费墙/广告位放在哪几个页面、从免费访客到付费的转化路径（3-5 条要点）',
      pricingTiers: '定价套餐数组，每项 {name, price, billing, features[], bestFor}；若有免费版也列为套餐并标 $0',
      complianceScope: '面向地区带来的合规范围摘要（详细清单在第 4 步合规优化展开）',
      domainAdvice: '域名/命名建议与注意事项',
      successMetrics: '成功指标数组，每项 {metric, target, window}',
      siteSpec: '站点规格：定位、目标受众、核心差异化（一段话）',
      pages: '页面清单数组（分门别类罗列：一个关键词一个页面），每项 {path, title, purpose, keySections[], targetQuery, priority}',
      techStack: '技术选型建议数组，每项 {choice, why, alternative}',
      seoBaseline: 'SEO 基线要求数组（title/meta/结构化数据/性能/llms.txt 等必须满足项）',
      nextActions: '下一步动作数组，每项 {action, owner, effort}',
    },
    prompt: (v, ctx) => `根据调研内容新建独立站产品并生成站点规格。

【产品名】${v.siteName}
【域名】${v.domain || '未定'}
【面向地区】${v.region}
【站点语言】${v.language || '英语'}
【产品定位】${v.positioning}
【站点类型】${v.siteType || '未指定'}
【收费模式】${v.monetization || '未指定'}${v.price ? `（目标定价 ${v.price}）` : ''}
【需求描述】${v.requirement || '未提供'}
${ctx.upstream ? `【上游调研结论】\n${JSON.stringify(ctx.upstream).slice(0, 2500)}` : ''}

要求：
1. 先建档：产品档案要能直接指导后续建站与内容，目标用户具体到使用场景。
2. monetizationPlan 必须给出可落地的变现设计：说明为什么选这个收费模式；广告模式下要指出哪些页面放广告位、哪些页面绝不能放（如支付/隐私页）；订阅/买断模式要指出付费墙卡在哪一步、免费额度怎么定；并给出免费→付费的转化路径。定价要参考目标市场购买力，不要凭空编造精确转化率。
3. pricingTiers 给 2-3 个套餐（含免费版时标 $0），每个套餐列出关键功能差异与适合人群，价格与 billing（月付/年付/一次性）要写清。若用户给了目标定价，围绕它设计。
2. complianceScope 按面向地区给出合规范围摘要（如欧盟 GDPR 要隐私政策+Cookie 同意+数据处理记录），详细清单留给第 4 步合规优化。
3. 再出站点规格与页面矩阵，严格遵循哥飞「分门别类罗列」：一个关键词一个页面，相邻长尾词互相内链，规划好 TDH（Title/Description/H1）、URL 结构、母版模板复用。
4. SEO 基线列出必须满足项（title/meta/结构化数据/性能/llms.txt），作为验收标准。
5. successMetrics 给可度量指标，不要编造数字；若有上游调研结论，定位与目标用户优先采用其中的机会词与用户痛点。`,
  },
];

export const SUITES: SuiteDef[] = [
  {
    slug: 'seo-research',
    name: 'SEO 研究与竞品',
    desc: '关键词评估、意图聚类、SERP 竞争、竞品拆解、外链机会。',
    step: 1,
    covers: '',
    tasks: researchTasks,
  },
  {
    slug: 'seo-technical',
    name: '技术 SEO 与合规',
    desc: '站点审计、CWV、结构化数据、面向地区合规清单、GEO/AI 可见性。',
    step: 4,
    covers: '',
    tasks: technicalTasks,
  },
  {
    slug: 'seo-content-geo',
    name: '内容与 GEO',
    desc: '内容 Brief、E-E-A-T、GEO 优化、AI 引用友好改造。',
    step: 3,
    covers: '',
    tasks: contentTasks,
  },
  {
    slug: 'seo-monitor',
    name: '监控与回流',
    desc: 'GSC 检查、临近排名机会、自相残杀检测、养站决策。',
    step: 9,
    covers: '',
    tasks: monitorTasks,
  },
  {
    slug: 'seo-orchestrator',
    name: '总控与编排',
    desc: '全流程路线图、阶段退出标准、独立站产品建档与站点规格。',
    step: 2,
    covers: '',
    tasks: orchestratorTasks,
  },
];

export function findSuite(slug: string): SuiteDef | undefined {
  return SUITES.find((s) => s.slug === slug);
}

export function findTask(suiteSlug: string, taskKey: string): { suite: SuiteDef; task: TaskDef } | undefined {
  const suite = findSuite(suiteSlug);
  if (!suite) return undefined;
  const task = suite.tasks.find((t) => t.key === taskKey);
  if (!task) return undefined;
  return { suite, task };
}

/** 所有可执行任务的扁平列表（前端工作台用） */
export function allTasks(): { suite: string; suiteName: string; step: number; task: TaskDef }[] {
  const out: { suite: string; suiteName: string; step: number; task: TaskDef }[] = [];
  for (const s of SUITES) {
    for (const t of s.tasks) out.push({ suite: s.slug, suiteName: s.name, step: t.step || s.step, task: t });
  }
  return out;
}
