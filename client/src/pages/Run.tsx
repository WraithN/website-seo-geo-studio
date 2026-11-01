// 技能执行工作台：选技能 → 填参数 → 真实执行 → 看结构化产物。
// 与「只展示技能文档」不同，这里每一次运行都会真实调用技能（采集 + 模型分析）并落地产物。
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getJSON, postJSON } from '../api';
import { fieldLabel, colLabel } from '../labels';

interface Field {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  default?: string;
  hint?: string;
}

export default function Run() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [suite, setSuite] = useState(params.suite || 'seo-research');
  const [taskKey, setTaskKey] = useState(params.task || 'keyword-evaluate');
  const [input, setInput] = useState<Record<string, any>>({});
  const [runId, setRunId] = useState('');
  const [run, setRun] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [upstreamId, setUpstreamId] = useState('');
  const [tab, setTab] = useState<'form' | 'history'>('form');

  useEffect(() => {
    getJSON('/suites')
      .then((d) => {
        setData(d);
        const first = d.suites?.[0];
        if (first) {
          setSuite(first.slug);
          setTaskKey(first.tasks?.[0]?.key || '');
        }
      })
      .catch(() => setErr('无法加载技能清单'));
    getJSON('/runs?limit=30')
      .then((d) => setHistory(d.runs || []))
      .catch(() => {});
  }, []);

  const suiteDef = useMemo(
    () => data?.suites?.find((s: any) => s.slug === suite),
    [data, suite],
  );
  const taskDef: any = useMemo(
    () => data?.tasks?.find((t: any) => t.suite === suite && t.key === taskKey),
    [data, suite, taskKey],
  );

  // 切换任务时重置表单为默认值
  useEffect(() => {
    if (!taskDef) return;
    const init: Record<string, any> = {};
    for (const f of taskDef.inputs || []) init[f.key] = f.default || '';
    setInput(init);
    setRun(null);
    setRunId('');
    setErr('');
  }, [taskDef]);

  // 轮询运行状态
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
          const h = await getJSON('/runs?limit=30').catch(() => ({ runs: [] }));
          if (alive) setHistory(h.runs || []);
          return;
        }
      } catch { /* 忽略单次轮询失败 */ }
      if (alive) setTimeout(tick, 1500);
    };
    tick();
    return () => {
      alive = false;
    };
  }, [runId]);

  const submit = useCallback(async () => {
    setErr('');
    const missing = (taskDef?.inputs || []).filter(
      (f: Field) => f.required && !String(input[f.key] || '').trim(),
    );
    if (missing.length) {
      setErr('请填写必填项：' + missing.map((f: Field) => f.label).join('、'));
      return;
    }
    setBusy(true);
    setRun(null);
    try {
      const r = await postJSON(`/suites/${suite}/run`, {
        task: taskKey,
        input,
        upstreamId: upstreamId || undefined,
      });
      if (!r.ok) throw new Error(r.error || '提交失败');
      setRunId(r.runId);
    } catch (e: any) {
      setErr(e?.message || '提交失败');
      setBusy(false);
    }
  }, [suite, taskKey, input, upstreamId, taskDef]);

  if (!data) return <div className="card">{err || '加载中…'}</div>;

  return (
    <div className="run-page">
      <div className="card">
        <div className="run-head">
          <h2>技能执行</h2>
          <div className="run-status">
            <span className={`pill ${data.llmReady ? 'ok' : 'warn'}`}>
              {data.llmReady ? '模型已就绪' : '模型未配置'}
            </span>
            <span className="pill">{data.tasks?.length || 0} 个可执行任务</span>
          </div>
        </div>
        <p className="muted">
          这里不是展示技能文档，而是<strong>真实调用技能</strong>：先采集真实数据，再由模型按技能方法论产出可执行结论，
          并把产物落盘供下游步骤消费。
        </p>

        <div className="tabs">
          <button className={tab === 'form' ? 'tab on' : 'tab'} onClick={() => setTab('form')}>
            执行
          </button>
          <button className={tab === 'history' ? 'tab on' : 'tab'} onClick={() => setTab('history')}>
            执行记录 ({history.length})
          </button>
        </div>

        {tab === 'form' ? (
          <>
            <div className="form-row">
              <label>技能套件</label>
              <select value={suite} onChange={(e) => setSuite(e.target.value)}>
                {(data.suites || []).map((s: any) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}（{s.covers}）
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label>任务</label>
              <select value={taskKey} onChange={(e) => setTaskKey(e.target.value)}>
                {(suiteDef?.tasks || []).map((t: any) => (
                  <option key={t.key} value={t.key}>
                    {t.name}（第 {t.step} 步）
                  </option>
                ))}
              </select>
            </div>

            {taskDef && <p className="muted task-desc">{taskDef.desc}</p>}

            {(taskDef?.inputs || []).map((f: Field) => (
              <div className="form-row" key={f.key}>
                <label>
                  {f.label}
                  {f.required && <span className="req">*</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={4}
                    placeholder={f.placeholder}
                    value={input[f.key] || ''}
                    onChange={(e) => setInput({ ...input, [f.key]: e.target.value })}
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={input[f.key] || ''}
                    onChange={(e) => setInput({ ...input, [f.key]: e.target.value })}
                  >
                    <option value="">请选择</option>
                    {(f.options || []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    placeholder={f.placeholder}
                    value={input[f.key] || ''}
                    onChange={(e) => setInput({ ...input, [f.key]: e.target.value })}
                  />
                )}
                {f.hint && <small className="muted">{f.hint}</small>}
              </div>
            ))}

            <div className="form-row">
              <label>上游产物（可选）</label>
              <select value={upstreamId} onChange={(e) => setUpstreamId(e.target.value)}>
                <option value="">不关联</option>
                {history
                  .filter((r) => r.status === 'done')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.task} · {r.id} · {r.createdAt}
                    </option>
                  ))}
              </select>
              <small className="muted">
                关联后，上一次运行的结论会作为上下文传入本次执行（形成流程链路上的产物回流）。
              </small>
            </div>

            {err && <div className="alert err">{err}</div>}

            <button className="rt-btn primary big" onClick={submit} disabled={busy}>
              {busy ? '执行中…' : '执行技能'}
            </button>

            {run && <RunProgress run={run} />}
            {run?.status === 'done' && <Artifact run={run} />}
          </>
        ) : (
          <History
            history={history}
            onOpen={async (id) => {
              setTab('form');
              setRunId(id);
              const d = await getJSON('/runs/' + id).catch(() => null);
              if (d?.run) {
                setSuite(d.run.suite);
                setTaskKey(d.run.task);
                setRun(d.run);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export function RunProgress({ run }: { run: any }) {
  const pct = run.progress || 0;
  return (
    <div className="run-progress">
      <div className="rp-head">
        <span className={`pill ${run.status === 'done' ? 'ok' : run.status === 'failed' ? 'err' : 'run'}`}>
          {run.status === 'done' ? '已完成' : run.status === 'failed' ? '失败' : '执行中'}
        </span>
        <span className="muted">{String(run.statusText || '').replace(/\s*·\s*\d+%$/, '')}</span>
        <span className="muted">{pct}%</span>
      </div>
      <div className="bar">
        <div className="bar-in" style={{ width: pct + '%' }} />
      </div>
      {run.status === 'failed' && run.error && <div className="alert err">{run.error}</div>}
    </div>
  );
}

/** 结构化产物渲染：字符串/数组/对象/对象数组 都能读 */
const FILE_FIELDS = new Set(['robotsTxt', 'sitemapXml', 'llmsTxt']);
const FILE_META: Record<string, { name: string; type: string }> = {
  robotsTxt: { name: 'robots.txt', type: 'text/plain' },
  sitemapXml: { name: 'sitemap.xml', type: 'application/xml' },
  llmsTxt: { name: 'llms.txt', type: 'text/plain' },
};

export function FileBlock({ content, fieldKey }: { content: string; fieldKey: string }) {
  const [copied, setCopied] = useState(false);
  const meta = FILE_META[fieldKey] || { name: fieldKey + '.txt', type: 'text/plain' };
  const download = () => {
    const blob = new Blob([content], { type: meta.type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meta.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  };
  return (
    <div className="file-block">
      <div className="file-bar">
        <span className="file-name">{meta.name}</span>
        <div className="file-actions">
          <button className="rt-btn small" onClick={copy}>
            {copied ? '已复制' : '复制'}
          </button>
          <button className="rt-btn small primary" onClick={download}>
            下载
          </button>
        </div>
      </div>
      <pre className="file-pre">{content}</pre>
    </div>
  );
}

/** 轻量 Markdown 渲染（XSS 安全：先转义再插入自有安全标签）。高亮 [待人工补充] 与 [^n] 引用 */
function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc(md || '').split('\n');
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const raw of lines) {
    let line = raw;
    line = line.replace(/\[\^(\d+)\]/g, '<sup class="cite-ref">[$1]</sup>');
    line = line.replace(/\[待人工补充：([^\]]*)\]/g, '<span class="todo-fill">[待人工补充：$1]</span>');
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (/^### /.test(line)) {
      closeList();
      out.push('<h6>' + line.slice(4) + '</h6>');
    } else if (/^## /.test(line)) {
      closeList();
      out.push('<h5>' + line.slice(3) + '</h5>');
    } else if (/^# /.test(line)) {
      closeList();
      out.push('<h4>' + line.slice(2) + '</h4>');
    } else if (/^[-*] /.test(line)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push('<li>' + line.slice(2) + '</li>');
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out.push('<p>' + line + '</p>');
    }
  }
  closeList();
  return out.join('');
}

export function Markdownish({ md }: { md: string }) {
  return <div className="md-block" dangerouslySetInnerHTML={{ __html: mdToHtml(md) }} />;
}

/** EEAT 四维评分卡（content-pipeline 阶段4产物） */
export function EeatReport({ r }: { r: any }) {
  if (!r || typeof r !== 'object') return <Value v={r} />;
  const dimVal = (raw: any) => (raw && typeof raw === 'object' ? raw.score ?? '—' : raw);
  const dimEv = (raw: any) => (raw && typeof raw === 'object' ? raw.evidence : null);
  const dims: [string, string][] = [
    ['experience', '经验 Experience'],
    ['expertise', '专业 Expertise'],
    ['authoritativeness', '权威 Authoritativeness'],
    ['trust', '可信 Trust'],
  ];
  return (
    <div className="eeat">
      <div className="eeat-top">
        <div className="eeat-score">
          {r.score ?? '—'}
          <span>/100</span>
        </div>
        <div className="eeat-dims">
          {dims.map(([k, label]) => {
            const raw = r[k];
            const ev = dimEv(raw);
            return (
              <div className="eeat-dim" key={k}>
                <div className="eeat-row">
                  <span className="eeat-label">{label}</span>
                  <span className="eeat-val">{dimVal(raw)}/5</span>
                </div>
                {ev && <div className="eeat-ev">{ev}</div>}
              </div>
            );
          })}
        </div>
      </div>
      {Array.isArray(r.gaps) && r.gaps.length > 0 && (
        <div className="eeat-sec">
          <b>缺口 gaps</b>
          <ul>{r.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul>
        </div>
      )}
      {Array.isArray(r.flags) && r.flags.length > 0 && (
        <div className="eeat-sec">
          <b>风险 flags</b>
          <ul className="flag-list">
            {r.flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 结论横幅：把「✅ 值得做 / 🟡 可尝试 / 🔴 暂不优先」渲染成醒目决策卡 */
function VerdictBanner({ text }: { text: string }) {
  const tone = /✅|值得做/.test(text) ? 'ok'
    : /🔴|暂不|不值得/.test(text) ? 'err'
    : /🟡|可尝试|谨慎/.test(text) ? 'warn'
    : 'info';
  return <div className={`verdict-banner ${tone}`}>{text}</div>;
}

export function Artifact({ run }: { run: any }) {
  const out = run.output || {};
  const fields = run.outputFields || {};
  const prov = run.provenance;
  const keys = Object.keys(out).filter((k) => !k.startsWith('__'));
  const MD_FIELDS = new Set(['draft', 'humanized', 'checklist']);

  return (
    <div className="artifact">
      <div className="art-head">
        <h3>执行产物</h3>
        <div className="art-meta">
          {prov?.hasRealData ? (
            <span className="pill ok">含真实采集数据（{prov.sources?.join('、')}）</span>
          ) : (
            <span className="pill warn">无真实采集，结论为模型估算</span>
          )}
          {run.__missing?.length ? '' : ''}
        </div>
      </div>

      {prov?.hasRealData && prov.terms?.length ? (
        <details className="art-terms">
          <summary>真实采集到的联想词（{prov.terms.length} 条）</summary>
          <div className="term-list">
            {prov.terms.slice(0, 40).map((t: string, i: number) => (
              <span className="term" key={i}>
                {t}
              </span>
            ))}
          </div>
        </details>
      ) : null}

      {prov?.pageFacts ? (
        <details className="art-terms">
          <summary>页面抓取事实（作为结论依据的真实数据）</summary>
          <div className="art-obj" style={{ marginTop: 10 }}>
            {Object.entries(prov.pageFacts)
              .filter(([, v]) => v === null || typeof v !== 'object')
              .map(([k, v]) => (
                <div className="art-obj-row" key={k}>
                  <b>{k}</b>
                  <span>{String(v)}</span>
                </div>
              ))}
          </div>
        </details>
      ) : null}

      {keys.map((k) => {
        const v = out[k];
        const label = fieldLabel(k);
        if (k === 'verdict' && typeof v === 'string') {
          return (
            <div className="art-block" key={k}>
              <div className="art-key">{label}<span className="art-key-en">{k}</span></div>
              <VerdictBanner text={v} />
            </div>
          );
        }
        return (
          <div className="art-block" key={k}>
            <div className="art-key">{label}<span className="art-key-en">{k}</span></div>
            {fields[k] && <div className="art-desc">{fields[k]}</div>}
            {k === 'eeatReport' ? (
              <EeatReport r={v} />
            ) : FILE_FIELDS.has(k) && typeof v === 'string' ? (
              <FileBlock content={v} fieldKey={k} />
            ) : MD_FIELDS.has(k) && typeof v === 'string' ? (
              <Markdownish md={v} />
            ) : (
              <Value v={v} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Value({ v }: { v: any }) {
  if (v === null || v === undefined) return <div className="muted">—</div>;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return <div className="art-val">{String(v)}</div>;
  }
  if (Array.isArray(v)) {
    // 对象数组 → 表格
    if (v.length && typeof v[0] === 'object' && v[0] !== null) {
      const cols = [...new Set(v.flatMap((o) => Object.keys(o)))];
      return (
        <div className="art-table-wrap">
          <table className="art-table">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c}>{colLabel(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.map((o: any, i: number) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c}>{typeof o[c] === 'object' ? JSON.stringify(o[c]) : String(o[c] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <ul className="art-list">
        {v.map((x, i) => (
          <li key={i}>{typeof x === 'object' ? JSON.stringify(x) : String(x)}</li>
        ))}
      </ul>
    );
  }
  if (typeof v === 'object') {
    return (
      <div className="art-obj">
        {Object.entries(v).map(([k, vv]) => (
          <div className="art-obj-row" key={k}>
            <b>{colLabel(k)}</b>
            <span>{typeof vv === 'object' ? JSON.stringify(vv) : String(vv)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <div className="art-val">{String(v)}</div>;
}

function History({ history, onOpen }: { history: any[]; onOpen: (id: string) => void }) {
  if (!history.length) return <div className="muted">还没有执行记录。</div>;
  return (
    <div className="hist">
      {history.map((r) => (
        <div className="hist-row" key={r.id} onClick={() => onOpen(r.id)}>
          <span className={`dot ${r.status}`} />
          <span className="hist-task">{r.task}</span>
          <span className="muted">{r.suite}</span>
          <span className="muted">{r.statusText}</span>
          <span className="muted">{r.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
