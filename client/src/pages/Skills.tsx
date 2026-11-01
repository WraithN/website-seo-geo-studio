import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getJSON } from '../api';

/** 技能资源页：点开任务直接看技能内容（SKILL.md），不展示合并数量等无关信息 */
export default function Skills() {
  const [suites, setSuites] = useState<any[]>([]);
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [suite, setSuite] = useState('');
  const [loading, setLoading] = useState(true);
  const [openTask, setOpenTask] = useState('');
  const [skillMd, setSkillMd] = useState<Record<string, string>>({});
  const nav = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    getJSON('/suites').then((d) => setSuites(d.suites || [])).catch(() => setSuites([]));
  }, []);

  useEffect(() => {
    const s = params.get('suite') || '';
    setSuite(s);
    setLoading(true);
    const url = s ? `/skills?suite=${encodeURIComponent(s)}` : '/skills';
    getJSON(url).then((r) => { setList(r); setLoading(false); }).catch(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    getJSON(`/skills?q=${encodeURIComponent(q)}`).then((r) => { setList(r); setLoading(false); }).catch(() => setLoading(false));
  }, [q]);

  // 展开任务时按需加载该套件的 SKILL.md（技能内容本体）
  const openDetail = (suiteSlug: string, taskKey: string) => {
    const k = suiteSlug + '/' + taskKey;
    if (openTask === k) { setOpenTask(''); return; }
    setOpenTask(k);
    if (!skillMd[suiteSlug]) {
      getJSON(`/suites/${suiteSlug}/skillmd`)
        .then((d: any) => setSkillMd((m) => ({ ...m, [suiteSlug]: d.body || '（无 SKILL.md）' })))
        .catch(() => setSkillMd((m) => ({ ...m, [suiteSlug]: '（加载失败）' })));
    }
  };

  return (
    <>
      <section className="hero">
        <div className="kicker">SKILLS · 可执行技能</div>
        <h1>SEO / GEO <span className="hl">技能库</span></h1>
        <p className="hero-sub">点开任意技能，直接看这个技能的内容（SKILL.md 全文）：它做什么、怎么做、输出什么。</p>
      </section>

      <div className="sb-group" style={{ padding: '4px 0 10px' }}>技能与任务（点击查看技能内容）</div>
      {suites.map((s) => (
        <div key={s.slug} className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{s.name}</h3>
            <span className="tag">{s.slug}</span>
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{s.desc}</div>
          {(s.tasks || []).map((t: any) => {
            const k = s.slug + '/' + t.key;
            const open = openTask === k;
            return (
              <div key={t.key} className="pcard" style={{ cursor: 'pointer', marginTop: 8 }} onClick={() => openDetail(s.slug, t.key)}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <b style={{ fontSize: 13 }}>{t.name}</b>
                  <span className="tag">{t.key}</span>
                  <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{open ? '收起 ▲' : '技能详情 ▼'}</span>
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{t.desc}</div>
                {open && (
                  <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <button className="btn ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); nav('/run/' + s.slug + '/' + t.key); }}>去执行该任务</button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, letterSpacing: '.05em', color: 'var(--accent)', marginBottom: 6 }}>
                      技能内容（SKILL.md）
                    </div>
                    <div className="markdown" style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', maxHeight: 420, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 12.5 }}>
                      {skillMd[s.slug] || '加载中…'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="sb-group" style={{ padding: '16px 0 10px' }}>SKILL.md 文档库（点击查看全文）</div>
      <div className="toolbar">
        <input className="search" placeholder="搜索技能名称 / 描述 / 正文…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={suite} onChange={(e) => { setSuite(e.target.value); nav(e.target.value ? '/skills?suite=' + e.target.value : '/skills'); }}>
          <option value="">全部套件</option>
          <option value="seo-orchestrator">总控编排</option>
          <option value="seo-research">关键词/竞品/外链</option>
          <option value="seo-content-geo">内容/GEO</option>
          <option value="seo-technical">技术SEO</option>
          <option value="seo-monitor">GSC监控/报告</option>
          <option value="seo-social-search">短视频搜索</option>
        </select>
      </div>

      {loading ? <div className="loading">加载中…</div> : (
        <div className="list">
          {list.map((s) => (
            <div key={s.slug} className="row-item" onClick={() => nav('/skills/' + s.slug)}>
              <div>
                <div className="ri-title">{s.name || s.slug}</div>
                <div className="ri-desc">{s.description || '—'}</div>
              </div>
              <div className="ri-meta"><span className="tag">{s.suite}</span></div>
            </div>
          ))}
          {list.length === 0 && <div className="empty">没有匹配结果。</div>}
        </div>
      )}
    </>
  );
}
