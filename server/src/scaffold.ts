// 站点工程生成器：把「建档 + 页面矩阵 + 收费模式」变成一套可直接部署的真实静态站点文件。
// 产出：HTML 页面、样式、sitemap.xml、robots.txt、llms.txt、定价页、部署配置、README。
// 目标是「用户下载即可上线」，而不是再给一堆建议。

export interface ScaffoldPage {
  path: string;
  title: string;
  purpose?: string;
  targetQuery?: string;
  keySections?: string[];
  priority?: string;
}

export interface ScaffoldInput {
  site: any;
  profile?: any;
  research?: any;
}

export interface ScaffoldFile {
  path: string;
  content: string;
}

const esc = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'page';
}

/** 统一路径：/about、about、/about/ → /about；根 → / */
function normPath(p: string): string {
  let s = String(p || '/').trim();
  if (!s.startsWith('/')) s = '/' + s;
  s = s.replace(/\/+/g, '/').replace(/\.html?$/i, '');
  if (s.length > 1) s = s.replace(/\/$/, '');
  return s || '/';
}

function fileOf(p: string): string {
  const n = normPath(p);
  return n === '/' ? 'index.html' : n.slice(1) + '.html';
}

function relHref(fromFile: string, toFile: string): string {
  const fromDir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/')) : '';
  if (!fromDir) return toFile;
  const depth = fromDir.split('/').filter(Boolean).length;
  return '../'.repeat(depth) + toFile;
}

function langOf(site: any): string {
  const l = String(site?.language || '');
  if (/中文/.test(l)) return 'zh-CN';
  return 'en';
}

function hasCJK(s: any): boolean {
  return /[\u4e00-\u9fa5]/.test(String(s || ''));
}

/** 站点类型的中文标签 → 英文文案（英文站不能出现「工具站」这类中文词） */
function siteTypeEn(site: any): string {
  const t = String(site?.siteType || '');
  if (/工具/.test(t)) return 'online tool';
  if (/落地/.test(t)) return 'landing page';
  if (/博客|内容/.test(t)) return 'content site';
  if (/文档/.test(t)) return 'documentation site';
  return 'online tool';
}

/** 加不定冠词（a / an），用于生成「an online tool」「a landing page」 */
function withArticle(en: string): string {
  return (en === 'online tool' ? 'an ' : 'a ') + en;
}

/** 对外可见文案（title / meta description）按站点语言生成，避免英文站出现中文占位描述 */
function siteDesc(site: any, page: ScaffoldPage): string {
  const zh = langOf(site) === 'zh-CN';
  const pos = String(site?.positioning || '');
  if (zh) return (page.purpose || pos || `${site?.name || '站点'}：${page.title}`).slice(0, 155);
  if (page.path === '/' || page.path === '/about') {
    if (pos && !hasCJK(pos)) return pos.slice(0, 155);
    return `${site?.name || 'Your Site'} is ${withArticle(siteTypeEn(site))} that helps you get results in minutes.`.slice(0, 155);
  }
  if (page.targetQuery) return `Everything about ${page.targetQuery}: quick answers, step-by-step guidance and FAQ, from ${site?.name || 'our team'}.`.slice(0, 155);
  return `${page.title} — ${site?.name || 'Your Site'}.`.slice(0, 155);
}

function siteTitle(site: any, page: ScaffoldPage): string {
  const zh = langOf(site) === 'zh-CN';
  const pos = String(site?.positioning || '');
  const name = site?.name || 'Your Site';
  if (page.path === '/') {
    if (zh) return pos ? `${name} — ${pos.slice(0, 40)}` : name;
    if (pos && !hasCJK(pos)) return `${name} — ${pos.slice(0, 50)}`;
    return `${name} — ${siteTypeEn(site)}`;
  }
  return `${page.title} | ${name}`;
}

