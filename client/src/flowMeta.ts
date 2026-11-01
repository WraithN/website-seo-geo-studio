// 流程元信息派生（单一数据源：后端 /flow）。站点步骤、任务->步骤映射都从这里取，
// 不再在各页面手写重复的 STEP_TASK / SITE_STEPS / TASK_META。
import { getJSON } from './api';

export type FlowStep = {
  step: number;
  key: string;
  label: string;
  task: string;
  phase: string;
  group: 'pre' | 'create' | 'operate';
  desc: string;
  page: string;
  suites: string[];
  workflows: { slug: string; name: string; nodes: number; category: string }[];
};

export async function loadFlow(): Promise<FlowStep[]> {
  const d = await getJSON('/flow');
  return (d.steps || []) as FlowStep[];
}

/** 站点内步骤 = 去掉立项（pre）后的产品创建/运营步骤 */
export function siteSteps(steps: FlowStep[]): FlowStep[] {
  return steps.filter((s) => s.group !== 'pre');
}

/** task 名 -> 步骤信息（用于「该步骤是否已执行」） */
export function taskMeta(steps: FlowStep[]): Record<string, { step: number; label: string; key: string }> {
  const m: Record<string, { step: number; label: string; key: string }> = {};
  for (const s of steps) m[s.task] = { step: s.step, label: s.label, key: s.key };
  return m;
}