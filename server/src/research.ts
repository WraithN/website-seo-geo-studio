/**
 * 关键词需求调研引擎（阶段 0）—— TypeScript 移植版。
 * 零付费依赖：默认用 Google Suggest / DuckDuckGo 自动补全 / Google SERP（公开免费信号）。
 * 会员 API / 视觉模型为可选增强，未配置时优雅降级。
 * 输出与原有 bridge↔n8n 回调一致：六维雷达 + 长尾词机会 + 指标佐证。
 */

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './db.js';

const OFFLINE = (process.env.RESEARCH_OFFLINE || '').toLowerCase() === '1' || (process.env.RESEARCH_OFFLINE || '') === 'true';
const TIMEOUT_MS = parseInt(process.env.RESEARCH_TIMEOUT_MS || '12000', 10);

// 品牌 / 大站域名（出现在 SERP 前排通常意味着竞争激烈）
const BRAND_DOMAINS = [
  'wikipedia.org', 'youtube.com', 'amazon.com', 'pinterest.com', 'reddit.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
  'quora.com', 'wikihow.com', 'google.com', 'bing.com', 'yelp.com',
  'tripadvisor.com', 'linkedin.com', 'medium.com', 'github.com', 'imdb.com',
];

// 免费源取不到真实 CPC 时，按泛品类给经验默认 CPC（美元，仅用于相对排序）
const DEFAULT_CPC_BY_CATEGORY: Record<string, number> = {
  finance: 3.5, insurance: 4.0, loan: 4.5, crypto: 2.5, saas: 3.0, software: 2.8,
  marketing: 3.2, health: 2.2, fitness: 1.8, beauty: 1.5, fashion: 1.4, travel: 1.6,
  education: 2.0, legal: 3.8, realestate: 2.6, tech: 2.4, game: 1.2, music: 1.0,
  ukulele: 0.9, general: 1.5,
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// 离线兜底样例
const FIXTURES: Record<string, any> = {
  'ukulele chord trainer': {
    suggestions: [
      'ukulele chord trainer app', 'ukulele chord trainer online', 'ukulele chord trainer free',
      'ukulele chord trainer for beginners', 'best ukulele chord trainer', 'ukulele chord trainer ios',
      'ukulele chord trainer android', 'how to use ukulele chord trainer', 'ukulele chord trainer with strumming',
      'ukulele chord trainer vs tabs', 'ukulele chord trainer offline', 'ukulele chord trainer metronome',
      'ukulele chord progression trainer', 'ukulele chord trainer game', 'ukulele chord trainer song',
      'ukulele chord trainer tutorial', 'ukulele chord trainer download', 'ukulele chord trainer apk',
    ],
    serp: {
      results_count: 4280000,
      top_domains: ['youtube.com', 'ukutabs.com', 'ultimate-guitar.com', 'reddit.com', 'apps.apple.com',
        'play.google.com', 'wikihow.com', 'guitarworld.com', 'ukuleleka.blogspot.com', 'coustii.com'],
      ads_present: true, inner_page_ratio: 0.4, brand_in_top: 4,
    },
  },
};

function fixtureFor(seed: string) {
  const key = seed.toLowerCase().trim();
  if (FIXTURES[key]) return FIXTURES[key];
  const base = seed.trim();
  return {
    suggestions: [`${base} app`, `${base} online`, `${base} free`, `${base} for beginners`,
      `best ${base}`, `${base} tutorial`, `${base} vs`, `${base} review`, `${base} tool`, `${base} guide`],
    serp: {
      results_count: 1200000,
      top_domains: ['youtube.com', 'reddit.com', 'pinterest.com', 'medium.com', 'quora.com',
        'wikihow.com', 'a-small-blog.example.com', 'niche-site.example.com', 'indie-tool.example.com', 'forum.example.com'],
      ads_present: true, inner_page_ratio: 0.5, brand_in_top: 3,
    },
  };
}

// 字母汤 + 疑问词 + 修饰词，用于把种子词扩展成长尾簇
const MODIFIERS: string[] = [].concat(
  [''], 'abcdefghijklmnopqrstuvwxyz'.split(''), ['0', '1', '2', '3', '4', '5'],
  ['how to', 'what is', 'best', 'top', 'cheap', 'free', 'near me', 'for beginners', 'vs',
    'alternative', 'review', 'diy', 'guide', 'online', 'app', 'tool', 'examples', 'tips'],
);

async function fetchText(url: string, timeoutMs = TIMEOUT_MS): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return await r.text();
  } catch { return null; }
}

