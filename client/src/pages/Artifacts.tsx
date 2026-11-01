import { useEffect, useState } from 'react';
import { getJSON } from '../api';

const SUITE_LABEL: Record<string, string> = {
  'seo-research': '关键词与竞品调研',
  'seo-technical': '技术 SEO',
  'seo-content-geo': '内容与 GEO',
  'seo-monitor': 'GSC 监控',
  'seo-social-search': '短视频搜索',
  'seo-orchestrator': '全流程编排',
};

export default function Artifacts() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJSON('/artifacts')
      .then(setData)
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  // 按 runId 聚合：每条执行 = 一个 JSON + 一个 MD
  const groups = (() => {
    const map = new Map<string, any>();
    for (const it of data?.items || []) {
      const k = it.runId;
      if (!map.has(k)) {
        map.set(k, { runId: k, suite: it.suite, task: it.task, status: it.status, statusText: it.statusText, createdAt: it.createdAt, mtime: it.mtime, json: null, md: null, hasEvidence: false, sources: [] });
      }
      const g = map.get(k);
      if (it.ext === 'json') { g.json = it; g.hasEvidence = !!it.hasEvidence; g.sources = it.sources || []; }
      if (it.ext === 'md') g.md = it;
    }
    return [...map.values()];
  })();

  const view = async (it: any) => {
    setLoading(true);
    try {
      const r = await fetch('/api/artifacts/view?p=' + encodeURIComponent(it.path));
      setText(await r.text());
    } catch (e: any) {
      setText('读取失败：' + (e?.message || e));
    }
    setLoading(false);
  };

  if (err) return <div className="card">加载失败：{err}</div>;

  return (
    <>
      <section className="hero">
        <div className="kicker">ARTIFACTS · 执行产物归档</div>
        <h1>每次执行都<span className="hl">留下了什么</span></h1>
        <p className="hero-sub">
          每个流程节点的执行结果都会落盘保存：<code>{data?.dir || 'data/workspace'}</code> 下按「套件 / 任务」归档，
          同时生成结构化 JSON 与可读 Markdown。JSON 中附带 <b>__evidence</b> —— 本次真实采集到的原始数据，
          用于区分「有事实依据的结论」与「模型估算」。
        </p>
      </section>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card">
            <h3>产物列表（{groups.length} 次执行）</h3>
            <div className="hist" style={{ marginTop: 12 }}>
              {groups.length === 0 && <div className="empty">暂无产物，先去流程节点执行一次。</div>}
              {groups.map((g) => (
                <div
                  key={g.runId}
                  className={'hist-row' + (sel?.runId === g.runId ? ' active' : '')}
                  onClick={() => { if (!g.md) return; setSel(g); view(g.md); }}
                >
                  <span className={'dot ' + (g.status === 'done' ? 'done' : g.status === 'failed' ? 'failed' : 'running')} />
                  <span className="hist-task">{SUITE_LABEL[g.suite] || g.suite}</span>
                  <span className="muted" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.task}
                  </span>
                  {g.hasEvidence ? (
                    <span className="pill ok">真实数据</span>
                  ) : (
                    <span className="pill warn">估算</span>
                  )}
                  <span className="muted">{String(g.mtime || '').slice(5, 16)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3>{sel?.md ? '产物内容 · ' + sel.md.file : '产物内容'}</h3>
            {!sel?.md && <div className="empty">从左侧选择一条产物查看 Markdown 全文。</div>}
            {sel?.md && (
              <>
                <div className="art-meta" style={{ margin: '10px 0' }}>
                  {sel.hasEvidence ? (
                    <span className="pill ok">含真实采集证据（{sel.sources.join('、') || '—'}）</span>
                  ) : (
                    <span className="pill warn">无真实采集，结论为估算</span>
                  )}
                  <a className="pill" href={'/api/artifacts/view?p=' + encodeURIComponent(sel.md.path)} target="_blank" rel="noreferrer">
                    新窗口打开 ↗
                  </a>
                  {sel.json && (
                    <a className="pill" href={'/api/artifacts/view?p=' + encodeURIComponent(sel.json.path)} target="_blank" rel="noreferrer">
                      查看 JSON ↗
                    </a>
                  )}
                </div>
                {loading ? (
                  <div className="empty">读取中…</div>
                ) : (
                  <pre className="art-val" style={{ maxHeight: '62vh', overflow: 'auto', fontSize: 12.5, background: 'var(--surface-2)', padding: 14, borderRadius: 12 }}>
                    {text}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
