// 站点详情：展示建档信息 + 站点内 8 步流程（每步可点开执行）+ 近期运行。
// 每个步骤的执行都自动带上建档上下文，无需「引用上一步」。
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJSON } from '../api';

const SITE_STEPS = [
  { key: 'create', label: '创建站点', phase: '建站', goal: '建档：产品名/域名/面向地区/定位/语言 → 站点规格与页面矩阵' },
  { key: 'seo', label: 'SEO·GEO 优化', phase: '优化', goal: '关键词→页面映射、内链骨架、meta/llms.txt 模板、答案块规划' },
  { key: 'compliance', label: '合规优化', phase: '合规', goal: '按面向地区输出合规清单（隐私/Cookie/数据处理/未成年人等）' },
  { key: 'techseo', label: '技术SEO·GEO', phase: '技术', goal: '验收清单 + 生成 robots.txt / sitemap.xml / llms.txt' },
  { key: 'content', label: '内容生产', phase: '内容', goal: 'blog 规划 → 内容成稿 → 去AI味 → EEAT 验证（带论文/权威博客引用）' },
  { key: 'deploy', label: '部署上线', phase: '上线', goal: '上线检查清单与部署步骤，提交 GSC/Bing 站长平台' },
  { key: 'backlink', label: '外链推广', phase: '运营', goal: '按外链质量排序找可争取的外链/引用机会' },
  { key: 'monitor', label: '线上监控', phase: '运营', goal: 'UV/PV、跳出、停留、GSC 覆盖与 AdSense 覆盖率 → 养站决策' },
];

const STEP_TASK: Record<string, string> = {
  create: 'create-site', content: 'content-pipeline', seo: 'geo-optimize',
  compliance: 'compliance-check', techseo: 'audit', deploy: 'deploy-plan',
  backlink: 'link-prospecting', monitor: 'gsc-monitor',
};

export default function SiteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [site, setSite] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    getJSON('/sites/' + id).then((d) => { setSite(d.site); setRuns(d.runs || []); }).catch((e) => setErr(String(e.message || e)));
  }, [id]);

  if (err) return <div className="loading">加载失败：{err}</div>;
  if (!site) return <div className="loading">加载中…</div>;

  const done = new Set(site.doneTasks || []);
  const doneCount = SITE_STEPS.filter((s) => done.has(STEP_TASK[s.key])).length;

  return (
    <>
      <div className="back" onClick={() => nav('/sites')}>← 返回站点列表</div>

      <section className="hero">
        <div className="kicker">站点 · {site.region}</div>
        <h1><span className="hl">{site.name}</span></h1>
        <p className="hero-sub">{site.positioning || '（未填写产品定位）'}</p>
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {site.domain && <span className="tag">{site.domain}</span>}
          <span className="tag">{site.language}</span>
          <span className="tag">{site.site_type || '站点类型未定'}</span>
          <span className="tag">{doneCount}/{SITE_STEPS.length} 步完成</span>
        </div>
        <div className="row" style={{ marginTop: 14, gap: 10 }}>
          <Link to={`/sites/${site.id}/create`} className="btn">从「创建站点」开始 →</Link>
          <Link to="/sites" className="btn ghost">站点列表</Link>
        </div>
      </section>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>站点流程（建档上下文已自动带入，无需引用上一步）</h3>
        <div className="flow-chain" style={{ marginTop: 12 }}>
          {SITE_STEPS.map((s, i) => {
            const isDone = done.has(STEP_TASK[s.key]);
            return (
              <div key={s.key} className="flow-step" onClick={() => nav(`/sites/${site.id}/${s.key}`)}>
                <div className="fs-head">
                  <span className="fs-num">{i + 1}</span>
                  <span className="fs-label">{s.label}</span>
                  {isDone && <span className="pill ok" style={{ marginLeft: 'auto' }}>已执行</span>}
                </div>
                <div className="fs-desc">{s.goal}</div>
                <div className="fs-meta"><span className="tag">{s.phase}</span></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>站点内执行记录（{runs.length} 条）</h3>
          <Link to="/history" className="link">全部历史 →</Link>
        </div>
        {runs.length === 0 ? (
          <div className="empty">这个站点还没有执行记录。从上方流程第一步「创建站点」开始吧。</div>
        ) : (
          <div className="hist" style={{ marginTop: 12 }}>
            {runs.slice(0, 10).map((r: any) => (
              <div className="hist-row" key={r.id} onClick={() => nav('/history')}>
                <span className={`dot ${r.status}`} />
                <span className="hist-task">{r.task}</span>
                <span className="muted">{r.createdAt}{r.error ? ' · ' + r.error : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
