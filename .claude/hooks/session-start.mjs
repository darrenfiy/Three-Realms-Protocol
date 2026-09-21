#!/usr/bin/env node
// Claude Code on the web：新容器是全新 clone，tools/trp-mcp/node_modules/ 被 .gitignore
// 排除，因此 .mcp.json 啟動 trp-public 時會以 ERR_MODULE_NOT_FOUND 立即斷線
// （session 端只看得到 CONNECTION_CLOSED）。這裡先把相依裝好，MCP 才連得上。
//
// 寫成 Node 而不是 shell：本庫已要求 Node 20+（MCP server 本身就是 Node），
// 而 .sh 在沒有 Git Bash 的 Windows 上會讓每個 session 都噴一次 hook 錯誤。
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 只在遠端環境執行；本機開發者自己管 node_modules。
if (process.env.CLAUDE_CODE_REMOTE !== 'true') process.exit(0);

const root = resolve(process.env.CLAUDE_PROJECT_DIR
  || join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const pkgDir = join(root, 'tools', 'trp-mcp');
const lockfile = join(pkgDir, 'package-lock.json');
const stamp = join(pkgDir, 'node_modules', '.trp-install-stamp');

if (!existsSync(lockfile)) {
  console.error(`[session-start] 找不到 ${lockfile}，略過。`);
  process.exit(0);
}

// SessionStart 在 startup、resume、clear、compact 都會觸發。容器有可能是新的
// （resume 也會落到新容器），所以不能依 source 判斷，改看相依是否真的就緒：
// lockfile 內容雜湊與上次安裝留下的印記相同就跳過，避免每次都重跑 npm ci。
const want = createHash('sha256').update(readFileSync(lockfile)).digest('hex');
if (existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === want) process.exit(0);

try {
  execFileSync('npm', ['ci', '--no-audit', '--no-fund'], {
    cwd: pkgDir, stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32',
  });
  writeFileSync(stamp, want);
} catch (error) {
  // 裝不起來不該讓 session 起不來；MCP 會斷線，但其餘工作仍可進行。
  console.error(`[session-start] npm ci 失敗：${error.message}`);
  process.exit(0);
}
