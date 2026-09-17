import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { PublicCorpus, classifyPath, findRepoRoot, lookupKey } from '../src/corpus.js';

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

  assert.equal(corpus.entries.some((entry) => /^DOCS\/(sources|cases|meetings|wiki|LNS-A01)\//u.test(entry.path)), false);
  assert.equal(corpus.entries.some((entry) => entry.path.startsWith('tools/')), false);
});

test('review-required paths fail closed before general DOCS matching', () => {
  const corpus = new PublicCorpus(root);
  assert.equal(classifyPath('DOCS/sources/conversations/example.md', corpus.manifest).disposition, 'review-required');
  assert.equal(classifyPath('DOCS/cases/example.md', corpus.manifest).disposition, 'review-required');
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

test('the two unsafe ID decisions remain absent from the public index', () => {
  const corpus = new PublicCorpus(root);
  assert.equal(corpus.entries.some((entry) => entry.path === 'DOCS/cases/INDEX·ARC-語言代謝與自觀測-066-071.md'), false);
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
