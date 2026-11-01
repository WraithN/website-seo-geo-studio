import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJSON } from '../api';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    getJSON('/dashboard').then(setData).catch((e) => setErr(String(e.message || e)));
  }, []);

  if (err) return <div className="loading">加载失败：{err}</div>;
  if (!data) return <div className="loading">加载中…</div>;

  const statusLabel: Record<string, string> = { pending: '待开始', running: '调研中', done: '已完成', error: '出错' };
  const statusClass: Record<string, string> = { pending: '', running: 'building', done: 'done', error: 'error' };

  return (
    <>
      <section className="hero">
        <div className="kicker">SEO / GEO 流量获客工作室</div>
        <h1>按<span className="hl">站点</span>推进获客全链路</h1>
        <p className="hero-sub">
          先做需求调研判断「值不值得做」，再创建站点：每个站点收拢「创建站点 → 内容生产 → 合规优化 → SEO·GEO → 外链推广 → 线上监控」全部步骤。
          建档信息（产品名/域名/面向地区/定位/语言）作为统一上下文自动带入后续步骤，无需再「引用上一步」。
          每一步都可直接执行：填写必要信息，得到可落地的结果。SEO/GEO 技能与 n8n 工作流在后台自动调用。
        </p>
      </section>

      <div className="grid cols-3">
        <div className="card" onClick={() => nav('/sites')} style={{ cursor: 'pointer' }}>
          <h3>我的站点</h3>
          <div className="big">站点</div>
          <div className="hint">每个站点收拢建站全链路（建档→内容→合规→SEO→外链→监控）</div>
        </div>
        <div className="card" onClick={() => nav('/research')} style={{ cursor: 'pointer' }}>
          <h3>从这一步开始</h3>
          <div className="big">1</div>
          <div className="hint">需求调研：判断值不值得做</div>
        </div>
        <div className="card" onClick={() => nav('/workflows')} style={{ cursor: 'pointer' }}>
          <h3>n8n 工作流</h3>
          <div className="big">{data.counts.workflows}</div>
          <div className="hint">个流程（含站点建站与增长链路）</div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <div className="card" onClick={() => nav('/pages')} style={{ cursor: 'pointer' }}>
          <h3>建站页面</h3>
          <div className="big">{data.counts.pages}</div>
          <div className="hint">个页面（按流程链条排序，可在线预览）</div>
        </div>
        <div className="card" onClick={() => nav('/settings/orchestration')} style={{ cursor: 'pointer' }}>
          <h3>流程编排</h3>
          <div className="big">9</div>
          <div className="hint">个节点（查看各自调用的 n8n 与技能）</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>最近调研任务</h3>
        {data.recentJobs.length === 0 ? (
          <div className="empty">还没有调研任务，去 <a onClick={() => nav('/research')} style={{ color: 'var(--accent-ink)', cursor: 'pointer' }}>需求调研</a> 跑一个吧。</div>
        ) : (
          <div className="list" style={{ marginTop: 8 }}>
            {data.recentJobs.map((j: any) => (
              <div key={j.id} className="row-item" onClick={() => nav('/research?job=' + j.id)}>
                <div>
                  <div className="ri-title">{j.seed}</div>
                  <div className="ri-desc">{statusLabel[j.status] || j.status} · {j.progress}%</div>
                </div>
                <div className="ri-meta"><span className={'status-pill ' + (statusClass[j.status] || '')}>{statusLabel[j.status] || j.status}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
