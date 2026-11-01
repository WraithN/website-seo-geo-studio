import { useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { activeRunCount, resumeRunning, subscribeRuns } from './runStore';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import SkillDetail from './pages/SkillDetail';
import Workflows from './pages/Workflows';
import Research from './pages/Research';
import Pages from './pages/Pages';
import Settings from './pages/Settings';
import Flow from './pages/Flow';
import StepBench from './pages/StepBench';
import Sites from './pages/Sites';
import SiteDetail from './pages/SiteDetail';
import Run from './pages/Run';
import History from './pages/History';
import Orchestration from './pages/Orchestration';
import Artifacts from './pages/Artifacts';

// 侧边栏信息架构（面向「出海运营 + 小白开发」，而不是面向资产类型）：
// 主路径只要「概览 / 需求调研 / 我的站点」三样；技能、n8n、页面库、产物归档等
// 属于实现细节，收进可折叠的「高级工具」区，不打扰主流程。
const MAIN_NAV = [
  {
    group: '工作台',
    items: [{ to: '/', label: '概览', end: true }],
  },
  {
    group: '产品',
    items: [
      { to: '/research', label: '需求调研' },
      { to: '/sites', label: '我的站点' },
    ],
  },
];

const ADVANCED_ITEMS = [
  { to: '/run', label: '技能执行', desc: '手动调用单个技能' },
  { to: '/history', label: '历史结果', desc: '所有执行记录与产物' },
  { to: '/skills', label: '技能库', desc: '查看 SKILL.md 全文' },
  { to: '/workflows', label: 'n8n 工作流', desc: '工作流资产与节点' },
  { to: '/pages', label: '建站页面', desc: '旧版页面归档预览' },
  { to: '/artifacts', label: '产物归档', desc: '落盘的 JSON / MD' },
];

const SETTINGS_NAV = [
  { to: '/settings', label: '通用设置' },
  { to: '/settings/orchestration', label: '流程编排' },
];

export default function App() {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="sb-dot" />
          <div className="sb-name">SEO/GEO Studio<small>流量获客工作室</small></div>
        </div>

        {MAIN_NAV.map((g) => (
          <div key={g.group}>
            <div className="sb-group">{g.group}</div>
            {g.items.map((it: any) => (
              <NavLink key={it.to} to={it.to} end={!!it.end} className="sb-link">
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sb-group">
          高级工具
          <button
            className="sb-fold"
            onClick={() => setAdvancedOpen((v) => !v)}
            title={advancedOpen ? '收起' : '展开'}
          >
            {advancedOpen ? '收起 ▾' : '展开 ▸'}
          </button>
        </div>
        {advancedOpen && (
          <div className="sb-advanced">
            {ADVANCED_ITEMS.map((it) => (
              <NavLink key={it.to} to={it.to} className="sb-link sb-link-sub">
                {it.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="sb-group">设置</div>
        {SETTINGS_NAV.map((it) => (
          <NavLink key={it.to} to={it.to} className="sb-link">
            {it.label}
          </NavLink>
        ))}

        <RunIndicator />
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/skills/:slug" element={<SkillDetail />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/research" element={<Research />} />
          <Route path="/pages" element={<Pages />} />
          <Route path="/artifacts" element={<Artifacts />} />
          <Route path="/flow" element={<Flow />} />
          <Route path="/flow/:key" element={<StepBench />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/sites/:id" element={<SiteDetail />} />
          <Route path="/sites/:id/:stepKey" element={<StepBench />} />
          <Route path="/history" element={<History />} />
          <Route path="/run" element={<Run />} />
          <Route path="/run/:suite/:task" element={<Run />} />
          <Route path="/settings/orchestration" element={<Orchestration />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

/** 侧边栏底部「执行中」指示：基于全局运行状态，跨页面可见 */
function RunIndicator() {
  const [, force] = useState(0);
  useEffect(() => {
    resumeRunning();
    return subscribeRuns(() => force((n) => n + 1));
  }, []);
  const n = activeRunCount();
  if (n === 0) return null;
  return (
    <NavLink to="/history" className="sb-runind" title="去历史结果查看">
      ⏳ {n} 个任务执行中
    </NavLink>
  );
}