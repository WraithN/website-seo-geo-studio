// 流程步骤的「执行定义」：用户在流程节点上只需填必要信息，点执行，看结果。
// 技能与 n8n 工作流是后台实现细节，不暴露在用户界面上（编排配置另设管理页）。
//
// 每个步骤声明：
//   inputs    —— 用户需要填的必要字段（面向业务，不面向技术）
//   exec      —— 执行方式：skill（调用某套件任务）/ bridge（调建站助手引擎）
//   outputs   —— 结果区要展示的字段（对应技能的 outputFields）

export interface StepInput {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  /** 条件必填：当另一字段等于某值时才必填 */
  requiredWhen?: { key: string; equals: string };
  options?: string[];
  default?: string;
  hint?: string;
}

export interface StepExec {
  /** 执行方式 */
  kind: 'skill' | 'bridge';
  /** kind=skill 时的套件与任务 */
  suite?: string;
  /** kind=skill 时的任务 */
  task?: string;
  /** kind=bridge 时的引擎端点 */
  engine?: string;
  /**
   * 条件路由：输入满足 when 时改用该套件/任务。
   * 例：按输入切换执行的任务。
   */
  variants?: { when: { key: string; equals: string }; suite: string; task: string }[];
}

export interface StepDef {
  step: number;
  key: string;
  label: string;
  phase: string;
  /** 产品分组：pre 立项（产品外）/ create 产品创建 / operate 产品运营 */
  group: 'pre' | 'create' | 'operate';
  /** 这一步替用户解决什么问题（界面上的一句话） */
  goal: string;
  inputs: StepInput[];
  exec: StepExec;
  /** 结果区展示的字段键（顺序即展示顺序） */
  outputs: string[];
  /** 结果字段的友好中文标签（键 -> 简短标签），前端据此渲染，不再暴露英文字段名 */
  outputLabels: Record<string, string>;
  /** 后台实际用到的技能套件与 n8n 工作流（仅编排配置页展示） */
  backend: { suites: string[]; workflows: string[]; note?: string };
}

