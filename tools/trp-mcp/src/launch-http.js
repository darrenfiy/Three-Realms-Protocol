#!/usr/bin/env node
// 本機常駐與全新 clone 的 HTTP 入口：先確認 lockfile 對應的相依已就緒，
// 再載入 HTTP server。Cloud Run image 已在 build 階段 npm ci，走這裡也只多一次雜湊比對。
import { ensureDeps } from './ensure-deps.js';

const state = ensureDeps();
if (state === 'installed' || state === 'failed') {
  console.error(`[trp-mcp] HTTP 啟動前相依處理：${state}`);
}

let startHttp;
try {
  ({ startHttp } = await import('./http.js'));
} catch (error) {
  console.error(`[trp-mcp] 載入 HTTP server 失敗（相依處理：${state}）：${error.message}`);
  console.error('[trp-mcp] 先在 tools/trp-mcp 執行 npm ci，再重新啟動。');
  process.exit(1);
}

startHttp();
