#!/bin/bash
# Claude Code on the web：新容器是全新 clone，tools/trp-mcp/node_modules/ 被 .gitignore
# 排除，因此 .mcp.json 啟動 trp-public 時會以 ERR_MODULE_NOT_FOUND 立即斷線
# （session 只看得到 CONNECTION_CLOSED）。這裡先把相依套件裝好，MCP 才連得上。
set -euo pipefail

# 只在遠端環境執行；本機開發者自己管 node_modules。
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}/tools/trp-mcp"

# 依 lockfile 安裝，與 README 的 `npm ci` 一致；重跑安全。
npm ci --no-audit --no-fund
