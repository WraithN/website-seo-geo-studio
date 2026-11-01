import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { all, get, run, DATA_DIR, createSite, listSites, getSite, updateSite, deleteSite, setSiteProfile } from '../db.js';
import { runResearchPipeline, type ResearchSpec } from '../research.js';
import { FLOW_STEPS, FLOW_GROUP_LABEL, PAGE_TO_STEP, WORKFLOW_STEP, pageCategory } from '../flow.js';
import { SUITES, allTasks, findTask } from '../skills/registry.js';
import { STEP_DEFS, findStepDef } from '../steps.js';
import { executeRun, loadSkillMd, type RunnerDeps, type RunRow, WORKSPACE_DIR } from '../skills/runner.js';
import { llmAvailable } from '../llm.js';

export const api = Router();

/** 原「建站助手」Python bridge 地址：代理提交/轮询 legacy 引擎任务用 */
const BRIDGE_BASE = process.env.BRIDGE_BASE || 'http://127.0.0.1:8788';

const SUITE_LABEL: Record<string, string> = {
  'seo-orchestrator': '总控编排', 'seo-research': '关键词/竞品/外链',
  'seo-content-geo': '内容/GEO', 'seo-technical': '技术SEO',
  'seo-monitor': 'GSC监控/报告', 'seo-social-search': '短视频搜索',
};

api.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// 仪表盘统计
api.get('/dashboard', (_req, res) => {
  const skills = (get('SELECT COUNT(*) c FROM skills') || { c: 0 }).c;
  const wf = (get('SELECT COUNT(*) c FROM workflows') || { c: 0 }).c;
  const pages = (get('SELECT COUNT(*) c FROM pages') || { c: 0 }).c;
  const jobs = all('SELECT id, seed, status, progress, status_text, created_at FROM jobs ORDER BY created_at DESC LIMIT 8');
  const suites = all('SELECT suite, COUNT(*) c FROM skills GROUP BY suite ORDER BY c DESC');
  res.json({
    counts: { skills, workflows: wf, pages },
    suites: suites.map((s: any) => ({ slug: s.suite, label: SUITE_LABEL[s.suite] || s.suite, count: s.c })),
    recentJobs: jobs,
  });
});

// ---- 技能 ----
api.get('/skills', (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  const suite = req.query.suite as string || '';
  let rows: any[];
  if (q) {
    rows = all(`SELECT id,slug,name,suite,description FROM skills WHERE name LIKE ? OR description LIKE ? OR body LIKE ? ORDER BY name`,
      [`%${q}%`, `%${q}%`, `%${q}%`]);
  } else if (suite) {
    rows = all('SELECT id,slug,name,suite,description FROM skills WHERE suite=? ORDER BY name', [suite]);
  } else {
    rows = all('SELECT id,slug,name,suite,description FROM skills ORDER BY suite,name');
  }
  res.json(rows);
});

