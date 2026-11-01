// 统一 API 封装（开发期经 Vite 代理 /api 到 :8789，生产期同源）
export async function getJSON(url: string) {
  const r = await fetch('/api' + url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function postJSON(url: string, body: any) {
  const r = await fetch('/api' + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function getText(url: string) {
  const r = await fetch('/api' + url);
  return r.text();
}
