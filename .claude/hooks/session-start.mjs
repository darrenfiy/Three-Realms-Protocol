#!/usr/bin/env node
// 遠端 session 的相依預熱。**它不是 trp-public 連得上的保證**：MCP server 與
// SessionStart hook 同時起跑，hook 慢一步，那一輪的 trp-public 就已經以
// CONNECTION_CLOSED 斷線了（2026-09-21 本機實測）。保證在 server 自己的
// launcher（`tools/trp-mcp/src/launch.js`）；本檔只是讓 `npm test` 之類
// 不經 launcher 的用法也有相依可用，並讓 launcher 通常不必真的去裝。
//
// 寫成 Node 而不是 shell：本庫已要求 Node 20+（MCP server 本身就是 Node），
// 而 .sh 在沒有 Git Bash 的 Windows 上會讓每個 session 都噴一次 hook 錯誤。
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 只在遠端環境執行；本機開發者自己管 node_modules。
if (process.env.CLAUDE_CODE_REMOTE !== 'true') process.exit(0);

const root = resolve(process.env.CLAUDE_PROJECT_DIR
  || join(dirname(fileURLToPath(import.meta.url)), '..', '..'));

// 安裝判斷與實作只有一份，在 tools/trp-mcp/src/ensure-deps.js；這裡不重抄。
// Windows 上 'C:\\...' 不是合法的 import specifier，必須轉成 file:// URL。
const { ensureDeps, packageDir } = await import(
  pathToFileURL(join(root, 'tools', 'trp-mcp', 'src', 'ensure-deps.js')).href);

const state = ensureDeps(packageDir);
if (state !== 'stamp-matches') console.error(`[session-start] trp-mcp 相依：${state}`);
