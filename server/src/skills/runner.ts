// 技能执行引擎：SKILL.md 方法论 + 真实采集数据 -> LLM -> 结构化产物 -> 落盘回流。
//
// 一次执行的阶段：
//   1 collect  真实数据采集（联想词 / 页面事实）
//   2 compose  组装 system（SKILL.md + references）+ user（任务 prompt + 采集数据）
//   3 think    LLM 生成（严格 JSON，失败自动修复重试一次）
//   4 verify   校验产物字段完整性
//   5 persist  存库 + 落盘 JSON/MD 到 seo-workspace/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chatJSON, llmAvailable } from '../llm.js';
import { collectSignals, fetchPage, extractSeoFacts } from './collect.js';
import { findTask, type TaskContext, type TaskDef, type SuiteDef } from './registry.js';
import { DATA_DIR, get, setSiteProfile } from '../db.js';
import { ocrFile } from '../ocr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUITES_DIR = path.resolve(__dirname, '../../../data/suites');
export const WORKSPACE_DIR = path.resolve(__dirname, '../../../data/workspace');
fs.mkdirSync(WORKSPACE_DIR, { recursive: true });

/** 剥离 SKILL.md 的 YAML frontmatter */
function stripFrontmatter(md: string): string {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  if (end < 0) return md;
  return md.slice(end + 4).trim();
}

/** 读取套件的方法论文档（SKILL.md），缺失时降级为空 */
export function loadSkillMd(suite: string): string {
  const p = path.join(SUITES_DIR, suite, 'SKILL.md');
  try {
    return stripFrontmatter(fs.readFileSync(p, 'utf-8'));
  } catch {
    return '';
  }
}

/** 读取若干 references，按 maxChars 截断，避免 prompt 爆炸 */
export function loadReferences(suite: string, files: string[], maxChars = 6000): string {
  const parts: string[] = [];
  for (const f of files) {
    try {
      const p = path.join(SUITES_DIR, suite, 'references', f);
      let txt = fs.readFileSync(p, 'utf-8');
      if (txt.length > maxChars) txt = txt.slice(0, maxChars) + '\n…(已截断)';
      parts.push(`### 参考：${f}\n${txt}`);
    } catch {
      // 缺失的 reference 静默跳过
    }
  }
  return parts.join('\n\n');
}

export interface RunRow {
  id: string;
  suite: string;
  task: string;
  status: string;
  progress: number;
  status_text: string;
  input_json: string;
  output_json: string;
  provenance: string;
  artifact_json: string;
  artifact_md: string;
  error: string;
  upstream_id: string;
  created_at: string;
  finished_at: string;
}

export interface RunnerDeps {
  createRun: (r: Omit<RunRow, 'output_json' | 'artifact_json' | 'artifact_md' | 'finished_at'>) => void;
  updateRun: (id: string, patch: Partial<RunRow>) => void;
  getRun: (id: string) => RunRow | undefined;
}

function statusText(stage: string, pct: number): string {
  return `${stage} · ${pct}%`;
}

