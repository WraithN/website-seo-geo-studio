// 站点内的单步执行：URL 形如 /sites/:id/:stepKey。
// 直接复用 StepBench 的路由适配组件（它会从 :id / :stepKey 解析出 siteId 与步骤）。
import StepBenchRoute from './StepBench';

export default function SiteStep() {
  return <StepBenchRoute />;
}
