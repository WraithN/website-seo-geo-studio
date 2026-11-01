// 站点列表：每个站点是一张卡片，收拢「创建站点 → 内容生产 → 合规 → SEO → 外链 → 监控」全链路。
// 需求调研之后在这里「创建站点」，之后所有步骤都在站点内执行，建档信息作为统一上下文自动带入。
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJSON, postJSON } from '../api';

const REGIONS = ['全球/英语（宽松基线）', '欧盟/EEA（GDPR）', '英国（UK GDPR）', '美国加州（CCPA/CPRA）', '美国（含儿童 COPPA）', '日本（APPI）', '韩国（PIPA）', '巴西（LGPD）'];
const LANGS = ['英语', '英语+小语种', '中文+英语'];
const TYPES = ['落地页', '博客/内容站', '工具站', '文档站'];

const STEP_TASK: Record<string, string> = {
  create: 'create-site', content: 'content-pipeline', seo: 'geo-optimize',
  compliance: 'compliance-check', techseo: 'audit', deploy: 'deploy-plan',
  backlink: 'link-prospecting', monitor: 'gsc-monitor',
};

// 站点内 8 步（与 flow.ts 的 group!=='pre' 一致）
const SITE_STEPS = [
  { key: 'create', label: '创建站点', phase: '建站' },
  { key: 'seo', label: 'SEO·GEO 优化', phase: '优化' },
  { key: 'compliance', label: '合规优化', phase: '合规' },
  { key: 'techseo', label: '技术SEO·GEO', phase: '技术' },
  { key: 'content', label: '内容生产', phase: '内容' },
  { key: 'deploy', label: '部署上线', phase: '上线' },
  { key: 'backlink', label: '外链推广', phase: '运营' },
  { key: 'monitor', label: '线上监控', phase: '运营' },
];

export default function Sites() {
  const nav = useNavigate();
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ name: '', domain: '', region: REGIONS[0], positioning: '', language: LANGS[0], siteType: TYPES[0] });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => getJSON('/sites').then((d) => setSites(d.sites || [])).catch(() => setSites([])).finally(() => setLoading(false));
  useEffect(() => {
    load();
    // 从需求调研「创建站点」CTA 带过来的默认站点名
    try {
      const pending = localStorage.getItem('pendingSiteName');
      if (pending) {
        setForm((f) => ({ ...f, name: pending }));
        setShowForm(true);
        localStorage.removeItem('pendingSiteName');
      }
    } catch { /* 忽略 */ }
  }, []);

  const create = async () => {
    if (!form.name.trim()) { setMsg('请填写站点名'); return; }
    setSubmitting(true); setMsg('');
    try {
      const d = await postJSON('/sites', { ...form, name: form.name.trim() });
      if (!d.ok) throw new Error(d.error || '创建失败');
      setShowForm(false);
      setForm({ name: '', domain: '', region: REGIONS[0], positioning: '', language: LANGS[0], siteType: TYPES[0] });
      nav('/sites/' + d.site.id);
    } catch (e: any) { setMsg(e?.message || '创建失败'); setSubmitting(false); }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`确定删除站点「${name}」？其下的执行记录会解除关联（但不会删除产物文件）。`)) return;
    try {
      const r = await fetch('/api/sites/' + id, { method: 'DELETE' });
      if (!r.ok) throw new Error('删除失败');
    } catch (e: any) { setMsg(e?.message || '删除失败'); return; }
    load();
  };

  if (loading) return <div className="loading">加载中…</div>;

  return (
    <>
      <section className="hero">
        <div className="kicker">站点 · 建站容器</div>
        <h1>每个<span className="hl">站点</span>一张卡片，串起全链路</h1>
        <p className="hero-sub">
          需求调研判断「值不值得做」之后，在这里创建站点。每个站点收拢「创建站点 → 内容生产 → 合规优化 → SEO → 外链推广 → 线上监控」全部步骤；
          建档信息（产品名/域名/面向地区/定位/语言）作为统一上下文自动带入后续步骤，<b>无需再「引用上一步」</b>。
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => setShowForm((s) => !s)}>{showForm ? '收起' : '＋ 创建站点'}</button>
          <Link to="/flow" className="btn ghost">查看增长流程方法论</Link>
        </div>
      </section>

      {showForm && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>新建站点（建档）</h3>
          <div className="grid cols-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>站点名 <span className="req">*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 Rhythm Trainer" /></div>
            <div className="field"><label>域名（可选）</label>
              <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="如 example.com" /></div>
            <div className="field"><label>面向地区（决定合规策略）</label>
              <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>{REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
            <div className="field"><label>站点语言</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>{LANGS.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
            <div className="field"><label>站点类型</label>
              <select value={form.siteType} onChange={(e) => setForm({ ...form, siteType: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="field"><label>产品定位（可选）</label>
              <input value={form.positioning} onChange={(e) => setForm({ ...form, positioning: e.target.value })} placeholder="给谁用、解决什么问题、和竞品的差异" /></div>
          </div>
          {msg && <div className="alert err">{msg}</div>}
          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn" onClick={create} disabled={submitting}>{submitting ? '创建中…' : '创建站点 →'}</button>
          </div>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="card empty" style={{ marginTop: 20 }}>
          还没有站点。点上方「＋ 创建站点」开始——建议先去<Link to="/research" className="link">需求调研</Link>判断值不值得做，再来建档。
        </div>
      ) : (
        <div className="flow-chain" style={{ marginTop: 20 }}>
          {sites.map((s: any) => {
            const done = (s.doneTasks || []).length;
            const pct = Math.round((done / SITE_STEPS.length) * 100);
            return (
              <div key={s.id} className="site-card" onClick={() => nav('/sites/' + s.id)}>
                <div className="site-head">
                  <div className="site-name">{s.name}</div>
                  <button className="site-del" title="删除站点" onClick={(e) => { e.stopPropagation(); remove(s.id, s.name); }}>×</button>
                </div>
                <div className="site-meta">
                  {s.domain ? <span className="tag">{s.domain}</span> : <span className="tag muted">未定域名</span>}
                  <span className="tag">{s.region}</span>
                </div>
                <div className="site-progress">
                  <div className="site-bar"><i style={{ width: pct + '%' }} /></div>
                  <span className="site-pct">{done}/{SITE_STEPS.length} 步完成 · {pct}%</span>
                </div>
                <div className="site-steps">
                  {SITE_STEPS.map((st) => (
                    <span key={st.key} className={'mini-step ' + ((s.doneTasks || []).includes(STEP_TASK[st.key]) ? 'done' : '')} title={st.label}>
                      {st.label.slice(0, 2)}
                    </span>
                  ))}
                </div>
                <div className="site-foot">
                  <span className="muted" style={{ fontSize: 12 }}>{s.created_at?.slice(0, 10) || ''}</span>
                  <span className="link">进入 →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
