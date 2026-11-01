// 历史结果（独立页面）：所有步骤的执行记录与产物，按时间倒序。
// 与原「本步骤历史结果」小卡片不同，这里按步骤/状态筛选，点开可看产物 MD + 原始输入 + 采集证据。
import { useEffect, useMemo, useState } from 'react';
import { getJSON } from '../api';
import { Artifact, Value } from './Run';

/** 流程任务 → 步骤序号 + 中文名（与 Flow.tsx 的 STEP_TASK / TASK_STEP_LABEL 保持一致） */
const TASK_META: Record<string, { step: number; label: string }> = {
  'keyword-evaluate': { step: 1, label: '需求调研' },
  'create-site': { step: 2, label: '创建站点（含建档）' },
  'geo-optimize': { step: 3, label: 'SEO·GEO 优化' },
  'compliance-check': { step: 4, label: '合规优化' },
  audit: { step: 5, label: '技术SEO·GEO' },
  'content-brief': { step: 6, label: '内容生产' },
  'content-pipeline': { step: 6, label: '内容生产' },
  'deploy-plan': { step: 7, label: '部署上线' },
  'link-prospecting': { step: 8, label: '外链推广' },
  'gsc-monitor': { step: 9, label: '线上监控' },
};

const STATUS_OPTS = [
  { v: '', label: '全部状态' },
  { v: 'done', label: '已完成' },
  { v: 'failed', label: '失败' },
  { v: 'running', label: '执行中' },
];

export default function History() {
  const [runs, setRuns] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [step, setStep] = useState('');
  const [current, setCurrent] = useState<any>(null);
  const [tab, setTab] = useState<'output' | 'input' | 'evidence'>('output');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getJSON('/runs?limit=200')
      .then((d) => setRuns(d.runs || []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const steps = useMemo(() => {
    const seen: { step: number; label: string }[] = [];
    for (const r of runs) {
      const m = TASK_META[r.task];
      if (m && !seen.some((s) => s.step === m.step)) seen.push({ step: m.step, label: m.label });
    }
    return seen.sort((a, b) => a.step - b.step);
  }, [runs]);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (status && r.status !== status) return false;
      if (step && TASK_META[r.task]?.step !== Number(step)) return false;
      return true;
    });
  }, [runs, status, step]);

  const open = async (r: any) => {
    setCurrent(null);
    const d = await getJSON('/runs/' + r.id).catch(() => null);
    if (d?.run) {
      setCurrent(d.run);
      setTab('output');
    }
  };

  return (
    <div className="history-page">
      <section className="hero">
        <div className="kicker">执行记录</div>
        <h1>历史结果</h1>
        <p className="hero-sub">
          所有步骤的执行记录与产物都在这里。按步骤或状态筛选，点开任意一条可查看结构化产物、原始输入与采集证据（真实数据 vs 估算）。
        </p>
      </section>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-row" style={{ margin: 0, minWidth: 200 }}>
            <label>按步骤</label>
            <select value={step} onChange={(e) => setStep(e.target.value)}>
              <option value="">全部步骤</option>
              {steps.map((s) => (
                <option key={s.step} value={s.step}>
                  第 {s.step} 步 · {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row" style={{ margin: 0, minWidth: 160 }}>
            <label>按状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <span className="tag">{filtered.length} 条</span>
          <button className="rt-btn ghost" style={{ marginLeft: 'auto' }} onClick={load}>
            刷新
          </button>
        </div>
      </div>

      <div className="history-grid">
        <div className="card" style={{ marginTop: 14 }}>
          <h3>执行列表</h3>
          {loading ? (
            <div className="empty">加载中…</div>
          ) : filtered.length === 0 ? (
            <div className="empty">没有符合条件的执行记录。</div>
          ) : (
            <div className="hist">
              {filtered.map((r) => {
                const m = TASK_META[r.task];
                return (
                  <div
                    className={'hist-row' + (current?.id === r.id ? ' active' : '')}
                    key={r.id}
                    onClick={() => open(r)}
                  >
                    <span className={`dot ${r.status}`} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="hist-task">{m?.label || r.task}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>
                        {m ? `第 ${m.step} 步 · ` : ''}
                        {r.id} · {r.createdAt}
                      </div>
                    </div>
                    <span className={`pill ${r.status === 'done' ? 'ok' : r.status === 'failed' ? 'err' : ''}`}>
                      {r.status === 'done' ? '完成' : r.status === 'failed' ? '失败' : '执行中'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          {!current ? (
            <div className="empty">从左侧选择一条执行记录查看详情。</div>
          ) : (
            <>
              <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>
                  {TASK_META[current.task]?.label || current.task}
                </h3>
                <span className={`pill ${current.status === 'done' ? 'ok' : current.status === 'failed' ? 'err' : ''}`}>
                  {current.status === 'done' ? '已完成' : current.status === 'failed' ? '失败' : '执行中'}
                </span>
                <span className="muted">{current.id}</span>
              </div>
              {current.error && <div className="alert err" style={{ marginTop: 10 }}>{current.error}</div>}

              <div className="tabs" style={{ marginTop: 12 }}>
                <button className={tab === 'output' ? 'tab on' : 'tab'} onClick={() => setTab('output')}>
                  产物
                </button>
                <button className={tab === 'input' ? 'tab on' : 'tab'} onClick={() => setTab('input')}>
                  原始输入
                </button>
                <button className={tab === 'evidence' ? 'tab on' : 'tab'} onClick={() => setTab('evidence')}>
                  采集证据
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                {tab === 'output' && <Artifact run={current} />}
                {tab === 'input' && (
                  <div className="art-obj">
                    {Object.entries(current.input || {}).map(([k, v]) => (
                      <div className="art-obj-row" key={k}>
                        <b>{k}</b>
                        <span>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</span>
                      </div>
                    ))}
                  </div>
                )}
                {tab === 'evidence' && <EvidenceView run={current} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 采集证据：真实数据 vs 估算，及具体来源 */
function EvidenceView({ run }: { run: any }) {
  const prov = run.provenance;
  if (!prov) return <div className="muted">该记录无采集证据信息。</div>;
  return (
    <>
      <div className="art-obj">
        <div className="art-obj-row">
          <b>数据性质</b>
          <span>{prov.hasRealData ? '含真实采集数据' : '无真实采集，结论为模型估算'}</span>
        </div>
        {prov.sources?.length ? (
          <div className="art-obj-row">
            <b>采集来源</b>
            <span>{prov.sources.join('、')}</span>
          </div>
        ) : null}
        {prov.terms?.length ? (
          <div className="art-obj-row">
            <b>真实联想词</b>
            <span>{prov.terms.length} 条</span>
          </div>
        ) : null}
        {prov.pageFacts ? (
          <div className="art-obj-row">
            <b>页面抓取事实</b>
            <span>已抓取（详见产物中的 facts 字段）</span>
          </div>
        ) : null}
        {prov.images?.length ? (
          <div className="art-obj-row">
            <b>截图 OCR</b>
            <span>{prov.images.length} 张（{prov.images.map((i: any) => i.name).join('、')}）</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
