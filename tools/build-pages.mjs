/**
 * 建站页面统一构建脚本（可重复执行）。
 *
 * 做三件事：
 *  1. 主题统一：所有页面的 :root 换成同一套紫色主题，并把 CSS / 内联样式里写死的
 *     彩色值（绿 / 蓝 / 靛蓝 …）按明度映射到同一色系，避免「点一个页面换一套皮肤」。
 *  2. 去掉「哥飞方法论」字样。
 *  3. 注入「查看」标签页：每个页面右下角多一个标签，点开可看本页在后台调用了
 *     哪些 n8n 工作流、哪些技能套件与任务（数据来自 data/orchestration.json）。
 *
 * 运行：node tools/build-pages.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_DIR = path.join(ROOT, 'data', 'pages');
const WF_DIR = path.join(ROOT, 'data', 'workflows');
const REGISTRY = path.join(ROOT, 'server', 'src', 'skills', 'registry.ts');
const ORCH = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'orchestration.json'), 'utf8'));
const MIRROR_DIR = path.resolve(ROOT, '..', 'n8n-indie-builder', 'indie_builder', 'static');

// ---------------------------------------------------------------- 统一主题
const CANONICAL_ROOT = `:root{
    --paper:#f6f3ec; --surface:#fffdf9; --surface-2:#f1ece2;
    --ink:#17131b; --muted:#5f5867;
    --line:rgba(23,19,27,.10); --line-2:rgba(23,19,27,.06);
    --accent:#5b34e6; --accent-ink:#4a25c9; --accent-soft:rgba(91,52,230,.10);
    --ok:#0f9d6b; --ok-soft:rgba(15,157,107,.12);
    --warn:#b45309; --warn-soft:rgba(180,83,9,.12);
    --err:#dc2626; --err-soft:rgba(220,38,38,.10);
    --gold:#c98a16; --gold-soft:rgba(201,138,22,.14);
    --radius:16px; --radius-lg:22px;
    --shadow-1:0 2px 8px rgba(23,19,27,.06); --shadow-2:0 12px 32px rgba(23,19,27,.09);
    --ease:cubic-bezier(0.16,1,0.3,1); --dur-fast:170ms; --dur:320ms;
    --font-body:"Plus Jakarta Sans","PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;
    --font-disp:"Fraunces","Noto Serif SC","Songti SC",Georgia,serif;
    /* chat / settings 页的旧变量名，统一指向同一主题 */
    --bg:#f6f3ec; --fg:#17131b; --primary:#5b34e6; --primary2:#7c5cf0;
    --user:#5b34e6; --orb1:#c9b8ff; --orb2:#e3d9ff; --glass:0; --dark:0;
    --font:"Plus Jakarta Sans","PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;
    --serif:"Fraunces","Noto Serif SC","Songti SC",Georgia,serif;
    --shadow:0 12px 40px rgba(23,19,27,.10);
  }`;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

/** 主题色板：已在色板内的颜色原样保留（保证脚本可重复执行） */
const THEME_RGB = [
  [246, 243, 236], [255, 253, 249], [241, 236, 226],
  [23, 19, 27], [95, 88, 103],
  [91, 52, 230], [74, 37, 201], [139, 110, 240], [124, 92, 240],
  [201, 184, 255], [227, 217, 255],
];
function isTheme(r, g, b) {
  return THEME_RGB.some((t) => Math.abs(t[0] - r) <= 2 && Math.abs(t[1] - g) <= 2 && Math.abs(t[2] - b) <= 2);
}

/** 彩色 → 主题色（按明度分档）；中性灰 / 近白原样保留 */
function themeColor(r, g, b) {
  const { s, l } = rgbToHsl(r, g, b);
  if (s < 0.16 || l > 0.965 || l < 0.09) return null;
  if (isTheme(r, g, b)) return null;
  if (l >= 0.90) return [255, 253, 249];   // surface（浅色底/浅色字）
  if (l >= 0.80) return [241, 236, 226];   // surface-2
  if (l >= 0.62) return [139, 110, 240];   // accent 浅（深色底上的文字）
  if (l >= 0.35) return [91, 52, 230];     // accent
  if (l >= 0.22) return [74, 37, 201];     // accent-ink
  return [23, 19, 27];                     // 深色底（代码块/深色区块）→ 墨色
}

function remapSegment(seg) {
  return seg
    .replace(/#([0-9a-fA-F]{6})\b/g, (m, hex) => {
      const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
      const t = themeColor(r, g, b);
      return t ? '#' + t.map((v) => v.toString(16).padStart(2, '0')).join('') : m;
    })
    .replace(/#([0-9a-fA-F]{3})\b/g, (m, hex) => {
      const r = parseInt(hex[0] + hex[0], 16), g = parseInt(hex[1] + hex[1], 16), b = parseInt(hex[2] + hex[2], 16);
      const t = themeColor(r, g, b);
      return t ? '#' + t.map((v) => v.toString(16).padStart(2, '0')).join('') : m;
    })
    .replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*([\d.]+)\s*)?\)/g, (m, r, g, b, _a, alpha) => {
      const t = themeColor(+r, +g, +b);
      if (!t) return m;
      return alpha !== undefined
        ? `rgba(${t[0]}, ${t[1]}, ${t[2]}, ${alpha.trim()})`
        : `rgb(${t[0]}, ${t[1]}, ${t[2]})`;
    });
}

function unifyTheme(html) {
  // 先给正文里的写死色值做映射（跳过 :root 块，因为整块会被替换）
  const re = /:root\s*\{[\s\S]*?\}/g;
  let out = '', last = 0, m;
  while ((m = re.exec(html))) {
    out += remapSegment(html.slice(last, m.index));
    last = m.index + m[0].length;
  }
  out += remapSegment(html.slice(last));
  // 再把 :root 整块换成统一主题（只保留第一次出现的位置）
  let first = true;
  out = out.replace(/[ \t]*:root\s*\{[\s\S]*?\}/g, () => {
    if (first) { first = false; return CANONICAL_ROOT; }
    return '';
  });
  if (first) out = out.replace(/(<style[^>]*>)/i, '$1\n' + CANONICAL_ROOT);
  return out;
}

// ---------------------------------------------------------------- 去掉「哥飞方法论」
const GEFEI_FIXES = [
  [/哥飞方法论\s*·\s*/g, ''],
  [/·\s*哥飞方法论/g, ''],
  [/基于哥飞「选词 → 覆盖 → 内链 → 行为数据」的方法论。/g, ''],
  [/哥飞打法/g, '内链策略'],
  [/哥飞强调/g, ''],
  [/哥飞/g, ''],
];
function dropGeFei(html) {
  let s = html;
  for (const [re, to] of GEFEI_FIXES) s = s.replace(re, to);
  // 修掉可能留下的空分隔符
  s = s.replace(/·(\s*·)+/g, '·').replace(/·\s*(\||$)/g, '$1').replace(/·\s*</g, '<').replace(/\s{2,}(·)/g, ' $1');
  return s;
}

// ---------------------------------------------------------------- 编排数据
const TRIGGER_LABEL = {
  'n8n-nodes-base.webhook': 'Webhook 触发',
  'n8n-nodes-base.formTrigger': '表单触发',
  '@n8n/n8n-nodes-langchain.chatTrigger': '对话触发',
  'n8n-nodes-base.executeWorkflowTrigger': '子工作流（被 Agent 调用）',
  'n8n-nodes-base.scheduleTrigger': '定时触发',
  'n8n-nodes-base.manualTrigger': '手动触发',
};
const NODE_LABEL = {
  'n8n-nodes-base.webhook': 'Webhook',
  'n8n-nodes-base.code': 'Code',
  'n8n-nodes-base.httpRequest': 'HTTP 请求',
  'n8n-nodes-base.if': 'IF 判断',
  'n8n-nodes-base.set': 'Set',
  'n8n-nodes-base.form': 'Form',
  'n8n-nodes-base.formTrigger': 'Form Trigger',
  'n8n-nodes-base.executeWorkflowTrigger': 'Workflow Trigger',
  '@n8n/n8n-nodes-langchain.chatTrigger': 'Chat Trigger',
  '@n8n/n8n-nodes-langchain.agent': 'AI Agent',
  '@n8n/n8n-nodes-langchain.lmChatOpenAi': 'LLM',
  '@n8n/n8n-nodes-langchain.memoryBufferWindow': 'Memory',
  '@n8n/n8n-nodes-langchain.toolWorkflow': 'Workflow Tool',
};

function workflowMeta(slug) {
  const p = path.join(WF_DIR, slug + '.json');
  if (!fs.existsSync(p)) return { slug, name: slug, nodes: 0, hook: '', trigger: '未知', types: '' };
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const nodes = j.nodes || [];
  const trig = nodes.find((n) => /trigger/i.test(n.type || '')) || {};
  const types = [...new Set(nodes.map((n) => NODE_LABEL[n.type] || n.type))].slice(0, 6).join(' → ');
  return {
    slug,
    name: j.name || slug,
    nodes: nodes.length,
    hook: (trig.parameters && trig.parameters.path) || '',
    trigger: TRIGGER_LABEL[trig.type] || '工作流',
    types,
  };
}

/** 从 registry.ts 里解析套件与任务名称（避免手抄导致不同步） */
function parseRegistry() {
  const src = fs.readFileSync(REGISTRY, 'utf8');
  const suites = {};
  const suiteRe = /\{\s*slug:\s*'([^']+)',\s*name:\s*'([^']+)',\s*desc:\s*'([^']+)'[\s\S]*?covers:\s*'([^']*)'/g;
  let m;
  while ((m = suiteRe.exec(src))) suites[m[1]] = { slug: m[1], name: m[2], desc: m[3], covers: m[4], tasks: {} };
  const taskRe = /\{\s*key:\s*'([^']+)',\s*name:\s*'((?:[^'\\]|\\.)*)',\s*desc:\s*'((?:[^'\\]|\\.)*)',\s*step:\s*(\d+)/g;
  while ((m = taskRe.exec(src))) {
    const key = m[1], t = { key, name: m[2], desc: m[3], step: +m[4] };
    for (const s of Object.values(suites)) if (!s.tasks[key]) s.tasks[key] = t;
  }
  return suites;
}

function orchData(slug) {
  const suites = parseRegistry();
  const cfg = ORCH.pages[slug] || { step: 0, label: slug, phase: '其他', workflows: [], suites: [], tasks: [] };
  return {
    page: slug,
    step: cfg.step,
    label: cfg.label,
    phase: cfg.phase,
    note: cfg.note || '',
    workflows: cfg.workflows.map(workflowMeta),
    skills: cfg.suites.map((s) => {
      const su = suites[s] || { slug: s, name: s, desc: '', covers: '', tasks: {} };
      return {
        slug: s,
        name: su.name,
        desc: su.desc,
        covers: su.covers,
        tasks: cfg.tasks
          .map((k) => su.tasks[k])
          .filter(Boolean)
          .map((t) => ({ key: t.key, name: t.name, desc: t.desc })),
      };
    }),
  };
}

// ---------------------------------------------------------------- 「查看」标签页
function orchSnippet(slug) {
  const data = JSON.stringify(orchData(slug));
  return `
