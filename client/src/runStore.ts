// 全局执行状态 store：统一追踪运行中的任务，SSE 实时接收 + 轮询兜底。
// 作用：跨页面不丢进度、侧边栏能显示「还有 N 个任务在执行」、切走再回来能恢复。
import { useEffect, useState } from 'react';
import { getJSON } from './api';

export type TrackedRun = {
  id: string;
  suite: string;
  task: string;
  status: string;
  progress: number;
  statusText: string;
  hasArtifact: boolean;
  createdAt: string;
  finishedAt: string;
  error: string;
  upstreamId: string;
  siteId: string;
};

const runs = new Map<string, TrackedRun>();
const pollers = new Map<string, ReturnType<typeof setInterval>>();
const listeners = new Set<() => void>();
let es: EventSource | null = null;
let streamStarted = false;

function notify() {
  listeners.forEach((l) => { try { l(); } catch { /* ignore */ } });
}

export function subscribeRuns(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getTrackedRun(id: string): TrackedRun | undefined {
  return runs.get(id);
}

/** 当前仍在执行（pending/running）的任务数 */
export function activeRunCount(): number {
  let n = 0;
  runs.forEach((r) => { if (r.status === 'running' || r.status === 'pending') n++; });
  return n;
}

/** 确保全局 SSE 流已建立（应用级调用一次即可） */
export function ensureRunStream() {
  startStream();
}

/** 刷新后重新接管仍在运行的任务（断点续跑：侧边栏指示器可接上之前的执行） */
export function resumeRunning() {
  startStream();
  getJSON('/runs?limit=10')
    .then((d) => {
      for (const r of d.runs || []) {
        if (r.status === 'running' || r.status === 'pending') {
          upsert(r as TrackedRun);
          startPoll(r.id);
        }
      }
    })
    .catch(() => {});
}

function upsert(run: TrackedRun) {
  runs.set(run.id, run);
  notify();
}

function stopPoll(id: string) {
  const t = pollers.get(id);
  if (t) { clearInterval(t); pollers.delete(id); }
}

function startPoll(id: string) {
  if (pollers.has(id)) return;
  const t = setInterval(async () => {
    try {
      const d = await getJSON('/runs/' + id);
      const run = d.run as TrackedRun | undefined;
      if (!run) return;
      upsert(run);
      if (run.status === 'done' || run.status === 'failed') stopPoll(id);
    } catch { /* 单次失败忽略，下轮重试 */ }
  }, 2500);
  pollers.set(id, t);
}

function startStream() {
  if (streamStarted) return;
  streamStarted = true;
  try {
    es = new EventSource('/api/runs/events');
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.type === 'run' && msg.run) {
          upsert(msg.run as TrackedRun);
          if (msg.run.status === 'done' || msg.run.status === 'failed') stopPoll(msg.run.id);
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { /* 连接失败由轮询兜底 */ };
  } catch { /* EventSource 不可用时仅靠轮询 */ }
}

/** 追踪某个执行：先拉一次、进 store、开兜底轮询、启动 SSE */
export function trackRun(id: string) {
  startStream();
  const existing = runs.get(id);
  if (existing) {
    if (existing.status === 'running' || existing.status === 'pending') startPoll(id);
    return;
  }
  getJSON('/runs/' + id).then((d) => { if (d.run) upsert(d.run); }).catch(() => {});
  startPoll(id);
}

/** React hook：订阅某个执行的实时状态 */
export function useRun(id: string): TrackedRun | undefined {
  const [, force] = useState(0);
  useEffect(() => {
    if (id) trackRun(id);
    return subscribeRuns(() => force((n) => n + 1));
  }, [id]);
  return runs.get(id);
}