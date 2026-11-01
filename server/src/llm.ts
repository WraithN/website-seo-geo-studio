// LLM 客户端：OpenAI 兼容 /chat/completions，零依赖（Node 原生 fetch）。
// 技能执行的核心推理层：把 SKILL.md 方法论 + 真实采集数据 -> 结构化产物。
import './env.js';

export const LLM = {
  apiKey:
    process.env.CHAT_LLM_API_KEY ||
    process.env.LLM_API_KEY ||
    // 与 Python bridge 保持一致的默认测试 key（可在 .env 覆盖）
    'sk-eec3c9f19f274bddb1ef29690c6646f2',
  baseUrl: (process.env.CHAT_LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, ''),
  model: process.env.CHAT_LLM_MODEL || 'deepseek-chat',
};

export function llmAvailable(): boolean {
  return !!LLM.apiKey;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** 要求模型返回严格 JSON 对象（使用 response_format 若支持，否则靠 prompt 约束） */
  jsonMode?: boolean;
  timeoutMs?: number;
}

/** 非流式对话。成功返回文本；失败返回以 __LLM_ERROR__: 开头的串（不抛异常）。 */
export async function chat(
  system: string,
  user: string,
  opts: ChatOptions = {},
): Promise<string> {
  if (!LLM.apiKey) return '__LLM_ERROR__:未配置 CHAT_LLM_API_KEY';

  const body: any = {
    model: LLM.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: opts.temperature ?? 0.3,
    stream: false,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.jsonMode) body.response_format = { type: 'json_object' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 180000);
  try {
    const r = await fetch(`${LLM.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LLM.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const txt = await r.text();
    if (!r.ok) return `__LLM_ERROR__:HTTP ${r.status}: ${txt.slice(0, 300)}`;
    const j = JSON.parse(txt);
    const content = j?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return '__LLM_ERROR__:响应缺少 content';
    return content.trim();
  } catch (e: any) {
    if (e?.name === 'AbortError') return '__LLM_ERROR__:超时';
    return `__LLM_ERROR__:${e?.message || e}`;
  } finally {
    clearTimeout(timer);
  }
}

/** 从 LLM 输出中稳健提取 JSON（容忍 ```json 围栏、前后废话、尾随逗号）。 */
export function extractJSON<T = any>(raw: string): T | null {
  if (!raw) return null;
  // 1) 直接解析
  try {
    return JSON.parse(raw) as T;
  } catch { /* 继续 */ }

  // 2) 去掉代码围栏
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim()) as T;
    } catch { /* 继续 */ }
  }

  // 3) 截取首个 { 到最后一个 } 的片段
  const s = raw.indexOf('{');
  const e = raw.lastIndexOf('}');
  if (s >= 0 && e > s) {
    let frag = raw.slice(s, e + 1);
    try {
      return JSON.parse(frag) as T;
    } catch {
      // 去掉尾随逗号后再试
      frag = frag.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(frag) as T;
      } catch { /* 继续 */ }
    }
  }

  // 4) 数组形态
  const as = raw.indexOf('[');
  const ae = raw.lastIndexOf(']');
  if (as >= 0 && ae > as) {
    try {
      return JSON.parse(raw.slice(as, ae + 1)) as T;
    } catch { /* 放弃 */ }
  }
  return null;
}

/** 带一次修复重试的 JSON 生成：先生成，解析失败则让模型自行修正。 */
export async function chatJSON<T = any>(
  system: string,
  user: string,
  opts: ChatOptions = {},
): Promise<{ ok: true; data: T; raw: string } | { ok: false; error: string; raw: string }> {
  const raw = await chat(system, user, { ...opts, jsonMode: true });
  if (raw.startsWith('__LLM_ERROR__')) return { ok: false, error: raw, raw };

  const data = extractJSON<T>(raw);
  if (data) return { ok: true, data, raw };

  // 修复重试：把错误输出回喂，要求只输出 JSON
  const fix = await chat(
    system,
    `你上一次的输出不是合法 JSON。请把下面的内容原样改写为**唯一一个合法 JSON 对象**，不要任何解释、不要代码围栏：\n\n${raw.slice(0, 6000)}`,
    { ...opts, jsonMode: true, temperature: 0 },
  );
  if (fix.startsWith('__LLM_ERROR__')) return { ok: false, error: fix, raw };
  const fixed = extractJSON<T>(fix);
  if (fixed) return { ok: true, data: fixed, raw: fix };
  return { ok: false, error: '无法解析为 JSON', raw: fix || raw };
}