export const STEP_DEFS: StepDef[] = [
  {
    step: 1,
    key: 'research',
    label: '需求调研',
    phase: '立项',
    group: 'pre',
    goal: '判断这个词/需求值不值得做：扩词 + 用 Google 及免费工具初步验证商业价值（KDROI：搜索量×CPC÷竞争难度），再结合上传的 SimilarWeb、Semrush 指标截图做进一步分析。此时还没有产品。',
    inputs: [
      { key: 'seed', label: '核心关键词', type: 'text', required: true, placeholder: '如 ukulele chord trainer', hint: '英文优先' },
      { key: 'product', label: '产品/站点描述', type: 'textarea', placeholder: '一句话说明你做什么、给谁用', required: true },
      { key: 'market', label: '目标市场', type: 'text', default: '全球/英语' },
    ],
    exec: { kind: 'skill', suite: 'seo-research', task: 'keyword-evaluate' },
    outputs: ['verdict', 'score', 'rationale', 'kdroi', 'toolsChecked', 'longtail', 'clusters', 'risks', 'nextActions'],
    outputLabels: {
      verdict: '结论', score: '值得做评分', rationale: '判断理由', kdroi: '商业价值（kdroi）',
      toolsChecked: '已验证的免费工具', longtail: '长尾词机会', clusters: '意图簇', risks: '风险', nextActions: '下一步动作',
    },
    backend: { suites: ['seo-research'], workflows: ['keyword-research'] },
  },
  {
    step: 2,
    key: 'create',
    label: '创建站点',
    phase: '建站',
    group: 'create',
    goal: '先建档（产品名/域名/面向地区/定位/语言/收费模式），再产出站点规格与页面矩阵：一个关键词一个页面，规划 TDH、URL 结构与母版模板；同时给出收费模式、定价套餐与转化路径。这一步完成后会自动生成可下载、可部署的站点工程。',
    inputs: [
      { key: 'siteName', label: '产品名', type: 'text', required: true, placeholder: '如 Rhythm Trainer' },
      { key: 'domain', label: '域名（可选）', type: 'text', placeholder: '如 example.com' },
      { key: 'region', label: '面向地区（决定合规策略）', type: 'select', required: true, options: ['全球/英语（宽松基线）', '欧盟/EEA（GDPR）', '英国（UK GDPR）', '美国加州（CCPA/CPRA）', '美国（含儿童 COPPA）', '日本（APPI）', '韩国（PIPA）', '巴西（LGPD）'], default: '全球/英语（宽松基线）', hint: '第 4 步合规优化会按这里选的地区出清单' },
      { key: 'positioning', label: '产品定位', type: 'textarea', required: true, placeholder: '给谁用、解决什么问题、和竞品的差异（可直接用调研结论）' },
      { key: 'language', label: '站点语言', type: 'select', options: ['英语', '英语+小语种', '中文+英语'], default: '英语' },
      { key: 'siteType', label: '站点类型', type: 'select', options: ['落地页', '博客/内容站', '工具站', '文档站'], default: '工具站' },
      { key: 'monetization', label: '收费模式（决定做哪些商业页）', type: 'select', options: ['免费 + 广告（AdSense）', '订阅制（月付/年付）', '一次性买断', '免费增值（Freemium）', '联盟营销', '混合（订阅 + 广告）', '暂不变现'], default: '免费 + 广告（AdSense）', hint: '会决定是否需要定价页 / 付费墙 / 广告位规划' },
      { key: 'price', label: '目标定价（可选）', type: 'text', placeholder: '如 $9/月、$49 一次性' },
      { key: 'requirement', label: '需求描述', type: 'textarea', placeholder: '想做什么站、核心页面有哪些、风格偏好' },
    ],
    exec: { kind: 'skill', suite: 'seo-orchestrator', task: 'create-site' },
    outputs: ['productProfile', 'targetUsers', 'differentiation', 'monetizationPlan', 'pricingTiers', 'complianceScope', 'domainAdvice', 'successMetrics', 'siteSpec', 'pages', 'techStack', 'seoBaseline', 'nextActions'],
    outputLabels: {
      productProfile: '产品档案', targetUsers: '目标用户', differentiation: '差异化要点',
      monetizationPlan: '收费模式与变现路径', pricingTiers: '定价套餐', complianceScope: '合规范围',
      domainAdvice: '域名建议', successMetrics: '成功指标', siteSpec: '站点规格', pages: '页面清单',
      techStack: '技术选型', seoBaseline: 'SEO 基线', nextActions: '下一步动作',
    },
    backend: {
      suites: ['seo-orchestrator', 'seo-technical'],
      workflows: ['n8n-workflow-create', 'n8n-workflow-site-tool'],
      note: '建档信息是后续 3-9 步的统一上下文',
    },
  },
  {
    step: 3,
    key: 'seo',
    label: '站点架构规划',
    phase: '架构',
    group: 'create',
    goal: '写内容前的蓝图：关键词→页面映射（一个词一个页面）、内链骨架、title/description 模板、llms.txt 结构与 AI 可引用答案块。这一步只决定「做哪些页面、每页打什么词」，不写正文。',
    inputs: [
      { key: 'topic', label: '核心主题/产品', type: 'text', placeholder: '如 chinese name generator', hint: '可留空，自动带入建档信息' },
      { key: 'siteName', label: '站点/产品名', type: 'text', placeholder: '如 MandarinName' },
      { key: 'market', label: '目标市场/语言', type: 'text', default: '全球/英语' },
      { key: 'pageCount', label: '计划页面数（参考）', type: 'text', default: '12' },
    ],
    exec: { kind: 'skill', suite: 'seo-content-geo', task: 'geo-optimize' },
    outputs: ['pageMap', 'internalLinkSkeleton', 'metaTemplate', 'llmsTxtStructure', 'answerBlockPlan', 'checklist'],
    outputLabels: {
      pageMap: '关键词→页面映射', internalLinkSkeleton: '内链骨架', metaTemplate: '标题/描述模板',
      llmsTxtStructure: 'llms.txt 结构', answerBlockPlan: '答案块规划', checklist: '验收清单',
    },
    backend: { suites: ['seo-content-geo'], workflows: [] },
  },
  {
    step: 5,
    key: 'compliance',
    label: '合规优化',
    phase: '合规',
    group: 'create',
    goal: '针对产品面向地区输出合规清单：隐私政策、Cookie 同意、数据处理、未成年人保护、无障碍、邮件营销规则等。海外产品上线前必须过这一关，面向地区默认继承建档时的选择。',
    inputs: [
      { key: 'region', label: '面向地区', type: 'select', required: true, options: ['全球/英语（宽松基线）', '欧盟/EEA（GDPR）', '英国（UK GDPR）', '美国加州（CCPA/CPRA）', '美国（含儿童 COPPA）', '日本（APPI）', '韩国（PIPA）', '巴西（LGPD）'], default: '全球/英语（宽松基线）', hint: '自动带入建档的面向地区，可改' },
      { key: 'productType', label: '产品类型', type: 'select', options: ['工具/SaaS', '内容/博客', '电商', '社区/UGC', '移动 App 官网'], default: '工具/SaaS' },
      { key: 'dataCollection', label: '数据收集范围', type: 'select', options: ['仅匿名统计', '统计+邮箱订阅', '账号体系+个人数据', '含支付/敏感数据'], default: '统计+邮箱订阅' },
      { key: 'siteName', label: '产品名', type: 'text', placeholder: '如 Rhythm Trainer' },
    ],
    exec: { kind: 'skill', suite: 'seo-technical', task: 'compliance-check' },
    outputs: ['applicableLaws', 'mustHave', 'cookieConsent', 'privacyPolicyOutline', 'dataProcessing', 'accessibility', 'marketingRules', 'riskLevel', 'checklist'],
    outputLabels: {
      applicableLaws: '适用法规', mustHave: '必备合规件', cookieConsent: 'Cookie 同意方案', privacyPolicyOutline: '隐私政策大纲',
      dataProcessing: '数据处理要求', accessibility: '无障碍要求', marketingRules: '营销规则', riskLevel: '风险等级', checklist: '合规清单',
    },
    backend: { suites: ['seo-technical'], workflows: [], note: '合规结论同时回写产品档案的 complianceScope' },
  },
  {
    step: 6,
    key: 'techseo',
    label: '技术SEO·GEO',
    phase: '技术',
    group: 'create',
    goal: '产出技术项验收清单（抓取/索引/title-meta/canonical/结构化数据/性能/llms.txt/多语言 hreflang），并直接生成可部署的 robots.txt / sitemap.xml / llms.txt。站点已部署上线后，可填 URL 做真实抓取诊断。',
    inputs: [
      { key: 'url', label: '站点 URL（已上线可填）', type: 'text', placeholder: 'https://example.com', hint: '未上线留空即可：将输出上线前技术验收清单 + 默认文件；已上线填写则真实抓取页面做诊断' },
      { key: 'focus', label: '重点', type: 'select', options: ['全面', '索引与抓取', '性能 CWV', '结构化数据', '移动端', '多语言'], default: '全面' },
      { key: 'domain', label: '主域名（未上线时用于生成文件）', type: 'text', placeholder: 'example.com' },
    ],
    exec: { kind: 'skill', suite: 'seo-technical', task: 'audit' },
    outputs: ['facts', 'findings', 'scorecard', 'quickWins', 'structuredDataPlan', 'robotsTxt', 'sitemapXml', 'llmsTxt'],
    outputLabels: {
      facts: '抓取事实', findings: '问题清单', scorecard: '分项评分', quickWins: '快速修复',
      structuredDataPlan: '结构化数据', robotsTxt: 'robots.txt', sitemapXml: 'sitemap.xml', llmsTxt: 'llms.txt',
    },
    backend: { suites: ['seo-technical'], workflows: ['techseo'] },
  },
  {
    step: 4,
    key: 'content',
    label: '内容生产',
    phase: '内容',
    group: 'create',
    goal: '按上一步的页面蓝图逐页写稿，产出可直接发布的正文（标题/大纲/要点/内链/FAQ），再走「去AI味 → EEAT 自检」。一个关键词一个页面；需人工补的用 [待人工补充：…] 标识。',
    inputs: [
      { key: 'topic', label: '主题/目标词', type: 'text', required: true, placeholder: '如 chinese names for boys' },
      { key: 'intent', label: '意图', type: 'select', options: ['信息', '商业', '交易', '导航'], default: '信息' },
      { key: 'audience', label: '目标读者', type: 'text', placeholder: '如 在中国的外国人' },
      { key: 'pageKind', label: '页面类型', type: 'select', options: ['博客文章（SEO长页）', '博客支柱页（集群枢纽）', '博客索引页', '转化落地页', '两者都要'], default: '博客文章（SEO长页）' },
      { key: 'cluster', label: '所属集群/支柱页（可选）', type: 'text', placeholder: '如 中文名大全' },
      { key: 'tone', label: '语气/人称', type: 'select', options: ['第一人称经验分享', '专业中立第三方', '对话式友好'], default: '第一人称经验分享' },
      { key: 'citationsWanted', label: '引用要求', type: 'select', options: ['尽量引用论文+权威博客', '仅权威博客', '不强制引用'], default: '尽量引用论文+权威博客' },
    ],
    exec: { kind: 'skill', suite: 'seo-content-geo', task: 'content-pipeline' },
    outputs: ['blogPlan', 'draft', 'citations', 'humanized', 'eeatReport', 'checklist'],
    outputLabels: {
      blogPlan: '博客规划', draft: '成稿（初稿）', citations: '引用清单', humanized: '去AI味稿', eeatReport: 'EEAT 评分', checklist: '发布前核对',
    },
    backend: { suites: ['seo-content-geo'], workflows: ['content-gen'] },
  },
  {
    step: 7,
    key: 'deploy',
    label: '部署上线',
    phase: '上线',
    group: 'create',
    goal: '产出上线检查清单与部署步骤（Cloudflare Pages 等），提交 GSC/Bing 站长平台，确保发布即可被收录。',
    inputs: [
      { key: 'siteName', label: '站点名', type: 'text', required: true },
      { key: 'domain', label: '域名', type: 'text', placeholder: '如 example.com' },
      { key: 'platform', label: '部署平台', type: 'select', options: ['Vercel', 'Netlify', 'Cloudflare Pages', '自有服务器'], default: 'Cloudflare Pages' },
    ],
    exec: { kind: 'skill', suite: 'seo-technical', task: 'deploy-plan' },
    outputs: ['preLaunch', 'deploySteps', 'postLaunch', 'indexingPlan', 'risks'],
    outputLabels: {
      preLaunch: '上线前检查', deploySteps: '部署步骤', postLaunch: '上线后动作', indexingPlan: '收录推进', risks: '风险与回滚',
    },
    backend: { suites: ['seo-technical'], workflows: ['n8n-workflow-deploy'] },
  },
  {
    step: 8,
    key: 'backlink',
    label: '外链推广',
    phase: '产品运营',
    group: 'operate',
    goal: '产品上线后：按哥飞外链质量排序（流量 > 品牌 > 活跃）找出可争取的外链/引用机会与接近方式。外链是中长期资产，需要维护。',
    inputs: [
      { key: 'topic', label: '主题/产品', type: 'text', required: true },
      { key: 'competitors', label: '竞品域名（逗号分隔）', type: 'text' },
    ],
    exec: { kind: 'skill', suite: 'seo-research', task: 'link-prospecting' },
    outputs: ['queries', 'opportunities', 'note'],
    outputLabels: { queries: '查询词', opportunities: '外链机会', note: '提醒' },
    backend: { suites: ['seo-research'], workflows: ['backlink'] },
  },
  {
    step: 9,
    key: 'monitor',
    label: '线上监控',
    phase: '产品运营',
    group: 'operate',
    goal: '持续监控 UV/PV、人均访问页、跳出率、平均停留、GSC 覆盖与 AdSense 覆盖率，判断这个站「值得养」还是「该撤」，结果回流下一轮迭代（养网站防老）。',
    inputs: [
      { key: 'site', label: '站点', type: 'text', required: true, placeholder: 'example.com' },
      { key: 'period', label: '对比周期', type: 'select', options: ['7 天 vs 上 7 天', '28 天 vs 上 28 天', '3 个月同比'], default: '28 天 vs 上 28 天' },
      { key: 'data', label: 'GSC 数据（可选）', type: 'textarea', placeholder: 'query,clicks,impressions,ctr,position' },
    ],
    exec: { kind: 'skill', suite: 'seo-monitor', task: 'gsc-monitor' },
    outputs: ['checklist', 'strikingDistance', 'cannibalization', 'healthSignals', 'alerts', 'actions'],
    outputLabels: {
      checklist: 'GSC 检查项', strikingDistance: '临近排名机会', cannibalization: '自相残杀检测',
      healthSignals: '站点健康度', alerts: '告警配置', actions: '本周期动作',
    },
    backend: { suites: ['seo-monitor'], workflows: ['monitor'] },
  },
];

// 以 step 为唯一顺序，前端 /steps 与 /flow 永远一致。
STEP_DEFS.sort((a, b) => a.step - b.step);

export function findStepDef(key: string): StepDef | undefined {
  return STEP_DEFS.find((s) => s.key === key);
}
