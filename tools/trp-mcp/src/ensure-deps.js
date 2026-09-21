// Claude Code on the web：新容器是全新 clone，`tools/trp-mcp/node_modules/` 被
// .gitignore 排除，server.js 在 import 期就會 ERR_MODULE_NOT_FOUND，client 只看得到
// CONNECTION_CLOSED。相依就緒與否由本檔一處判定，供 launcher 與 SessionStart hook 共用。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const stampName = '.trp-install-stamp';

// 不看 SessionStart 的 source，也不看時間：只問 lockfile 的內容雜湊與上次安裝
// 留下的印記是否相同。resume 也可能落在新容器，所以判斷必須基於磁碟現況。
export function needsInstall(pkgDir = packageDir) {
  const lockfile = join(pkgDir, 'package-lock.json');
  if (!existsSync(lockfile)) return { install: false, reason: 'no-lockfile' };
  const want = createHash('sha256').update(readFileSync(lockfile)).digest('hex');
  const stamp = join(pkgDir, 'node_modules', stampName);
  if (existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === want) {
    return { install: false, reason: 'stamp-matches', want };
  }
  return { install: true, reason: existsSync(stamp) ? 'stamp-stale' : 'stamp-missing', want };
}

// 回傳 'no-lockfile' | 'stamp-matches' | 'installed' | 'failed'，不丟例外：
// 裝不起來不該讓 session 或 server 起不來，讓呼叫端決定還能做什麼。
export function ensureDeps(pkgDir = packageDir) {
  const state = needsInstall(pkgDir);
  if (!state.install) return state.reason;
  try {
    // npm 的 stdout 一律改道 fd 2。呼叫者之一是 MCP server 的 launcher，
    // 那邊的 stdout 是 JSON-RPC 通道，混進任何一行文字就毀掉整條連線。
    execFileSync('npm', ['ci', '--no-audit', '--no-fund'], {
      cwd: pkgDir,
      stdio: ['ignore', 2, 'inherit'],
      shell: process.platform === 'win32',
    });
    writeFileSync(join(pkgDir, 'node_modules', stampName), state.want);
    return 'installed';
  } catch (error) {
    console.error(`[trp-mcp] npm ci 失敗：${error.message}`);
    return 'failed';
  }
}