api.get('/skills/:slug', (req: Request, res: Response) => {
  const row = get('SELECT * FROM skills WHERE slug=?', [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

api.get('/skills/:slug/references/:file', (req: Request, res: Response) => {
  const fp = path.join(DATA_DIR, 'skills', req.params.slug, 'references', req.params.file);
  if (!fp.startsWith(path.join(DATA_DIR, 'skills')) || !fs.existsSync(fp)) return res.status(404).end();
  res.type('text/markdown').send(fs.readFileSync(fp, 'utf-8'));
});

// ---- 工作流 ----
// 按流程链条排序：先按 step（同 step 内按名称），step=0 的建站总流程等排最后
api.get('/workflows', (_req, res) => {
  const rows = all('SELECT id,slug,name,category,description,nodes,active,version_id,step FROM workflows');
  rows.sort((a: any, b: any) => {
    const sa = a.step || 999, sb = b.step || 999;
    if (sa !== sb) return sa - sb;
    return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
  });
  res.json(rows);
});

api.get('/workflows/:slug', (req: Request, res: Response) => {
  const row = get('SELECT * FROM workflows WHERE slug=?', [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'not found' });
  let nodeDetails: any[] = [];
  try {
    const j = JSON.parse(String((row as any).json || '{}'));
    nodeDetails = (j.nodes || []).map(describeNode);
  } catch { /* JSON 异常时只返回基本信息 */ }
  res.json({ ...row, nodeDetails });
});

api.get('/workflows/:slug/export', (req: Request, res: Response) => {
  const row = get('SELECT json,name FROM workflows WHERE slug=?', [req.params.slug]);
  if (!row) return res.status(404).end();
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.slug}.json"`);
  res.type('application/json').send(row.json);
});

// ---- 页面 ----
// 按流程链条排序：12 个增长步骤（1..12）→ 工作台 → 系统
api.get('/pages', (_req, res) => {
  const rows = all('SELECT id,slug,title,category,step FROM pages');
  const rank = (p: any) => (p.step > 0 ? p.step : p.slug === 'chat' ? 90 : p.slug === 'settings' ? 91 : 95);
  rows.sort((a: any, b: any) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    return String(a.title).localeCompare(String(b.title), 'zh-Hans-CN');
  });
  // 附带流程步骤元信息，供前端渲染徽标与跳转
  res.json(rows.map((p: any) => {
    const st = PAGE_TO_STEP[p.slug];
    return {
      ...p,
      stepLabel: st ? st.label : (p.slug === 'chat' ? '对话式建站' : p.slug === 'settings' ? 'API 设置' : p.slug),
      phase: st ? st.phase : (p.slug === 'chat' ? '工作台' : p.slug === 'settings' ? '系统' : ''),
      desc: st ? st.desc : '',
    };
  }));
});

api.get('/pages/:slug', (req: Request, res: Response) => {
  const row = get('SELECT * FROM pages WHERE slug=?', [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

// 原始 HTML：供 iframe 直接 src 引用（此前前端把 JSON 塞进 srcDoc，导致预览显示 JSON 文本）
/**
 * 历史页面自带各自的 :root 主题（techseo 淡蓝+绿、backlink 淡绿、chat 靛蓝…），
 * 内嵌预览时会出现「点一个页面换一套皮肤」。这里统一注入主站主题变量覆盖。
 */
const THEME_OVERRIDE = `<style id="studio-theme-sync">
:root{
  --paper:#f6f3ec !important; --surface:#fffdf9 !important; --surface-2:#f1ece2 !important;
  --ink:#17131b !important; --muted:#5f5867 !important;
  --line:rgba(23,19,27,.10) !important; --line-2:rgba(23,19,27,.06) !important;
  --accent:#5b34e6 !important; --accent-ink:#4a25c9 !important; --accent-soft:rgba(91,52,230,.10) !important;
  --ok:#0f9d6b !important; --ok-soft:rgba(15,157,107,.12) !important;
  --warn:#b45309 !important; --err:#dc2626 !important; --err-soft:rgba(220,38,38,.10) !important;
  --gold:#c98a16 !important;
  --bg:#f6f3ec !important; --fg:#17131b !important;
  --primary:#5b34e6 !important; --primary2:#8b5cf6 !important;
  --user:#5b34e6 !important; --orb1:#c9b8ff !important; --orb2:#e3d9ff !important;
  --font-body:"Plus Jakarta Sans","PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif !important;
  --font-disp:"Fraunces","Noto Serif SC","Songti SC",Georgia,serif !important;
  --font:"Plus Jakarta Sans","PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif !important;
}
html, body { background: #f6f3ec !important; }
</style>`;

api.get('/pages/:slug/raw', (req: Request, res: Response) => {
  const row = get('SELECT html FROM pages WHERE slug=?', [req.params.slug]);
  if (!row) return res.status(404).type('text/plain; charset=utf-8').send('not found');
  let html = String(row.html || '');
  if (!html.includes('studio-theme-sync')) {
    if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, THEME_OVERRIDE + '\n</head>');
    else html = THEME_OVERRIDE + html;
  }
  res.type('text/html; charset=utf-8').send(html);
});

// ---- 页面编排：某页面在后台调用了哪些 n8n 工作流 / 技能套件与任务 ----
const ORCH_FILE = path.join(DATA_DIR, 'orchestration.json');
const WF_DIR = path.join(DATA_DIR, 'workflows');

/** 把 n8n 节点翻译成「这一步在干什么」的可读说明 */
function describeNode(n: any): { name: string; type: string; desc: string; detail?: string } {
  const typeShort = String(n.type || '').split('.').pop() || 'node';
  const name = n.name || typeShort;
  const p = n.parameters || {};
  if (/webhook/i.test(n.type || '')) {
    return { name, type: typeShort, desc: `Webhook 触发器：接收 ${p.httpMethod || 'POST'} /${p.path || ''} 请求启动流程` };
  }
  if (/httpRequest/i.test(n.type || '')) {
    const url = String(p.url || '').replace(/=\{\{[\s\S]*?\}\}/g, '（动态表达式）');
    return {
      name, type: typeShort,
      desc: 'HTTP 请求节点：调用外部接口取真实数据（非估算）',
      detail: url ? `请求地址：${url.slice(0, 180)}` : undefined,
    };
  }
  if (/code/i.test(n.type || '')) {
    const js = String(p.jsCode || '');
    // 只认行首注释，且跳过 ---- 分节线之类的装饰注释
    const comment = (js.match(/^\s*\/\/\s*(.+)$/gm) || [])
      .map((l: string) => l.replace(/^\s*\/\/\s*/, '').trim())
      .find((l: string) => l && !/^[-=_]{3,}/.test(l) && !/^\*+/.test(l)) || '';
    const byName = /generate|analyze|生成|分析/i.test(name) ? '汇总输入并生成结构化结果（报告/方案）'
      : /callback|回写|回调/i.test(name) ? '把生成结果打包回写（状态/产物/日志）'
      : /fetch|collect|采集/i.test(name) ? '整理采集到的数据'
      : '用 JavaScript 对节点数据做处理/汇总/回写';
    return {
      name, type: typeShort,
      desc: `Code 节点：${comment || byName}`,
      detail: js ? js.split('\n').filter(Boolean).slice(0, 8).join('\n') : undefined,
    };
  }
  return { name, type: typeShort, desc: `处理节点（${typeShort}）` };
}

const COLLECT_LABEL: Record<string, string> = {
  suggest: '采集真实联想词（Google/DDG Suggest）',
  page: '抓取页面 HTML 提取确定性事实',
  none: '无外部采集（纯模型推理 + 上游产物）',
};

api.get('/orchestration/:slug', (req: Request, res: Response) => {
  let map: any = { pages: {} };
  try { map = JSON.parse(fs.readFileSync(ORCH_FILE, 'utf8')); } catch { /* 无配置时返回空 */ }
  const cfg = (map.pages || {})[req.params.slug];
  if (!cfg) return res.status(404).json({ error: 'not found' });
  const workflows = (cfg.workflows || []).map((w: string) => {
    let meta: any = { slug: w, name: w, nodes: 0, hook: '', trigger: '工作流', types: '', nodeDetails: [] };
    try {
      const j = JSON.parse(fs.readFileSync(path.join(WF_DIR, w + '.json'), 'utf8'));
      const nodes = j.nodes || [];
      const trig = nodes.find((n: any) => /trigger/i.test(n.type || '')) || {};
      meta = {
        slug: w,
        name: j.name || w,
        nodes: nodes.length,
        hook: (trig.parameters && trig.parameters.path) || '',
        trigger: trig.type || '',
        types: [...new Set(nodes.map((n: any) => String(n.type).split('.').pop()))].slice(0, 6).join(' → '),
        nodeDetails: nodes.map(describeNode),
      };
    } catch { /* 工作流文件缺失时退回基本信息 */ }
    return meta;
  });
  const skills = (cfg.suites || []).map((s: string) => {
    const su = SUITES.find((x) => x.slug === s);
    return {
      slug: s,
      name: su?.name || s,
      desc: su?.desc || '',
      skillMd: su ? loadSkillMd(su.slug) : '',
      tasks: (cfg.tasks || [])
        .map((k: string) => su?.tasks.find((t) => t.key === k))
        .filter(Boolean)
        .map((t: any) => ({
          key: t.key,
          name: t.name,
          desc: t.desc,
          collect: t.collect,
          collectLabel: COLLECT_LABEL[t.collect] || t.collect,
          refs: t.refs || [],
          inputs: (t.inputs || []).map((i: any) => ({ label: i.label, type: i.type, required: !!i.required })),
          outputs: Object.entries(t.outputFields || {}).map(([k2, v2]) => ({ key: k2, desc: v2 })),
          how: `${COLLECT_LABEL[t.collect] || '采集'} → LLM 按固定输出字段生成 → 字段校验（缺失自动补齐重试）→ 落盘产物 JSON/MD`,
        })),
    };
  });
  res.json({
    page: req.params.slug,
    step: cfg.step || 0,
    label: cfg.label || '',
    phase: cfg.phase || '',
    impl: cfg.impl || '',
    logic: cfg.logic || '',
    note: cfg.note || '',
    workflows,
    skills,
  });
});

// ---- 流程链条（单一数据源，供前端导航与总览页） ----
api.get('/flow', (_req, res) => {
  const pages = all('SELECT slug,title,category,step FROM pages');
  const workflows = all('SELECT slug,name,category,nodes,step FROM workflows');
  res.json({
    steps: FLOW_STEPS.map((s) => ({
      step: s.step,
      key: s.key,
      label: s.label,
      phase: s.phase,
      group: s.group,
      groupLabel: FLOW_GROUP_LABEL[s.group],
      desc: s.desc,
      page: s.page,
      suites: s.suites,
      workflows: s.workflows.map((w) => {
        const wf = workflows.find((x: any) => x.slug === w);
        return wf ? { slug: wf.slug, name: wf.name, nodes: wf.nodes, category: wf.category } : { slug: w, name: w, nodes: 0, category: '' };
      }),
    })),
    extra: [
      { key: 'chat', label: '对话式建站', phase: '工作台', page: 'chat', category: '工作台' },
      { key: 'settings', label: 'API 设置', phase: '系统', page: 'settings', category: '系统' },
    ],
  });
});

// ---- 调研任务 ----
api.post('/research', async (req: Request, res: Response) => {
  const spec = (req.body?.spec || {}) as ResearchSpec;
  const seed = (spec.seed || '').trim();
  if (!seed) return res.status(400).json({ ok: false, error: '请填写种子关键词' });
  const jobId = crypto.randomUUID().slice(0, 12);
  (spec as any).jobId = jobId;
  run('INSERT INTO jobs (id,type,seed,status,progress,status_text,steps) VALUES (?,?,?,?,?,?,?)',
    [jobId, 'research', seed, 'pending', 0, '已提交，准备开始…', '[]']);
  res.json({ ok: true, jobId });

  // 异步执行，避免阻塞请求
  (async () => {
    try {
      run('UPDATE jobs SET status=?, updated_at=datetime(\'now\') WHERE id=?', ['running', jobId]);
      const result = await runResearchPipeline(spec, (step, label, pct) => {
        const steps = JSON.parse(get('SELECT steps FROM jobs WHERE id=?', [jobId])?.steps || '[]');
        steps.push({ step, label, pct, at: Date.now() });
        run('UPDATE jobs SET progress=?, status_text=?, steps=?, updated_at=datetime(\'now\') WHERE id=?',
          [pct, label, JSON.stringify(steps), jobId]);
      });
      run('UPDATE jobs SET status=?, progress=?, status_text=?, result=?, analysis=?, plan=?, updated_at=datetime(\'now\') WHERE id=?',
        ['done', 100, '调研完成', result.report, JSON.stringify(result.analysis), JSON.stringify(result.plan), jobId]);
    } catch (e: any) {
      const steps = JSON.parse(get('SELECT steps FROM jobs WHERE id=?', [jobId])?.steps || '[]');
      steps.push({ step: 'error', label: String(e?.message || e).slice(0, 200), pct: -1, at: Date.now() });
      run('UPDATE jobs SET status=?, status_text=?, steps=?, updated_at=datetime(\'now\') WHERE id=?',
        ['error', String(e?.message || e).slice(0, 200), JSON.stringify(steps), jobId]);
    }
  })();
});

api.get('/jobs/:id', (req: Request, res: Response) => {
  const row = get('SELECT * FROM jobs WHERE id=?', [req.params.id]);
  if (!row) return res.status(404).json({ ok: false });
  res.json({ ok: true, job: row });
});

/**
 * legacy 契约适配：内嵌的 12 个原始页面用单数 /api/job/<id> 轮询，
 * 且期望 job.statusText / job.progress(对象) / job.steps[].node|detail / job.plan(对象)。
 * 这里把 studio 的扁平 job 行转换成 legacy 形状，保证老页面能真正跑起来。
 *
 * 注意：经代理提交到「建站助手」bridge 的任务，其 job 存在 bridge 进程内存中，
 * studio 本地表查不到 → 回退到 bridge 轮询，否则老页面会误报「任务已丢失」。
 */
api.get('/job/:id', async (req: Request, res: Response) => {
  const row = get('SELECT * FROM jobs WHERE id=?', [req.params.id]);
  if (!row) {
    // 回退：到 bridge 查（代理提交的任务）
    try {
      const r = await fetch(`${BRIDGE_BASE}/api/job/${encodeURIComponent(req.params.id)}`, {
        signal: AbortSignal.timeout(Number(process.env.RESEARCH_TIMEOUT_MS || 12000)),
      });
      if (r.ok) {
        const text = await r.text();
        res.type('application/json').send(text);
        return;
      }
    } catch { /* bridge 不在线则按未找到处理 */ }
    return res.status(404).json({ ok: false, error: 'job not found' });
  }
  let steps: any[] = [];
  try { steps = JSON.parse(row.steps || '[]'); } catch { /* ignore */ }
  let plan: any = null;
  try { plan = row.plan ? JSON.parse(row.plan) : null; } catch { /* ignore */ }
  const legacySteps = steps.map((s: any) => ({
    node: s.label || s.step || '',
    detail: typeof s.pct === 'number' ? `${s.pct}%` : String(s.pct ?? ''),
    ok: true,
  }));
  res.json({
    ok: true,
    job: {
      id: row.id,
      status: row.status === 'running' ? 'building' : row.status,
      statusText: row.status_text || '',
      progress: { label: row.status_text || '', pct: row.progress || 0 },
      steps: legacySteps,
      plan,
      result: row.result || '',
      error: row.status === 'error' ? row.status_text : undefined,
    },
  });
});

api.get('/jobs', (_req, res) => {
  res.json(all('SELECT id,seed,status,progress,status_text,created_at FROM jobs ORDER BY created_at DESC LIMIT 20'));
});

// ---- 截图静态服务 ----
api.get('/shots/:job/:file', (req: Request, res: Response) => {
  const fp = path.join(DATA_DIR, 'shots', req.params.job, req.params.file);
  if (!fp.startsWith(path.join(DATA_DIR, 'shots')) || !fs.existsSync(fp)) return res.status(404).end();
  res.type('image/png').send(fs.readFileSync(fp));
});

// legacy 别名：原始页面用单数 /api/shot/<jobId>/<file>
api.get('/shot/:job/:file', (req: Request, res: Response) => {
  const fp = path.join(DATA_DIR, 'shots', req.params.job, req.params.file);
  if (!fp.startsWith(path.join(DATA_DIR, 'shots')) || !fs.existsSync(fp)) return res.status(404).end();
  res.type('image/png').send(fs.readFileSync(fp));
});

// ---- 需求调研截图上传（本地 OCR 用） ----
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const IMG_EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
};

api.post('/uploads', (req: Request, res: Response) => {
  const { name, dataUrl } = req.body || {};
  const m = typeof dataUrl === 'string' ? dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i) : null;
  if (!m) return res.status(400).json({ ok: false, error: '请提供 dataUrl 格式的图片（截图）' });
  const ext = IMG_EXT[m[1].toLowerCase()] || 'png';
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 12 * 1024 * 1024) return res.status(413).json({ ok: false, error: '图片过大（上限 12MB）' });
  const id = crypto.randomBytes(10).toString('hex') + '.' + ext;
  try {
    fs.writeFileSync(path.join(UPLOADS_DIR, id), buf);
    res.json({ ok: true, id, url: `/uploads/${id}`, name: typeof name === 'string' ? name : id });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: '保存失败：' + String(e?.message || e).slice(0, 120) });
  }
});

