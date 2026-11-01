/**
 * 流程链条单一数据源（Flow Chain）。
 *
 * 权威顺序源自用户确定的「独立站产品」结构，并结合哥飞的出海方法论：
 * 挖需求 → 快速上线 → SEO/外链 → 变现（养网站防老）。本文件是前后端
 * 唯一的流程定义来源：页面排序、侧边栏导航、流程总览页、阶段标签全部由此派生，
 * 避免各处各写一套顺序导致「页面和流程都是乱的」。
 *
 * 9 步链路（产品定位：给跨境电商 / 独立开发者的出海建站工具）：
 *   1 需求调研（立项，产品之外）
 *   独立站产品 · 产品创建：
 *     2 创建站点（含产品建档：产品名/域名/面向地区/定位/语言 → 站点规格与页面矩阵）
 *     3 SEO·GEO 优化（Google 自然流量 + AI 搜索引用双轨）
 *     4 合规优化（按面向地区的上线门禁）
 *     5 技术SEO·GEO（收录/sitemap/结构化数据/渲染/速度）
 *     6 内容生产（一个关键词一个页面；SEO 页 vs 转化页）
 *     7 部署上线
 *   独立站产品 · 产品运营：
 *     8 外链推广（导航站/目录/社区/guest post；外链质量排序）
 *     9 线上监控（UV/PV、跳出、停留、GSC、AdSense 覆盖率 → 养站决策）
 */

export type FlowStage = {
  /** 步骤序号，1..9（2-9 都属于同一个独立站产品） */
  step: number;
  /** 稳定标识（路由 / 关联键） */
  key: string;
  /** 步骤中文名（与原建站助手一致） */
  label: string;
  /** 对应的建站页面 slug（data/pages/<slug>.html） */
  page: string;
  /** 对应的 n8n 工作流 slug（可能多个） */
  workflows: string[];
  /** 对应的 SEO 技能套件 */
  suites: string[];
  /** 阶段划分 */
  phase: string;
  /** 产品分组：pre 立项（产品外）/ create 产品创建 / operate 产品运营 */
  group: 'pre' | 'create' | 'operate';
  /** 一句话说明 */
  desc: string;
};

/** 产品分组的展示名（独立站产品把建站到监控闭环全部收在下面） */
export const FLOW_GROUP_LABEL: Record<string, string> = {
  pre: '立项 · 独立站产品之外',
  create: '独立站产品 · 产品创建',
  operate: '独立站产品 · 产品运营',
};

