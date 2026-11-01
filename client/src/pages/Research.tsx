import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getJSON, postJSON } from '../api';

const MARKETS = ['us', 'gb', 'ca', 'au', 'cn', 'jp', 'de', 'fr', 'in'];
const LANGS = ['en', 'zh-CN', 'ja', 'de', 'fr', 'es'];
const CATS = ['ukulele', 'music', 'saas', 'software', 'finance', 'insurance', 'health', 'fitness', 'education', 'travel', 'game', 'general'];

function renderReport(text: string) {
  const lines = (text || '').split('\n');
  return lines.map((raw, i) => {
    const esc = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let cls = 'muted';
    if (/^=/.test(raw)) cls = 'sec';
    else if (/结论[:：]/.test(raw)) cls = 'verdict';
    else if (/值得做|✅/.test(raw)) cls = 'ok';
    else if (/暂不优先|🔴|失败|error/i.test(raw)) cls = 'err';
    else if (/可尝试|🟡|建议|注意|warn/i.test(raw)) cls = 'warn';
    return <div key={i} className={cls}>{esc}</div>;
  });
}

export default function Research() {
  const [params] = useSearchParams();
  const [seed, setSeed] = useState('ukulele chord trainer');
  const [market, setMarket] = useState('us');
  const [lang, setLang] = useState('en');
  const [category, setCategory] = useState('ukulele');
  const [cpc, setCpc] = useState('');
  const [shots, setShots] = useState<{ name: string; data_url: string }[]>([]);
  const [mVisits, setMVisits] = useState('');
  const [mBounce, setMBounce] = useState('');
  const [mPages, setMPages] = useState('');
  const [mDur, setMDur] = useState('');

  const [job, setJob] = useState<any>(null);
  const [jobId, setJobId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef<any>(null);

  function stopPoll() { if (timer.current) { clearInterval(timer.current); timer.current = null; } }

  async function poll(id: string) {
    stopPoll();
    timer.current = setInterval(async () => {
      try {
        const d = await getJSON('/jobs/' + id);
        if (d.ok && d.job) {
          setJob(d.job);
          if (d.job.status === 'done' || d.job.status === 'error') stopPoll();
        }
      } catch { /* ignore */ }
    }, 1500);
  }

  useEffect(() => {
    const j = params.get('job');
    if (j) { setJobId(j); poll(j); }
    return stopPoll;
    // eslint-disable-next-line
  }, []);

  async function submit(e: any) {
    e.preventDefault();
    if (!seed.trim()) { setMsg('请填写种子关键词'); return; }
    setSubmitting(true); setMsg('提交中…');
    const manualMetrics: any = {};
    if (mVisits) manualMetrics.monthlyVisits = +mVisits;
    if (mBounce) manualMetrics.bounceRate = +mBounce;
    if (mPages) manualMetrics.pagesPerVisit = +mPages;
    if (mDur) manualMetrics.avgVisitDurationSeconds = +mDur;
    const spec = {
      seed: seed.trim(), market, lang, category,
      cpc: cpc ? parseFloat(cpc) : null,
      screenshot: false, screenshots: shots, manualMetrics: Object.keys(manualMetrics).length ? manualMetrics : null,
    };
    try {
      const d = await postJSON('/research', { spec });
      if (d.ok) {
        setJobId(d.jobId); setJob(null); setMsg('已开始调研…');
        poll(d.jobId);
      } else { setMsg('提交失败：' + (d.error || '未知错误')); setSubmitting(false); }
    } catch (e: any) { setMsg('网络错误：' + e.message); setSubmitting(false); }
  }

  function onPick(e: any) {
    const files: File[] = Array.from(e.target.files || []);
    for (const f of files) {
      if (shots.length >= 3) break;
      const rd = new FileReader();
      rd.onload = () => { if (shots.length < 3) setShots((s) => [...s, { name: f.name, data_url: rd.result as string }]); };
      rd.readAsDataURL(f);
    }
    e.target.value = '';
  }

  const plan = job ? safeParse<any>(job.plan) : null;
  const steps = job ? (safeParse<any[]>(job.steps) || []) : [];

  const goCreateSite = () => {
    const name = (job?.seed || seed || '未命名站点').trim();
    // 把调研结论（是否值得做 + 推荐长尾词 + 任务 id）一起带给建站，避免只传一个站点名
    const analysis = safeParse<any>(job?.analysis);
    const verdict = analysis?.verdict || '';
    const topKeywords = (analysis?.longtail || []).slice(0, 8).map((l: any) => l?.keyword).filter(Boolean);
    const positioning = verdict
      ? `调研结论：${verdict}` + (topKeywords.length ? `。建议优先做的长尾词：${topKeywords.join('、')}` : '')
      : '';
    try {
      localStorage.setItem('pendingSite', JSON.stringify({ name, researchId: job?.id || jobId || '', positioning }));
    } catch { /* 忽略 */ }
    window.location.hash = '#/sites';
  };

  return (
    <>
      <section className="hero">
        <div className="kicker">KEYWORD RESEARCH · 阶段 0</div>
        <h1>先想清楚<span className="hl">这个词值不值得做</span></h1>
        <p className="hero-sub">免费抓取 Google Suggest 长尾 + SERP 构成（内页占比、品牌站、广告块），算出 kdroi 与「值得做评分」，并给出是否切入的结论。可叠加 Similarweb / Semrush 截图或手填指标辅助分析。</p>
      </section>

      <div className="grid cols-2" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
        <div className="card">
          <h3>调研参数</h3>
          <form onSubmit={submit}>
            <div className="field full">
              <label>种子关键词 <span className="req">*</span></label>
              <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="ukulele chord trainer" required />
            </div>
            <div className="grid2">
              <div className="field">
                <label>市场</label>
                <select value={market} onChange={(e) => setMarket(e.target.value)}>
                  {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="field">
                <label>语言</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>品类（默认 CPC 量级）</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>手填 CPC（可选，$）</label>
                <input type="number" step="0.1" min="0" value={cpc} onChange={(e) => setCpc(e.target.value)} placeholder="留空用品类默认" />
              </div>
            </div>

            <details className="step-params" style={{ marginTop: 4 }}>
              <summary>选填：叠加 Similarweb / Semrush 真实指标（让结论更准）</summary>
              <div style={{ marginTop: 12 }}>
                <div className="field full">
                  <label>截图辅助分析（可选）</label>
                  <div className="upload" onClick={() => document.getElementById('shots')!.click()}>
                    点击选择截图（最多 3 张）——登录 Similarweb / Semrush 后截图月访问、跳出率、流量结构等面板，自动提取指标参与分析
                  </div>
                  <input id="shots" type="file" accept="image/*" multiple hidden onChange={onPick} />
                  <div className="thumbs">
                    {shots.map((s, i) => (
                      <div key={i} className="thumb">
                        <img src={s.data_url} alt={s.name} />
                        <button type="button" onClick={() => setShots((a) => a.filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="hint">未配置视觉模型时截图仅存档，请改用手填指标。</div>
                </div>

                <div className="grid2">
                  <div className="field"><label>月访问量（手填）</label><input type="number" min="0" value={mVisits} onChange={(e) => setMVisits(e.target.value)} placeholder="如 120000" /></div>
                  <div className="field"><label>跳出率 %</label><input type="number" min="0" max="100" step="0.1" value={mBounce} onChange={(e) => setMBounce(e.target.value)} placeholder="如 42" /></div>
                </div>
                <div className="grid2">
                  <div className="field"><label>人均页数</label><input type="number" min="0" step="0.1" value={mPages} onChange={(e) => setMPages(e.target.value)} placeholder="如 2.4" /></div>
                  <div className="field"><label>平均停留（秒）</label><input type="number" min="0" value={mDur} onChange={(e) => setMDur(e.target.value)} placeholder="如 145" /></div>
                </div>
              </div>
            </details>

            <div style={{ marginTop: 16 }} className="row">
              <button className="btn" type="submit" disabled={submitting}>开始需求调研 →</button>
              <span className="hint">{msg}</span>
            </div>
          </form>
        </div>

        <div className="card">
          <h3>综合分析报告</h3>
          <div className="row" style={{ marginBottom: 6 }}>
            <span className={'status-pill ' + (job?.status === 'done' ? 'done' : job?.status === 'error' ? 'error' : job ? 'building' : '')}>
              {!job ? '待提交' : job.status === 'done' ? '已完成' : job.status === 'error' ? '出错' : '调研中'}
            </span>
            {jobId && <span className="hint">任务号 {jobId}</span>}
          </div>

          {job && (
            <>
              <div className="pbar"><i style={{ width: (job.progress || 0) + '%' }} /></div>
              <div className="steps">
                {steps.map((s: any, i: number) => (
                  <div key={i} className={'step ' + (s.pct < 0 ? 'ok' : 'on')}>
                    <span className="dot" /> <span>{s.label}</span>
                    <span className="pct">{s.pct >= 0 ? s.pct + '%' : '✕'}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {plan && (
            <>
              {plan.metricsEvidence && (plan.metricsEvidence.data || (plan.metricsEvidence.shots || []).length > 0) && (
                <div className="pcard">
                  <h3>📊 指标佐证 <span className="tag">{(plan.metricsEvidence.data && plan.metricsEvidence.data.source) || '截图存档'}</span></h3>
                  <div className="ev-grid">
                    {evCell('月访问量', plan.metricsEvidence.data?.monthlyVisits)}
                    {evCell('访问趋势', plan.metricsEvidence.data?.visitsTrendPct != null ? plan.metricsEvidence.data.visitsTrendPct + '%' : null)}
                    {evCell('跳出率', plan.metricsEvidence.data?.bounceRate != null ? plan.metricsEvidence.data.bounceRate + '%' : null)}
                    {evCell('人均页数', plan.metricsEvidence.data?.pagesPerVisit)}
                    {evCell('平均停留', plan.metricsEvidence.data?.avgVisitDurationSeconds != null ? plan.metricsEvidence.data.avgVisitDurationSeconds + 's' : null)}
                    {evCell('付费流量', plan.metricsEvidence.data?.trafficSources?.paid != null ? plan.metricsEvidence.data.trafficSources.paid + '%' : null)}
                  </div>
                  {(plan.metricsEvidence.shots || []).length > 0 && (
                    <div className="ev-grid" style={{ marginTop: 10 }}>
                      {plan.metricsEvidence.shots.map((u: string, i: number) => (
                        <div key={i} className="ev"><img src={u} alt="指标截图" style={{ width: '100%', borderRadius: 6, border: '1px solid var(--line)' }} /></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {plan.radar && plan.radar.svg && (
                <div className="pcard">
                  <h3>🧭 六维雷达 <span className="tag">机会评估</span></h3>
                  <div dangerouslySetInnerHTML={{ __html: plan.radar.svg }} />
                </div>
              )}
              {plan.longtail && plan.longtail.length > 0 && (
                <div className="pcard">
                  <h3>🎯 长尾词机会 <span className="tag">TOP {plan.longtail.length}</span></h3>
                  <table className="lt">
                    <thead><tr><th>分</th><th>意图</th><th>难度</th><th>建议页面</th><th>关键词</th></tr></thead>
                    <tbody>
                      {plan.longtail.map((it: any, i: number) => (
                        <tr key={i}>
                          <td><span className="score-pill">{it.score}</span></td>
                          <td>{it.intentLabel || it.intent}</td>
                          <td>{it.difficulty}</td>
                          <td>{it.pageType}</td>
                          <td className="kw">{it.keyword}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {job?.result && <div className="report">{renderReport(job.result)}</div>}
          {job?.status === 'done' && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>调研完成，进入下一步</h3>
                  <div className="hint">判断完「值不值得做」，就可以创建站点、开始建站全链路了。</div>
                </div>
                <button className="btn" style={{ marginLeft: 'auto' }} onClick={goCreateSite}>基于本次调研创建站点 →</button>
              </div>
            </div>
          )}
          {!job && <div className="hint" style={{ marginTop: 14 }}>提交后，这里会实时显示调研进度，随后展示六维雷达图、长尾词机会、指标佐证与是否值得做的结论。</div>}
        </div>
      </div>
    </>
  );
}

function evCell(k: string, v: any) {
  if (v === null || v === undefined || v === '') return null;
  return <div className="ev"><div className="k">{k}</div><div className="v">{v}</div></div>;
}

function safeParse<T = any>(s: string): T | null {
  try { return JSON.parse(s || 'null') as T; } catch { return null; }
}
