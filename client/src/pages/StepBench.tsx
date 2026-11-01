// 站点内的步骤执行台：填必要信息 → 执行 → 看结果。
// 与旧版不同：不再提供「引用之前的执行结果」下拉——站点建档信息（产品名/域名/面向地区/定位/语言）
// 会作为统一上下文自动带入，因此下一步无需手动引用上一步。
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJSON, postJSON } from '../api';
import { Artifact, RunProgress } from './Run';

type FlowStep = {
  step: number;
  key: string;
  label: string;
  phase: string;
  group: string;
  groupLabel?: string;
  desc: string;
  page: string;
  suites: string[];
  workflows: { slug: string; name: string; nodes: number; category: string }[];
};

/** 流程步骤 → 后台技能任务：用于判断该步骤是否已执行过 */
const STEP_TASK: Record<string, string> = {
  research: 'keyword-evaluate',
  create: 'create-site',
  content: 'content-pipeline',
  seo: 'geo-optimize',
  compliance: 'compliance-check',
  techseo: 'audit',
  deploy: 'deploy-plan',
  backlink: 'link-prospecting',
  monitor: 'gsc-monitor',
};

/** 任务 → 中文步骤名：历史记录里给用户看的名字 */
const TASK_STEP_LABEL: Record<string, string> = {
  'keyword-evaluate': '需求调研',
  'create-site': '创建站点（含建档）',
  'content-brief': '内容生产',
  'content-pipeline': '内容生产',
  'geo-optimize': 'SEO·GEO 优化',
  'compliance-check': '合规优化',
  audit: '技术SEO·GEO',
  'deploy-plan': '部署上线',
  'link-prospecting': '外链推广',
  'gsc-monitor': '线上监控',
};

type FlowData = { steps: FlowStep[]; extra: any[] };
type StepInput = {
  key: string; label: string; type: string; placeholder?: string; required?: boolean;
  requiredWhen?: { key: string; equals: string }; options?: string[]; default?: string; hint?: string;
};
type StepExecDef = {
  step: number; key: string; label: string; phase: string; goal: string;
  inputs: StepInput[]; outputs: string[];
};

/** 路由适配：/flow/:key（无站点，独立运行）与 /sites/:id/:stepKey（站点内运行）都走这里 */
export default function StepBenchRoute() {
  const p = useParams();
  const stepKey = (p.key || p.stepKey || '') as string;
  const siteId = (p.id || '') as string;
  return <StepBench stepKey={stepKey} siteId={siteId || undefined} />;
}