api.get('/uploads/:file', (req: Request, res: Response) => {
  const fp = path.join(UPLOADS_DIR, path.basename(req.params.file));
  if (!fp.startsWith(UPLOADS_DIR) || !fs.existsSync(fp)) return res.status(404).end();
  res.sendFile(fp);
});

// ---- legacy 引擎端点代理 ----
/**
 * 内嵌的 12 个原始页面（内容生产 / 技术SEO / 外链 / 社区 / 变现 / 监控 / SEO / 部署…）
 * 会 POST 到 /api/<engine> 并用 {ok, jobId} 回执，然后轮询 /api/job/<id>。
 * 这些引擎的真实实现仍在原「建站助手」Python bridge 上，这里做一层透明代理，
 * 让页面在 Studio 内嵌预览时同样可用；bridge 不在线时返回明确错误而不是静默 404。
 */
const LEGACY_ENGINES = [
  'content', 'techseo', 'backlink', 'community', 'monetize',
  'monitor', 'seo', 'deploy', 'build', 'chat', 'generate', 'autofill',
];

async function proxyToBridge(req: Request, res: Response, endpoint: string) {
  const body = req.method === 'GET' ? undefined : JSON.stringify(req.body ?? {});
  try {
    const r = await fetch(`${BRIDGE_BASE}${endpoint}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(Number(process.env.RESEARCH_TIMEOUT_MS || 12000) * 6),
    });
    const text = await r.text();
    res.status(r.status).type(r.headers.get('content-type') || 'application/json').send(text);
  } catch (e: any) {
    res.status(502).json({
      ok: false,
      error: `建站助手桥接服务未连接（${BRIDGE_BASE}）：${String(e?.message || e).slice(0, 160)}`,
    });
  }
}

for (const eng of LEGACY_ENGINES) {
  api.post(`/${eng}`, (req: Request, res: Response) => proxyToBridge(req, res, `/api/${eng}`));
}

// 原始设置页读取的 agent 状态
api.get('/agent/status', (req: Request, res: Response) => proxyToBridge(req, res, '/api/agent/status'));

// ============ 技能执行（把技能从「文档」变成「可执行任务」） ============

/** 可执行任务清单：前端工作台与流程页据此渲染 */
// 套件的 SKILL.md 原文（技能内容本体）
api.get('/suites/:slug/skillmd', (req: Request, res: Response) => {
  const su = SUITES.find((x) => x.slug === req.params.slug);
  if (!su) return res.status(404).json({ error: 'not found' });
  res.json({ slug: su.slug, name: su.name, body: loadSkillMd(su.slug) });
});

api.get('/suites', (_req: Request, res: Response) => {
  const tasks = allTasks().map((t) => ({
    suite: t.suite,
    suiteName: t.suiteName,
    step: t.step,
    key: t.task.key,
    name: t.task.name,
    desc: t.task.desc,
    collect: t.task.collect,
    inputs: t.task.inputs,
    outputFields: Object.keys(t.task.outputFields || {}),
  }));
  const suites = SUITES.map((s) => ({
    slug: s.slug,
    name: s.name,
    desc: s.desc,
    step: s.step,
    covers: s.covers,
    tasks: s.tasks.map((t) => ({ key: t.key, name: t.name, desc: t.desc, step: t.step, collect: t.collect })),
  }));
  res.json({ ok: true, suites, tasks, llmReady: llmAvailable() });
});

/** 流程步骤的执行定义：用户只需面对「这一步填什么」，技能是后台细节 */
api.get('/steps', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    steps: STEP_DEFS.map((s) => ({
      step: s.step,
      key: s.key,
      label: s.label,
      phase: s.phase,
      goal: s.goal,
      inputs: s.inputs,
      outputs: s.outputs,
      // 后台编排信息：只在「流程编排」设置页展示，不在主流程界面暴露
      backend: s.backend,
    })),
  });
});

/** 把站点档案合并进执行输入：建档字段（站点名/域名/面向地区/定位/语言）作为统一上下文，
 * 用户显式填写的字段优先，留空则回退到站点档案，确保后续步骤不再需要「引用上一步」。 */
function applySiteContext(input: Record<string, any>, siteId?: string): { input: Record<string, any>; siteContext?: string } {
  if (!siteId) return { input: input || {} };
  const s = getSite(siteId);
  if (!s) return { input: input || {} };
  const defaults: Record<string, any> = {
    siteName: s.name,
    domain: s.domain,
    region: s.region,
    positioning: s.positioning,
    language: s.language,
    siteType: s.site_type,
    site: s.domain || s.name,
    appName: s.name,
    product: s.name,
  };
  const merged: Record<string, any> = { ...defaults };
  for (const [k, v] of Object.entries(input || {})) {
    // 用户留空 → 保留站点档案值；用户填写 → 覆盖
    if (v !== undefined && v !== null && String(v).trim() !== '') merged[k] = v;
  }
  const siteContext = `站点上下文（来自建档，无需引用上一步）：产品名=${s.name || '未命名'}；域名=${s.domain || '未定'}；面向地区=${s.region || '未指定'}；定位=${s.positioning || '未提供'}；语言=${s.language || '英语'}。后续判断请以该上下文为准。`;
  return { input: merged, siteContext };
}

/** 按流程步骤执行：前端只传步骤 key 与用户输入，后端决定调用哪个技能 */
api.post('/steps/:key/run', async (req: Request, res: Response) => {
  const def = findStepDef(req.params.key);
  if (!def) return res.status(404).json({ ok: false, error: `未找到流程步骤 ${req.params.key}` });
  const { input, upstreamId, online, siteId } = req.body || {};
  if (!def.exec.suite || !def.exec.task) {
    return res.status(400).json({ ok: false, error: '该步骤尚未接入可执行引擎' });
  }
  // 站点上下文：建档字段自动合并进输入，消除「引用上一步」
  const ctxMerge = applySiteContext(input || {}, siteId || undefined);
  const mergedInput = ctxMerge.input;
  if (siteId && !getSite(siteId)) {
    return res.status(400).json({ ok: false, error: '站点不存在' });
  }
  // 必填校验（含条件必填），避免空输入产出无依据的估算
  const vals: Record<string, any> = mergedInput;
  const lack = (def.inputs || []).filter((f) => {
    if (String(vals[f.key] ?? '').trim()) return false;
    if (f.required) return true;
    return !!(f.requiredWhen && String(vals[f.requiredWhen.key] ?? '') === f.requiredWhen.equals);
  });
  if (lack.length) {
    return res.status(400).json({ ok: false, error: '缺少必填信息：' + lack.map((f) => f.label).join('、') });
  }

  // 条件路由：按输入切换执行的任务（如有 variants 定义时）
  let suite = def.exec.suite!;
  let task = def.exec.task!;
  for (const v of def.exec.variants || []) {
    if (String(vals[v.when.key] ?? '') === v.when.equals) {
      suite = v.suite;
      task = v.task;
      break;
    }
  }

  const id = crypto.randomBytes(6).toString('hex');
  run(
    `INSERT INTO skill_runs (id,suite,task,status,progress,status_text,input_json,upstream_id,site_id) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, suite, task, 'pending', 0, '已排队', JSON.stringify(mergedInput), upstreamId || '', siteId || ''],
  );

  const deps: RunnerDeps = {
    createRun: () => {},
    updateRun: (rid, patch) => {
      const keys = Object.keys(patch);
      if (!keys.length) return;
      const set = keys.map((k) => `${k}=?`).join(',');
      run(`UPDATE skill_runs SET ${set} WHERE id=?`, [...keys.map((k) => (patch as any)[k]), rid]);
    },
    getRun: (rid) => get('SELECT * FROM skill_runs WHERE id=?', [rid]) as RunRow | undefined,
  };

  // 建档步骤（create）完成后，把产物写回站点档案作为统一上下文
  const promoteProfile = siteId ? def.key === 'create' : false;

  void executeRun(id, suite, task, mergedInput, deps, {
    upstreamId: upstreamId || undefined,
    online: online !== false,
    siteId: siteId || undefined,
    siteContext: ctxMerge.siteContext,
    promoteProfile,
  });

  res.json({ ok: true, runId: id, step: def.key, stepLabel: def.label, suite, task, siteId: siteId || '' });
});

