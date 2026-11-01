/**
 * 导入脚本：把 data/ 下的 53 个 SEO 技能、n8n 工作流、建站页面灌入 SQLite。
 * 运行：npm run import
 */
import fs from 'node:fs';
import path from 'node:path';
import { db, run, all, DATA_DIR } from '../db.js';
import { PAGE_TO_STEP, WORKFLOW_STEP, pageCategory } from '../flow.js';

const DATA = DATA_DIR;
const SKILLS_DIR = path.join(DATA, 'skills');
const WF_DIR = path.join(DATA, 'workflows');
const PAGES_DIR = path.join(DATA, 'pages');

// 技能 → 合并套件映射（与 README 的 53→6 对应；competitors 归 research）
const SUITE_MAP: Record<string, string> = {
  'seo-growth-orchestrator': 'seo-orchestrator', 'seo-project-setup': 'seo-orchestrator',
  'seo-plan': 'seo-orchestrator', 'seo-coach': 'seo-orchestrator',
  'keyword-research': 'seo-research', 'keyword-clustering': 'seo-research', 'keywords': 'seo-research',
  'seo-serp': 'seo-research', 'competitive-landscape': 'seo-research', 'competitor-analysis': 'seo-research',
  'competitors': 'seo-research', 'seo-competitor-pages': 'seo-research', 'link-prospecting': 'seo-research',
  'seo-content': 'seo-content-geo', 'seo-content-brief': 'seo-content-geo', 'seo-eeat-audit': 'seo-content-geo',
  'seo-helpful-content': 'seo-content-geo', 'seo-ai-content-check': 'seo-content-geo', 'seo-ai-optimization': 'seo-content-geo',
  'seo-geo': 'seo-content-geo', 'seo-llms-txt': 'seo-content-geo', 'seo-robots-ai': 'seo-content-geo',
  'seo-markdown-audit': 'seo-content-geo', 'seo-page': 'seo-content-geo',
  'seo-technical': 'seo-technical', 'seo-audit': 'seo-technical', 'seo-site-audit-pro': 'seo-technical',
  'seo-lighthouse-audit': 'seo-technical', 'seo-core-web-vitals': 'seo-technical', 'seo-page-experience': 'seo-technical',
  'seo-schema': 'seo-technical', 'seo-rich-results': 'seo-technical', 'seo-sitemap': 'seo-technical',
  'seo-hreflang': 'seo-technical', 'seo-images': 'seo-technical', 'seo-internal-links': 'seo-technical',
  'seo-migration-check': 'seo-technical', 'seo-log-analysis': 'seo-technical', 'seo-local': 'seo-technical',
  'seo-programmatic': 'seo-technical',
  'seo-gsc-overview': 'seo-monitor', 'seo-gsc-opportunities': 'seo-monitor', 'seo-gsc-new-keywords': 'seo-monitor',
  'seo-gsc-content-decay': 'seo-monitor', 'seo-gsc-cannibalization': 'seo-monitor', 'seo-gsc-drops': 'seo-monitor',
  'seo-gsc-indexing': 'seo-monitor', 'seo-gsc-compare': 'seo-monitor', 'seo-gsc-brand-vs-nonbrand': 'seo-monitor',
  'seo-brand-radar': 'seo-monitor', 'seo-report': 'seo-monitor',
  'audit': 'seo-social-search', 'strategy': 'seo-social-search',
};

const SUITE_LABEL: Record<string, string> = {
  'seo-orchestrator': '总控编排', 'seo-research': '关键词 / 竞品 / 外链',
  'seo-content-geo': '内容 / GEO', 'seo-technical': '技术 SEO',
  'seo-monitor': 'GSC 监控 / 报告', 'seo-social-search': '短视频搜索',
};

function parseFrontmatter(body: string): { name: string; description: string } {
  const nameM = body.match(/^name:\s*(.+)$/m);
  const descM = body.match(/^description:\s*(.+)$/m);
  return {
    name: nameM ? nameM[1].trim() : '',
    description: descM ? descM[1].trim() : '',
  };
}

function importSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return 0;
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  let n = 0;
  for (const d of dirs) {
    const slug = d.name;
    const skillMd = path.join(SKILLS_DIR, slug, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    const body = fs.readFileSync(skillMd, 'utf-8');
    const fm = parseFrontmatter(body);
    const refDir = path.join(SKILLS_DIR, slug, 'references');
    const refs = fs.existsSync(refDir) ? fs.readdirSync(refDir).filter((f) => f.endsWith('.md')) : [];
    const suite = SUITE_MAP[slug] || 'uncategorized';
    run('INSERT OR REPLACE INTO skills (slug,name,suite,description,body,references_list) VALUES (?,?,?,?,?,?)',
      [slug, fm.name || slug, suite, fm.description, body, JSON.stringify(refs)]);
    n++;
  }
  return n;
}

const WF_CATEGORY: Record<string, string> = {
  'keyword-research': '调研', 'content-gen': '内容', 'techseo': '技术SEO',
  'backlink': '外链', 'monitor': '监控', 'community': '社区', 'monetize': '变现',
  'n8n-workflow': '建站总流程', 'n8n-workflow-create': '建站-创建', 'n8n-workflow-deploy': '建站-部署',
  'n8n-workflow-chat-create': '建站-对话创建', 'n8n-workflow-site-tool': '建站-站点工具',
};

function importWorkflows() {
  if (!fs.existsSync(WF_DIR)) return 0;
  const files = fs.readdirSync(WF_DIR).filter((f) => f.endsWith('.json'));
  let n = 0;
  for (const f of files) {
    const slug = f.replace(/\.json$/, '');
    const raw = fs.readFileSync(path.join(WF_DIR, f), 'utf-8');
    let json: any;
    try { json = JSON.parse(raw); } catch { continue; }
    const name = json.name || slug;
    const nodes = (json.nodes || []).length;
    const category = WF_CATEGORY[slug] || 'other';
    const desc = json.meta?.description || json.description || (json.nodes ? `${nodes} 个节点` : '');
    // step 来自流程链条（0 = 不属于增长 12 步，如建站总流程）
    const step = WORKFLOW_STEP[slug] || 0;
    run('INSERT OR REPLACE INTO workflows (slug,name,category,description,json,nodes,step) VALUES (?,?,?,?,?,?,?)',
      [slug, name, category, desc, raw, nodes, step]);
    n++;
  }
  return n;
}

function importPages() {
  if (!fs.existsSync(PAGES_DIR)) return 0;
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html'));
  let n = 0;
  for (const f of files) {
    const slug = f.replace(/\.html$/, '');
    const html = fs.readFileSync(path.join(PAGES_DIR, f), 'utf-8');
    const titleM = html.match(/<title>([^<]*)<\/title>/i);
    const title = titleM ? titleM[1].trim() : slug;
    // 分类与序号一律来自流程链条（server/src/flow.ts），保证页面顺序与标签一致
    const { category, step } = pageCategory(slug);
    run('INSERT OR REPLACE INTO pages (slug,title,category,html,step) VALUES (?,?,?,?,?)',
      [slug, title, category, html, step]);
    n++;
  }
  return n;
}

const t0 = Date.now();
console.log('开始导入 SEO/GEO Studio 数据…');
const s = importSkills();
const w = importWorkflows();
const p = importPages();
console.log(`✓ 技能 ${s} 个｜工作流 ${w} 个｜页面 ${p} 个`);
const suites = all<{ suite: string; cnt: number }>('SELECT suite, COUNT(*) cnt FROM skills GROUP BY suite ORDER BY cnt DESC');
console.log('套件分布：', suites.map((x) => `${SUITE_LABEL[x.suite] || x.suite}=${x.cnt}`).join('  '));
console.log(`完成，耗时 ${Date.now() - t0}ms。数据库：${path.join(DATA, 'seo-geo-studio.db')}`);
