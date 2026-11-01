import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getJSON } from '../api';

export default function Pages() {
  const [list, setList] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    getJSON('/pages')
      .then((rows) => setList(rows))
      .catch(() => setList([]));
  }, []);

  // 深链 ?p=<slug>：参数变化时必须响应（否则切换页面会停在上一个）
  useEffect(() => {
    const want = params.get('p');
    if (!want || list.length === 0) return;
    const hit = list.find((r: any) => r.slug === want);
    if (hit && hit.slug !== sel?.slug) setSel(hit);
    // eslint-disable-next-line
  }, [params, list]);

  function open(p: any) {
    setSel(p);
    setParams({ p: p.slug });
  }

  // 按流程分组：增长 12 步 → 工作台 → 系统
  const flow = list.filter((p) => p.step > 0);
  const bench = list.filter((p) => p.step === 0 && p.slug === 'chat');
  const sys = list.filter((p) => p.step === 0 && p.slug !== 'chat');

  const Section = ({ title, items }: { title: string; items: any[] }) =>
    items.length === 0 ? null : (
      <div style={{ marginBottom: 16 }}>
        <div className="sb-group" style={{ padding: '10px 4px 6px' }}>{title}</div>
        <div className="list">
          {items.map((p) => (
            <div
              key={p.slug}
              className={'row-item' + (sel?.slug === p.slug ? ' active' : '')}
              onClick={() => open(p)}
            >
              {p.step > 0 && <span className="ri-num">{p.step}</span>}
              <div>
                <div className="ri-title">{p.stepLabel || p.title}</div>
                <div className="ri-desc">{p.slug}.html{p.desc ? ' · ' + p.desc : ''}</div>
              </div>
              <div className="ri-meta"><span className="tag">{p.category}</span></div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <>
      <section className="hero">
        <div className="kicker">LEGACY PAGES · 旧版页面归档</div>
        <h1>旧版建站 <span className="hl">页面归档</span></h1>
        <p className="hero-sub">
          这些是早期版本的原始页面，仅供参考与在线预览，<b>不属于当前「9 步增长流程」的主路径</b>。
          正式执行请到「我的站点」推进。
        </p>
      </section>

      <div className="grid cols-2">
        <div>
          <Section title="旧版流程页（仅归档）" items={flow} />
          <Section title="工作台" items={bench} />
          <Section title="系统" items={sys} />
        </div>
        <div>
          {sel ? (
            <div className="iframe-wrap">
              <div className="iframe-head">
                <span>{sel.stepLabel || sel.title}</span>
                <a href={'/api/pages/' + sel.slug + '/raw'} target="_blank" rel="noreferrer">新窗口打开 ↗</a>
              </div>
              <iframe
                title={sel.title}
                src={'/api/pages/' + sel.slug + '/raw'}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          ) : (
            <div className="card"><div className="empty">从左侧选择一个页面预览。</div></div>
          )}
        </div>
      </div>
    </>
  );
}
