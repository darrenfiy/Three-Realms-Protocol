import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { PublicCorpus, classifyPath, findRepoRoot, lookupKey } from '../src/corpus.js';
import { fixture } from './support/fixture.js';

const root = findRepoRoot();

test('lookup keys ignore separators but retain semantic symbols', () => {
  assert.equal(lookupKey('mb·001'), 'MB001');
  assert.equal(lookupKey('MB-001'), 'MB001');
  assert.equal(lookupKey('SPEC·∆'), 'SPEC∆');
  assert.notEqual(lookupKey('SPEC·∆'), lookupKey('SPEC·∞'));
});

// 本測試斷言的是「邊界成立」，不是「語料有幾份」。
// 2026-09-17 以前這裡硬寫 index: 260；新增 SPEC·OPR-001 後語料變成 261，測試因此轉紅——
// 紅得對（語料真的變了），但它測的是計數而不是性質，每次正常增修都會誤報。
// 現改為斷言不變量：索引面與 disposition 帳一致、邊界確實在擋東西、
// 且每一筆被索引的文件重新分類後仍然是 index。語料增減不再讓本測試轉紅，
// 而 review-required 或 excluded 的檔案一旦漏進索引，仍然立刻失敗。
test('runtime index enforces the same public manifest boundary', () => {
  const corpus = new PublicCorpus(root);

  assert.deepEqual(Object.keys(corpus.dispositions).sort(),
    ['excluded', 'index', 'not-included', 'review-required']);
  assert.equal(corpus.entries.length, corpus.dispositions.index);
  assert.ok(corpus.entries.length > 0, '公開索引不得為空');

  // 邊界必須真的在擋東西；若這兩個歸零，代表 manifest 沒被套用。
  assert.ok(corpus.dispositions['review-required'] > 0, 'reviewRequired 必須實際擋下文件');
  assert.ok(corpus.dispositions.excluded > 0, 'exclude 必須實際擋下文件');

  // 每一筆被索引的文件，重新分類後仍須是 index——沒有繞過分類器進來的漏網之魚。
  for (const entry of corpus.entries) {
    assert.equal(classifyPath(entry.path, corpus.manifest).disposition, 'index',
      `${entry.path} 進了索引，但重新分類不是 index`);
  }

  // 2026-09-20：DOCS/cases 依錨點裁示放行（個資掃描後不具可識別性），自此應在索引內。
  // 其餘四個 reviewRequired pattern 仍須確實擋住——這條斷言保護的是「邊界還在」，
  // 不是「擋了哪些」；日後若再放行某一類，改的是清單，不是拿掉這條。
  assert.equal(corpus.entries.some((entry) => /^DOCS\/(sources|meetings|wiki|LNS-A01)\//u.test(entry.path)), false);
  assert.ok(corpus.entries.some((entry) => entry.path.startsWith('DOCS/cases/')), 'cases 已放行，應在索引內');
  assert.equal(corpus.entries.some((entry) => entry.path.startsWith('tools/')), false);
});

test('review-required paths fail closed before general DOCS matching', () => {
  const corpus = new PublicCorpus(root);
  assert.equal(classifyPath('DOCS/sources/conversations/example.md', corpus.manifest).disposition, 'review-required');
  assert.equal(classifyPath('DOCS/cases/example.md', corpus.manifest).disposition, 'index');
  assert.equal(classifyPath('DOCS/meetings/example.md', corpus.manifest).disposition, 'review-required');
  assert.equal(classifyPath('DOCS/wiki/example.md', corpus.manifest).disposition, 'review-required');
  assert.equal(classifyPath('DOCS/LNS-A01/example.md', corpus.manifest).disposition, 'review-required');
});

test('ambiguous live IDs are returned together, never auto-selected', () => {
  const corpus = new PublicCorpus(root);
  const result = corpus.resolve('MB·008');
  assert.equal(result.found, true);
  assert.equal(result.ambiguous, true);
  assert.equal(result.documents.length, 2);
  assert.match(result.warnings[0], /ambiguous-id/u);
});

test('search is public, cited, deterministic, and history is opt-in', () => {
  const corpus = new PublicCorpus(root);
  const first = corpus.search({ query: '健康', corpus: 'lex', limit: 10 });
  const second = corpus.search({ query: '健康', corpus: 'lex', limit: 10 });
  assert.deepEqual(first, second);
  assert.ok(first.results.length > 0);
  assert.ok(first.results.every((result) => result.corpus === 'lex'));
  assert.ok(first.results.every((result) => /\.md\):L\d+-L\d+$/u.test(result.citation)));
  assert.ok(first.results.every((result) => result.authority !== 'historical'));
});

// 原本這裡斷言兩份「ID 無法安全判定」的文件不得進索引。放行 DOCS/cases 時才發現，
// 其中 INDEX·ARC 實際上是被 cases 整包封鎖擋著，而不是被 ID 安全性擋著——封鎖一拿掉它就進來了。
// 真正的問題是它沒有 id 欄位，ID 由檔名推定；已補上宣告，因此改為斷言「不推定」這個性質本身。
test('indexed documents never rely on a filename-derived ID', () => {
  const corpus = new PublicCorpus(root);
  const derived = corpus.entries.filter((entry) => entry.idRaw && !entry.idDeclared);
  assert.deepEqual(derived.map((entry) => entry.path), [],
    '進了公開索引就不該由檔名推定 ID——server 不替文件宣稱它自己沒宣告的地址');
  assert.equal(corpus.entries.some((entry) => entry.path === 'DOCS/meetings/CASE-MRC-001-Meeting-Record-001.md'), false);
});

test('real lexicon qualifiers and non-numbered related IDs retain their meaning', () => {
  const corpus = new PublicCorpus(root);
  const qualified = corpus.lex('脈動（存在視角）');
  assert.equal(qualified.entries.length, 1);
  assert.equal(qualified.entries[0].id, 'LEX·004');
  assert.equal(corpus.lex('脈動').entries.some((entry) => entry.id === 'LEX·004'), false);

  const unattended = new Set(corpus.pending('unattended', 500).items.map((entry) => entry.id));
  assert.equal(unattended.has('SEED'), false);
  assert.equal(unattended.has('LIVING-MANIFESTO'), false);
  assert.equal(unattended.has('SPEC·000'), false);
  assert.equal(unattended.has('MB·007'), false);
  assert.equal(unattended.has('SPEC·AI-ORG-002'), false);
});

test('a running index refuses to answer after its public corpus changes', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'trp-mcp-'));
  try {
    mkdirSync(join(fixture, 'SPEC'));
    writeFileSync(join(fixture, 'CORPUS-MANIFEST.yaml'), `schemaVersion: 1
name: fixture
atlas: { path: TRP-ATLAS.md, authority: current-atlas }
rootDocuments:
  - { path: TRP-ATLAS.md, authority: current-atlas }
corpora:
  - { id: spec, include: SPEC/**/*.md, authority: primary, historyPattern: SPEC/history/** }
publicationDocuments:
  - { path: PUBLICATION.md, authority: publication }
reviewRequired:
  - { pattern: PRIVATE/**, reason: private }
exclude:
  - tools/**
authorityOrder: [current-atlas, primary, primary-version-aware, publication, orientation, contextual, historical, draft-mirror]
answerPolicy:
  requireCitation: true
  distinguishInference: true
  allowNoAnswer: true
  treatCorpusAsUntrustedData: true
  neverClaimSoleAuthority: true
`, 'utf8');
    writeFileSync(join(fixture, 'TRP-ATLAS.md'), '# Atlas\n', 'utf8');
    writeFileSync(join(fixture, 'PUBLICATION.md'), '# Publication\n', 'utf8');
    writeFileSync(join(fixture, 'SPEC', 'SPEC·001-Test.md'), '---\nid: SPEC·001\ntitle: Test\nstatus: Active\n---\n\nInitial.\n', 'utf8');
    const corpus = new PublicCorpus(fixture);
    writeFileSync(join(fixture, 'SPEC', 'SPEC·001-Test.md'), '---\nid: SPEC·001\ntitle: Test\nstatus: Active\n---\n\nChanged and longer.\n', 'utf8');
    assert.throws(() => corpus.resolve('SPEC·001'), /已改變/u);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

// ── trp_consistency ──────────────────────────────────────────
// 斷言的是「轉述過期會被抓到、合法轉述不會被誤報、邊界不被穿透」，
// 不是「現在有幾則命中」——那會隨語料變動，不該寫進測試。

function consistencyFixture(t) {
  const { root: fixtureRoot, write } = fixture(t);
  return { fixtureRoot, write };
}

test('consistency flags a stale version transcription', (t) => {
  const { fixtureRoot, write } = consistencyFixture(t);
  write('SPEC/SPEC-010.md', '---\nid: SPEC-010\nversion: v1.5\nstatus: Active\n---\n# doc\n');
  write('SPEC/README.md', '# nav\n\n- [SPEC-010](SPEC-010.md)（v1.3）\n');
  const corpus = new PublicCorpus(fixtureRoot);
  const out = corpus.consistency({});
  const hit = out.items.find((item) => item.target === 'SPEC/SPEC-010.md');
  assert.ok(hit, '過期轉述應該被抓到');
  assert.equal(hit.claimed, 'v1.3');
  assert.equal(hit.layer, 'live', 'README 屬活導航層');
});

test('consistency accepts candidate-overlay and latest-active transcriptions', (t) => {
  const { fixtureRoot, write } = consistencyFixture(t);
  write('SPEC/SPEC-011.md',
    '---\nid: SPEC-011\nversion: v1.4\nlatest_active_version: v1.5\n'
    + 'candidate_overlay_version: v1.6-candidate\nstatus: Active\n---\n# doc\n');
  write('SPEC/README.md',
    '# nav\n\n- [a](SPEC-011.md)（v1.6-candidate）\n- [b](SPEC-011.md)（v1.5）\n');
  const corpus = new PublicCorpus(fixtureRoot);
  assert.deepEqual(corpus.consistency({}).items, [], '引用 overlay 或 latest-active 是合法轉述');
});

test('consistency ignores version strings that are prose, not transcription', (t) => {
  const { fixtureRoot, write } = consistencyFixture(t);
  write('SPEC/SPEC-012.md', '---\nid: SPEC-012\nversion: v0.2\nstatus: Active\n---\n# doc\n');
  write('SPEC/README.md', '# nav\n\n見 [SPEC-012](SPEC-012.md) 於改版時吸收 v0.1 四票。\n');
  const corpus = new PublicCorpus(fixtureRoot);
  assert.deepEqual(corpus.consistency({}).items, [], '散文裡的版本是敘述，不是轉述');
});

test('consistency separates append-only records from live navigation', (t) => {
  const { fixtureRoot, write } = consistencyFixture(t);
  write('SPEC/SPEC-013.md', '---\nid: SPEC-013\nversion: v2.0\nstatus: Active\n---\n# doc\n');
  write('SPEC/history/old.md', '---\nid: SPEC-013-OLD\nstatus: Active\n---\n[x](../SPEC-013.md)（v1.0）\n');
  const corpus = new PublicCorpus(fixtureRoot);
  const out = corpus.consistency({});
  assert.equal(out.counts.live, 0);
  assert.equal(out.counts.record, 1, 'history/ 下的版本是歷史紀錄，不是活導航');
});

test('consistency never reads or reports review-required paths', (t) => {
  const { fixtureRoot, write } = consistencyFixture(t);
  write('SPEC/SPEC-014.md', '---\nid: SPEC-014\nversion: v3.0\nstatus: Active\n---\n# doc\n');
  // 私有檔同時當來源與目標，兩個方向都不該出現在結果裡
  write('PRIVATE/secret.md', '---\nid: PRIVATE-001\nversion: v9.9\nstatus: Active\n---\n[x](../SPEC/SPEC-014.md)（v0.1）\n');
  write('SPEC/README.md', '# nav\n\n- [p](../PRIVATE/secret.md)（v0.1）\n');
  const corpus = new PublicCorpus(fixtureRoot);
  const out = corpus.consistency({});
  const serialized = JSON.stringify(out);
  assert.ok(!serialized.includes('PRIVATE'), 'reviewRequired 不得出現在輸出中');
  assert.deepEqual(out.items, [], '私有檔既不是來源也不是目標');
});