export async function googleSuggest(seed: string, market = 'us', lang = 'en'): Promise<string[]> {
  if (OFFLINE) return fixtureFor(seed).suggestions.slice();
  const out: string[] = [];
  for (const m of MODIFIERS) {
    const q = m ? `${seed} ${m}`.trim() : seed;
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&gl=${market}&hl=${lang}&q=${encodeURIComponent(q)}`;
    const raw = await fetchText(url);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
        for (const s of data[1]) {
          if (typeof s === 'string' && s.toLowerCase() !== seed.toLowerCase()) out.push(s);
        }
      }
    } catch { /* ignore */ }
  }
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const s of out) {
    const k = s.toLowerCase().trim();
    if (k && !seen.has(k)) { seen.add(k); uniq.push(s); }
  }
  return uniq;
}

export async function ddgSuggest(seed: string): Promise<string[]> {
  if (OFFLINE) return [];
  const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(seed)}`;
  const raw = await fetchText(url);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return data.filter((d: any) => d && d.phrase).map((d: any) => d.phrase);
  } catch { return []; }
}

function brandCount(domains: string[]): number {
  return domains.filter((d) => BRAND_DOMAINS.some((b) => d.includes(b))).length;
}

export function parseSerp(html: string): any {
  const res = { results_count: 0, top_domains: [] as string[], ads_present: false, inner_page_ratio: 0, brand_in_top: 0 };
  const m = html.match(/(?:About|约)?\s*([\d,]+)\s*(?:results|条结果)/i);
  if (m) { try { res.results_count = parseInt(m[1].replace(/,/g, ''), 10); } catch { /* */ } }
  res.ads_present = /data-text-ad|class="ads-ad"|赞助|广告|Ad\s*·|ad__"/i.test(html);
  const hrefs = [...html.matchAll(/href="(\/url\?q=|https:\/\/)([^"&]+)/g)];
  const domains: string[] = [];
  for (const [, , url] of hrefs) {
    const host = url.startsWith('http') ? url.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
      : url.split('/')[0].toLowerCase();
    if (host && host.includes('.') && !host.includes('google')) domains.push(host);
  }
  const seen = new Set<string>();
  const top: string[] = [];
  for (const d of domains) { if (!seen.has(d)) { seen.add(d); top.push(d); } if (top.length >= 10) break; }
  res.top_domains = top;
  res.brand_in_top = brandCount(top);
  const nonBrand = top.filter((d) => !BRAND_DOMAINS.some((b) => d.includes(b)));
  res.inner_page_ratio = Math.round((nonBrand.length / Math.max(top.length, 1)) * 100) / 100;
  return res;
}

export async function serpViaHttp(seed: string, market = 'us', lang = 'en'): Promise<[any, string | null]> {
  if (OFFLINE) return [JSON.parse(JSON.stringify(fixtureFor(seed).serp)), null];
  const url = `https://www.google.com/search?q=${encodeURIComponent(seed)}&gl=${market}&hl=${lang}&num=10&pws=0`;
  const html = await fetchText(url, TIMEOUT_MS + 3000);
  if (!html) return [null, null];
  return [parseSerp(html), html];
}

