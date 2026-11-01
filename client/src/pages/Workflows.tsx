import { useEffect, useMemo, useState } from 'react';
import { getJSON } from '../api';

/** n8n 工作流资源页：列表 + 节点级细节（每个节点在干什么）+ 原始 JSON */
export default function Workflows() {
  const [list, setList] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    getJSON('/workflows').then(setList).catch(() => setList([]));
  }, []);

  const grouped = useMemo(() => {
    // 按流程阶段分组，组内保持后端已排好的流程顺序
    const m: Record<string, any[]> = {};
    for (const w of list) {
      const g = w.step > 0 ? `阶段 ${w.step}` : '建站总流程 / 其他';
      (m[g] ||= []).push(w);
    }
    return m;
  }, [list]);

  const order = (g: string) => (g.startsWith('阶段') ? parseInt(g.replace(/\D/g, ''), 10) : 999);

  async function open(w: any) {
    setSel(w);
    setShowJson(false);
    const r = await getJSON('/workflows/' + w.slug);
    setDetail(r);
  }

  return (
    <>
      <section className="hero">
        <div className="kicker">N8N WORKFLOWS · 按流程链条排序</div>
        <h1>工作流 <span className="hl">资产库</span></h1>
        <p className="hero-sub">每条 n8n 流程的触发方式、节点链路与每个节点的职责都可点开查看；可一键导出 JSON 回 n8n 导入。</p>
      </section>

      <div className="grid cols-2">
        <div>
          {Object.entries(grouped)
            .sort((a, b) => order(a[0]) - order(b[0]))
            .map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div className="sb-group" style={{ padding: '10px 4px 6px' }}>{cat}</div>
              <div className="list">
                {items.map((w) => (
                  <div
                    key={w.slug}
                    className={'row-item' + (sel?.slug === w.slug ? ' on' : '')}
                    style={sel?.slug === w.slug ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined}
                    onClick={() => open(w)}
                  >
                    <div>
                      <div className="ri-title">{w.name}</div>
                      <div className="ri-desc">{w.description || ''}</div>
                    </div>
                    <div className="ri-meta">{w.nodes} 节点</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          {!sel ? (
            <div className="card"><div className="empty">从左侧选择一个工作流，查看节点细节。</div></div>
          ) : (
            <div className="card">
              <h3>{sel.name}</h3>
              <div className="hint" style={{ marginBottom: 10 }}>
                {sel.nodes} 个节点 · 分类：{sel.category}
                {detail?.description ? ` · ${detail.description}` : ''}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn" onClick={() => window.open('/api/workflows/' + sel.slug + '/export')}>导出 JSON</button>
                <button className="btn ghost" onClick={() => setShowJson(!showJson)}>{showJson ? '收起原始 JSON' : '查看原始 JSON'}</button>
              </div>

              {detail?.nodeDetails?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="sb-group" style={{ padding: '4px 0 8px' }}>节点链路（共 {detail.nodeDetails.length} 个）</div>
                  {detail.nodeDetails.map((n: any, i: number) => (
                    <div key={i} className="pcard" style={{ marginBottom: 8 }}>
                      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                        <span className="tag">{i + 1}</span>
                        <b style={{ fontSize: 13.5 }}>{n.name}</b>
                        <span className="tag">{n.type}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{n.desc}</div>
                      {n.detail && (
                        <pre style={{ marginTop: 6, fontSize: 11, background: 'var(--surface-2)', padding: '6px 8px', borderRadius: 8, overflow: 'auto', maxHeight: 140 }}>{n.detail}</pre>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showJson && (
                <div className="markdown" style={{ marginTop: 12, maxHeight: '50vh', overflow: 'auto' }}>
                  {(() => { try { return JSON.stringify(JSON.parse(detail?.json || '{}'), null, 2); } catch { return String(detail?.json || ''); } })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
