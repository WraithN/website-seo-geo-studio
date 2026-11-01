// 通过 GitHub REST API 推送 commit（绕过 git HTTP 传输端点，代理只挡 github.com 时使用）。
// 关键点：
//   1) blob 内容取自 git 对象库（git cat-file），而不是工作区文件——避免 autocrlf 造成的字节差异
//   2) 精确复刻 author/committer 的时间戳与时区，使远程 commit SHA 与本地完全一致
// 流程：blob -> tree -> commit -> update ref
import { execFileSync } from 'node:child_process';

const REPO = process.env.GH_REPO || 'WraithN/website-seo-geo-studio';
const BRANCH = process.argv[2] || 'master';
const HEAD = process.argv[3] || 'HEAD';

function git(args, encoding = 'utf-8') {
  return execFileSync('git', args, { encoding, maxBuffer: 64 * 1024 * 1024 });
}
function gitText(args) {
  return git(args, 'utf-8').trim();
}

const GH_BIN =
  process.env.GH_BIN ||
  ['C:/Program Files/GitHub CLI/gh.exe', 'gh'].find((p) => {
    try { execFileSync(p, ['--version'], { stdio: 'ignore' }); return true; } catch { return false; }
  }) ||
  'gh';

const token = execFileSync(GH_BIN, ['auth', 'token'], { encoding: 'utf-8' }).trim();
const API = `https://api.github.com/repos/${REPO}`;

async function api(method, endpoint, body) {
  const res = await fetch(API + endpoint, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'website-seo-geo-studio-push',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${endpoint} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

// ---- 读取本地 commit 元数据 ----
const headSha = gitText(['rev-parse', HEAD]);
const parentSha = gitText(['rev-parse', `${HEAD}^`]);
const localTree = gitText(['rev-parse', `${HEAD}^{tree}`]);
const rawCommit = git(['cat-file', 'commit', HEAD], 'utf-8');
const headerEnd = rawCommit.indexOf('\n\n');
const headers = rawCommit.slice(0, headerEnd).split('\n');
const message = rawCommit.slice(headerEnd + 2);

const authorLine = headers.find((h) => h.startsWith('author '));
const committerLine = headers.find((h) => h.startsWith('committer '));

// "author Name <email> 1793575508 +0800" -> { name, email, date }
function parseIdent(line) {
  const m = line.match(/^(?:author|committer) (.*) <(.*)> (\d+) ([+-]\d{4})$/);
  if (!m) throw new Error('无法解析 ident: ' + line);
  const [, name, email, ts, tz] = m;
  const sign = tz[0] === '-' ? -1 : 1;
  const offMinutes = sign * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(3, 5)));
  // ts 是 Unix 秒；转成该时区的墙上时间（UTC 字段取值），再拼上原时区偏移
  const d = new Date((Number(ts) + offMinutes * 60) * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const iso =
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` +
    `${tz.slice(0, 3)}:${tz.slice(3)}`;
  return { name, email, date: iso };
}

const author = parseIdent(authorLine);
const committer = parseIdent(committerLine);
console.log(`本地 HEAD    = ${headSha}`);
console.log(`本地 tree    = ${localTree}`);
console.log(`父 commit    = ${parentSha}`);
console.log(`author       = ${author.name} <${author.email}> ${author.date}`);

// ---- 1) 变更清单 ----
const raw = gitText(['diff', '--name-status', parentSha, HEAD]);
const changes = raw.split('\n').filter(Boolean).map((line) => {
  const parts = line.split('\t');
  return { status: parts[0], path: parts[parts.length - 1] };
});
console.log(`变更文件 ${changes.length} 个`);

// ---- 2) 建 blob（内容取自 git 对象库）----
const entries = [];
for (const c of changes) {
  if (c.status.startsWith('D')) { console.log(`  跳过删除: ${c.path}`); continue; }
  const mode = gitText(['ls-tree', HEAD, '--', c.path]).split(/\s+/)[0];
  const buf = git(['cat-file', 'blob', `${HEAD}:${c.path}`], 'buffer');
  const blob = await api('POST', '/git/blobs', { content: buf.toString('base64'), encoding: 'base64' });
  entries.push({ path: c.path, mode, type: 'blob', sha: blob.sha });
  console.log(`  blob ${c.path} -> ${blob.sha.slice(0, 7)}`);
}

// ---- 3) 建 tree ----
const baseCommit = await api('GET', `/git/commits/${parentSha}`);
const tree = await api('POST', '/git/trees', { base_tree: baseCommit.tree.sha, tree: entries });
console.log(`tree -> ${tree.sha.slice(0, 7)}  (本地 ${localTree.slice(0, 7)})  ${tree.sha === localTree ? '✅ 一致' : '⚠️ 不一致'}`);
if (tree.sha !== localTree) throw new Error('tree 与本地不一致，已中止（避免污染远程）');

// ---- 4) 建 commit（复刻元数据）----
const commit = await api('POST', '/git/commits', {
  message,
  tree: tree.sha,
  parents: [parentSha],
  author,
  committer,
});
console.log(`commit -> ${commit.sha.slice(0, 7)}  (本地 ${headSha.slice(0, 7)})  ${commit.sha === headSha ? '✅ 一致' : '⚠️ 不一致'}`);
if (commit.sha !== headSha) throw new Error('commit SHA 与本地不一致，已中止（避免远程历史分叉）');

// ---- 5) 更新 ref ----
const ref = await api('PATCH', `/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
console.log(`ref ${BRANCH} -> ${ref.object.sha.slice(0, 7)}`);

// ---- 6) 校验 ----
const remote = await api('GET', `/git/commits/${commit.sha}`);
console.log(`\n远程 ${BRANCH} HEAD = ${remote.sha.slice(0, 7)}  msg="${remote.message.split('\n')[0]}"`);
console.log(remote.sha === headSha ? '✅ 本地与远程完全一致' : '❌ 不一致');