/** 增长流程 9 步（顺序即执行顺序；2-9 步都属于同一个独立站产品） */
export const FLOW_STEPS: FlowStage[] = [
  {
    step: 1, key: 'research', label: '需求调研', page: 'research',
    workflows: ['keyword-research'], suites: ['seo-research'], phase: '立项', group: 'pre',
    desc: '判断这个词/需求值不值得做：扩词 + 用 Google 及免费工具（Trends / Keyword Planner / 免费版 Ahrefs·Semrush）初步验证商业价值，再结合上传的 SimilarWeb、Semrush 指标截图做进一步分析。此时还没有产品。',
  },
  {
    step: 2, key: 'create', label: '创建站点', page: 'create',
    workflows: ['n8n-workflow-create', 'n8n-workflow-site-tool'], suites: ['seo-orchestrator', 'seo-technical'], phase: '建站', group: 'create',
    desc: '先建档（产品名/域名/面向地区/定位/语言），再产出站点规格与页面矩阵：哥飞式「分门别类罗列」——一个关键词一个页面，规划 TDH、URL 结构、母版模板复用。',
  },
  {
    step: 3, key: 'seo', label: 'SEO·GEO 优化', page: 'seo',
    workflows: [], suites: ['seo-content-geo', 'seo-technical'], phase: '优化', group: 'create',
    desc: '上线前把内容做成「搜索友好 + AI 搜索引用友好」双轨形态：答案块、实体数据、llms.txt，覆盖 Google 自然流量与 ChatGPT/Perplexity/AI Overviews 引用。',
  },
  {
    step: 4, key: 'compliance', label: '合规优化', page: 'compliance',
    workflows: [], suites: ['seo-technical'], phase: '合规', group: 'create',
    desc: '按产品面向地区输出合规清单（隐私政策/Cookie 同意/数据处理/未成年人保护/无障碍/营销规则），海外产品上线前必须过这一关。',
  },
  {
    step: 5, key: 'techseo', label: '技术SEO·GEO', page: 'techseo',
    workflows: ['techseo'], suites: ['seo-technical'], phase: '技术', group: 'create',
    desc: '产出技术项验收清单并可对已上线站点做真实抓取诊断：收录/索引、sitemap、结构化数据、渲染方式、页面速度、移动端、多语言 hreflang。',
  },
  {
    step: 6, key: 'content', label: '内容生产', page: 'content',
    workflows: ['content-gen'], suites: ['seo-content-geo'], phase: '内容', group: 'create',
    desc: '一个关键词一个页面：产出可直接发布的页面内容（标题/大纲/要点/内链/FAQ）。区分「SEO 长页」与「转化落地页」两类，并做多语言。',
  },
  {
    step: 7, key: 'deploy', label: '部署上线', page: 'deploy',
    workflows: ['n8n-workflow-deploy'], suites: ['seo-technical'], phase: '上线', group: 'create',
    desc: '一键部署到公网可访问地址（Cloudflare Pages 等），提交 GSC/Bing 站长平台，回写结果，确保发布即可被收录。',
  },
  {
    step: 8, key: 'backlink', label: '外链推广', page: 'backlink',
    workflows: ['backlink'], suites: ['seo-research'], phase: '产品运营', group: 'operate',
    desc: '产品上线后：按哥飞外链质量排序（流量 > 品牌 > 活跃）找出可争取的外链/引用机会与接近方式。外链是中长期资产，需要维护。',
  },
  {
    step: 9, key: 'monitor', label: '线上监控', page: 'monitor',
    workflows: ['monitor'], suites: ['seo-monitor'], phase: '产品运营', group: 'operate',
    desc: '持续监控 UV/PV、人均访问页、跳出率、平均停留、GSC 覆盖与 AdSense 覆盖率，判断这个站「值得养」还是「该撤」，结果回流下一轮迭代（养网站防老）。',
  },
];

/** 工作台 / 系统分组（非增长流程步骤，但属于同一导航体系） */
export const FLOW_GROUPS = {
  workbench: { key: 'chat', label: '对话式建站', page: 'chat', phase: '工作台' },
  system: { key: 'settings', label: 'API 设置', page: 'settings', phase: '系统' },
} as const;

/** page slug → 流程步骤（不含工作台/系统） */
export const PAGE_TO_STEP: Record<string, FlowStage> = Object.fromEntries(
  FLOW_STEPS.map((s) => [s.page, s]),
);

/** 页面分类标签：步骤号 + 阶段名，用于列表徽标 */
export function pageCategory(page: string): { category: string; step: number; label: string } {
  const st = PAGE_TO_STEP[page];
  if (st) return { category: `阶段 ${st.step} · ${st.phase}`, step: st.step, label: st.label };
  if (page === FLOW_GROUPS.workbench.page) return { category: '工作台', step: 0, label: FLOW_GROUPS.workbench.label };
  if (page === FLOW_GROUPS.system.page) return { category: '系统', step: 0, label: FLOW_GROUPS.system.label };
  return { category: '其他', step: 0, label: page };
}

/** 工作流 slug → 所属流程步骤序号（用于工作流排序） */
export const WORKFLOW_STEP: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const s of FLOW_STEPS) for (const w of s.workflows) m[w] = s.step;
  return m;
})();

/** 工作流分类中文名 */
export const WORKFLOW_CATEGORY_LABEL: Record<string, string> = {
  '调研': '阶段 1 · 立项',
  '建站-创建': '阶段 2 · 产品创建',
  '内容': '阶段 6 · 内容',
  '技术SEO': '阶段 3-5 · 优化/合规/技术',
  '建站-部署': '阶段 7 · 上线',
  '外链': '阶段 8 · 产品运营',
  '监控': '阶段 9 · 产品运营',
  '建站总流程': '建站总流程',
  '建站-对话创建': '阶段 2 · 产品创建',
  '建站-站点工具': '阶段 2 · 产品创建',
};
