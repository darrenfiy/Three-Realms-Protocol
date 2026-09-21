#!/usr/bin/env node
// `.mcp.json` 的進入點。server.js 在 import 期就需要 node_modules，因此這裡必須
// 先把相依裝好再「動態」載入它——寫成 static import 會在相依缺席時於載入期爆掉，
// 那正是 SessionStart hook 補不到的洞：MCP server 與 hook 同時起跑，hook 慢一步，
// 這一輪的 trp-public 就已經斷線了。相依就緒時本檔只多一次雜湊比對。
import { ensureDeps } from './ensure-deps.js';

const state = ensureDeps();
if (state === 'installed' || state === 'failed') {
  console.error(`[trp-mcp] 啟動前相依處理：${state}`);
}

const { startStdio } = await import('./server.js');
startStdio();
