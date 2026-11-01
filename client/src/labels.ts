// 结果字段 -> 友好中文标签（共享单一数据源，供执行结果 / 历史 / 执行台统一使用）。
// 目标：给运营/小白看的界面不再暴露英文字段名（productProfile、strikingDistance …）。
const LABELS: Record<string, string> = {
  // 调研 / 关键词评估
  verdict: '结论',
  score: '值得做评分',
  rationale: '判断理由',
  kdroi: '商业价值（kdroi）',
  toolsChecked: '已验证的免费工具',
  longtail: '长尾词机会',
  clusters: '意图簇',
  risks: '风险',
  nextActions: '下一步动作',
  // 建站
  productProfile: '产品档案',
  targetUsers: '目标用户',
  differentiation: '差异化要点',
  monetizationPlan: '收费模式与变现路径',
  pricingTiers: '定价套餐',
  complianceScope: '合规范围',
  domainAdvice: '域名建议',
  successMetrics: '成功指标',
  siteSpec: '站点规格',
  pages: '页面清单',
  techStack: '技术选型',
  seoBaseline: 'SEO 基线',
  // SEO·GEO
  pageMap: '关键词→页面映射',
  internalLinkSkeleton: '内链骨架',
  metaTemplate: '标题/描述模板',
  llmsTxtStructure: 'llms.txt 结构',
  answerBlockPlan: '答案块规划',
  // 合规
  applicableLaws: '适用法规',
  mustHave: '必备合规件',
  cookieConsent: 'Cookie 同意方案',
  privacyPolicyOutline: '隐私政策大纲',
  dataProcessing: '数据处理要求',
  accessibility: '无障碍要求',
  marketingRules: '营销规则',
  riskLevel: '风险等级',
  checklist: '合规清单',
  // 技术 SEO
  facts: '抓取事实',
  findings: '问题清单',
  scorecard: '分项评分',
  quickWins: '快速修复',
  structuredDataPlan: '结构化数据',
  // 内容
  blogPlan: '博客规划',
  draft: '成稿（初稿）',
  citations: '引用清单',
  humanized: '去AI味稿',
  eeatReport: 'EEAT 评分',
  // 部署
  preLaunch: '上线前检查',
  deploySteps: '部署步骤',
  postLaunch: '上线后动作',
  indexingPlan: '收录推进',
  // 外链
  queries: '查询词',
  opportunities: '外链机会',
  note: '提醒',
  // 监控
  strikingDistance: '临近排名机会',
  cannibalization: '自相残杀检测',
  healthSignals: '站点健康度',
  alerts: '告警配置',
  actions: '本周期动作',
  // 其它任务（serp-intent / competitor / plan）
  intent: '主意图',
  intentMixed: '是否混合意图',
  serpFeatures: 'SERP 特性',
  canCompete: '能否竞争',
  contentAngle: '内容角度',
  pageType: '建议页面类型',
  titles: '建议标题',
  overview: '竞品概览',
  strengths: '值得学习',
  weaknesses: '可反超缺口',
  contentThemes: '内容主题',
  linkPatterns: '外链模式',
  counterPosition: '反定位建议',
  positioning: '定位',
  roadmap: '路线图',
  priorityNow: '当前最该做的 3 件事',
  metrics: '跟踪指标',
};

function humanize(key: string): string {
  if (!key) return key;
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

export function fieldLabel(key: string): string {
  return LABELS[key] || humanize(key);
}

/** 对象表格表头 / 对象行键也用友好名 */
export function colLabel(key: string): string {
  return LABELS[key] || humanize(key);
}