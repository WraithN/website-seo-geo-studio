import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
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

export default function App() {
  const navigate = useNavigate();

  // 侧边栏：需求调研（立项）→ 站点（建站容器）→ 资源 / 设置。
  // 具体的 8 步流程收在每个站点内部（/sites/:id），不再在侧边栏逐条列出。
  const nav = [
    { group: '工作台', items: [{ to: '/', label: '概览', end: true }] },
    { group: '立项', items: [{ to: '/research', label: '需求调研' }] },
    { group: '站点', items: [{ to: '/sites', label: '站点列表' }] },
    {
      group: '资源',
      items: [
        { to: '/history', label: '历史结果' },
        { to: '/workflows', label: 'n8n 工作流' },
        { to: '/skills', label: '技能' },
      ],
    },
    {
      group: '设置',
      items: [
        { to: '/settings', label: '通用设置' },
        { to: '/settings/orchestration', label: '流程编排' },
      ],
    },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="sb-dot" />
          <div className="sb-name">SEO/GEO Studio<small>流量获客工作室</small></div>
        </div>
        {nav.map((g) => (
          <div key={g.group}>
            <div className="sb-group">{g.group}</div>
            {g.items.map((it: any) => (
              <NavLink key={it.to} to={it.to} end={(it as any).end} className="sb-link">
                {it.num && <span className="sb-num">{it.num}</span>}
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
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
