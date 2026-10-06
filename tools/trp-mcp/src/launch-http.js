#!/usr/bin/env node
// 本機常駐與全新 clone 的 HTTP 入口：先確認 lockfile 對應的相依已就緒，
// 再載入 HTTP server。Cloud Run image 已在 build 階段 npm ci，走這裡也只多一次雜湊比對。
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureDeps } from './ensure-deps.js';

const state = ensureDeps();
if (state === 'installed' || state === 'failed') {
  console.error(`[trp-mcp] HTTP 啟動前相依處理：${state}`);
}

async function prepareCommittedSnapshot() {
  const requested = String(process.env.TRP_SNAPSHOT_ROOT || '').trim();
  const revision = String(process.env.TRP_SNAPSHOT_REF || '').trim();
  if (!requested && !revision) return null;
  if (!requested || !revision) throw new Error('TRP_SNAPSHOT_ROOT 與 TRP_SNAPSHOT_REF 必須一起設定。');

  const destination = resolve(requested);
  if (destination === dirname(destination) || destination.split(/[\\/]/u).at(-1) !== 'trp-public-snapshot') {
    throw new Error('TRP_SNAPSHOT_ROOT 必須指向專用的 trp-public-snapshot 目錄。');
  }
  const protocolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const temporary = `${destination}.next-${process.pid}-${Date.now()}`;
  const previous = `${destination}.previous`;
  mkdirSync(dirname(destination), { recursive: true });

  const { stagePublicCorpusRevision } = await import('./stage-public-corpus.js');
  let staged;
  try {
    staged = stagePublicCorpusRevision(protocolRoot, temporary, revision);
    if (existsSync(previous)) rmSync(previous, { recursive: true, force: true });
    if (existsSync(destination)) renameSync(destination, previous);
    try {
      renameSync(temporary, destination);
    } catch (error) {
      if (!existsSync(destination) && existsSync(previous)) renameSync(previous, destination);
      throw error;
    }
    if (existsSync(previous)) rmSync(previous, { recursive: true, force: true });
  } catch (error) {
    if (existsSync(temporary)) rmSync(temporary, { recursive: true, force: true });
    throw error;
  }

  process.env.TRP_REPO_ROOT = destination;
  process.env.TRP_BUILD_COMMIT = staged.commit;
  process.env.TRP_CORPUS_IMMUTABLE = '1';
  process.stdout.write(`${JSON.stringify({
    severity: 'INFO',
    event: 'snapshot_ready',
    revision,
    commit: staged.commit,
    files: staged.files,
    corpusDigest: staged.digest,
  })}\n`);
  return staged;
}

try {
  await prepareCommittedSnapshot();
} catch (error) {
  console.error(`[trp-mcp] 無法從已推送版本建立公開快照：${error.message}`);
  process.exit(1);
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