function monetizationKind(site: any): {
  ads: boolean; subscription: boolean; oneTime: boolean; affiliate: boolean; none: boolean;
  label: string;
} {
  const m = String(site?.monetization || '');
  return {
    ads: /广告|AdSense/i.test(m),
    subscription: /订阅|月付|年付|Freemium|免费增值/i.test(m),
    oneTime: /买断|一次性/i.test(m),
    affiliate: /联盟/.test(m),
    none: /暂不|不变现/.test(m) || !m,
    label: m || '暂不变现',
  };
}

function buildPages(site: any, profile: any, research: any): ScaffoldPage[] {
  const raw: ScaffoldPage[] = Array.isArray(profile?.pages) ? profile.pages : [];
  const seen = new Set<string>();
  const pages: ScaffoldPage[] = [];

  const push = (p: ScaffoldPage) => {
    const path = normPath(p.path);
    if (seen.has(path)) return;
    seen.add(path);
    pages.push({ ...p, path });
  };

  // 优先用模型产出的页面矩阵（过滤明显无效项）
  for (const p of raw) {
    if (!p || !p.path) continue;
    push({
      path: p.path,
      title: p.title || site?.name || 'Home',
      purpose: p.purpose || '',
      targetQuery: p.targetQuery || '',
      keySections: Array.isArray(p.keySections) ? p.keySections : [],
      priority: p.priority || '',
    });
  }

  // 必备页兜底
  push({ path: '/', title: site?.name || 'Home', purpose: '首页：一句话价值主张 + 核心 CTA', keySections: ['Hero', 'Features', 'How it works', 'FAQ'] });
  if (!seen.has('/about')) push({ path: '/about', title: 'About', purpose: '关于：你是谁、为什么做这个产品', keySections: ['Our story', 'Team', 'Contact'] });

  const mon = monetizationKind(site);
  if (!mon.none && !seen.has('/pricing')) {
    push({ path: '/pricing', title: 'Pricing', purpose: '定价页：套餐对比与升级 CTA', keySections: ['Plans', 'Compare', 'FAQ'] });
  }

  // 调研长尾词 → 内容页（一个关键词一个页面）
  const kws: string[] = Array.isArray(research?.topKeywords) ? research.topKeywords : [];
  for (const kw of kws.slice(0, 6)) {
    const s = slugify(kw);
    push({
      path: '/guides/' + s,
      title: String(kw).replace(/\b\w/g, (c) => c.toUpperCase()),
      purpose: `长尾词内容页：覆盖「${kw}」`,
      targetQuery: kw,
      keySections: ['Quick answer', 'Step by step', 'FAQ'],
    });
  }

  if (!seen.has('/privacy')) push({ path: '/privacy', title: 'Privacy Policy', purpose: '隐私政策（上线上必需）', keySections: [] });
  if (!seen.has('/terms')) push({ path: '/terms', title: 'Terms of Service', purpose: '服务条款', keySections: [] });
  return pages;
}

function navHtml(currentFile: string, pages: ScaffoldPage[], site: any): string {
  const items = pages.filter((p) => ['/', '/about', '/pricing'].includes(p.path));
  const links = items
    .map((p) => {
      const href = relHref(currentFile, fileOf(p.path));
      const label = p.path === '/' ? 'Home' : esc(p.title);
      return `<a href="${href}">${label}</a>`;
    })
    .join('');
  return `<header class="site-header"><div class="wrap">
  <a class="brand" href="${relHref(currentFile, 'index.html')}">${esc(site?.name || 'Your Site')}</a>
  <nav class="site-nav">${links}</nav>
</div></header>`;
}

function footerHtml(currentFile: string, pages: ScaffoldPage[], site: any): string {
  const privacy = pages.find((p) => p.path === '/privacy');
  const terms = pages.find((p) => p.path === '/terms');
  const year = new Date().getFullYear();
  return `<footer class="site-footer"><div class="wrap">
  <div>© ${year} ${esc(site?.name || 'Your Site')}. All rights reserved.</div>
  <div class="footer-links">
    ${privacy ? `<a href="${relHref(currentFile, fileOf(privacy.path))}">Privacy</a>` : ''}
    ${terms ? `<a href="${relHref(currentFile, fileOf(terms.path))}">Terms</a>` : ''}
  </div>
</div></footer>`;
}