<!-- ORCH:BEGIN 编排查看标签页（本页调用的 n8n 流程与技能） -->
<style>
  .orch-tab{position:fixed;right:0;top:34%;z-index:70;writing-mode:vertical-rl;letter-spacing:.08em;
    padding:14px 9px;border:1px solid var(--line,rgba(23,19,27,.12));border-right:0;border-radius:12px 0 0 12px;
    background:var(--surface,#fffdf9);color:var(--accent-ink,#4a25c9);cursor:pointer;
    font:600 12.5px/1 var(--font-body,"PingFang SC","Microsoft YaHei",sans-serif);
    box-shadow:var(--shadow-1,0 2px 8px rgba(23,19,27,.08));transition:var(--dur-fast,170ms)}
  .orch-tab:hover{background:var(--accent-soft,rgba(91,52,230,.10));color:var(--accent,#5b34e6)}
  .orch-mask{position:fixed;inset:0;z-index:80;background:rgba(23,19,27,.34);backdrop-filter:blur(2px)}
  .orch-mask[hidden]{display:none}
  .orch-panel{position:fixed;top:0;right:0;bottom:0;width:min(460px,94vw);z-index:90;overflow:auto;
    background:var(--surface,#fffdf9);border-left:1px solid var(--line,rgba(23,19,27,.12));
    box-shadow:var(--shadow-2,0 12px 32px rgba(23,19,27,.16));padding:22px 24px 48px;
    font-family:var(--font-body,"PingFang SC","Microsoft YaHei",sans-serif);color:var(--ink,#17131b)}
  .orch-panel[hidden]{display:none}
  .orch-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:18px}
  .orch-head b{font-size:18px;display:block}
  .orch-head span{display:block;margin-top:4px;font-size:12.5px;color:var(--muted,#5f5867)}
  .orch-x{margin-left:auto;border:1px solid var(--line,rgba(23,19,27,.12));background:var(--surface-2,#f1ece2);
    color:var(--ink,#17131b);border-radius:999px;width:30px;height:30px;cursor:pointer;font-size:14px;flex:none}
  .orch-sec{margin-top:20px}
  .orch-sec h4{margin:0 0 10px;font-size:13px;letter-spacing:.06em;color:var(--accent,#5b34e6);text-transform:uppercase}
  .orch-card{border:1px solid var(--line,rgba(23,19,27,.12));border-radius:var(--radius,14px);padding:12px 14px;margin-bottom:10px;background:var(--surface-2,#f1ece2)}
  .orch-card b{font-size:14px}
  .orch-badge{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;
    background:var(--accent-soft,rgba(91,52,230,.12));color:var(--accent-ink,#4a25c9)}
  .orch-meta{margin-top:6px;font-size:12px;color:var(--muted,#5f5867)}
  .orch-desc{margin-top:6px;font-size:12.5px;color:var(--muted,#5f5867);line-height:1.6}
  .orch-task{margin-top:8px;padding-left:12px;border-left:2px solid var(--accent,#5b34e6)}
  .orch-task b{font-size:13px}
  .orch-empty{font-size:12.5px;color:var(--muted,#5f5867);padding:10px 12px;border:1px dashed var(--line,rgba(23,19,27,.16));border-radius:var(--radius,14px)}
  .orch-note{margin-top:18px;font-size:12.5px;line-height:1.7;color:var(--muted,#5f5867);
    background:var(--accent-soft,rgba(91,52,230,.08));border-radius:var(--radius,14px);padding:12px 14px}
</style>
<button class="orch-tab" id="orchTab" type="button" title="查看本页调用的 n8n 流程与技能">查看 · n8n / 技能</button>
<div class="orch-mask" id="orchMask" hidden></div>
<aside class="orch-panel" id="orchPanel" hidden aria-label="编排查看">
  <div class="orch-head">
    <div><b>本页编排</b><span id="orchSub"></span></div>
    <button class="orch-x" id="orchClose" type="button" aria-label="关闭">✕</button>
  </div>
  <div id="orchBody"></div>
</aside>
<script id="orchData" type="application/json">${data}</script>
<script>
(function(){
  var d = JSON.parse(document.getElementById('orchData').textContent);
  var tab=document.getElementById('orchTab'), panel=document.getElementById('orchPanel'),
      mask=document.getElementById('orchMask'), box=document.getElementById('orchBody'),
      sub=document.getElementById('orchSub'), x=document.getElementById('orchClose');
  function el(t,c,txt){var n=document.createElement(t); if(c)n.className=c; if(txt!=null)n.textContent=txt; return n;}
  function build(){
    sub.textContent = (d.step? ('第 '+d.step+' 步 · ') : '') + d.phase + ' · ' + d.label;
    box.innerHTML='';
    var s1=el('div','orch-sec'); s1.appendChild(el('h4','','n8n 流程'));
    if(!d.workflows.length){ s1.appendChild(el('div','orch-empty','本页不经过 n8n，由后台技能引擎直接执行。')); }
    d.workflows.forEach(function(w){
      var c=el('div','orch-card'), t=el('div','');
      t.appendChild(el('b','',w.name)); t.appendChild(el('span','orch-badge',w.trigger));
      c.appendChild(t);
      c.appendChild(el('div','orch-meta','节点 '+w.nodes+' 个'+(w.hook?(' · Webhook /'+w.hook):'')+(w.types?(' · '+w.types):'')));
      s1.appendChild(c);
    });
    box.appendChild(s1);
    var s2=el('div','orch-sec'); s2.appendChild(el('h4','','技能套件与任务'));
    if(!d.skills.length){ s2.appendChild(el('div','orch-empty','本页不直接调用 SEO/GEO 技能套件。')); }
    d.skills.forEach(function(s){
      var c=el('div','orch-card'), t=el('div','');
      t.appendChild(el('b','',s.name)); t.appendChild(el('span','orch-badge',s.slug));
      c.appendChild(t);
      c.appendChild(el('div','orch-desc',s.desc+(s.covers?('（'+s.covers+'）'):'')));
      s.tasks.forEach(function(k){
        var w=el('div','orch-task'); w.appendChild(el('b','',k.name));
        w.appendChild(el('div','orch-desc',k.desc)); c.appendChild(w);
      });
      s2.appendChild(c);
    });
    box.appendChild(s2);
    if(d.note){ box.appendChild(el('div','orch-note',d.note)); }
  }
  function open(){ build(); panel.hidden=false; mask.hidden=false; document.body.style.overflow='hidden'; }
  function shut(){ panel.hidden=true; mask.hidden=true; document.body.style.overflow=''; }
  tab.addEventListener('click',open); x.addEventListener('click',shut); mask.addEventListener('click',shut);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') shut(); });
})();
</script>
<!-- ORCH:END -->`;
}

// -------------------------------------------- 侧边栏「增长流程」导航（12 步，单一数据源）
// 顺序与 step 编号来自 data/orchestration.json，避免各处各写一套导致页面与流程不一致。
function navList() {
  return Object.entries(ORCH.pages || {})
    .map(([slug, cfg]) => ({ slug, step: cfg.step || 0, label: cfg.label || slug }))
    .filter((x) => x.step > 0)
    .sort((a, b) => a.step - b.step);
}

function navSnippet(slug) {
  return navList()
    .map((x) => {
      const on = x.slug === slug;
      return `      <a class="sb-link${on ? ' active' : ''}" href="/${x.slug}"${on ? ' aria-current="page"' : ''}><span class="sb-num">${x.step}</span>${x.label}</a>`;
    })
    .join('\n');
}

// ------------------------------------------------- n8n 工作流里的「哥飞」+ 生成报告配色
function syncWorkflows() {
  let n = 0;
  for (const f of fs.readdirSync(WF_DIR).filter((x) => x.endsWith('.json'))) {
    const p = path.join(WF_DIR, f);
    const before = fs.readFileSync(p, 'utf8');
    let s = dropGeFei(before);
    s = s.replace(/("jsCode"\s*:\s*")((?:[^"\\]|\\.)*)(")/g, (_m, a, v, c) => a + remapSegment(v) + c);
    if (s !== before) { fs.writeFileSync(p, s); n++; }
  }
  return n;
}

// ---------------------------------------------------------------- 主流程
const wfChanged = syncWorkflows();
console.log('工作流同步（去哥飞 + 生成报告配色统一）：', wfChanged, '个');
const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html'));
let changed = 0;
for (const f of files) {
  const slug = f.replace(/\.html$/, '');
  const p = path.join(PAGES_DIR, f);
  let html = fs.readFileSync(p, 'utf8');
  const before = html;
  if (!html.includes('/* theme:canonical */')) {
    html = unifyTheme(html).replace(CANONICAL_ROOT, CANONICAL_ROOT.replace(':root{', ':root{ /* theme:canonical */'));
  }
  html = dropGeFei(html);
  // 侧边栏流程导航：整段替换，保证 12 步编号与新增步骤永远跟着编排数据走
  const navRe = /<div class="sb-group">增长流程[\s\S]*?<div class="sb-group">系统<\/div>/;
  if (navRe.test(html)) {
    html = html.replace(
      navRe,
      '      <div class="sb-group">增长流程（按流程链条排序）</div>\n' +
        navSnippet(slug) +
        '\n      <div class="sb-group">系统</div>',
    );
  }
  // 编排标签页：已注入则整段替换，保证数据可更新
  const b = html.indexOf('<!-- ORCH:BEGIN');
  const e = html.indexOf('<!-- ORCH:END -->');
  if (b >= 0 && e > b) html = html.slice(0, b) + orchSnippet(slug) + html.slice(e + '<!-- ORCH:END -->'.length);
  else html = html.replace(/<\/body>/i, orchSnippet(slug) + '\n</body>');
  if (html !== before) { fs.writeFileSync(p, html); changed++; }
  if (fs.existsSync(MIRROR_DIR)) fs.copyFileSync(p, path.join(MIRROR_DIR, f));
  console.log('✓', f, html.length, 'bytes');
}
console.log('\n已更新', changed, '个页面；镜像同步到', MIRROR_DIR);
