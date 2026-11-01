// 部署清单面板：把「生成的站点工程」变成可执行的部署动作。
// 数据来自 GET /sites/:id/deploy（确定性检查，不依赖模型）：
//   工程是否生成 / 域名是否配置 / 待替换占位 / 部署命令 / GSC 与 Bing 提交链接。
import { useEffect, useState } from 'react';
import { getJSON } from '../api';

type Check = { key: string; label: string; done: boolean; detail: string };
type Placeholder = { key: string; label: string; total: number; files: { path: string; count: number }[] };
type DeployData = {
  generated: boolean;
  pages: number;
  domain: string;
  domainConfigured: boolean;
  platform: string;
  command: string;
  sitemapUrl: string;
  gscUrl: string;
  bingUrl: string;
  siteUrl: string;
  checklist: Check[];
  placeholders: Placeholder[];
  ready: boolean;
};

const PLATFORMS = [
  { key: 'cloudflare', label: 'Cloudflare Pages' },
  { key: 'netlify', label: 'Netlify' },
  { key: 'vercel', label: 'Vercel' },
];

export default function DeployPanel({ siteId, compact }: { siteId: string; compact?: boolean }) {
  const [data, setData] = useState<DeployData | null>(null);
  const [platform, setPlatform] = useState('cloudflare');
  const [copied, setCopied] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!siteId) return;
    setErr('');
    getJSON(`/sites/${siteId}/deploy?platform=${platform}`)
      .then(setData)
      .catch((e) => setErr(String(e.message || e)));
  }, [siteId, platform]);

  const copy = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(''), 1500);
    } catch { /* 剪贴板不可用时忽略 */ }
  };

  if (err) return <div className="empty">部署信息加载失败：{err}</div>;
  if (!data) return <div className="empty">加载部署清单…</div>;

  if (!data.generated) {
    return (
      <div className="empty">
        还没有站点工程，先生成工程再部署（在站点页点「生成站点工程」，或跑一次「创建站点」会自动生成）。
      </div>
    );
  }

  const pending = data.checklist.filter((c) => !c.done);

  return (
    <div className="deploy-panel">
      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={`pill ${data.ready ? 'ok' : 'warn'}`}>{data.ready ? '可以部署了' : `还有 ${pending.length} 项待处理`}</span>
        <span className="tag">{data.pages} 个页面</span>
        {data.domainConfigured ? <span className="tag">{data.domain}</span> : <span className="tag">域名未配置</span>}
      </div>

      {!compact && (
        <>
          <div className="deploy-sec-title">上线前检查</div>
          <div className="deploy-checks">
            {data.checklist.map((c) => (
              <div className={'deploy-check' + (c.done ? ' done' : '')} key={c.key}>
                <span className="dc-mark">{c.done ? '✓' : '○'}</span>
                <div>
                  <div className="dc-label">{c.label}</div>
                  <div className="dc-detail">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {data.placeholders.some((p) => p.total > 0) && (
            <>
              <div className="deploy-sec-title">还需要替换的占位</div>
              <div className="deploy-ph">
                {data.placeholders.filter((p) => p.total > 0).map((p) => (
                  <div key={p.key} className="deploy-ph-row">
                    <b>{p.label}</b>
                    <span className="muted">{p.total} 处 · {p.files.map((f) => f.path).slice(0, 4).join('、')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="deploy-sec-title">部署命令</div>
      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ maxWidth: 200 }}>
          {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <button className="rt-btn small" onClick={() => copy(data.command, 'cmd')}>{copied === 'cmd' ? '已复制' : '复制命令'}</button>
      </div>
      <pre className="deploy-cmd">{data.command}</pre>
      <div className="hint">在下载解压后的站点工程目录里执行；纯静态文件，无需构建。</div>

      <div className="deploy-sec-title">提交收录</div>
      {data.domainConfigured ? (
        <div className="deploy-links">
          <div className="deploy-link-row">
            <span>sitemap 地址</span>
            <code>{data.sitemapUrl}</code>
            <button className="rt-btn small" onClick={() => copy(data.sitemapUrl, 'sm')}>{copied === 'sm' ? '已复制' : '复制'}</button>
          </div>
          <div className="deploy-link-row">
            <span>Google Search Console</span>
            <a href={data.gscUrl} target="_blank" rel="noreferrer" className="link">打开并提交 sitemap ↗</a>
          </div>
          <div className="deploy-link-row">
            <span>Bing Webmaster</span>
            <a href={data.bingUrl} target="_blank" rel="noreferrer" className="link">打开并提交 sitemap ↗</a>
          </div>
          <div className="deploy-link-row">
            <span>站点地址</span>
            <a href={data.siteUrl} target="_blank" rel="noreferrer" className="link">{data.siteUrl} ↗</a>
          </div>
        </div>
      ) : (
        <div className="hint">填写真实域名后，这里会自动生成 GSC / Bing 的提交链接与 sitemap 地址。</div>
      )}
    </div>
  );
}