/** 组装 system prompt：方法论 + 参考知识 + 输出结构硬约束 */
function composeSystem(suite: SuiteDef, task: TaskDef): string {
  const skillMd = loadSkillMd(suite.slug);
  const refs = loadReferences(suite.slug, task.refs);

  const fieldsDesc = Object.entries(task.outputFields)
    .map(([k, v]) => `- \`${k}\`：${v}`)
    .join('\n');

  return `你是 ${suite.name}（${suite.slug}）领域的资深 SEO/GEO 专家。下面是该领域的方法论与参考资料，你必须严格遵循。

# 领域方法论（SKILL.md）
${skillMd || '（方法论文档缺失，按通用最佳实践执行）'}

${refs ? `# 参考资料（节选）\n${refs}` : ''}

# 本次任务
${task.name}：${task.desc}

# 输出要求（硬性）
只输出**一个 JSON 对象**，不要任何解释文字或代码围栏。必须包含以下字段：
${fieldsDesc}

额外要求：
1. 所有结论必须可执行、可落地，避免空泛套话。
2. 无法获取真实数据的指标，用 "未知" 或明确标注"估算"，**严禁编造精确数字**。
3. 涉及事实时，优先引用输入中提供的真实采集数据作为证据。
4. 语言：与用户输入的语言保持一致（用户用中文提问就用中文回答）。
5. **字段名必须严格与上面列出的完全一致**（包括大小写与下划线），不得自行改名、不得增加同义字段、不得嵌套到别的键里；这是下游步骤自动消费产物的前提。
6. 若某项要求回填既有事实（如页面审计的 facts 字段），请**原样回填**给定 JSON 的键与值，不要重命名或省略。
7. 只输出 JSON 对象本身，禁止包裹在 markdown 代码块中。`;
}

/** 把 JSON 产物渲染为可读 Markdown（存档与人工查看用） */
export function renderMarkdown(suite: string, task: TaskDef, data: any, ctx: TaskContext): string {
  const L: string[] = [];
  L.push(`# ${task.name}`);
  L.push('');
  L.push(`- 技能套件：${suite}`);
  L.push(`- 任务：${task.key}`);
  L.push(`- 生成时间：${new Date().toLocaleString('zh-CN')}`);
  L.push(
    `- 数据来源：${ctx.hasRealData ? '**真实采集**（' + ctx.provenance.join('、') + '）' : '无真实采集，结论为估算'}`,
  );
  L.push('');

  // 采集证据明细（中间产物留痕，便于复核产物是事实还是估算）
  if (ctx.hasRealData) {
    L.push('## 采集证据');
    L.push(`> 本次执行真实采集到的原始数据，产结论时以此为事实依据。`);
    L.push('');
    if (ctx.provenance.length) {
      L.push(`- 采集来源：${ctx.provenance.join('、')}`);
    }
    if (ctx.realTerms && ctx.realTerms.length) {
      L.push(`- 真实联想词（${ctx.realTerms.length} 条）：`);
      ctx.realTerms.forEach((t) => L.push(`  - ${t}`));
    }
    if (ctx.pageFacts && typeof ctx.pageFacts === 'object') {
      L.push(`- 页面抓取事实：`);
      for (const [k, v] of Object.entries(ctx.pageFacts)) {
        if (v === null || v === undefined || typeof v === 'object') continue;
        L.push(`  - ${k}: ${v}`);
      }
    }
    L.push('');
  }

  if (!data || typeof data !== 'object') {
    L.push('（产物为空）');
    return L.join('\n');
  }

  const renderVal = (v: any, depth = 0): string => {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) {
      return v
        .map((item) => {
          if (item && typeof item === 'object') {
            const inner = Object.entries(item)
              .map(([k, vv]) => `  - ${k}: ${typeof vv === 'object' ? JSON.stringify(vv) : vv}`)
              .join('\n');
            return `- ${inner.trim().replace(/^  - /, '')}`;
          }
          return `- ${item}`;
        })
        .join('\n');
    }
    if (typeof v === 'object') {
      return Object.entries(v)
        .map(([k, vv]) => `- ${k}: ${typeof vv === 'object' ? JSON.stringify(vv) : vv}`)
        .join('\n');
    }
    return String(v);
  };

  for (const [k, desc] of Object.entries(task.outputFields)) {
    const v = (data as any)[k];
    if (v === undefined) continue;
    L.push(`## ${k}`);
    L.push(`> ${desc}`);
    L.push('');
    L.push(renderVal(v));
    L.push('');
  }

  // 兜底：schema 之外的字段也保留
  const extra = Object.keys(data).filter((k) => !(k in task.outputFields));
  if (extra.length) {
    L.push('## 其他输出');
    L.push('');
    for (const k of extra) {
      L.push(`### ${k}`);
      L.push(renderVal((data as any)[k]));
      L.push('');
    }
  }
  return L.join('\n');
}

/** 校验产物是否覆盖了关键字段 */
function verify(data: any, task: TaskDef): { ok: boolean; missing: string[] } {
  const keys = Object.keys(task.outputFields || {});
  const missing = keys.filter((k) => data?.[k] === undefined || data?.[k] === null || data?.[k] === '');
  return { ok: missing.length === 0, missing };
}