function pricingCards(profile: any): string {
  const tiers = Array.isArray(profile?.pricingTiers) ? profile.pricingTiers : [];
  if (!tiers.length) {
    return `<div class="card"><h3>Free</h3><p class="price">$0</p><ul><li>Core feature</li></ul>
      <a class="btn" href="#">Get started</a></div>
      <div class="card featured"><h3>Pro</h3><p class="price">$9<span>/mo</span></p><ul><li>Everything in Free</li><li>Advanced features</li></ul>
      <a class="btn" href="#">Upgrade</a></div>`;
  }
  return tiers
    .slice(0, 4)
    .map((t: any, i: number) => {
      const feats = Array.isArray(t.features) ? t.features.map((f: string) => `<li>${esc(f)}</li>`).join('') : '';
      return `<div class="card${i === 1 ? ' featured' : ''}">
        <h3>${esc(t.name || 'Plan')}</h3>
        <p class="price">${esc(t.price || '$0')}${t.billing ? `<span>/${esc(t.billing)}</span>` : ''}</p>
        <ul>${feats}</ul>
        ${t.bestFor ? `<p class="bestfor">适合：${esc(t.bestFor)}</p>` : ''}
        <a class="btn" href="#">${i === 0 ? 'Get started' : 'Choose plan'}</a>
      </div>`;
    })
    .join('');
}

function adSlot(mon: any, placement: string): string {
  if (!mon.ads) return '';
  return `<!-- AdSense 广告位（${placement}）：上线后把 data-ad-client / data-ad-slot 换成你的值 -->
<div class="ad-slot" data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="${placement}">Ad slot · ${placement}</div>`;
}

