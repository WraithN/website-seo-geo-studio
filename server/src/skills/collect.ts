// 真实数据采集层：为技能执行提供「真实世界信号」。
// 设计原则：多源降级 + 来源标注。每个数据点都带 provenance（real / estimated），
// 拿不到真实数据时不伪造，而是明确标记 estimated —— 符合 SKILL.md 的方法论要求。

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

export interface Collected {
  /** 采集到的原始联想词/相关词 */
  suggestions: { term: string; source: string }[];
  /** 采集来源与是否真实 */
  provenance: { source: string; ok: boolean; note: string }[];
  /** 是否至少拿到一份真实数据 */
  hasRealData: boolean;
}

async function fetchWithTimeout(url: string, ms = 8000, headers: any = {}): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: ctrl.signal });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.toString('utf-8');
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** 百度联想词：返回 GBK 编码的 JSONP，需转码后正则提取。 */
async function baiduSuggest(seed: string): Promise<string[]> {
  const url = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(seed)}&p=3&cb=window.baidu.sug`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: 'https://www.baidu.com/' },
      signal: ctrl.signal,
    });
    if (!r.ok) return [];
    const buf = Buffer.from(await r.arrayBuffer());
    // 百度返回 GBK；Node 的 TextDecoder 在 full-icu 下支持 gbk
    let text = '';
    try {
      text = new TextDecoder('gbk').decode(buf);
    } catch {
      text = buf.toString('utf-8'); // 降级：可能乱码，但不会崩
    }
    const m = text.match(/s\s*:\s*\[([^\]]*)\]/);
    if (!m) return [];
    return m[1]
      .split(',')
      .map((s) => s.replace(/^["'\s]+|["'\s]+$/g, ''))
      .filter((s) => s && s.length > 1 && !/[\ufffd]/.test(s)); // 剔除乱码
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/** DuckDuckGo 联想词（海外词更准；本机网络不通时自动返回空）。 */
async function ddgSuggest(seed: string): Promise<string[]> {
  const txt = await fetchWithTimeout(
    `https://duckduckgo.com/ac/?q=${encodeURIComponent(seed)}&type=list`,
    8000,
  );
  if (!txt) return [];
  try {
    const j = JSON.parse(txt);
    if (Array.isArray(j?.[1])) return j[1].filter((x: any) => typeof x === 'string');
  } catch {
    const m = txt.match(/"([^"]{2,60})"/g);
    if (m) return m.map((s) => s.replace(/"/g, ''));
  }
  return [];
}

/** 必应联想词（备用海外源）。 */
async function bingSuggest(seed: string): Promise<string[]> {
  const txt = await fetchWithTimeout(
    `https://www.bing.com/AS/Suggestions?pt=page.home&mkt=en-us&qry=${encodeURIComponent(seed)}`,
    8000,
  );
  if (!txt) return [];
  const out = new Set<string>();
  const re = />([^<>]{3,80})</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt))) {
    const s = m[1].trim();
    if (s && !s.includes('=') && !s.includes('http')) out.add(s);
  }
  return [...out].slice(0, 20);
}

export interface CollectOptions {
  /** 额外种子词（如竞品名、上游产出的主词） */
  extraSeeds?: string[];
  /** 是否尝试联网采集（关闭则全部标记 estimated） */
  online?: boolean;
  /** 是否先尝试 n8n 采集通道（n8n 内可配代理/API key，拿到本地拿不到的数据） */
  useN8n?: boolean;
  market?: string;
  lang?: string;
}

const N8N_BASE = (process.env.N8N_BASE || 'http://127.0.0.1:5678').replace('localhost', '127.0.0.1');

/**
 * n8n 采集通道：触发 keyword-research 工作流的 webhook 取真实数据。
 * n8n 侧可配置代理或第三方 API（Ahrefs/SerpAPI 等），从而拿到本地网络不可达的源。
 * 工作流未激活时静默返回空，由上层降级到本地采集 —— 不影响主流程。
 */
export async function n8nCollect(
  seed: string,
  opts: { market?: string; lang?: string; timeoutMs?: number } = {},
): Promise<{ terms: string[]; ok: boolean; note: string }> {
  const url = `${N8N_BASE}/webhook/keyword-research`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed,
        market: opts.market || 'us',
        lang: opts.lang || 'en',
        jobId: 'studio-' + Date.now(),
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { terms: [], ok: false, note: `n8n webhook ${r.status}（工作流未激活）` };
    const txt = await r.text();
    let j: any = null;
    try {
      j = JSON.parse(txt);
    } catch {
      return { terms: [], ok: false, note: 'n8n 返回非 JSON' };
    }
    // 兼容多种回包形态：{terms:[...]} / {suggestions:[...]} / [{...}] / {data:{...}}
    const cand = j?.terms || j?.suggestions || j?.keywords || j?.data?.terms || (Array.isArray(j) ? j : null);
    if (!Array.isArray(cand)) return { terms: [], ok: false, note: 'n8n 回包无词表' };
    const terms = cand
      .map((x: any) => (typeof x === 'string' ? x : x?.term || x?.keyword || x?.q || ''))
      .filter((s: string) => s && s.length > 1);
    return { terms, ok: terms.length > 0, note: terms.length ? `n8n 返回 ${terms.length} 条` : 'n8n 返回空词表' };
  } catch (e: any) {
    return { terms: [], ok: false, note: `n8n 不可用：${e?.message || e}` };
  } finally {
    clearTimeout(t);
  }
}

