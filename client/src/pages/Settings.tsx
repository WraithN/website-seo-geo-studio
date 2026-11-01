export default function Settings() {
  return (
    <>
      <section className="hero">
        <div className="kicker">SETTINGS</div>
        <h1>设置 / <span className="hl">关于本工程</span></h1>
        <p className="hero-sub">
          本工程为 React + TypeScript + SQLite 单体应用，所有数据（技能、工作流、页面、调研任务）持久化于
          <code> data/seo-geo-studio.db </code>（SQLite 文件，随工程存在）。
        </p>
      </section>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>技术构成</h3>
        <ul style={{ fontSize: 13.5, lineHeight: 1.9, color: 'var(--ink)' }}>
          <li><b>前端</b>：React 18 + TypeScript + Vite + React Router</li>
          <li><b>后端</b>：Node.js + Express + 内置 <code>node:sqlite</code>（零原生依赖）</li>
          <li><b>数据库</b>：SQLite（文件型，自动持久化，无需额外服务）</li>
          <li><b>调研引擎</b>：TS 移植版（原 Python research.py），含六维雷达、长尾词机会、截图指标辅助分析</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>可选环境变量（服务端 .env）</h3>
        <ul style={{ fontSize: 13.5, lineHeight: 1.9, color: 'var(--muted)' }}>
          <li><code>VISION_LLM_API_KEY</code> / <code>VISION_LLM_BASE_URL</code> / <code>VISION_LLM_MODEL</code>：Similarweb / Semrush 截图自动提取指标（未配置则截图仅存档，可手填指标）</li>
          <li><code>RESEARCH_OFFLINE=1</code>：使用内置样例数据，无需联网即可验证整条流水线</li>
          <li><code>RESEARCH_TIMEOUT_MS</code>：联网抓取超时（默认 12000ms）</li>
        </ul>
        <div className="hint" style={{ marginTop: 10 }}>提示：复制 <code>.env.example</code> 为 <code>.env</code> 按需填写，重启后端生效。</div>
      </div>
    </>
  );
}