/** 生成单个页面的 HTML */
function pageHtml(site: any, page: ScaffoldPage, pages: ScaffoldPage[], profile: any): string {
  const file = fileOf(page.path);
  const domain = String(site?.domain || 'example.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const origin = 'https://' + domain;
  const isHome = page.path === '/';
  const title = siteTitle(site, page);
  const description = siteDesc(site, page);
  const canonical = origin + (isHome ? '/' : page.path);
  const mon = monetizationKind(site);
  const lang = langOf(site);

  const sections = (page.keySections || []).length
    ? page.keySections!
    : ['Overview', 'Details', 'FAQ'];

  let body = '';
  if (page.path === '/privacy') {
    body = `<h1>Privacy Policy</h1>
      <p class="muted">Last updated: ${new Date().toISOString().slice(0, 10)}</p>
      <h2>What we collect</h2><p>[待补充：列出你实际收集的数据，如访问统计、邮箱、支付信息]</p>
      <h2>How we use it</h2><p>[待补充：用途说明]</p>
      <h2>Your rights</h2><p>[待补充：按面向地区 ${esc(site?.region || '')} 写明删除/导出/退订权利与联系方式]</p>
      <h2>Contact</h2><p>[待补充：联系邮箱]</p>`;
  } else if (page.path === '/terms') {
    body = `<h1>Terms of Service</h1>
      <p class="muted">Last updated: ${new Date().toISOString().slice(0, 10)}</p>
      <h2>Use of service</h2><p>[待补充：使用规则]</p>
      <h2>Payments & refunds</h2><p>[待补充：按「${esc(mon.label)}」写明计费、续费与退款政策]</p>
      <h2>Liability</h2><p>[待补充：责任限制]</p>`;
  } else if (page.path === '/pricing') {
    const plan = profile?.monetizationPlan;
    const planText = Array.isArray(plan) ? plan.map((x: string) => `<li>${esc(x)}</li>`).join('') : (plan ? `<p>${esc(plan)}</p>` : '');
    body = `<h1>Pricing</h1>
      <p class="lead">${esc(site?.positioning || 'Choose the plan that fits how you work.')}</p>
      ${adSlot(mon, 'pricing-top')}
      <div class="pricing-grid">${pricingCards(profile)}</div>
      ${planText ? `<h2>为什么值得升级</h2><ul>${planText}</ul>` : ''}
      <h2>FAQ</h2>
      <details><summary>Can I cancel anytime?</summary><p>[待补充]</p></details>
      <details><summary>Do you offer refunds?</summary><p>[待补充]</p></details>`;
  } else if (isHome) {
    const pos = String(site?.positioning || '');
    const hero = pos && (langOf(site) === 'zh-CN' || !hasCJK(pos))
      ? pos
      : `${site?.name || 'Your Site'} — ${langOf(site) === 'zh-CN' ? (site?.siteType || '一个简单好用的工具') : withArticle(siteTypeEn(site)) + ' that gets the job done'}`;
    body = `<section class="hero">
        <h1>${esc(hero)}</h1>
        <p class="lead">${esc(description)}</p>
        <div class="cta-row">
          <a class="btn" href="${relHref(file, fileOf('/pricing'))}">${mon.subscription || mon.oneTime ? 'See pricing' : 'Get started'}</a>
          <a class="btn ghost" href="${relHref(file, fileOf('/about'))}">Learn more</a>
        </div>
      </section>
      ${adSlot(mon, 'home-top')}
      <section class="features">
        ${sections.map((s) => `<div class="feature"><h3>${esc(s)}</h3><p>[待补充：用 1-2 句讲清这个卖点，最好带具体结果数字]</p></div>`).join('')}
      </section>`;
  } else {
    body = `<article>
      <h1>${esc(page.title)}</h1>
      <p class="lead">${esc(page.purpose || '')}</p>
      ${adSlot(mon, 'article-top')}
      ${sections.map((s) => `<h2>${esc(s)}</h2><p>[待补充：围绕${page.targetQuery ? `「${esc(page.targetQuery)}」` : '本页主题'}写 120-200 字，先给结论再展开]</p>`).join('')}
      ${page.targetQuery ? `<p class="muted">目标关键词：${esc(page.targetQuery)}</p>` : ''}
      ${adSlot(mon, 'article-bottom')}
    </article>`;
  }

  const jsonLd = isHome
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site?.name,
        url: origin + '/',
        description,
      }
    : page.path === '/pricing'
      ? { '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, url: canonical, isPartOf: { '@type': 'WebSite', name: site?.name, url: origin + '/' } }
      : { '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, url: canonical };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:type" content="${isHome ? 'website' : 'article'}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="stylesheet" href="${relHref(file, 'assets/style.css')}" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
${navHtml(file, pages, site)}
<main class="wrap">${body}</main>
${footerHtml(file, pages, site)}
</body>
</html>
`;
}

const STYLE_CSS = `:root{--bg:#fbfaf7;--fg:#16131b;--muted:#5e5866;--line:#e6e1d8;--accent:#5b34e6;--card:#fff}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--fg);background:var(--bg);line-height:1.65}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
a{color:var(--accent)}
.site-header{position:sticky;top:0;background:rgba(251,250,247,.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:10}
.site-header .wrap{display:flex;align-items:center;justify-content:space-between;height:60px}
.brand{font-weight:800;font-size:17px;color:var(--fg);text-decoration:none;letter-spacing:-.01em}
.site-nav{display:flex;gap:18px}
.site-nav a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:600}
.site-nav a:hover{color:var(--accent)}
main{padding:44px 0 64px}
.hero h1{font-size:clamp(28px,5vw,44px);line-height:1.12;letter-spacing:-.02em;margin:0 0 14px}
.lead{font-size:17px;color:var(--muted);max-width:680px}
.cta-row{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0 8px}
.btn{display:inline-block;padding:12px 22px;border-radius:12px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700}
.btn.ghost{background:transparent;color:var(--accent);border:1px solid var(--line)}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:36px}
.feature,.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px}
.feature h3{margin:0 0 6px}
article h2{margin-top:34px}
.ad-slot{margin:24px 0;padding:18px;text-align:center;color:var(--muted);font-size:12px;border:1px dashed var(--line);border-radius:12px;background:#fff}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin:26px 0}
.card .price{font-size:32px;font-weight:800;margin:8px 0}
.card .price span{font-size:14px;color:var(--muted);font-weight:600}
.card ul{padding-left:18px;color:var(--muted)}
.card.featured{border-color:var(--accent);box-shadow:0 12px 30px rgba(91,52,230,.14)}
.card .btn{margin-top:14px;width:100%;text-align:center}
.bestfor{font-size:12.5px;color:var(--muted)}
details{border-bottom:1px solid var(--line);padding:10px 0}
summary{cursor:pointer;font-weight:700}
.muted{color:var(--muted)}
.site-footer{border-top:1px solid var(--line);color:var(--muted);font-size:13px}
.site-footer .wrap{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:22px;padding-bottom:22px}
.footer-links{display:flex;gap:14px}
@media(max-width:600px){.site-nav{gap:12px;font-size:13px}main{padding:28px 0 48px}}
`;

function sitemapXml(site: any, pages: ScaffoldPage[]): string {
  const domain = String(site?.domain || 'example.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>https://${domain}${p.path === '/' ? '/' : p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.path === '/' ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${p.path === '/' ? '1.0' : '0.7'}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function robotsTxt(site: any): string {
  const domain = String(site?.domain || 'example.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `User-agent: *
Allow: /

# 允许 AI 搜索爬虫抓取（做 GEO / AI 引用时保留；不想被引用就改成 Disallow: /）
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;
}

function llmsTxt(site: any, pages: ScaffoldPage[], profile: any): string {
  const domain = String(site?.domain || 'example.com').replace(/^https?:\/\//, '');
  const zh = langOf(site) === 'zh-CN';
  const intro = (() => {
    const pos = String(site?.positioning || '');
    if (pos && (zh || !hasCJK(pos))) return pos.slice(0, 300);
    const prof = String(profile?.productProfile || '');
    if (prof && (zh || !hasCJK(prof))) return prof.slice(0, 300);
    return `${site?.name || 'This site'} — ${zh ? (site?.siteType || '一个简单好用的工具') : withArticle(siteTypeEn(site))}.`;
  })();
  const lines = [
    `# ${site?.name || 'Your Site'}`,
    '',
    `> ${intro}`,
    '',
    '## Pages',
    ...pages.map((p) => {
      const desc = zh
        ? (p.purpose || p.title)
        : (p.targetQuery ? `Covers "${p.targetQuery}" with quick answers and step-by-step guidance.` : `${p.title} page.`);
      return `- [${p.title}](https://${domain}${p.path === '/' ? '/' : p.path}): ${desc.slice(0, 100)}`;
    }),
    '',
    '## Notes',
    '- Content is written for humans first; cite the page URL when quoting.',
    '',
  ];
  return lines.join('\n');
}

export function buildScaffold(input: ScaffoldInput): { files: ScaffoldFile[]; pages: ScaffoldPage[] } {
  const { site, profile } = input;
  const research = input.research || profile?.research || null;
  const pages = buildPages(site, profile || {}, research);
  const mon = monetizationKind(site);
  const files: ScaffoldFile[] = [];

  for (const p of pages) {
    files.push({ path: fileOf(p.path), content: pageHtml(site, p, pages, profile || {}) });
  }
  files.push({ path: 'assets/style.css', content: STYLE_CSS });
  files.push({ path: 'sitemap.xml', content: sitemapXml(site, pages) });
  files.push({ path: 'robots.txt', content: robotsTxt(site) });
  files.push({ path: 'llms.txt', content: llmsTxt(site, pages, profile || {}) });

  files.push({
    path: '404.html',
    content: `<!doctype html>
<html lang="${langOf(site)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>404 · Not Found</title>
<link rel="stylesheet" href="assets/style.css" />
</head>
<body>
${navHtml('404.html', pages, site)}
<main class="wrap">
  <h1>404 · Page not found</h1>
  <p class="muted">这个页面不存在或已移动。返回 <a href="index.html">首页</a>。</p>
</main>
${footerHtml('404.html', pages, site)}
</body>
</html>
`,
  });

  files.push({
    path: '_headers',
    content: `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
`,
  });

  files.push({
    path: 'netlify.toml',
    content: `[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`,
  });

  files.push({
    path: 'package.json',
    content: JSON.stringify(
      {
        name: slugify(site?.name || 'my-site'),
        private: true,
        version: '0.1.0',
        description: String(site?.positioning || '').slice(0, 200),
        scripts: {
          dev: 'npx serve . -l 3000',
          deploy: 'npx wrangler pages deploy . --project-name=' + slugify(site?.name || 'my-site'),
        },
      },
      null,
      2,
    ) + '\n',
  });

  files.push({
    path: 'README.md',
    content: `# ${site?.name || 'Your Site'}

> 由 SEO/GEO Studio 自动生成的静态站点工程，可直接部署。

## 这套工程包含什么

| 文件 | 说明 |
| --- | --- |
| \`index.html\` | 首页（含 Hero + 卖点 + CTA） |
${pages
  .filter((p) => p.path !== '/')
  .map((p) => `| \`${fileOf(p.path)}\` | ${p.title}${p.targetQuery ? `（目标词：${p.targetQuery}）` : ''} |`)
  .join('\n')}
| \`assets/style.css\` | 全站样式（响应式，无需构建） |
| \`sitemap.xml\` / \`robots.txt\` | 给 Google / Bing 的收录文件 |
| \`llms.txt\` | 给 AI 搜索引擎（ChatGPT / Perplexity）的站点说明 |
| \`_headers\` / \`netlify.toml\` | Cloudflare Pages / Netlify 的安全响应头 |
| \`404.html\` | 404 兜底页 |

## 收费模式

当前模式：**${mon.label}**
${mon.ads ? '- 已在页面中预留广告位（`data-ad-client` 需替换为你的 AdSense ID）。' : ''}
${mon.subscription || mon.oneTime ? '- 已生成 `/pricing` 定价页，套餐来自建档时的定价设计。' : ''}
${mon.none ? '- 当前未设计变现，可后续在「创建站点」里修改收费模式重新生成。' : ''}

## 上线前必须替换的占位内容

1. 所有 \`[待补充]\` 文本 → 你的真实内容
2. \`sitemap.xml\` / \`llms.txt\` / 各页 canonical 里的域名 → 你的真实域名（当前为 \`${String(site?.domain || 'example.com').replace(/^https?:\/\//, '')}\`）
3. AdSense 的 \`ca-pub-XXXXXXXXXXXXXXXX\`（如投放广告）
4. 隐私政策 / 服务条款的真实条款（涉及面向地区 ${site?.region || '合规'}）

## 本地预览

\`\`\`bash
npx serve . -l 3000
# 或
python -m http.server 3000
\`\`\`

## 部署

**Cloudflare Pages（推荐，免费 + 全球 CDN）**
\`\`\`bash
npm i -g wrangler
wrangler pages deploy . --project-name=${slugify(site?.name || 'my-site')}
\`\`\`

**Netlify**：把本目录拖到 Netlify Drop，或用 \`netlify deploy --prod\`。

**Vercel**：\`vercel --prod\`（Framework 选 Other，输出目录填 \`.\`）。

上线后到 Google Search Console / Bing Webmaster 提交 \`https://${String(site?.domain || 'example.com').replace(/^https?:\/\//, '')}/sitemap.xml\`。
`,
  });

  return { files, pages };
}
