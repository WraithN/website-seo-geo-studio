# 内容生产流水线契约（content-pipeline）

四阶段，最终产物为**一个 JSON 对象**，字段如下，命名不得改动：

| 字段 | 阶段 | 说明 |
|---|---|---|
| `blogPlan` | 1 规划 | `{pillarPages, clusterPosts, editorialCalendar, pageList}`；非博客类型给简化版 |
| `draft` | 2 生产 | Markdown 成稿，含 `[^n]` 引用与 `[待人工补充：…]` 标识 |
| `citations` | 2 生产 | 引用清单：`{type, title, source, url, confidence, note}` |
| `humanized` | 3 去AI味 | 自然化版本，保留引用与标识 |
| `eeatReport` | 4 验证 | `{experience, expertise, authoritativeness, trust, score, gaps, flags}` |
| `checklist` | 4 验证 | 发布前人工核对清单（汇总待补充项与 EEAT 缺口） |

阶段顺序与边界：
- 阶段1 只做规划，不写正文。
- 阶段2 产出可发布草稿（含引用与待补充标识）。
- 阶段3 不改事实，只改表达（去AI味）。
- 阶段4 基于阶段2/3 两个成稿做 EEAT 评分，列出缺口与风险。

引用与标识规范见 `citation-guide.md`；去AI味手法见 `de-ai-humanize.md`；EEAT 细则见 `eeat-framework.md`。
