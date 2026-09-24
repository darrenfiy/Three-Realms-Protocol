import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

import { needsInstall, packageDir, stampName } from '../src/ensure-deps.js';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function pkgFixture(t, { lockfile = '{"lockfileVersion":3}', stamp = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'trp-deps-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (lockfile !== null) writeFileSync(join(root, 'package-lock.json'), lockfile, 'utf8');
  if (stamp !== null) {
    mkdirSync(join(root, 'node_modules'), { recursive: true });
    writeFileSync(join(root, 'node_modules', stampName), stamp, 'utf8');
  }
  return root;
}

// launcher 存在的唯一理由：相依缺席時 server.js 會在 import 期就死，
// client 只看得到 CONNECTION_CLOSED。相依就緒時它必須與直接起動完全等價。
test('launcher serves the same nine read-only tools over stdio', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(packageRoot, 'src', 'launch.js')],
    cwd: packageRoot,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'trp-launch-test', version: '0.1.0' });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.deepEqual(
      listed.tools.map((tool) => tool.name).sort(),
      ['fetch', 'search', 'trp_consistency', 'trp_current', 'trp_lex', 'trp_manifest', 'trp_pending', 'trp_resolve', 'trp_search'],
    );
    const manifest = await client.callTool({ name: 'trp_manifest', arguments: {} });
    assert.equal(manifest.isError, undefined);
    assert.equal(manifest.structuredContent.profile, 'public-only');
  } finally {
    await client.close();
  }
});

test('install is decided by lockfile digest, not by session source or mtime', (t) => {
  const missing = pkgFixture(t);
  assert.equal(needsInstall(missing).install, true);
  assert.equal(needsInstall(missing).reason, 'stamp-missing');

  const stale = pkgFixture(t, { stamp: 'a'.repeat(64) });
  assert.equal(needsInstall(stale).install, true);
  assert.equal(needsInstall(stale).reason, 'stamp-stale');

  const fresh = pkgFixture(t, { stamp: needsInstall(pkgFixture(t)).want });
  assert.equal(needsInstall(fresh).install, false);
  assert.equal(needsInstall(fresh).reason, 'stamp-matches');
});

// 沒有 lockfile 就不該自作主張裝東西——那是別人的目錄，不是本包。
test('a directory without a lockfile is never installed into', (t) => {
  const bare = pkgFixture(t, { lockfile: null });
  assert.deepEqual(needsInstall(bare), { install: false, reason: 'no-lockfile' });
});

// 本包自己在測試執行時必然已就緒；若這條轉紅，代表 stamp 與 lockfile 脫鉤了。
test('this package reports ready while its own tests are running', () => {
  assert.equal(needsInstall(packageDir).install, false);
});