export function StepBench({ stepKey, siteId }: { stepKey: string; siteId?: string }) {
  const nav = useNavigate();
  const [data, setData] = useState<FlowData | null>(null);
  const [defs, setDefs] = useState<StepExecDef[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [site, setSite] = useState<any>(null);
  const [err, setErr] = useState('');

  const runsUrl = siteId ? `/runs?siteId=${encodeURIComponent(siteId)}&limit=100` : '/runs?limit=100';

  useEffect(() => {
    getJSON('/flow').then(setData).catch((e) => setErr(String(e.message || e)));
    getJSON('/steps').then((d) => setDefs(d.steps || [])).catch(() => setDefs([]));
    getJSON(runsUrl)
      .then((d) => setRuns(d.runs || []))
      .catch(() => setRuns([]));
    if (siteId) {
      getJSON('/sites/' + siteId).then((d) => setSite(d.site || null)).catch(() => setSite(null));
    } else {
      setSite(null);
    }
  }, [stepKey, siteId, runsUrl]);

  if (err) return <div className="loading">加载失败：{err}</div>;
  if (!data) return <div className="loading">加载中…</div>;

  const cur = data.steps.find((s) => s.key === stepKey);
  if (!cur) return <div className="loading">未找到该步骤（{stepKey}）。</div>;

  // 站点内只展示「产品创建 / 产品运营」8 步；独立模式展示全部
  const flowSteps = siteId
    ? data.steps.filter((s) => s.group !== 'pre')
    : data.steps;
  const idx = flowSteps.findIndex((s) => s.key === stepKey);
  const prev = idx > 0 ? flowSteps[idx - 1] : undefined;
  const next = idx >= 0 && idx < flowSteps.length - 1 ? flowSteps[idx + 1] : undefined;

  return (
    <StepBenchInner
      step={cur}
      def={defs.find((d) => d.key === cur.key)}
      prev={prev}
      next={next}
      runs={runs}
      site={site}
      siteId={siteId}
      onDone={(r) => setRuns((rs) => [r, ...rs])}
      onBack={() => nav(siteId ? '/sites/' + siteId : '/flow')}
    />
  );
}

function StepBenchInner({
  step, def, prev, next, runs, site, siteId, onDone, onBack,
}: {
  step: FlowStep; def?: StepExecDef; prev?: FlowStep; next?: FlowStep;
  runs: any[]; site: any; siteId?: string; onDone: (r: any) => void; onBack: () => void;
}) {
  const nav = useNavigate();
  const [input, setInput] = useState<Record<string, any>>({});
  const [runId, setRunId] = useState('');
  const [run, setRun] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'run' | 'view'>('run');
  const [orch, setOrch] = useState<any>(null);
  const [shots, setShots] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [promoted, setPromoted] = useState(false);

  // 初始化输入字段默认值
  useEffect(() => {
    const init: Record<string, any> = {};
    for (const f of def?.inputs || []) init[f.key] = f.default || '';
    setInput(init);
    setRun(null);
    setRunId('');
    setMsg('');
    setShots([]);
    setPromoted(false);
  }, [def, step.key]);

  // 站点模式：用建档信息（产品名/域名/面向地区/定位/语言）预填，作为统一上下文（无需引用上一步）
  useEffect(() => {
    if (!site || !def) return;
    setInput((prev) => {
      const next = { ...prev };
      const fill = (k: string, v: string) => {
        if (v && !String(next[k] ?? '').trim()) next[k] = v;
      };
      fill('siteName', site.name);
      fill('domain', site.domain);
      fill('region', site.region);
      fill('positioning', site.positioning);
      fill('language', site.language);
      fill('siteType', site.site_type);
      fill('site', site.domain || site.name);
      fill('appName', site.name);
      fill('product', site.name);
      return next;
    });
  }, [site, def, step.key]);

  // 切换步骤回到「执行」标签；点开「查看」才拉取编排
  useEffect(() => { setTab('run'); setOrch(null); }, [step.key]);
  useEffect(() => {
    if (tab !== 'view' || orch) return;
    getJSON('/orchestration/' + step.page).then(setOrch).catch(() => setOrch({ error: true }));
  }, [tab, step.page, orch]);

  // 轮询执行状态
  useEffect(() => {
    if (!runId) return;
    let alive = true;
    const tick = async () => {
      try {
        const d = await getJSON('/runs/' + runId);
        if (!alive) return;
        setRun(d.run);
        if (d.run?.status === 'done' || d.run?.status === 'failed') {
          setBusy(false);
          if (d.run.status === 'done') {
            onDone(d.run);
            // 建档步骤完成 → 提示站点档案已更新
            if (siteId && step.key === 'create') setPromoted(true);
          }
          return;
        }
      } catch { /* 忽略 */ }
      if (alive) setTimeout(tick, 1500);
    };
    tick();
    return () => { alive = false; };
  }, [runId, onDone, siteId, step.key]);

  const onUploadShot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setMsg('');
    setUploading(true);
    for (const f of files) {
      const dataUrl = await new Promise<string>((res, rej) => {
        const rd = new FileReader();
        rd.onload = () => res(String(rd.result));
        rd.onerror = () => rej(rd.error);
        rd.readAsDataURL(f);
      });
      try {
        const r = await postJSON('/uploads', { name: f.name, dataUrl });
        if (!r.ok) throw new Error(r.error || '上传失败');
        setShots((s) => [...s, { id: r.id, name: f.name }]);
      } catch (err: any) {
        setMsg('截图上传失败：' + (err?.message || ''));
        break;
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const submit = useCallback(async () => {
    setMsg('');
    const missing = (def?.inputs || []).filter((f) => {
      const empty = !String(input[f.key] || '').trim();
      if (!empty) return false;
      if (f.required) return true;
      if (f.requiredWhen && String(input[f.requiredWhen.key] || '') === f.requiredWhen.equals) return true;
      return false;
    });
    if (missing.length) {
      setMsg('请填写：' + missing.map((f) => f.label).join('、'));
      return;
    }
    setBusy(true);
    setRun(null);
    setPromoted(false);
    try {
      const r = await postJSON(`/steps/${step.key}/run`, {
        input: { ...input, screenshots: shots.map((s) => s.id) },
        siteId: siteId || undefined,
      });
      if (!r.ok) throw new Error(r.error || '提交失败');
      setRunId(r.runId);
    } catch (e: any) {
      setMsg(e?.message || '提交失败');
      setBusy(false);
    }
  }, [step.key, input, shots, siteId, def]);

  const stepRuns = runs.filter(
    (r) => r.status === 'done' && STEP_TASK[step.key] && r.task === STEP_TASK[step.key],
  );

  const backLabel = siteId ? '← 返回站点' : '← 返回流程总览';

  return (
    <>
      <div className="back" onClick={onBack}>{backLabel}</div>
      <section className="hero">
        <h1><span className="hl">{step.label}</span></h1>
        <p className="hero-sub">{def?.goal || step.desc}</p>
        {siteId && site && (
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span className="tag">站点：{site.name}</span>
            {site.domain && <span className="tag">{site.domain}</span>}
            <span className="tag">{site.region}</span>
            {site.language && <span className="tag">{site.language}</span>}
          </div>
        )}
      </section>

      <div className="rt-head">
        <div className="rt-tabs">
          <button className={'rt-tab' + (tab === 'run' ? ' on' : '')} onClick={() => setTab('run')}>执行</button>
          <button className={'rt-tab' + (tab === 'view' ? ' on' : '')} onClick={() => setTab('view')}>查看</button>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {prev ? (
            <button className="rt-btn ghost" onClick={() => nav(siteId ? `/sites/${siteId}/${prev.key}` : `/flow/${prev.key}`)}>← {prev.label}</button>
          ) : (
            <button className="rt-btn ghost" onClick={onBack}>{backLabel}</button>
          )}
          {next ? (
            <button className="rt-btn" onClick={() => nav(siteId ? `/sites/${siteId}/${next.key}` : `/flow/${next.key}`)}>{next.label} →</button>
          ) : (
            <Link className="rt-btn" to={siteId ? `/sites/${siteId}` : '/flow'}>完成 →</Link>
          )}
        </div>
      </div>

      {tab === 'view' ? (
        <div className="card" style={{ marginTop: 16 }}>
          <OrchView orch={orch} stepLabel={step.label} />
        </div>
      ) : (
        <div className="grid cols-2">
          <div>
            <div className="card">
              <h3>执行本步骤</h3>
              {!def ? (
                <div className="empty">该步骤暂未接入执行引擎。</div>
              ) : (
                <>
                  {siteId && (
                    <div className="alert" style={{ marginTop: 4 }}>
                      本步骤在站点「{site?.name}」内执行：建档信息（产品名 / 域名 / 面向地区 / 定位 / 语言）已作为统一上下文自动带入，
                      无需再「引用上一步」。
                    </div>
                  )}
                  {(def.inputs || []).map((f) => (
                    <div className="form-row" key={f.key}>
                      <label>
                        {f.label}
                        {(f.required || (f.requiredWhen && String(input[f.requiredWhen.key] || '') === f.requiredWhen.equals)) && (
                          <span className="req">*</span>
                        )}
                      </label>
                      {f.type === 'textarea' ? (
                        <textarea rows={4} placeholder={f.placeholder} value={input[f.key] || ''} onChange={(e) => setInput({ ...input, [f.key]: e.target.value })} />
                      ) : f.type === 'select' ? (
                        <select value={input[f.key] || ''} onChange={(e) => setInput({ ...input, [f.key]: e.target.value })}>
                          <option value="">请选择</option>
                          {(f.options || []).map((o) => (<option key={o} value={o}>{o}</option>))}
                        </select>
                      ) : (
                        <input placeholder={f.placeholder} value={input[f.key] || ''} onChange={(e) => setInput({ ...input, [f.key]: e.target.value })} />
                      )}
                      {f.hint && <small className="muted">{f.hint}</small>}
                    </div>
                  ))}

                  {step.key === 'research' && (
                    <div className="form-row">
                      <label>上传指标截图（SimilarWeb / Semrush 等，可选）</label>
                      <input type="file" accept="image/*" multiple onChange={onUploadShot} disabled={uploading} />
                      <small className="muted">
                        截图只在本地用 OCR 识别其中的搜索量、CPC、竞争度、流量/外链数（不会上传模型，仅提取文本），
                        并作为真实数据参与需求价值分析。可上传多张。{uploading && ' 上传识别中…'}
                      </small>
                      {shots.length > 0 && (
                        <div className="shot-list">
                          {shots.map((s) => (
                            <span className="shot-chip" key={s.id}>
                              <span className="shot-name">{s.name}</span>
                              <button type="button" className="shot-x" title="移除" onClick={() => setShots((arr) => arr.filter((x) => x.id !== s.id))}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {msg && <div className="alert err">{msg}</div>}

                  <button className="rt-btn primary big" onClick={submit} disabled={busy}>
                    {busy ? '执行中…' : `执行「${step.label}」`}
                  </button>

                  {promoted && (
                    <div className="alert ok" style={{ marginTop: 12 }}>
                      建档完成，站点档案已更新——后续步骤将自动带上这套上下文。
                    </div>
                  )}

                  {run && <RunProgress run={run} />}
                </>
              )}
            </div>

            {run?.status === 'done' && (
              <div className="card" style={{ marginTop: 16 }}>
                <Artifact run={run} />
              </div>
            )}
          </div>

          <div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row" style={{ gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>本步骤历史</h3>
                <Link to="/history" className="link">查看全部 →</Link>
              </div>
              {stepRuns.length === 0 ? (
                <div className="empty">本步骤还没有执行记录。执行后结果会出现在这里{siteId ? '（仅本站点）' : ''}。</div>
              ) : (
                <div className="hist">
                  {stepRuns.slice(0, 6).map((r) => (
                    <div className="hist-row" key={r.id} onClick={async () => {
                      const d = await getJSON('/runs/' + r.id).catch(() => null);
                      if (d?.run) setRun(d.run);
                    }}>
                      <span className={`dot ${r.status}`} />
                      <span className="hist-task">{r.taskName || r.task}</span>
                      <span className="muted">{r.createdAt}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <Link to="/history" className="rt-btn ghost" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                  查看全部历史结果（{runs.length} 条）
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** 「查看」标签页：本步骤的功能与实现逻辑、n8n 流程节点、技能详情（均可点开细节） */
function OrchView({ orch, stepLabel }: { orch: any; stepLabel: string }) {
  const [openWf, setOpenWf] = useState('');
  const [openTask, setOpenTask] = useState('');
  if (!orch) return <div className="empty">加载编排信息…</div>;
  if (orch.error) return <div className="empty">未拿到该步骤的编排配置（data/orchestration.json）。</div>;
  const Sec = ({ title, children }: any) => (
    <div style={{ marginTop: 22 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 13, letterSpacing: '.06em', color: 'var(--accent)' }}>{title}</h3>
      {children}
    </div>
  );
  return (
    <>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{stepLabel}</h3>
        {orch.phase && <span className="tag">{orch.phase}</span>}
      </div>

      <Sec title="当前功能与实现逻辑">
        {orch.impl && (<div style={{ fontSize: 13.5, lineHeight: 1.85, marginBottom: 10 }}><b>功能：</b>{orch.impl}</div>)}
        {orch.logic && (<div style={{ fontSize: 13.5, lineHeight: 1.85, color: 'var(--ink)' }}><b>实现逻辑：</b>{orch.logic}</div>)}
      </Sec>

      <Sec title="n8n 流程与节点">
        {!orch.workflows?.length ? (
          <div className="empty">本步骤不经过 n8n，由后台技能引擎直接执行。</div>
        ) : (
          orch.workflows.map((w: any) => (
            <div className="pcard" key={w.slug} style={{ cursor: 'pointer' }} onClick={() => setOpenWf(openWf === w.slug ? '' : w.slug)}>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <b>{w.name}</b><span className="tag">{w.slug}</span>
                <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{openWf === w.slug ? '收起 ▲' : '查看节点 ▼'}</span>
              </div>
              <div className="muted" style={{ marginTop: 4, fontSize: 12.5 }}>
                节点 {w.nodes} 个{w.hook ? ` · Webhook /${w.hook}` : ''}{w.types ? ` · ${w.types}` : ''}
              </div>
              {openWf === w.slug && (
                <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid var(--accent)' }}>
                  {(w.nodeDetails || []).map((n: any, i: number) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13 }}><b>{i + 1}. {n.name}</b><span className="tag" style={{ marginLeft: 6 }}>{n.type}</span></div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{n.desc}</div>
                      {n.detail && (<pre style={{ marginTop: 4, fontSize: 11, background: 'var(--surface-2)', padding: '6px 8px', borderRadius: 8, overflow: 'auto', maxHeight: 120 }}>{n.detail}</pre>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Sec>

      <Sec title="技能与任务详情">
        {!orch.skills?.length ? (
          <div className="empty">本步骤不直接调用 SEO/GEO 技能。</div>
        ) : (
          orch.skills.map((s: any) => (
            <div key={s.slug}>
              <div className="row" style={{ gap: 8, alignItems: 'center', margin: '10px 0 6px' }}>
                <b style={{ fontSize: 13.5 }}>{s.name}</b><span className="tag">{s.slug}</span>
              </div>
              {s.desc && <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>{s.desc}</div>}
              {s.tasks.map((t: any) => {
                const k = s.slug + '/' + t.key;
                const open = openTask === k;
                return (
                  <div key={t.key} className="pcard" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => setOpenTask(open ? '' : k)}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <b style={{ fontSize: 13 }}>{t.name}</b>
                      <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{open ? '收起 ▲' : '技能详情 ▼'}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{t.desc}</div>
                    {open && (
                      <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.8 }}>
                        {s.skillMd && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: '.05em', color: 'var(--accent)', marginBottom: 4 }}>技能内容（SKILL.md）</div>
                            <div className="markdown" style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px', maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 12 }}>{s.skillMd}</div>
                          </div>
                        )}
                        <div><b>采集方式：</b>{t.collectLabel}</div>
                        <div style={{ marginTop: 6 }}><b>执行链路：</b>{t.how}</div>
                        {t.inputs?.length > 0 && (<div style={{ marginTop: 6 }}><b>输入：</b>{t.inputs.map((i: any) => `${i.label}${i.required ? '*' : ''}`).join('、')}</div>)}
                        {t.outputs?.length > 0 && (
                          <div style={{ marginTop: 6 }}><b>输出字段：</b>{t.outputs.map((o: any) => (<div key={o.key} style={{ paddingLeft: 10 }}><code>{o.key}</code> — {o.desc}</div>))}</div>
                        )}
                        {t.refs?.length > 0 && (<div style={{ marginTop: 6 }}><b>方法论参考：</b>{t.refs.join('、')}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </Sec>
      {orch.note && <div className="pcard" style={{ marginTop: 18 }}>{orch.note}</div>}
    </>
  );
}
