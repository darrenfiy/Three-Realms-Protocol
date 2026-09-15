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

test('runtime index enforces the same public manifest boundary', () => {
  const corpus = new PublicCorpus(root);
  assert.equal(corpus.entries.length, 260);
  assert.deepEqual(corpus.dispositions, {
    index: 260,
    'review-required': 224,
    excluded: 124,
    'not-included': 1,
  });
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