/** 启动一次技能执行 */
api.post('/suites/:suite/run', async (req: Request, res: Response) => {
  const suiteSlug = req.params.suite;
  const { task: taskKey, input, upstreamId, online, useN8n, siteId } = req.body || {};
  if (!taskKey) return res.status(400).json({ ok: false, error: '缺少 task' });
  if (!findTask(suiteSlug, taskKey)) {
    return res.status(404).json({ ok: false, error: `未找到任务 ${suiteSlug}/${taskKey}` });
  }
  // 站点上下文合并（建档字段自动带入，无需引用上一步）
  const ctxMerge = applySiteContext(input || {}, siteId || undefined);
  const mergedInput = ctxMerge.input;
  if (siteId && !getSite(siteId)) {
    return res.status(400).json({ ok: false, error: '站点不存在' });
  }

  const id = crypto.randomBytes(6).toString('hex');
  run(
    `INSERT INTO skill_runs (id,suite,task,status,progress,status_text,input_json,upstream_id,site_id) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, suiteSlug, taskKey, 'pending', 0, '已排队', JSON.stringify(mergedInput), upstreamId || '', siteId || ''],
  );

  const deps: RunnerDeps = {
    createRun: () => {},
    updateRun: (rid, patch) => {
      const keys = Object.keys(patch);
      if (!keys.length) return;
      const set = keys.map((k) => `${k}=?`).join(',');
      run(`UPDATE skill_runs SET ${set} WHERE id=?`, [...keys.map((k) => (patch as any)[k]), rid]);
    },
    getRun: (rid) => get('SELECT * FROM skill_runs WHERE id=?', [rid]) as RunRow | undefined,
  };

  // 异步执行，立即回执（前端轮询状态）
  void executeRun(id, suiteSlug, taskKey, mergedInput, deps, {
    upstreamId: upstreamId || undefined,
    online: online !== false,
    useN8n: useN8n === true,
    siteId: siteId || undefined,
    siteContext: ctxMerge.siteContext,
    promoteProfile: false,
  });

  res.json({ ok: true, runId: id, suite: suiteSlug, task: taskKey, siteId: siteId || '' });
});

/** 执行历史（支持按站点 / 套件过滤） */
api.get('/runs', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const suite = (req.query.suite as string) || '';
  const siteId = (req.query.siteId as string) || '';
  const rows = siteId
    ? all('SELECT * FROM skill_runs WHERE site_id=? ORDER BY created_at DESC LIMIT ?', [siteId, limit])
    : suite
      ? all('SELECT * FROM skill_runs WHERE suite=? ORDER BY created_at DESC LIMIT ?', [suite, limit])
      : all('SELECT * FROM skill_runs ORDER BY created_at DESC LIMIT ?', [limit]);
  res.json({
    ok: true,
    runs: rows.map((r: any) => ({
      id: r.id,
      suite: r.suite,
      task: r.task,
      status: r.status,
      progress: r.progress,
      statusText: r.status_text,
      hasArtifact: !!r.artifact_md,
      createdAt: r.created_at,
      finishedAt: r.finished_at,
      error: r.error,
      upstreamId: r.upstream_id,
      siteId: r.site_id,
    })),
  });
});

// ============ 站点（每个站点收拢建站全链路，取代「引用上一步」的跨步骤上下文传递） ============

/** 站点列表（附带各步骤完成度用于卡片进度展示） */
api.get('/sites', (_req: Request, res: Response) => {
  const sites = listSites();
  const sitesWithProgress = sites.map((s: any) => {
    const runs = all(
      `SELECT task, status FROM skill_runs WHERE site_id=? AND status='done'`,
      [s.id],
    ) as any[];
    const doneTasks = new Set(runs.map((r) => r.task));
    return { ...s, profile: safeJson(s.profile_json), doneTasks: [...doneTasks] };
  });
  res.json({ ok: true, sites: sitesWithProgress });
});

/** 创建站点：建档信息即站点上下文，后续步骤自动带上，无需引用上一步 */
api.post('/sites', (req: Request, res: Response) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ ok: false, error: '请填写站点名' });
  const id = createSite({
    name,
    domain: String(b.domain || '').trim(),
    region: String(b.region || '').trim(),
    positioning: String(b.positioning || '').trim(),
    language: String(b.language || '').trim(),
    siteType: String(b.siteType || '').trim(),
    researchId: String(b.researchId || '').trim(),
  });
  const site = getSite(id);
  res.json({ ok: true, site: { ...site, profile: safeJson(site.profile_json) } });
});

/** 站点详情（含其下执行记录，按步骤分组） */
api.get('/sites/:id', (req: Request, res: Response) => {
  const s = getSite(req.params.id);
  if (!s) return res.status(404).json({ ok: false, error: '站点不存在' });
  const runs = all('SELECT * FROM skill_runs WHERE site_id=? ORDER BY created_at DESC', [s.id]) as any[];
  const doneTasks = new Set(runs.filter((r) => r.status === 'done').map((r) => r.task));
  res.json({
    ok: true,
    site: { ...s, profile: safeJson(s.profile_json), doneTasks: [...doneTasks] },
    runs: runs.map((r: any) => ({
      id: r.id,
      suite: r.suite,
      task: r.task,
      status: r.status,
      progress: r.progress,
      statusText: r.status_text,
      createdAt: r.created_at,
      finishedAt: r.finished_at,
      error: r.error,
    })),
  });
});

/** 更新站点信息（手动编辑 / 建档后回填） */
api.patch('/sites/:id', (req: Request, res: Response) => {
  const s = getSite(req.params.id);
  if (!s) return res.status(404).json({ ok: false, error: '站点不存在' });
  const b = req.body || {};
  const patch: Record<string, any> = {};
  for (const k of ['name', 'domain', 'region', 'positioning', 'language', 'site_type', 'research_id']) {
    if (b[k] !== undefined) patch[k] = String(b[k]);
  }
  if (b.profile_json !== undefined) patch.profile_json = String(b.profile_json);
  updateSite(s.id, patch);
  const updated = getSite(s.id);
  res.json({ ok: true, site: { ...updated, profile: safeJson(updated.profile_json) } });
});

/** 删除站点 */
api.delete('/sites/:id', (req: Request, res: Response) => {
  deleteSite(req.params.id);
  res.json({ ok: true });
});

/** 把某次建档（create-site）产物写回站点档案：建档完成即站点上下文 */
api.post('/sites/:id/profile-from-run', (req: Request, res: Response) => {
  const s = getSite(req.params.id);
  if (!s) return res.status(404).json({ ok: false, error: '站点不存在' });
  const runId = String(req.body?.runId || '');
  const r = runId ? get('SELECT * FROM skill_runs WHERE id=?', [runId]) : null;
  if (!r) return res.status(404).json({ ok: false, error: '运行记录不存在' });
  setSiteProfile(s.id, String(r.output_json || '{}'));
  const updated = getSite(s.id);
  res.json({ ok: true, site: { ...updated, profile: safeJson(updated.profile_json) } });
});

/** 单次执行详情（含产物） */
api.get('/runs/:id', (req: Request, res: Response) => {
  const r = get('SELECT * FROM skill_runs WHERE id=?', [req.params.id]) as any;
  if (!r) return res.status(404).json({ ok: false, error: 'run not found' });
  let output: any = null;
  try {
    output = r.output_json ? JSON.parse(r.output_json) : null;
  } catch { /* 忽略 */ }
  let provenance: any = null;
  try {
    provenance = r.provenance ? JSON.parse(r.provenance) : null;
  } catch { /* 忽略 */ }
  const taskDef = findTask(r.suite, r.task)?.task;
  res.json({
    ok: true,
    run: {
      id: r.id,
      suite: r.suite,
      task: r.task,
      taskName: taskDef?.name || r.task,
      status: r.status,
      progress: r.progress,
      statusText: r.status_text,
      input: safeJson(r.input_json),
      output,
      outputFields: taskDef?.outputFields || {},
      provenance,
      error: r.error,
      upstreamId: r.upstream_id,
      createdAt: r.created_at,
      finishedAt: r.finished_at,
    },
  });
});

/** 产物 Markdown（直接查看） */
api.get('/runs/:id/md', (req: Request, res: Response) => {
  const r = get('SELECT * FROM skill_runs WHERE id=?', [req.params.id]) as any;
  if (!r) return res.status(404).json({ ok: false, error: 'run not found' });
  try {
    const md = fs.readFileSync(r.artifact_md, 'utf-8');
    res.type('text/plain; charset=utf-8').send(md);
  } catch {
    res.status(404).json({ ok: false, error: '产物尚未生成' });
  }
});

/** 删除一次执行记录 */
api.delete('/runs/:id', (req: Request, res: Response) => {
  run('DELETE FROM skill_runs WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

/** 产物归档：扫描落盘的 JSON / MD（含采集证据） */
api.get('/artifacts', (_req: Request, res: Response) => {
  const items: any[] = [];
  const walk = (dir: string, suite: string) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const st = fs.statSync(full);
      if (st.isDirectory()) { walk(full, suite); continue; }
      const m = f.match(/^(.+)-([0-9a-f]+)\.(json|md)$/);
      if (!m) continue;
      const [, task, runId, ext] = m;
      const base = `${suite}/${task}-${runId}`;
      const row = get('SELECT suite,task,status,status_text,created_at FROM skill_runs WHERE id=?', [runId]) as any;
      items.push({
        suite,
        task,
        runId,
        ext,
        file: f,
        path: `${suite}/${f}`,
        size: st.size,
        mtime: st.mtime.toISOString(),
        status: row?.status || '',
        statusText: row?.status_text || '',
        createdAt: row?.created_at || '',
        // 从 JSON 产物读取是否有真实采集证据
        hasEvidence: ext === 'json' ? null : undefined,
      });
    }
  };
  try {
    for (const d of fs.readdirSync(WORKSPACE_DIR)) {
      const full = path.join(WORKSPACE_DIR, d);
      if (fs.statSync(full).isDirectory()) walk(full, d);
    }
  } catch {
    /* 目录不存在则返回空 */
  }
  // 补充：标注哪些产物含真实采集证据
  for (const it of items) {
    if (it.ext !== 'json') continue;
    try {
      const j = JSON.parse(fs.readFileSync(path.join(WORKSPACE_DIR, it.suite, it.file), 'utf-8'));
      it.hasEvidence = !!(j.__evidence && j.__evidence.hasRealData);
      it.sources = j.__evidence?.sources || [];
    } catch {
      it.hasEvidence = false;
    }
  }
  items.sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)));
  res.json({ ok: true, dir: path.relative(process.cwd(), WORKSPACE_DIR), items });
});

/** 查看单个产物内容（md 原文 或 json） */
api.get('/artifacts/view', (req: Request, res: Response) => {
  const p = String(req.query.p || '');
  const m = p.match(/^([a-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
  if (!m) return res.status(400).json({ ok: false, error: '路径不合法' });
  const full = path.join(WORKSPACE_DIR, m[1], m[2]);
  if (!full.startsWith(WORKSPACE_DIR) || !fs.existsSync(full)) {
    return res.status(404).json({ ok: false, error: '产物不存在' });
  }
  res.type(m[2].endsWith('.md') ? 'text/plain; charset=utf-8' : 'application/json');
  res.send(fs.readFileSync(full, 'utf-8'));
});

function safeJson(s: string): any {
  try {
    return JSON.parse(s || '{}');
  } catch {
    return {};
  }
}