/** 执行一个技能任务（异步，内部更新 run 状态） */
export async function executeRun(
  runId: string,
  suiteSlug: string,
  taskKey: string,
  input: Record<string, any>,
  deps: RunnerDeps,
  opts: { upstreamId?: string; online?: boolean; useN8n?: boolean; siteId?: string; siteContext?: string; promoteProfile?: boolean } = {},
): Promise<void> {
  const found = findTask(suiteSlug, taskKey);
  if (!found) {
    deps.updateRun(runId, { status: 'failed', error: `未找到任务 ${suiteSlug}/${taskKey}` });
    return;
  }
  const { suite, task } = found;

  try {
    // ---- 1) 采集真实数据 ----
    deps.updateRun(runId, { status: 'running', progress: 10, status_text: statusText('采集真实数据', 10) });

    const ctx: TaskContext = {
      realTerms: [],
      provenance: [],
      hasRealData: false,
      upstream: undefined,
      images: [],
      siteContext: opts.siteContext,
    };

    // 上游产物回流
    if (opts.upstreamId) {
      const up = deps.getRun(opts.upstreamId);
      if (up?.output_json) {
        try {
          ctx.upstream = JSON.parse(up.output_json);
        } catch { /* 上游产物不可解析则忽略 */ }
      }
    }

    const seed =
      input.seed || input.keyword || input.topic || input.product || input.domain || input.site || input.appName || '';

    if (task.collect === 'suggest' && seed) {
      const c = await collectSignals(String(seed), {
        online: opts.online,
        useN8n: opts.useN8n,
        market: input.market,
        lang: input.lang,
      });
      ctx.realTerms = c.suggestions.map((s) => s.term);
      ctx.provenance = c.provenance.filter((p) => p.ok).map((p) => p.source);
      ctx.hasRealData = c.hasRealData;
      deps.updateRun(runId, {
        progress: 30,
        status_text: statusText(
          ctx.hasRealData ? `已采集 ${ctx.realTerms.length} 条真实联想词` : '联网采集不可用，将标注估算',
          30,
        ),
        provenance: JSON.stringify({ terms: ctx.realTerms, sources: ctx.provenance, hasRealData: ctx.hasRealData }),
      });
    } else if (task.collect === 'page' && input.url) {
      const fp = await fetchPage(String(input.url));
      if (fp.ok && fp.html) {
        ctx.pageFacts = extractSeoFacts(fp.html, String(input.url));
        ctx.hasRealData = true;
        ctx.provenance = ['page-fetch'];
        deps.updateRun(runId, {
          progress: 30,
          status_text: statusText('已抓取页面事实', 30),
          provenance: JSON.stringify({
            pageFacts: ctx.pageFacts,
            hasRealData: true,
            sources: ctx.provenance,
          }),
        });
      } else {
        ctx.provenance = [];
        deps.updateRun(runId, {
          progress: 30,
          status_text: statusText(`页面抓取失败（${fp.error || '未知'}），将标注需实测`, 30),
          provenance: JSON.stringify({ pageFacts: null, hasRealData: false, error: fp.error }),
        });
      }
    }

    // ---- 1.5) 用户上传截图的本地 OCR（需求调研步骤用于指标分析） ----
    const shots = Array.isArray(input.screenshots) ? input.screenshots : [];
    if (shots.length) {
      for (const s of shots) {
        const id = typeof s === 'string' ? s : s?.id;
        const name = (s && typeof s === 'object' && s.name) || String(id);
        const fp = path.join(DATA_DIR, 'uploads', String(id));
        if (id && fs.existsSync(fp)) {
          const r = await ocrFile(fp);
          if (r.ok) ctx.images!.push({ name: String(name), ocrText: r.text });
        }
      }
      if (ctx.images && ctx.images.length) {
        ctx.provenance.push('screenshot-ocr');
        ctx.hasRealData = true;
        deps.updateRun(runId, {
          progress: 40,
          status_text: statusText(`已识别 ${ctx.images.length} 张截图指标`, 40),
          provenance: JSON.stringify({ images: ctx.images, sources: ctx.provenance, hasRealData: ctx.hasRealData }),
        });
      }
    }

    // ---- 2) 组装 prompt ----
    deps.updateRun(runId, { progress: 45, status_text: statusText('组装方法论与上下文', 45) });
    const system = composeSystem(suite, task);
    const user = task.prompt(input, ctx);

    // ---- 3) LLM 生成 ----
    if (!llmAvailable()) {
      deps.updateRun(runId, {
        status: 'failed',
        progress: 100,
        status_text: 'LLM 未配置',
        error: '未配置 CHAT_LLM_API_KEY，无法执行技能。请在 .env 中配置后重试。',
        finished_at: new Date().toISOString(),
      });
      return;
    }
    deps.updateRun(runId, { progress: 55, status_text: statusText('模型分析中', 55) });

    const res = await chatJSON<any>(system, user, { temperature: 0.3, maxTokens: 4000 });
    if (!res.ok) {
      const errText = (res as { error: string }).error;
      deps.updateRun(runId, {
        status: 'failed',
        progress: 100,
        status_text: '模型输出解析失败',
        error: errText,
        finished_at: new Date().toISOString(),
      });
      return;
    }
    const data = (res as { data: any }).data;

    // ---- 4) 校验 ----
    deps.updateRun(runId, { progress: 85, status_text: statusText('校验产物', 85) });
    const v = verify(data, task);
    if (!v.ok && v.missing.length >= Object.keys(task.outputFields).length) {
      deps.updateRun(runId, {
        status: 'failed',
        progress: 100,
        status_text: '产物字段缺失过多',
        error: `缺少关键字段：${v.missing.join('、')}`,
        finished_at: new Date().toISOString(),
      });
      return;
    }

    // 模型常把字段名改写（如 verdict→keyword、risks→idea），等同于字段缺失，
    // 会让下游自动消费失败。这里做一次「补齐重试」：只让它补缺失字段并合并。
    if (v.missing.length) {
      deps.updateRun(runId, { progress: 90, status_text: statusText(`补齐 ${v.missing.length} 个字段`, 90) });
      const need = v.missing
        .map((k) => `- \`${k}\`：${task.outputFields[k]}`)
        .join('\n');
      const fix = await chatJSON<any>(
        system,
        `你上一次的输出缺少以下必需字段（键名必须完全一致，不得改名）：\n${need}\n\n` +
          `请只输出一个 JSON 对象，键就是上面这些字段名（不要新增、不要改名），值为对应内容。` +
          `如果你之前用了别的名字表达同样含义，请把内容搬到这些标准键名下。`,
        { temperature: 0.2, maxTokens: 2000 },
      );
      if (fix.ok) {
        const patched: any = (fix as any).data;
        if (patched && typeof patched === 'object') {
          for (const k of v.missing) {
            if (patched[k] !== undefined && patched[k] !== null && patched[k] !== '') {
              (data as any)[k] = patched[k];
            }
          }
        }
      }
    }
    const v2 = verify(data, task);
    (data as any).__missing = v2.missing.length ? v2.missing : undefined;
    (data as any).__fieldCompliance =
      Math.round(
        ((Object.keys(task.outputFields).length - v2.missing.length) /
          Math.max(1, Object.keys(task.outputFields).length)) *
          100,
      ) + '%';

    // ---- 5) 落盘 + 存库 ----
    const dir = path.join(WORKSPACE_DIR, suiteSlug);
    fs.mkdirSync(dir, { recursive: true });
    const jsonPath = path.join(dir, `${taskKey}-${runId}.json`);
    const mdPath = path.join(dir, `${taskKey}-${runId}.md`);
    const md = renderMarkdown(suite.name, task, data, ctx);
    // 产物自包含：把采集证据一并落盘，避免只有结论没有依据
    const withEvidence = {
      ...(data || {}),
      __evidence: {
        hasRealData: ctx.hasRealData,
        sources: ctx.provenance || [],
        realTerms: ctx.realTerms || [],
        pageFacts: ctx.pageFacts || null,
        upstream: ctx.upstream
          ? { task: ctx.upstream.task, suite: ctx.upstream.suite, keys: Object.keys(ctx.upstream.output || {}) }
          : null,
      },
    };
    fs.writeFileSync(jsonPath, JSON.stringify(withEvidence, null, 2), 'utf-8');
    fs.writeFileSync(mdPath, md, 'utf-8');

    deps.updateRun(runId, {
      status: 'done',
      progress: 100,
      status_text: ctx.hasRealData ? '已完成（含真实数据）' : '已完成（估算）',
      output_json: JSON.stringify(data),
      artifact_json: jsonPath,
      artifact_md: mdPath,
      finished_at: new Date().toISOString(),
    });

    // 建档步骤完成 → 把产物写回站点档案，作为后续步骤的统一上下文（取代「引用上一步」）
    if (opts.promoteProfile && opts.siteId) {
      try {
        // 保留建档时写入的调研结论（research），不被本次建档产物覆盖
        const existing = get('SELECT profile_json FROM sites WHERE id=?', [opts.siteId]) as any;
        let research: any = null;
        try { research = JSON.parse(existing?.profile_json || '{}').research || null; } catch { /* 忽略 */ }
        const merged = research ? { ...(data || {}), research } : data;
        setSiteProfile(opts.siteId, JSON.stringify(merged));
      } catch { /* 写回站点档案失败不影响本次产物 */ }
    }
  } catch (e: any) {
    deps.updateRun(runId, {
      status: 'failed',
      progress: 100,
      status_text: '执行异常',
      error: e?.message || String(e),
      finished_at: new Date().toISOString(),
    });
  }
}