// ---------- 视觉模型提取（Similarweb / Semrush 截图） ----------
function visionCfg(): [string, string, string] | null {
  const env = (n: string, d = '') => process.env[n] || d;
  let key = env('VISION_LLM_API_KEY');
  let base = env('VISION_LLM_BASE_URL');
  let model = env('VISION_LLM_MODEL');
  if (!key) {
    const chatKey = env('CHAT_LLM_API_KEY') || env('LLM_API_KEY') || env('OPENAI_API_KEY');
    const chatModel = (env('CHAT_LLM_MODEL') || '').toLowerCase();
    const hints = ['4o', '4-v', 'glm-4v', 'qwen-vl', 'vision', '-vl', 'gemini', 'pixtral', 'internvl', 'minicpm-v'];
    if (chatKey && hints.some((h) => chatModel.includes(h))) { key = chatKey; model = model || chatModel; }
  }
  if (!key) return null;
  base = (base || env('CHAT_LLM_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');
  return [key, base, model || 'gpt-4o-mini'];
}

const EXTRACT_SYSTEM = `你是流量数据分析助手。用户会提供 Similarweb / Semrush / Google Search Console 等分析工具的截图。请提取图中可见的关键指标，输出严格 JSON（不要 markdown 代码块、不要解释）：
{"monthlyVisits": null, "visitsTrendPct": null, "bounceRate": null, "pagesPerVisit": null, "avgVisitDurationSeconds": null, "trafficSources": {"organic": null, "direct": null, "social": null, "referral": null, "paid": null}, "topKeywords": [], "globalRank": null, "countryRank": null, "authority": null, "note": ""}
规则：数值用阿拉伯数字；百分数去掉 %；停留时长统一换算成秒；趋势百分比保留正负号；图中没有的字段填 null，不要编造。只输出 JSON。`;

export async function extractMetricsFromScreenshots(images: { name: string; data_url: string }[]): Promise<[any | null, string]> {
  const cfg = visionCfg();
  if (!cfg || !images.length) {
    return [null, '未配置视觉模型（VISION_LLM_API_KEY），截图仅存档；可手填指标参与分析，或配置 glm-4v-flash / qwen-vl-plus 等多模态模型后自动提取。'];
  }
  const [key, base, model] = cfg;
  const content: any[] = [{ type: 'text', text: '请提取这些流量分析截图中的指标 JSON。' }];
  for (const im of images.slice(0, 3)) content.push({ type: 'image_url', image_url: { url: im.data_url } });
  const payload = { model, temperature: 0, messages: [
    { role: 'system', content: EXTRACT_SYSTEM },
    { role: 'user', content },
  ] };
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90000),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const mm = text.match(/\{[\s\S]*\}/);
    if (!mm) return [null, '视觉模型未返回 JSON，截图仅存档。'];
    const metrics = JSON.parse(mm[0]);
    if (typeof metrics !== 'object' || !metrics) return [null, '视觉模型返回格式异常，截图仅存档。'];
    return [metrics, `已从 ${Math.min(images.length, 3)} 张截图提取指标（模型 ${model}）`];
  } catch (e: any) {
    return [null, `截图指标提取失败（${(e?.message || '').slice(0, 80)}），已存档，可改用手填指标。`];
  }
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(/,/g, '').replace(/%/g, '').trim());
  return isNaN(n) ? null : n;
}

export function trafficQuality(ev: any): number | null {
  if (!ev) return null;
  const bounce = num(ev.bounceRate);
  const pages = num(ev.pagesPerVisit);
  const dur = num(ev.avgVisitDurationSeconds);
  const parts: number[] = [];
  if (bounce !== null) parts.push(Math.max(0, Math.min(100, 100 - bounce)));
  if (pages !== null) parts.push(Math.max(0, Math.min(100, pages * 32)));
  if (dur !== null) parts.push(Math.max(0, Math.min(100, dur / 3)));
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;
}

