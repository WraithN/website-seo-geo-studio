const fs = require('fs');
const p = 'server/src/skills/registry.ts';
let s = fs.readFileSync(p, 'utf8');

// 1) 删除 aso 任务整块
const i = s.indexOf("key: 'aso',");
if (i >= 0) {
  const start = s.lastIndexOf('  {', i);
  const end = s.indexOf("key: 'geo-audit',");
  const endStart = s.lastIndexOf('  {', end);
  s = s.slice(0, start) + s.slice(endStart);
  console.log('removed aso task');
} else console.log('aso already gone');

// 2) 重写 geo-optimize 为「上线前」模式
const gs = s.indexOf("  {\n    key: 'geo-optimize',");
const ge = s.indexOf("  },\n];\n\n// ---------- seo-monitor");
if (gs < 0 || ge < 0) throw new Error('geo-optimize block not found');
const block = `  {
    key: 'geo-optimize',
    name: '站点 SEO/GEO 优化（上线前）',
    desc: '在站点上线前把要发布的页面内容改造成搜索与 AI 引用友好的形态：答案块、元数据、结构化数据、llms.txt。不需要 URL（站点还没上线）。',
    step: 4,
    collect: 'none',
    refs: ['ai-crawlers-guide.md', 'llms-txt-spec.md', 'eeat-framework.md'],
    inputs: [
      { key: 'target', label: '目标查询', type: 'text', placeholder: '希望被搜索/AI 引用时对应的问题' },
      { key: 'content', label: '要发布的页面内容', type: 'textarea', required: true, placeholder: '粘贴即将发布到站点的正文（可来自第 3 步内容生产）' },
      { key: 'siteName', label: '站点/产品名', type: 'text', placeholder: '如 Rhythm Trainer' },
    ],
    outputFields: {
      diagnosis: '当前内容在搜索与 AI 引用上的问题（3-5 条）',
      rewritten: '优化后的正文（完整可直接发布）',
      answerBlocks: '答案块数组（每段独立可引用，对应目标查询）',
      dataPoints: '应补充的数据锚点建议',
      metaChanges: '发布时要一并写入的 title/description/结构化数据/llms.txt 建议',
    },
    prompt: (v, ctx) => \`对即将发布的站点内容做上线前 SEO/GEO 优化（站点尚未上线，不需要 URL）。

【站点/产品名】\${v.siteName || '未指定'}
【目标查询】\${v.target || '未指定'}

【即将发布的页面内容】
\${String(v.content || '').slice(0, 8000)}

要求：
1. 输出诊断、完整改写后的正文（可直接发布）、可独立引用的答案块、应补的数据锚点。
2. metaChanges 给出发布时要一并写入的 title/description/结构化数据类型/llms.txt 草案。
3. 改写保持原意与事实，不得编造数据；答案块直接对应目标查询，便于 AI 搜索引用。\`,
  },
`;
s = s.slice(0, gs) + block + s.slice(ge + "  },\n".length);
console.log('geo-optimize rewritten');

// 3) 套件名去 ASO，covers 文案去掉（用户不关心合并数量）
s = s.split('技术 SEO / ASO').join('技术 SEO');
s = s.split('站点审计、CWV、结构化数据、ASO、GEO 可见性。').join('站点审计、CWV、结构化数据、GEO 可见性。');
s = s.replace(/covers: '合并 \d+ 个原始技能',/g, "covers: '',");

fs.writeFileSync(p, s);
console.log('registry done');
