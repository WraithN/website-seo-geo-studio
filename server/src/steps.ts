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
    backend: { suites: ['seo-research'], workflows: ['keyword-research'] },
  },
  {
    step: 2,
    key: 'create',
    label: '创建站点',
    phase: '建站',
    group: 'create',
    goal: '先建档（产品名/域名/面向地区/定位/语言），再产出站点规格与页面矩阵：哥飞式「分门别类罗列」——一个关键词一个页面，规划 TDH、URL 结构、母版模板复用。站点名与域名会自动带入后续步骤。',
    inputs: [
      { key: 'siteName', label: '产品名', type: 'text', required: true, placeholder: '如 Rhythm Trainer' },
      { key: 'domain', label: '域名（可选）', type: 'text', placeholder: '如 example.com' },
      { key: 'region', label: '面向地区（决定合规策略）', type: 'select', required: true, options: ['全球/英语（宽松基线）', '欧盟/EEA（GDPR）', '英国（UK GDPR）', '美国加州（CCPA/CPRA）', '美国（含儿童 COPPA）', '日本（APPI）', '韩国（PIPA）', '巴西（LGPD）'], default: '全球/英语（宽松基线）', hint: '第 4 步合规优化会按这里选的地区出清单' },
      { key: 'positioning', label: '产品定位', type: 'textarea', required: true, placeholder: '给谁用、解决什么问题、和竞品的差异（可直接用调研结论）' },
      { key: 'language', label: '站点语言', type: 'select', options: ['英语', '英语+小语种', '中文+英语'], default: '英语' },
      { key: 'siteType', label: '站点类型', type: 'select', options: ['落地页', '博客/内容站', '工具站', '文档站'], default: '工具站' },
      { key: 'requirement', label: '需求描述', type: 'textarea', placeholder: '想做什么站、核心页面有哪些、风格偏好' },
    ],
    exec: { kind: 'skill', suite: 'seo-orchestrator', task: 'create-site' },
    outputs: ['productProfile', 'targetUsers', 'differentiation', 'complianceScope', 'domainAdvice', 'successMetrics', 'siteSpec', 'pages', 'techStack', 'seoBaseline', 'nextActions'],
    backend: {
      suites: ['seo-orchestrator', 'seo-technical'],
      workflows: ['n8n-workflow-create', 'n8n-workflow-site-tool'],
      note: '建档信息是后续 3-9 步的统一上下文',
    },
  },
  {
    step: 3,
    key: 'seo',
    label: 'SEO·GEO 优化',
    phase: '优化',
    group: 'create',
    goal: '上线前规划「一个关键词一个页面」的 SEO/GEO 架构：关键词→页面映射、分门别类罗列、内链骨架、meta/llms.txt 模板、答案块规划。不依赖正文，给第 6 步内容生产当蓝图。',
    inputs: [
      { key: 'topic', label: '核心主题/产品', type: 'text', placeholder: '如 chinese name generator', hint: '可留空，自动带入建档信息' },
      { key: 'siteName', label: '站点/产品名', type: 'text', placeholder: '如 MandarinName' },
      { key: 'market', label: '目标市场/语言', type: 'text', default: '全球/英语' },
      { key: 'pageCount', label: '计划页面数（参考）', type: 'text', default: '12' },
    ],
    exec: { kind: 'skill', suite: 'seo-content-geo', task: 'geo-optimize' },
    outputs: ['pageMap', 'internalLinkSkeleton', 'metaTemplate', 'llmsTxtStructure', 'answerBlockPlan', 'checklist'],
    backend: { suites: ['seo-content-geo'], workflows: [] },
  },
  {
    step: 4,
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
    backend: { suites: ['seo-technical'], workflows: [], note: '合规结论同时回写产品档案的 complianceScope' },
  },
  {
    step: 5,
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
    backend: { suites: ['seo-technical'], workflows: ['techseo'] },
  },
  {
    step: 6,
    key: 'content',
    label: '内容生产',
    phase: '内容',
    group: 'create',
    goal: '四阶段流水线：① 生成 blog 规划（支柱页/集群/编辑日历/页面清单）→ ② 内容生产（带论文与权威博客引用的成稿，需人工补的用 [待人工补充：…] 标识）→ ③ 去AI味（改写为自然、有细节与人称声音）→ ④ EEAT 验证（经验/专业/权威/可信四维评分与缺口）。',
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
    backend: { suites: ['seo-monitor'], workflows: ['monitor'] },
  },
];

export function findStepDef(key: string): StepDef | undefined {
  return STEP_DEFS.find((s) => s.key === key);
}
