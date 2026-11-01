// 增长流程方法论总览：把「需求调研 → 创建站点 → … → 监控」的完整链路讲清楚。
// 实际执行在「站点」内进行——每个站点收拢 8 个步骤，建档信息作为统一上下文自动带入，无需引用上一步。
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJSON } from '../api';

type FlowStep = {
  step: number; key: string; label: string; phase: string;
  group: string; groupLabel?: string; desc: string; page: string;
  suites: string[]; workflows: { slug: string; name: string; nodes: number; category: string }[];
};

export default function Flow() {
  const nav = useNavigate();
  const [data, setData] = useState<{ steps: FlowStep[]; extra: any[] } | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    getJSON('/flow').then(setData).catch((e) => setErr(String(e.message || e)));
    getJSON('/sites').then((d) => setSites(d.sites || [])).catch(() => setSites([]));
  }, []);

  if (err) return <div className="loading">加载失败：{err}</div>;
  if (!data) return <div className="loading">加载中…</div>;

  // 站点内执行某步骤：有站点则进第一个站点，否则独立运行
  const goStep = (s: FlowStep) => {
    if (s.group === 'pre') { nav('/flow/' + s.key); return; }
    if (sites.length) nav(`/sites/${sites[0].id}/${s.key}`);
    else nav('/flow/' + s.key);
  };

  const groups = ['pre', 'create', 'operate']
    .map((g) => {
      const items = data.steps.filter((s) => s.group === g);
      return items.length ? { group: g, label: items[0].groupLabel || '', items } : null;
    })
    .filter(Boolean) as { group: string; label: string; items: FlowStep[] }[];

  const renderGroup = (g: { group: string; label: string; items: FlowStep[] }) => (
    <div key={g.group} style={{ marginTop: 12 }}>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <div className="sb-group" style={{ padding: '8px 4px 4px' }}>{g.label}</div>
        <span className="tag">{g.items.length} 步</span>
      </div>
      <div className="flow-chain" style={{ marginTop: 4 }}>
        {g.items.map((s) => (
          <div key={s.key} className="flow-step" onClick={() => goStep(s)}>
            <div className="fs-head">
              <span className="fs-num">{s.step}</span>
              <span className="fs-label">{s.label}</span>
            </div>
            <div className="fs-desc">{s.desc}</div>
            <div className="fs-meta">
              <span className="tag">{s.phase}</span>
              <span className="tag">{(s.suites || []).length} 套技能</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const productCount = data.steps.filter((s) => s.group !== 'pre').length;

  return (
    <>
      <section className="hero">
        <div className="kicker">增长流程 · 方法论</div>
        <h1>一个<span className="hl">独立站产品</span>，一条流程走到底</h1>
        <p className="hero-sub">
          需求调研在立项阶段（还没有产品）；调研结论出来后<Link to="/sites" className="link">创建站点</Link>，
          之后「上线前 → 线上持续优化和监控」全部收在同一个站点下推进。建档信息（产品名/域名/面向地区/定位/语言）
          会作为统一上下文自动带入后续步骤，<b>因此不再需要「引用上一步」</b>。
        </p>
        <div className="row" style={{ marginTop: 16, gap: 10, flexWrap: 'wrap' }}>
          <Link to="/sites" className="btn">创建 / 进入站点 →</Link>
          <Link to="/research" className="btn ghost">先做需求调研</Link>
        </div>
      </section>

      {sites.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>我的站点</h3>
            <span className="tag">{sites.length} 个</span>
            <Link to="/sites" className="link" style={{ marginLeft: 'auto' }}>全部 →</Link>
          </div>
          <div className="flow-rail" style={{ marginTop: 10 }}>
            {sites.slice(0, 6).map((s: any) => (
              <div key={s.id} className="flow-node" onClick={() => nav('/sites/' + s.id)}>
                <span className="fn-num">{String((s.doneTasks || []).length || 0)}</span>
                <span>{s.name}</span>
                <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{s.region}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>独立站产品</h3>
          <span className="tag">共 {productCount} 步</span>
          <span className="muted" style={{ fontSize: 12.5 }}>
            建档 → 内容生产 → 合规 → SEO·GEO → 技术SEO → 部署 → 外链 → 监控（养网站防老）
          </span>
        </div>
        {groups.map(renderGroup)}
        <div className="hint" style={{ marginTop: 14 }}>
          提示：点任意步骤会进入「站点」执行（自动带上建档上下文）。也可在上方「创建 / 进入站点」里选择具体站点。
        </div>
      </div>
    </>
  );
}