/**
 * 采集种子词的相关词。始终返回结果；真实源不可用时 hasRealData=false，
 * 由上层用 LLM 生成并用 estimated 标注，绝不静默伪造为真实数据。
 */
export async function collectSignals(seed: string, opts: CollectOptions = {}): Promise<Collected> {
  const provenance: Collected['provenance'] = [];
  const suggestions: Collected['suggestions'] = [];
  const seeds = [seed, ...(opts.extraSeeds || [])].filter(Boolean).slice(0, 5);
  const online = opts.online !== false;

  if (!online) {
    provenance.push({ source: 'offline', ok: false, note: '已关闭联网采集' });
    return { suggestions, provenance, hasRealData: false };
  }

  // 优先走 n8n 采集通道（n8n 内可配代理/第三方 API，能拿到本地网络不可达的源）
  if (opts.useN8n) {
    const n = await n8nCollect(seeds[0], { market: opts.market, lang: opts.lang });
    provenance.push({ source: 'n8n', ok: n.ok, note: n.note });
    if (n.ok) {
      for (const t of n.terms) suggestions.push({ term: t, source: 'n8n' });
      return { suggestions, provenance, hasRealData: true };
    }
    // n8n 不可用则继续走本地采集
  }

  // 三个源并发采集，任一成功即有真实数据
  const jobs = [
    { name: 'baidu-suggest', fn: () => baiduSuggest(seeds[0]) },
    { name: 'ddg-suggest', fn: () => ddgSuggest(seeds[0]) },
    { name: 'bing-suggest', fn: () => bingSuggest(seeds[0]) },
  ];
  const results = await Promise.all(
    jobs.map(async (j) => {
      try {
        const terms = await j.fn();
        provenance.push({
          source: j.name,
          ok: terms.length > 0,
          note: terms.length ? `采集 ${terms.length} 条` : '无返回（网络/被墙）',
        });
        return terms;
      } catch (e: any) {
        provenance.push({ source: j.name, ok: false, note: e?.message || '失败' });
        return [] as string[];
      }
    }),
  );

  const seen = new Set<string>();
  for (const terms of results) {
    for (const t of terms) {
      const k = t.toLowerCase().trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      suggestions.push({ term: t.trim(), source: 'real' });
    }
  }

  return {
    suggestions,
    provenance,
    hasRealData: suggestions.length > 0,
  };
}

/** 抓取页面 HTML（用于技术 SEO 审计、竞品页面分析）。 */
export async function fetchPage(url: string, ms = 15000): Promise<{ ok: boolean; html?: string; error?: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    clearTimeout(t);
    const html = await r.text();
    return { ok: r.ok, html, error: r.ok ? undefined : `HTTP ${r.status}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'fetch failed' };
  }
}

/** 从 HTML 提取技术 SEO 事实（title/meta/canonical/h1/结构化数据/llms.txt 线索）。
 *  这些是**确定性事实**，不用 LLM 猜 —— 审计类技能的可信度基础。 */
export function extractSeoFacts(html: string, url: string) {
  const pick = (re: RegExp): string => {
    const m = html.match(re);
    return m ? m[1].trim() : '';
  };
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDesc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const robotsMeta = pick(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  const viewport = pick(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i);
  const lang = pick(/<html[^>]+lang=["']([^"']*)["']/i);
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []).map((s) =>
    s.replace(/<[^>]+>/g, '').trim(),
  );
  const h2 = (html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []).map((s) =>
    s.replace(/<[^>]+>/g, '').trim(),
  );
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgsNoAlt = imgs.filter((i) => !/\balt\s*=\s*["'][^"']+["']/i.test(i)).length;
  const jsonLd = (html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []).length;
  const hasLlmsTxt = /llms\.txt/i.test(html);
  const hasSitemapHint = /sitemap/i.test(html);
  const https = /^https:\/\//i.test(url);
  const textLen = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;

  return {
    url,
    https,
    title,
    titleLen: title.length,
    metaDesc,
    metaDescLen: metaDesc.length,
    canonical: canonical || '(缺失)',
    robotsMeta: robotsMeta || '(无)',
    viewport: viewport || '(缺失)',
    lang: lang || '(缺失)',
    h1,
    h1Count: h1.length,
    h2Count: h2.length,
    imgCount: imgs.length,
    imgsMissingAlt: imgsNoAlt,
    jsonLdCount: jsonLd,
    hasLlmsTxt,
    hasSitemapHint,
    textLen,
  };
}
