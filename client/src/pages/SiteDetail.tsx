// 站点详情：建档信息 + 站点内 8 步流程 + 站点工程（真实可部署文件）+ 执行记录。
// 步骤与完成判定统一来自后端 /flow；建档上下文自动带入，无需「引用上一步」。
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJSON, postJSON } from '../api';
import { loadFlow, siteSteps, type FlowStep } from '../flowMeta';
import DeployPanel from '../components/DeployPanel';

type ScaffoldFile = { path: string; size: number; mtime: string };

export default function SiteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [site, setSite] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [err, setErr] = useState('');

  // 站点工程
  const [files, setFiles] = useState<ScaffoldFile[]>([]);
  const [scaffoldMeta, setScaffoldMeta] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [selFile, setSelFile] = useState('');
  const [fileText, setFileText] = useState('');

  useEffect(() => {
    if (!id) return;
    getJSON('/sites/' + id).then((d) => { setSite(d.site); setRuns(d.runs || []); }).catch((e) => setErr(String(e.message || e)));
    loadFlow().then((s) => setSteps(siteSteps(s))).catch(() => {});
    loadScaffold();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadScaffold = () => {
    if (!id) return;
    getJSON('/sites/' + id + '/scaffold')
      .then((d) => { setFiles(d.files || []); setScaffoldMeta(d.meta || null); })
      .catch(() => { setFiles([]); setScaffoldMeta(null); });
  };

  const generate = async () => {
    if (!id) return;
    setGenerating(true); setGenMsg('');
    try {
      const d = await postJSON('/sites/' + id + '/scaffold', {});
      if (!d.ok) throw new Error(d.error || '生成失败');
      setFiles(d.files || []);
      setScaffoldMeta({ generatedAt: new Date().toISOString(), pages: (d.pages || []).length });
      setGenMsg(`已生成 ${d.files?.length || 0} 个文件，覆盖 ${(d.pages || []).length} 个页面${d.pages?.length ? '：' + d.pages.map((p: any) => p.path).slice(0, 6).join('、') : ''}`);
      setSelFile('index.html');
    } catch (e: any) {
      setGenMsg('生成失败：' + (e?.message || ''));
    }
    setGenerating(false);
  };

  const openFile = async (p: string) => {
    if (!id) return;
    setSelFile(p);
    const isText = /\.(html|css|js|json|xml|txt|md|toml)$/i.test(p);
    if (!isText) { setFileText('（二进制文件，请下载后查看）'); return; }
    try {
      const r = await fetch(`/api/sites/${id}/scaffold/file?p=${encodeURIComponent(p)}`);
      setFileText(await r.text());
    } catch { setFileText('读取失败'); }
  };

  if (err) return <div className="loading">加载失败：{err}</div>;
  if (!site) return <div className="loading">加载中…</div>;

  const done = new Set(site.doneTasks || []);
  const doneCount = steps.filter((s) => done.has(s.task)).length;
  const firstPending = steps.find((s) => !done.has(s.task));
  const taskLabel: Record<string, string> = Object.fromEntries(steps.map((s) => [s.task, s.label]));
  const previewSrc = selFile.toLowerCase().endsWith('.html') && id
    ? `/api/sites/${id}/scaffold/static/${selFile}`
    : '';

  return (
    <>
      <div className="back" onClick={() => nav('/sites')}>← 返回站点列表</div>

      <section className="hero">
        <div className="kicker">站点 · {site.region}</div>
        <h1><span className="hl">{site.name}</span></h1>
        <p className="hero-sub">{site.positioning || '（未填写产品定位）'}</p>
        {site.research?.verdict && (
          <div className="alert" style={{ marginTop: 12, display: 'inline-block' }}>
            <b>调研结论</b>：{site.research.verdict}
            {site.research.topKeywords?.length ? (
              <div className="hint" style={{ marginTop: 4 }}>建议优先做的长尾词：{site.research.topKeywords.slice(0, 8).join('、')}</div>
            ) : null}
          </div>
        )}
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {site.domain && <span className="tag">{site.domain}</span>}
          <span className="tag">{site.language}</span>
          <span className="tag">{site.site_type || '站点类型未定'}</span>
          <span className="tag">{site.monetization || '收费模式未定'}{site.price ? ` · ${site.price}` : ''}</span>
          <span className="tag">{doneCount}/{steps.length} 步完成</span>
        </div>
        <div className="row" style={{ marginTop: 14, gap: 10 }}>
          <Link to={`/sites/${site.id}/${firstPending ? firstPending.key : 'create'}`} className="btn">
            {firstPending ? `继续「${firstPending.label}」→` : '从「创建站点」开始 →'}
          </Link>
          <Link to="/sites" className="btn ghost">站点列表</Link>
        </div>
      </section>

      {/* ===== 站点工程：真实可部署文件 ===== */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>站点工程（可直接部署的真实文件）</h3>
            <div className="hint" style={{ marginTop: 4 }}>
              把建档信息、页面矩阵、收费模式变成真的 HTML / CSS / sitemap / 定价页，不是建议。
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={generate} disabled={generating}>
              {generating ? '生成中…' : files.length ? '重新生成' : '生成站点工程 →'}
            </button>
            {files.length > 0 && (
              <a className="btn ghost" href={`/api/sites/${site.id}/scaffold.zip`}>下载整站 zip</a>
            )}
          </div>
        </div>

        {genMsg && <div className={'alert ' + (genMsg.startsWith('生成失败') ? 'err' : 'ok')}>{genMsg}</div>}

        {files.length === 0 ? (
          <div className="empty" style={{ marginTop: 10 }}>
            还没有站点工程。点「生成站点工程」，系统会按你的页面矩阵生成首页、内容页、定价页、隐私/条款、sitemap、robots、llms.txt 与部署配置。
          </div>
        ) : (
          <>
            <div className="row" style={{ gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <span className="tag">{files.length} 个文件</span>
              {scaffoldMeta?.generatedAt && <span className="muted">生成于 {String(scaffoldMeta.generatedAt).slice(0, 16).replace('T', ' ')}</span>}
              <a className="link" style={{ marginLeft: 'auto' }} href={`/api/sites/${site.id}/scaffold/static/index.html`} target="_blank" rel="noreferrer">
                新窗口预览整站 ↗
              </a>
            </div>

            <div className="scaffold-grid">
              <div className="scaffold-list">
                {files.map((f) => (
                  <div
                    key={f.path}
                    className={'sf-row' + (selFile === f.path ? ' active' : '')}
                    onClick={() => openFile(f.path)}
                  >
                    <span className="sf-name">{f.path}</span>
                    <span className="sf-size">{Math.max(1, Math.round(f.size / 1024))} KB</span>
                  </div>
                ))}
              </div>
              <div className="scaffold-preview">
                {!selFile ? (
                  <div className="empty">选择左侧文件查看内容，或直接看整站预览。</div>
                ) : previewSrc ? (
                  <iframe title={selFile} src={previewSrc} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
                ) : (
                  <pre className="sf-code">{fileText}</pre>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>部署清单（按顺序打勾就能上线）</h3>
        <DeployPanel siteId={site.id} />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>站点流程（建档上下文已自动带入，无需引用上一步）</h3>
        <div className="flow-chain" style={{ marginTop: 12 }}>
          {steps.map((s) => {
            const isDone = done.has(s.task);
            return (
              <div key={s.key} className="flow-step" onClick={() => nav(`/sites/${site.id}/${s.key}`)}>
                <div className="fs-head">
                  <span className="fs-num">{s.step}</span>
                  <span className="fs-label">{s.label}</span>
                  {isDone && <span className="pill ok" style={{ marginLeft: 'auto' }}>已执行</span>}
                </div>
                <div className="fs-desc">{s.desc}</div>
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
                <span className="hist-task">{taskLabel[r.task] || r.task}</span>
                <span className="muted">{r.createdAt}{r.error ? ' · ' + r.error : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}