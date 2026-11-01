// 流程编排配置：说明每个流程节点在后台调用哪些 n8n 工作流与技能套件。
// 这是管理与配置视图（放在设置下），不出现在主流程界面——用户面对的是流程节点本身。
import { useEffect, useState } from 'react';
import { getJSON } from '../api';

const SUITE_LABEL: Record<string, string> = {
  'seo-orchestrator': '总控编排',
  'seo-research': '关键词 / 竞品 / 外链',
  'seo-content-geo': '内容 / GEO',
  'seo-technical': '技术 SEO',
  'seo-monitor': 'GSC 监控 / 报告',
  'seo-social-search': '短视频搜索',
};

export default function Orchestration() {
  const [steps, setSteps] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [err, setErr] = useState('');

  useEffect(() => {
    getJSON('/steps')
      .then((d) => setSteps(d.steps || []))
      .catch((e) => setErr(String(e.message || e)));
    getJSON('/suites')
      .then((d) => setSuites(d.suites || []))
      .catch(() => setSuites([]));
    getJSON('/dashboard')
      .then((d) => {
        const m: Record<string, number> = {};
        (d.suites || []).forEach((s: any) => (m[s.slug] = s.count));
        setCounts(m);
      })
      .catch(() => setCounts({}));
  }, []);

  if (err) return <div className="loading">加载失败：{err}</div>;
  if (!steps.length) return <div className="loading">加载中…</div>;

  return (
    <>
      <section className="hero">
        <div className="kicker">设置 · 流程编排</div>
        <h1>每个流程节点<span className="hl">调用了什么</span></h1>
        <p className="hero-sub">
          这里说明后台编排关系：某一步会调用哪些 n8n 工作流、使用哪些 SEO 技能套件。
          这些是实现细节，用户在流程节点上只需填写业务信息并查看结果。
        </p>
      </section>

      <div className="card">
        {steps.map((s) => {
          const wf = s.backend?.workflows || [];
          const su = s.backend?.suites || [];
          return (
            <div key={s.key} className="orch-row">
              <div className="orch-head">
                <span className="fs-num">{s.step}</span>
                <div>
                  <div className="orch-title">{s.label}</div>
                  <div className="muted">{s.goal}</div>
                </div>
              </div>

              <div className="orch-body">
                <div className="orch-col">
                  <div className="orch-label">调用的 n8n 工作流</div>
                  {wf.length === 0 ? (
                    <div className="empty sm">无（纯模型分析，不经 n8n）</div>
                  ) : (
                    <div className="chip-row">
                      {wf.map((w: string) => (
                        <span className="chip" key={w}>{w}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="orch-col">
                  <div className="orch-label">使用的技能套件</div>
                  {su.length === 0 ? (
                    <div className="empty sm">无</div>
                  ) : (
                    <div className="chip-row">
                      {su.map((k: string) => (
                        <span className="chip" key={k}>
                          {SUITE_LABEL[k] || k}
                          {counts[k] ? <b>{counts[k]}</b> : null}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="orch-col">
                  <div className="orch-label">用户输入 / 输出</div>
                  <div className="muted">
                    输入 {(s.inputs || []).length} 项 · 输出 {(s.outputs || []).length} 个字段
                  </div>
                </div>
              </div>

              {s.backend?.note && <div className="orch-note">备注：{s.backend.note}</div>}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>技能套件总览</h3>
        <div className="hint" style={{ marginBottom: 10 }}>
          技能由流程节点在后台调用；点开可查看每个技能的内容与任务细节。
        </div>
        <div className="chip-row">
          {suites.map((s) => (
            <span className="chip" key={s.slug}>
              {s.name}
              <b>{counts[s.slug] || 0}</b>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
