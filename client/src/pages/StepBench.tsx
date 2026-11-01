// 站点内的步骤执行台：填必要信息 → 执行 → 看结果。
// 设计原则（面向运营/小白）：
//  - 主界面 = 一张「价值卡 + 一键执行」；参数默认折叠（已用建档信息预填，缺必填时才展开）；
//  - 结果用友好中文标签展示；「后台编排细节」收进底部折叠区，不打扰主线。
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJSON, postJSON } from '../api';
import { useRun } from '../runStore';
import DeployPanel from '../components/DeployPanel';
import { Artifact, RunProgress } from './Run';

type FlowStep = {
  step: number; key: string; label: string; task: string; phase: string;
  group: string; groupLabel?: string; desc: string; page: string;
  suites: string[]; workflows: { slug: string; name: string; nodes: number; category: string }[];
};
type FlowData = { steps: FlowStep[]; extra: any[] };
type StepInput = {
  key: string; label: string; type: string; placeholder?: string; required?: boolean;
  requiredWhen?: { key: string; equals: string }; options?: string[]; default?: string; hint?: string;
};
type StepExecDef = {
  step: number; key: string; label: string; task: string; phase: string; goal: string;
  inputs: StepInput[]; outputs: string[]; outputLabels?: Record<string, string>;
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
    getJSON(runsUrl).then((d) => setRuns(d.runs || [])).catch(() => setRuns([]));
    if (siteId) getJSON('/sites/' + siteId).then((d) => setSite(d.site || null)).catch(() => setSite(null));
    else setSite(null);
  }, [stepKey, siteId, runsUrl]);

  if (err) return <div className="loading">加载失败：{err}</div>;
  if (!data) return <div className="loading">加载中…</div>;

  const cur = data.steps.find((s) => s.key === stepKey);
  if (!cur) return <div className="loading">未找到该步骤（{stepKey}）。</div>;

  // 站点内只展示「产品创建 / 产品运营」8 步；独立模式展示全部
  const flowSteps = siteId ? data.steps.filter((s) => s.group !== 'pre') : data.steps;
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
  const run = useRun(runId);
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [shots, setShots] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [showImpl, setShowImpl] = useState(false);
  const [orch, setOrch] = useState<any>(null);

  // 初始化输入字段默认值
  useEffect(() => {
    const init: Record<string, any> = {};
    for (const f of def?.inputs || []) init[f.key] = f.default || '';
    setInput(init);
    setDetail(null); setRunId(''); setMsg(''); setShots([]); setPromoted(false);
  }, [def, step.key]);

  // 站点模式：用建档信息（产品名/域名/面向地区/定位/语言/调研结论）预填，作为统一上下文
  useEffect(() => {
    if (!site || !def) return;
    setInput((prev) => {
      const next = { ...prev };
      const fill = (k: string, v: any) => {
        if (v != null && v !== '' && !String(next[k] ?? '').trim()) next[k] = v;
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

  // 执行状态：来自全局 store（SSE + 轮询）；到终态时拉取完整产物并收尾
  useEffect(() => {
    if (!run) return;
    if (run.status === 'done' || run.status === 'failed') {
      if (run.status === 'done' && busy) {
        onDone(run);
        if (siteId && step.key === 'create') setPromoted(true);
      }
      setBusy(false);
      if (!detail || detail.id !== run.id) {
        getJSON('/runs/' + run.id).then((d) => setDetail(d.run)).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.status, run?.id]);

  // 「后台实现细节」折叠时才拉取编排信息
  useEffect(() => {
    setShowImpl(false); setOrch(null);
  }, [step.key]);
  useEffect(() => {
    if (!showImpl || orch) return;
    getJSON('/orchestration/' + step.page).then(setOrch).catch(() => setOrch({ error: true }));
  }, [showImpl, step.page, orch]);

  const onUploadShot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setMsg(''); setUploading(true);
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
      } catch (err: any) { setMsg('截图上传失败：' + (err?.message || '')); break; }
    }
    setUploading(false);
    e.target.value = '';
  };

  const isMissing = (f: StepInput) => {
    const empty = !String(input[f.key] || '').trim();
    if (!empty) return false;
    if (f.required) return true;
    return !!(f.requiredWhen && String(input[f.requiredWhen.key] || '') === f.requiredWhen.equals);
  };

  const submit = useCallback(async () => {
    setMsg('');
    const missing = (def?.inputs || []).filter(isMissing);
    if (missing.length) { setMsg('请填写：' + missing.map((f) => f.label).join('、')); return; }
    setBusy(true); setRunId(''); setDetail(null); setPromoted(false);
    try {
      const r = await postJSON(`/steps/${step.key}/run`, {
        input: { ...input, screenshots: shots.map((s) => s.id) },
        siteId: siteId || undefined,
      });
      if (!r.ok) throw new Error(r.error || '提交失败');
      setRunId(r.runId);
    } catch (e: any) { setMsg(e?.message || '提交失败'); setBusy(false); }
  }, [step.key, input, shots, siteId, def]);

  const stepRuns = runs.filter((r) => r.status === 'done' && r.task === step.task);
  const backLabel = siteId ? '← 返回站点' : '← 返回流程总览';
  const prefillMissing = (def?.inputs || []).some(isMissing);

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

      <div className="step-main" style={{ marginTop: 16 }}>
        {siteId && step.key === 'deploy' && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>部署清单（工程真实状态）</h3>
            <div className="hint" style={{ marginTop: 4 }}>先按清单把该改的改掉，再点下方「执行」让 AI 基于这份工程出上线方案。</div>
            <DeployPanel siteId={siteId} />
          </div>
        )}
        <div className="card">
          <div className="row" style={{ gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3 style={{ margin: 0 }}>执行「{step.label}」</h3>
              {siteId && (
                <div className="hint" style={{ marginTop: 6 }}>
                  建档信息（产品名 / 域名 / 面向地区 / 定位 / 语言）已自动带入，直接点执行即可。
                </div>
              )}
            </div>
            <button className="rt-btn primary big" onClick={submit} disabled={busy}>
              {busy ? '执行中…' : `执行「${step.label}」`}
            </button>
          </div>

          {msg && <div className="alert err">{msg}</div>}
          {run && <RunProgress run={run} />}
          {promoted && (
            <div className="alert ok" style={{ marginTop: 12 }}>
              建档完成，站点档案已更新——后续步骤将自动带上这套上下文。
            </div>
          )}

          {def ? (
            prefillMissing ? (
              <div className="step-params open" style={{ marginTop: 14 }}>
                <div className="step-params-title">请补充必要信息</div>
                <ParamsForm def={def} input={input} setInput={setInput} step={step} shots={shots} setShots={setShots} uploading={uploading} onUploadShot={onUploadShot} />
              </div>
            ) : (
              <details className="step-params" style={{ marginTop: 14 }}>
                <summary>调整参数（已预填，可跳过）</summary>
                <ParamsForm def={def} input={input} setInput={setInput} step={step} shots={shots} setShots={setShots} uploading={uploading} onUploadShot={onUploadShot} />
              </details>
            )
          ) : (
            <div className="empty" style={{ marginTop: 12 }}>该步骤暂未接入执行引擎。</div>
          )}
        </div>

        {run?.status === 'done' && detail && (
          <div className="card" style={{ marginTop: 16 }}>
            <Artifact run={detail} />
          </div>
        )}

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
                <div className="hist-row" key={r.id} onClick={() => { setDetail(null); setRunId(r.id); }}>
                  <span className={`dot ${r.status}`} />
                  <span className="hist-task">{step.label}</span>
                  <span className="muted">{r.createdAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <button
            className="sb-fold"
            style={{ fontSize: 13, color: 'var(--muted)', padding: 0 }}
            onClick={() => setShowImpl((v) => !v)}
          >
            {showImpl ? '收起 ▾' : '展开 ▸'} 后台实现细节（n8n / 技能，一般无需理会）
          </button>
          {showImpl && <div style={{ marginTop: 12 }}><OrchView orch={orch} stepLabel={step.label} /></div>}
        </div>
      </div>
    </>
  );
}

/** 参数表单（参数区可折叠，缺必填时直接展开） */
function ParamsForm({ def, input, setInput, step, shots, setShots, uploading, onUploadShot }: any) {
  return (
    <>
      {(def.inputs || []).map((f: StepInput) => (
        <div className="form-row" key={f.key}>
          <label>
            {f.label}
            {(f.required || (f.requiredWhen && String(input[f.requiredWhen.key] || '') === f.requiredWhen.equals)) && <span className="req">*</span>}
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
            并作为真实数据参与需求价值分析。{uploading && ' 上传识别中…'}
          </small>
          {shots.length > 0 && (
            <div className="shot-list">
              {shots.map((s: any) => (
                <span className="shot-chip" key={s.id}>
                  <span className="shot-name">{s.name}</span>
                  <button type="button" className="shot-x" title="移除" onClick={() => setShots((arr: any[]) => arr.filter((x: any) => x.id !== s.id))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** 「实现细节」折叠：本步骤的功能/逻辑、n8n 流程节点、技能详情 */
function OrchView({ orch, stepLabel }: { orch: any; stepLabel: string }) {
  const [openWf, setOpenWf] = useState('');
  const [openTask, setOpenTask] = useState('');
  if (!orch) return <div className="empty">加载编排信息…</div>;
  if (orch.error) return <div className="empty">未拿到该步骤的编排配置（data/orchestration.json）。</div>;
  const Sec = ({ title, children }: any) => (
    <div style={{ marginTop: 18 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13, letterSpacing: '.06em', color: 'var(--accent)' }}>{title}</h3>
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
              <div className="muted" style={{ marginTop: 4, fontSize: 12.5 }}>节点 {w.nodes} 个{w.hook ? ` · Webhook /${w.hook}` : ''}{w.types ? ` · ${w.types}` : ''}</div>
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
                        <div><b>采集方式：</b>{t.collectLabel}</div>
                        <div style={{ marginTop: 6 }}><b>执行链路：</b>{t.how}</div>
                        {t.inputs?.length > 0 && (<div style={{ marginTop: 6 }}><b>输入：</b>{t.inputs.map((i: any) => `${i.label}${i.required ? '*' : ''}`).join('、')}</div>)}
                        {t.outputs?.length > 0 && (
                          <div style={{ marginTop: 6 }}><b>输出字段：</b>{t.outputs.map((o: any) => (<div key={o.key} style={{ paddingLeft: 10 }}><code>{o.key}</code> — {o.desc}</div>))}</div>
                        )}
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