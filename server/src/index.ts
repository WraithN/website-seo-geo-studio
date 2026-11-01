import './env.js'; // 必须最先加载：把 .env 注入 process.env
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = parseInt(process.env.PORT || '8789', 10);
const DIST = path.resolve(ROOT, 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use('/api', api);

// 生产模式：直接托管 vite 构建产物
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n  SEO/GEO Studio 后端已启动  →  http://localhost:${PORT}/api/health`);
  if (!fs.existsSync(DIST)) {
    console.log(`  开发模式：请另开终端运行 \`npm run dev:client\`（Vite 端口 5173，已代理 /api）\n`);
  } else {
    console.log(`  已托管前端构建产物（dist/），直接访问 http://localhost:${PORT}\n`);
  }
});
