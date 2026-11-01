import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getJSON } from '../api';
import { loadFlow, siteSteps } from '../flowMeta';

const statusLabel: Record<string, string> = { pending: '待开始', running: '调研中', done: '已完成', error: '出错' };
const statusClass: Record<string, string> = { pending: '', running: 'building', done: 'done', error: 'error' };

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    getJSON('/dashboard').then(setData).catch((e) => setErr(String(e.message || e)));
    getJSON('/sites').then((d) => setSites(d.sites || [])).catch(() => setSites([]));
    loadFlow().then((s) => setSteps(siteSteps(s))).catch(() => setSteps([]));
  }, []);

  if (err) return <div className="loading">加载失败：{err}</div>;
  if (!data) return <div className="loading">加载中…</div>;

  const hasStarted = sites.length > 0 || (data.recentJobs || []).length > 0;
  const nextStepFor = (site: any) => {
    const done = new Set(site.doneTasks || []);
    return steps.find((s) => !done.has(s.task));
  };

  return (
    <>
      <section className="hero">
        <div className="kicker">SEO / GEO 流量获客工作室</div>
        <h1>帮你把<span className="hl">一个想法</span>做成有流量的海外站</h1>
        <p className="hero-sub">
          三步走：先做需求调研判断「值不值得做」，再创建站点一键产出方案，最后上线并持续监控。
          建档信息会自动带入后续每一步，你不用懂 SEO、n8n、技术细节。
        </p>
        <div className="row" style={{ marginTop: 18, gap: 10 }}>
          <button className="btn" onClick={() => nav('/research')}>开始：需求调研 →</button>
          <button className="btn ghost" onClick={() => nav('/sites')}>查看我的站点</button>
        </div>
      </section>

      {sites.length > 0 ? (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>继续推进你的站点</h3>
            <Link className="link" style={{ marginLeft: 'auto' }} to="/sites">全部 →</Link>
          </div>
          <div className="flow-chain" style={{ marginTop: 12 }}>
            {sites.slice(0, 3).map((s: any) => {
              const ns = nextStepFor(s);
              const done = (s.doneTasks || []).length;
              return (
                <div key={s.id} className="site-card" onClick={() => nav('/sites/' + s.id)}>
                  <div className="site-name">{s.name}</div>
                  <div className="site-meta">
                    {s.domain ? <span className="tag">{s.domain}</span> : <span className="tag muted">未定域名</span>}
                    <span className="tag">{done}/{steps.length} 步</span>
                  </div>
                  <div className="site-progress">
                    <div className="site-bar"><i style={{ width: Math.round((done / Math.max(steps.length, 1)) * 100) + '%' }} /></div>
                  </div>
                  <div className="site-next">
                    {ns ? <>下一步：<b>「{ns.label}」</b> →</> : '全部步骤已完成 🎉'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ margin: 0 }}>新手上路 · 从想法到有流量的海外站</h3>
          <p className="hint" style={{ margin: '6px 0 16px' }}>
            全程不用懂 SEO / n8n / 技术细节，跟着这三步走就行。
          </p>
          <div className="onboard">
            <div className="on-step">
              <span className="on-num">1</span>
              <div>
                <div className="on-title">判断值不值得做</div>
                <div className="on-desc">输入一个关键词，用免费数据看需求大小、竞争难度与商业价值。</div>
              </div>
            </div>
            <div className="on-step">
              <span className="on-num">2</span>
              <div>
                <div className="on-title">一键创建站点</div>
                <div className="on-desc">调研结论自动带入，生成页面矩阵、SEO 架构、合规清单与内容。</div>
              </div>
            </div>
            <div className="on-step">
              <span className="on-num">3</span>
              <div>
                <div className="on-title">上线并持续监控</div>
                <div className="on-desc">部署上线后持续看流量与收录，判断「继续养」还是「该撤」。</div>
              </div>
            </div>
          </div>
          <button className="btn" style={{ marginTop: 18 }} onClick={() => nav('/research')}>开始第一步：输入关键词 →</button>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h3>最近调研任务</h3>
        {!data.recentJobs || data.recentJobs.length === 0 ? (
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