function radarSvg(axes: { name: string; score: number }[], size = 268): string {
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 46;
  const n = axes.length;
  const pt = (i: number, frac: number) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * frac * Math.cos(ang), cy + r * frac * Math.sin(ang)];
  };
  const grid: string[] = [];
  for (const frac of [0.25, 0.5, 0.75, 1.0]) {
    const pts = axes.map((_, i) => pt(i, frac).map((x) => x.toFixed(1)).join(',')).join(' ');
    grid.push(`<polygon points="${pts}" fill="none" stroke="rgba(91,52,230,.16)" stroke-width="1"/>`);
  }
  const spokes: string[] = [];
  const labels: string[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, 1.0);
    spokes.push(`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(91,52,230,.18)" stroke-width="1"/>`);
    const [lx, ly] = pt(i, 1.22);
    const score = Math.round(axes[i].score);
    labels.push(
      `<text x="${lx.toFixed(1)}" y="${(ly - 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#3b3145">${axes[i].name}</text>` +
      `<text x="${lx.toFixed(1)}" y="${(ly + 10).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#5b34e6">${score}</text>`,
    );
  }
  const f = (i: number) => Math.max(0.02, axes[i].score / 100);
  const dataPts = axes.map((_, i) => pt(i, f(i)).map((x) => x.toFixed(1)).join(',')).join(' ');
  const dots = axes.map((_, i) => { const [x, y] = pt(i, f(i)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#5b34e6"/>`; }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="auto" role="img" aria-label="六维雷达图" style="max-width:320px;display:block;margin:0 auto">` +
    `<rect width="${size}" height="${size}" fill="none"/>` + grid.join('') + spokes.join('') +
    `<polygon points="${dataPts}" fill="rgba(91,52,230,.22)" stroke="#5b34e6" stroke-width="2" stroke-linejoin="round"/>` +
    dots + labels.join('') + '</svg>';
}

const INTENT_RULES: [RegExp, string, string, number][] = [
  [/^(how to|what is|what are|why |guide|tutorial|learn)/, 'informational', '教程 / 科普页', 55],
  [/^(best|top |vs |versus|alternative|compare|comparison|review)/, 'comparative', '对比 / 榜单页', 72],
 [/(free|online|download|app|pricing|price|cost|buy|tool|generator|checker)/, 'transactional', '工具页 / 落地页', 82],
  [/(免费|在线|下载|工具|价格|收费|哪个好|对比|评测)/, 'transactional', '工具页 / 落地页', 82],
  [/(教程|入门|怎么|如何|什么是|为什么)/, 'informational', '教程 / 科普页', 55],
];

function classifyIntent(kw: string): [string, string, number] {
  const low = kw.toLowerCase();
  for (const [pat, intent, page, val] of INTENT_RULES) {
    if (pat.test(low)) return [intent, page, val];
  }
  return ['informational', '专题内容页', 55];
}

function longtail(seed: string, suggestions: string[], baseDifficulty: number, evidence: any): any[] {
  const items: any[] = [];
  const seen = new Set<string>();
  const add = (kw: string, source: string, volHint: number) => {
    kw = kw.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!kw || seen.has(kw) || kw === seed.toLowerCase()) return;
    seen.add(kw);
    const [intent, page, intentVal] = classifyIntent(kw);
    const extraWords = Math.max(0, kw.split(' ').length - seed.split(' ').length);
    let diff = baseDifficulty - extraWords * 3 + (intent === 'comparative' ? 8 : 0);
    diff = Math.max(5, Math.min(95, Math.round(diff)));
    const score = Math.round(0.42 * volHint + 0.36 * (100 - diff) + 0.22 * intentVal);
    items.push({
      keyword: kw, intent, intentLabel: { informational: '信息型', comparative: '对比型', transactional: '交易型' }[intent] || intent,
      difficulty: diff, volumeHint: volHint, pageType: page, score,
      source, why: `${intent}意图 · 建议做${page} · 难度约 ${diff}`,
    });
  };
  for (const s of suggestions.slice(0, 40)) add(s, 'suggest', s.split(' ').length >= 4 ? 62 : 52);
  const isCjk = /[一-龥]/.test(seed);
  const patList = isCjk
    ? ['{k}在线', '{k}免费', '{k}工具', '{k}下载', '{k}app', '{k}入门', '{k}教程', '如何使用{k}', '{k}对比', '{k}哪个好', '{k}评测', '{k}值得买吗', '{k}推荐']
    : ['{k} online free', 'free {k} online', '{k} app', '{k} tool', '{k} download', 'best {k}', '{k} for beginners',
       'how to use {k}', '{k} alternatives', '{k} review', '{k} pricing', 'is {k} worth it', '{k} 2026', '{k} without login'];
  for (const pat of patList) add(pat.replace('{k}', seed.trim()), 'pattern', 58);
  items.sort((a, b) => b.score - a.score);
  const evKw = new Set(((evidence || {}).topKeywords || []).filter(Boolean).map((x: any) => String(x).trim().toLowerCase()));
  for (const it of items) if (evKw.has(it.keyword)) { it.score = Math.min(100, it.score + 12); it.why += ' · 截图指标佐证'; }
  items.sort((a, b) => b.score - a.score);
  return items.slice(0, 12);
}

function radar(ctx: any): any {
  const c = ctx;
  const ev = c.evidence || {};
  const tq = c.traffic_quality;
  const ads = c.ads_present;
  const cpc = c.cpc_used || 0;
  const paid = num((ev.trafficSources || {}).paid) || 0;
  const mon = 45 + (ads ? 25 : 0) + Math.min(15, cpc * 5) + (paid >= 10 ? 10 : 0);
  const feas = Math.round(0.45 * (100 - c.difficulty) + 0.3 * Math.min(100, (c.suggestion_count || 0) * 2)
    + 0.25 * Math.min(100, ((c.serp || {}).inner_page_ratio || 0) * 100));
  const trend = num(ev.visitsTrendPct);
  const momentum = trend !== null ? Math.round(Math.max(5, Math.min(95, 50 + trend)))
    : Math.round(40 + Math.min(25, (c.suggestion_count || 0) * 1.2));
  const axes = [
    { key: 'demand', name: '需求热度', score: Math.round(c.volume_proxy),
      note: '搜索量代理（SERP 量级 + 长尾密度' + (ev.monthlyVisits ? ' + 截图月访问' : '') + '）' },
    { key: 'competition', name: '竞争空间', score: Math.round(100 - c.difficulty), note: `难度 ${c.difficulty}，越低越易切入` },
    { key: 'monetization', name: '变现潜力', score: Math.round(Math.max(5, Math.min(100, mon))), note: (ads ? 'SERP 有广告' : '未检出广告') + ` · CPC $${cpc}` },
    { key: 'feasibility', name: '内容可行性', score: Math.round(Math.max(5, Math.min(100, feas))), note: `内页占比 ${((c.serp || {}).inner_page_ratio || 0)} · 衍生词 ${c.suggestion_count || 0} 个` },
    { key: 'momentum', name: '趋势动能', score: Math.round(momentum), note: trend !== null ? `截图趋势 ${trend >= 0 ? '+' : ''}${trend}%` : '无趋势数据，按长尾活跃度估计' },
    { key: 'quality', name: '流量质量', score: Math.round(tq ?? 50), note: tq !== null ? '跳出/人均页/停留时长综合' : '未提供流量质量数据（可截图或手填）' },
  ];
  return { axes, svg: radarSvg(axes) };
}

export function analyze(seed: string, suggestions: string[], serp: any, screenshotAvailable: boolean,
  category = 'general', manualCpc: number | null = null, evidence: any = null): any {
  const ev = evidence || {};
  const rc = (serp || {}).results_count || 0;
  const volumeFromResults = rc ? Math.min(100, Math.round((Math.log10(Math.max(rc, 1)) / 10) * 100)) : 0;
  const sugDensity = Math.min(100, suggestions.length * 2);
  let volumeProxy = Math.round(0.6 * volumeFromResults + 0.4 * sugDensity);
  const mv = num(ev.monthlyVisits);
  if (mv && mv > 0) {
    const visitsScore = Math.min(100, Math.log10(Math.max(mv, 10)) * 12);
    volumeProxy = Math.round(0.5 * volumeProxy + 0.5 * visitsScore);
  }
  const inner = (serp || {}).inner_page_ratio ?? 0.3;
  const brand = (serp || {}).brand_in_top ?? 0;
  let difficulty = Math.round(100 - inner * 60 - Math.min(brand, 5) * 6);
  difficulty = Math.max(5, Math.min(100, difficulty));
  const ads = Boolean((serp || {}).ads_present);
  const monetization = ads ? '强（SERP 存在广告，商业意图明显）' : '中（暂未检出明显广告，可能偏信息类）';
  const cpc = manualCpc ?? (DEFAULT_CPC_BY_CATEGORY[category] ?? DEFAULT_CPC_BY_CATEGORY.general);
  const kdroi = Math.round(volumeProxy * cpc / Math.max(difficulty, 1) * 100) / 100;
  const ease = 100 - difficulty;
  const adBonus = ads ? 20 : 0;
  const worth = Math.round(0.4 * volumeProxy + 0.4 * ease + 0.2 * adBonus);
  const reasons: string[] = [];
  let verdict: string;
  if (worth >= 62 && difficulty <= 60) { verdict = '✅ 值得做'; reasons.push(`综合分 ${worth}/100 较高且难度适中（${difficulty}），建议优先排期`); }
  else if (worth >= 42) { verdict = '🟡 可尝试（长尾切入）'; reasons.push(`综合分 ${worth}/100 中等，建议先做长尾子词而非硬刚大词`); }
  else { verdict = '🔴 暂不优先'; reasons.push(`综合分 ${worth}/100 偏低，难度 ${difficulty}，投入产出比不高`); }
  if (ads) reasons.push('SERP 有广告 → 商业意图明确，变现路径清晰（策略：先选词再批量做页）');
  else reasons.push('暂未检出广告 → 偏信息/品牌词，变现需靠联盟/订阅间接转化');
  if (inner >= 0.5 && (serp || {}).top_domains) reasons.push(`前 10 中内页占比 ${inner}，存在可攻破的内页/小站机会`);
  else if ((serp || {}).brand_in_top >= 4) reasons.push('前排多为品牌大站 → 大词难攻，需用长尾/细分角度绕过');
  if (volumeProxy >= 50) reasons.push(`搜索量代理 ${volumeProxy} 不低，内容页有机会吃到长尾流量`);
  const trafficQualityVal = trafficQuality(ev);
  if (ev && Object.keys(ev).length) {
    const src = ev.source || '截图/手填';
    reasons.push(`已叠加 ${src} 指标佐证（月访问 ${ev.monthlyVisits ?? '—'}，跳出率 ${ev.bounceRate ?? '—'}%）`);
  }
  const baseCtx = { volume_proxy: volumeProxy, difficulty, cpc_used: cpc, ads_present: ads,
    suggestion_count: suggestions.length, serp, evidence: ev, traffic_quality: trafficQualityVal };
  const radarRes = radar(baseCtx);
  const longtailRes = longtail(seed, suggestions, difficulty, ev);
  return {
    seed, volume_proxy: volumeProxy, difficulty, cpc_used: cpc, kdroi, worth_score: worth,
    monetization, ads_present: ads, screenshot_available: screenshotAvailable, verdict, reasons,
    suggestions: suggestions.slice(0, 40), suggestion_count: suggestions.length, serp, evidence: ev,
    traffic_quality: trafficQualityVal, radar: radarRes, longtail: longtailRes,
  };
}

export function renderReport(seed: string, a: any, serp: any, jobId = '', shotsSaved: string[] = []): string {
  const L: string[] = [];
  L.push(`关键词调研报告 · ${seed}`);
  L.push('='.repeat(48));
  L.push(`结论：${a.verdict}`);
  L.push('');
  L.push('【核心指标】');
  L.push(`  · 搜索量代理值 : ${a.volume_proxy} / 100（免费源估算${((a.evidence || {}).monthlyVisits ? ' + 截图校准' : '')}，相对值）`);
  L.push(`  · 竞争难度     : ${a.difficulty} / 100（越低越易）`);
  L.push(`  · 预估 CPC     : $${a.cpc_used}（品类默认/手填，非实时竞价）`);
  L.push(`  · kdroi        : ${a.kdroi}  = 量×CPC÷难度（跨词相对排序，非绝对阈值）`);
  L.push(`  · 值得做评分   : ${a.worth_score} / 100`);
  L.push(`  · 变现信号     : ${a.monetization}`);
  if (a.traffic_quality !== null) L.push(`  · 流量质量     : ${a.traffic_quality} / 100`);
  const ev = a.evidence || {};
  if (ev && Object.keys(ev).length) {
    L.push('');
    L.push('【指标佐证（Similarweb / Semrush 截图 / 手填）】');
    L.push(`  · 来源         : ${ev.source || '—'}`);
    if (ev.monthlyVisits != null) L.push(`  · 月访问量     : ${ev.monthlyVisits}`);
    if (ev.visitsTrendPct != null) L.push(`  · 访问趋势     : ${ev.visitsTrendPct >= 0 ? '+' : ''}${ev.visitsTrendPct}%`);
    if (ev.bounceRate != null) L.push(`  · 跳出率       : ${ev.bounceRate}%`);
    if (ev.pagesPerVisit != null) L.push(`  · 人均页数     : ${ev.pagesPerVisit}`);
    if (ev.avgVisitDurationSeconds != null) L.push(`  · 平均停留     : ${ev.avgVisitDurationSeconds} 秒`);
    const ts = ev.trafficSources || {};
    if (Object.values(ts).some((v: any) => v != null)) L.push(`  · 流量结构     : 自然 ${ts.organic ?? '-'}% / 直接 ${ts.direct ?? '-'}% / 社交 ${ts.social ?? '-'}% / 引荐 ${ts.referral ?? '-'}% / 付费 ${ts.paid ?? '-'}%`);
    if (ev.topKeywords?.length) L.push(`  · 热门关键词   : ${ev.topKeywords.slice(0, 8).join(', ')}`);
    if (shotsSaved.length && jobId) L.push(`  · 截图存档     : ${shotsSaved.map((f) => `/api/shots/${jobId}/${f}`).join(', ')}`);
  }
  L.push('');
  L.push('【六维雷达】');
  for (const ax of (a.radar?.axes || [])) {
    const bar = '█'.repeat(ax.score / 5) + '░'.repeat(20 - ax.score / 5);
    L.push(`  · ${ax.name.padEnd(5, ' ')} ${bar} ${ax.score}/100  — ${ax.note}`);
  }
  const lt = a.longtail || [];
  if (lt.length) {
    L.push('');
    L.push(`【长尾词机会 TOP ${lt.length}】`);
    L.push(`  ${'分'.padStart(3)}  ${'意图'.padEnd(4)} ${'难度'.padStart(3)}  ${'建议页面'.padEnd(10)} 关键词`);
    for (const it of lt) L.push(`  ${String(it.score).padStart(3)}  ${it.intentLabel.padEnd(4)} ${String(it.difficulty).padStart(3)}  ${it.pageType.padEnd(10)} ${it.keyword}`);
  }
  L.push('');
  L.push('【SERP 快照】');
  if (serp) {
    L.push(`  · 结果总数     : ${serp.results_count?.toLocaleString?.() ?? serp.results_count}`);
    L.push(`  · 前 10 域名   : ${serp.top_domains?.join(', ') || '未解析'}`);
    L.push(`  · 内页占比     : ${serp.inner_page_ratio}`);
    L.push(`  · 品牌站数     : ${serp.brand_in_top}`);
  } else {
    L.push('  · SERP 未能抓取（网络/验证码），以下结论基于长尾信号');
  }
  L.push('');
  L.push('【长尾词（前 20）】');
  for (const s of a.suggestions.slice(0, 20)) L.push(`  - ${s}`);
  if (a.suggestion_count > 20) L.push(`  … 共 ${a.suggestion_count} 个`);
  L.push('');
  L.push('【为什么这个值不值得做】');
  for (const r of a.reasons) L.push(`  · ${r}`);
  L.push('');
  L.push('说明：当前为免费源（Google Suggest / DDG / SERP）估算，kdroi 为相对排序值。接入会员 API（SerpApi/Keyword Planner 等）后可获得真实搜索量与 CPC。');
  return L.join('\n');
}

// ---------- 截图存档 ----------
export function saveScreenshots(jobId: string, screenshots: { name: string; data_url: string }[]): { saved: string[]; urls: string[] } {
  const dir = path.join(DATA_DIR, 'shots', jobId);
  fs.mkdirSync(dir, { recursive: true });
  const saved: string[] = [];
  const urls: string[] = [];
  const re = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/s;
  (screenshots || []).slice(0, 3).forEach((im, i) => {
    const m = re.exec(im.data_url || '');
    if (!m) return;
    const ext = { jpeg: 'jpg', jpg: 'jpg' }[m[1]] || m[1];
    const fname = `img${i + 1}.${ext}`;
    try {
      fs.writeFileSync(path.join(dir, fname), Buffer.from(m[2], 'base64'));
      saved.push(fname);
      urls.push(`/api/shots/${jobId}/${fname}`);
    } catch { /* ignore */ }
  });
  return { saved, urls };
}

export type ResearchSpec = {
  seed: string;
  market?: string;
  lang?: string;
  category?: string;
  cpc?: number | null;
  screenshot?: boolean;
  screenshots?: { name: string; data_url: string }[];
  manualMetrics?: Record<string, any> | null;
};

export type StepCb = (step: string, label: string, pct: number) => void;

// 完整调研流水线（与 Python 版 run_research 对齐）
export async function runResearchPipeline(spec: ResearchSpec, onStep: StepCb): Promise<any> {
  const seed = (spec.seed || '').trim();
  const market = spec.market || 'us';
  const lang = spec.lang || 'en';
  const category = spec.category || 'general';
  const steps: string[] = [];
  const p = (step: string, label: string, pct: number) => { steps.push(`[${pct}%] ${label}`); try { onStep(step, label, pct); } catch { /* */ } };
  const jobId = (spec as any).jobId || '';

  const mode = OFFLINE ? '离线样例（RESEARCH_OFFLINE=1）' : '实时联网抓取';
  p('init', `准备调研环境（${mode}）`, 5);

  p('suggest', '抓取 Google / DuckDuckGo 自动补全…', 18);
  let suggestions = await googleSuggest(seed, market, lang);
  const ddg = await ddgSuggest(seed);
  suggestions = suggestions.concat(ddg.filter((s) => !suggestions.includes(s)));
  p('suggest', `长尾扩展完成：共得 ${suggestions.length} 个衍生词`, 34);

  p('serp', '抓取 SERP 快照（排名/内页占比/广告块）…', 44);
  const [serp, html] = await serpViaHttp(seed, market, lang);
  p('serp', `SERP 完成：前 10 域名 ${((serp || {}).top_domains || []).length} 个｜广告=${Boolean((serp || {}).ads_present) ? '有' : '无'}`, 58);

  const evidence: any = {};
  let shotsSaved: string[] = [];
  if (spec.manualMetrics && Object.keys(spec.manualMetrics).length) {
    Object.assign(evidence, Object.fromEntries(Object.entries(spec.manualMetrics).filter(([, v]) => v !== null && v !== '')));
    evidence.source = '手填指标';
  }
  if (spec.screenshots && spec.screenshots.length) {
    p('shots', `解析 ${spec.screenshots.length} 张指标截图（Similarweb/Semrush）…`, 66);
    const { saved, urls } = saveScreenshots(jobId, spec.screenshots);
    shotsSaved = saved;
    const norm = spec.screenshots.slice(0, 3).map((im) => ({ name: im.name, data_url: im.data_url }));
    const [extMetrics, extNote] = await extractMetricsFromScreenshots(norm);
    if (extMetrics) {
      const merged = { ...extMetrics };
      for (const [k, v] of Object.entries(evidence)) if (k !== 'source') merged[k] = v;
      merged.source = '截图提取' + (spec.manualMetrics ? ' + 手填' : '');
      Object.assign(evidence, merged);
    }
    evidence.extractNote = extNote;
    p('shots', extNote, 74);
  } else {
    p('shots', '无指标截图（可选：Similarweb/Semrush 面板截图可辅助分析）', 64);
  }

  p('analyze', '综合分析（kdroi / 难度 / 六维雷达）…', 82);
  const analysis = analyze(seed, suggestions, serp, (spec.screenshots?.length || 0) > 0, category, spec.cpc ?? null, Object.keys(evidence).length ? evidence : null);
  p('analyze', `分析完成：kdroi=${analysis.kdroi} 难度=${analysis.difficulty} → ${analysis.verdict}`, 90);

  p('longtail', '生成长尾词机会清单…', 95);
  const report = renderReport(seed, analysis, serp, jobId, shotsSaved);
  p('done', '报告生成完毕', 100);

  const plan = {
    radar: analysis.radar,
    longtail: analysis.longtail,
    metricsEvidence: {
      data: Object.keys(evidence).length ? evidence : null,
      shots: shotsSaved.map((f) => `/api/shots/${jobId}/${f}`),
      note: evidence.extractNote || null,
    },
    steps,
  };
  return { analysis, report, plan, steps };
}
