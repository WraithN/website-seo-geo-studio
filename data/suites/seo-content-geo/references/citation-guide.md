# 引用与「待人工补充」规范（content-pipeline 引用要求）

## 1. 正文引用格式
- 正文用上标 `[^n]`，n 从 1 递增。
- 每个 `[^n]` 必须在 `citations` 字段有对应条目。

## 2. citations 字段条目结构
```json
{ "type": "paper|blog|authority", "title": "...", "source": "期刊/站点名", "url": "https://...（已知则填）", "confidence": "confirmed|needs-human", "note": "可选补充说明" }
```
- **type=paper**：学术论文。title 写论文标题，source 写期刊/会议/preprint 仓库（如 Nature、arXiv），尽量给 DOI 或 arXiv 编号。
- **type=blog**：权威行业博客/机构站（Google Search Central、Ahrefs、Moz、NIH、大学/政府站等）。
- **type=authority**：官方文档/标准/指南（如 Google 质量指南、WCAG）。
- **confidence=confirmed**：你**确定**该来源真实存在且信息准确（你确实知道这个站点/论文存在）。
- **confidence=needs-human**：你只记得大概领域、记不清具体文章——此时仍要给出**可核验的领域或检索词**（如 source 写 "Google Scholar: Chinese naming conventions"），**不要把 `[待人工补充]` 写进 citations 的 title 或 source 字段**。

## 3. 引用必须是真实来源（硬性）
- **至少给出 3 条引用**，混合 paper 与 blog/authority 类型。
- 优先引用你确实知道的、真实存在的来源（SEO 类可引用 Google Search Central、Ahrefs Blog、Moz、Backlinko、Search Engine Journal；学术类引用你记得的真实论文/期刊）。
- 仅当完全无法回忆具体出处时才标 needs-human，且 source 给检索方向，不要留空或写占位。

## 4. 「待人工补充」标识（仅用于正文，不用于 citations）
凡是需要真人提供、模型**不应编造**的内容，在 **draft 正文**用 `[待人工补充：具体说明]` 明确标出，例如：
- `[待人工补充：插入你帮 10 位用户起中文名的真实案例]`
- `[待人工补充：补充本站真实转化率/留存数据]`
- `[待人工补充：添加作者本人资质与照片]`

严禁用模型编造真实人名、统计数据、客户案例、引述。标识要**具体**，让人一看就知道补什么。**citations 字段本身不得出现 `[待人工补充]`。**

## 5. 引用与标识都要保留到 humanized（去AI味）版本
两个阶段成稿都保留 `[^n]` 与 `[待人工补充：…]`，不得删除或伪造。
