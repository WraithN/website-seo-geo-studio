---
name: seo-orchestrator
description: SEO/GEO 流量获客总控与诊断入口。把"没有流量/流量不对/掉量/要做内容/要打竞品/要上 AI 搜索/要本地获客/要复盘"等模糊问题，路由到 seo-research / seo-content-geo / seo-technical / seo-monitor / seo-social-search 五个合并技能，并负责项目初始化、增长规划与新手教练。当你想提升自然流量、获客、排名、AI 引用，或不知道该先用哪个 SEO 技能时，使用本技能。
---

# SEO/GEO 流量获客总控（Orchestrator）

把模糊的流量问题变成一条**可度量、最短**的获客工作流。本技能不做全部工作，而是诊断后把任务路由给下面五个合并技能（它们由本套件合并自 53 个原始技能）：

| 合并技能 | 负责 | 对应建站工具模块 |
|---|---|---|
| `seo-research` | 关键词 / SERP / 竞品 / 外链机会 | `research.py` + `backlink.py` |
| `seo-content-geo` | 内容质量 / E-E-A-T / AI·GEO 可见性 / 单页优化 | `content_gen.py` |
| `seo-technical` | 技术审计 / 性能 / 结构化数据 / 迁移 / 本地 | `techseo.py` |
| `seo-monitor` | GSC 监控 / 掉量与衰退 / 复盘报告 | `monitor.py` |
| `seo-social-search` | TikTok/IG 短视频搜索增长 | `community` / 内容策略 |

## Start — 收集缺失输入

只在缺少以下信息时询问用户：

- 站点或产品 URL、目标市场与语言
- 转化目标：销售 / 线索 / 注册 / 到店 / 品牌曝光
- 当前卡点：没流量 / 流量不对 / 掉量 / 转化弱 / AI 可见性差
- 可用证据：Search Console 导出、分析数据、关键词表、竞品 URL、页面清单

若无实时数据，用用户提供的信息与公开页面继续，**把估算标为"估算"**，绝不编造搜索量、排名、流量或收入。

## Route — 选最短链路（读 references/catalog.md）

1. **无基线** → `seo-project-setup`（项目初始化）+ `seo-technical`（审计）
2. **要词与主题** → `seo-research`（研究 → 聚类 → content brief）
3. **要打竞品** → `seo-research`（市场格局 → 单竞品 → 竞品页）
4. **要做内容** → `seo-content-geo`（内容 → E-E-A-T → AI/GEO）
5. **掉量/衰退** → `seo-monitor`（drops → decay → indexing）→ 再派技术或内容
6. **技术卡点** → `seo-technical`（technical → CWV/schema/sitemap…）
7. **要本地客户** → `seo-technical`（local）+ `seo-monitor`（opportunities）
8. **要短视频搜索** → `seo-social-search`
9. **要复盘汇报** → `seo-monitor`（overview → compare → report）

**最多连续跑 3 个专业技能**即停，除非用户要求继续。每阶段先给结果，再进下一阶段。

## Deliver — 紧凑获客简报

1. 当前诊断与证据质量
2. 最高价值机会
3. 按影响× effort 排序的三件事
4. 选定的技能链路
5. 每件事的指标与回访日期
6. 还缺哪些权限/数据能提升置信度

收入目标下优先选商业意图页面与可度量机会。**不承诺任何流量、排名、线索或收入。**

## 项目初始化（来自 seo-project-setup）

建议用户建一个本地 SEO 工作夹，长期沉淀上下文：

```
seo-workspace/
  README.md   gsc/   keywords/   competitors/   content/   outreach/   reports/
```

收集：主站/附加域名、核心产品服务、目标国家语言、站点阶段（新站/成熟/迁移/恢复）、CMS、目标（线索/注册/电商/品牌）。

## 增长规划（来自 seo-plan）

四阶段路线图：①基础(1-4周) 技术地基+核心页+分析 ②扩张(5-12周) 内容+博客+内链 ③内容规模(13-24周) 程序化/集群 ④优化(持续) 据 GSC 数据迭代。每阶段给出行业模板、架构、E-E-A-T 计划与 KPI。

## 新手教练（来自 seo-coach）

首次交互先问：是否 SEO 新手 / 在做什么项目 / 想要策略还是执行。给出 2-4 个具体下一步，不要长菜单。解释数据源差异：OpenSEO MCP（关键词/排名/反向链接）、GSC（真实点击/展示/CTR/位置，免费首选）、网页搜索（市场上下文）、浏览器抓取（页面副本/作者/联系方式）、本地文件（长期上下文）。

## 与建站工具（indie_builder）的对接

本套件与 `n8n-indie-builder/indie_builder` 引擎协同：
- **自动路径**：在 indie_builder 内，`research.py` 已能做关键词调研+雷达+长尾词；运行于该引擎时优先用引擎出数，本技能负责方法论与策略判断。
- **人工路径**：把本技能的结论（关键词集、内容 brief、技术债务清单、监控异常）作为 indie_builder 各模块的输入。
- 五个合并技能各自 SKILL.md 末尾都标了"对接建站工具模块"段落，可直接对照调用。

## MCP 依赖与健康降级

多数子技能可用纯网页搜索/公开页面完成静态分析；接入 OpenSEO / Ahrefs / GSC MCP 后获得真实量、难度、外链与排名。缺连接时按 `references/mcp-degradation.md` 优雅降级，**不编造数据**。
