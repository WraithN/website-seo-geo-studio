import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 数据库文件放在工程 data/ 目录，随工程一起存在（SQLite 文件即数据库）
const DATA_DIR = path.resolve(__dirname, '../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });
export const DB_PATH = path.join(DATA_DIR, 'seo-geo-studio.db');

// 文件型 SQLite（node:sqlite 自带持久化，每条语句自动提交）
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// ---- 建表（幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  suite TEXT NOT NULL DEFAULT 'uncategorized',
  description TEXT DEFAULT '',
  body TEXT DEFAULT '',
  references_list TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT DEFAULT '',
  json TEXT NOT NULL,
  nodes INTEGER DEFAULT 0,
  active INTEGER DEFAULT 0,
  version_id TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT '',
  html TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'research',
  seed TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  status_text TEXT DEFAULT '',
  steps TEXT DEFAULT '[]',
  result TEXT DEFAULT '',
  analysis TEXT DEFAULT '',
  plan TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 技能执行记录：一次「调用技能」的完整生命周期与产物
CREATE TABLE IF NOT EXISTS skill_runs (
  id TEXT PRIMARY KEY,
  suite TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  status_text TEXT DEFAULT '',
  input_json TEXT DEFAULT '{}',
  output_json TEXT DEFAULT '',
  provenance TEXT DEFAULT '',
  artifact_json TEXT DEFAULT '',
  artifact_md TEXT DEFAULT '',
  error TEXT DEFAULT '',
  upstream_id TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT DEFAULT ''
);
`);

// ---- 增量迁移：给已有库补列（SQLite 不支持 IF NOT EXISTS 的 ADD COLUMN） ----
function ensureColumn(table: string, col: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  if (!cols.some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
}
// step = 增长流程中的序号（1..10），工作台/系统为 0
ensureColumn('pages', 'step', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('workflows', 'step', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('skill_runs', 'site_id', "TEXT NOT NULL DEFAULT ''");

// ---- 站点（每个站点是一个独立建站容器，收拢「创建站点 → 内容生产 → 合规 → SEO → 外链 → 监控」全链路） ----
db.exec(`
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '全球/英语（宽松基线）',
  positioning TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '英语',
  site_type TEXT NOT NULL DEFAULT '',
  profile_json TEXT DEFAULT '{}',
  research_id TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

export interface SiteInput {
  name: string;
  domain?: string;
  region?: string;
  positioning?: string;
  language?: string;
  siteType?: string;
  researchId?: string;
}

/** 创建一个站点，返回新站点 id */
export function createSite(f: SiteInput): string {
  const id = crypto.randomUUID().slice(0, 12);
  run(
    `INSERT INTO sites (id,name,domain,region,positioning,language,site_type,research_id) VALUES (?,?,?,?,?,?,?,?)`,
    [
      id,
      f.name || '未命名站点',
      f.domain || '',
      f.region || '全球/英语（宽松基线）',
      f.positioning || '',
      f.language || '英语',
      f.siteType || '',
      f.researchId || '',
    ],
  );
  return id;
}

export function listSites(): any[] {
  return all('SELECT * FROM sites ORDER BY created_at DESC');
}

export function getSite(id: string): any | undefined {
  return get('SELECT * FROM sites WHERE id=?', [id]);
}

/** 局部更新站点字段（建档后回填、手动编辑等） */
export function updateSite(id: string, patch: Record<string, any>): void {
  const cols = Object.keys(patch);
  if (!cols.length) return;
  const set = cols.map((k) => `${k}=?`).join(',');
  run(`UPDATE sites SET ${set} WHERE id=?`, [...cols.map((k) => patch[k]), id]);
}

/** 把某次建档（create-site）产物写回站点档案，作为后续步骤的统一上下文 */
export function setSiteProfile(id: string, profileJson: string): void {
  run('UPDATE sites SET profile_json=? WHERE id=?', [profileJson, id]);
}

/** 删除站点（并解除其下运行的 site_id 关联） */
export function deleteSite(id: string): void {
  run('DELETE FROM sites WHERE id=?', [id]);
  run("UPDATE skill_runs SET site_id='' WHERE site_id=?", [id]);
}

// ---- 轻量查询封装 ----
export function all<T = any>(sql: string, params: any[] = []): T[] {
  return db.prepare(sql).all(...params) as T[];
}
export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}
export function run(sql: string, params: any[] = []): void {
  db.prepare(sql).run(...params);
}

export { DATA_DIR };
