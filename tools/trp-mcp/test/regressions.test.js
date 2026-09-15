import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { PublicCorpus } from '../src/corpus.js';
import { document, fixture } from './support/fixture.js';

test('qualified versions cannot silently resolve to a different edition', (t) => {
  const { root, write } = fixture(t);
  write('LEX/LEX-001.md', document('LEX-001', 'version: v1.4-candidate\nstatus: Candidate'));
  const corpus = new PublicCorpus(root);
  assert.equal(corpus.resolve('LEX-001', 'v1.4-approved').found, false);
  assert.equal(corpus.resolve('LEX-001', 'v1.4-candidate').found, true);
  assert.equal(corpus.resolve('LEX-001', 'v1.4').documents[0].version, 'v1.4-candidate');
});

test('current state preserves explicit active and overlay version metadata', (t) => {
  const { root, write } = fixture(t);
  write('LEX/LEX-001.md', document('LEX-001', `version: v1.4
status: Living-Document
latest_active_version: v1.5
candidate_overlay_version: v1.6-candidate
candidate_overlay_status: awaiting review`));
  const result = new PublicCorpus(root).current('LEX-001');
  assert.equal(result.active[0].latestActiveVersion, 'v1.5');
  assert.deepEqual(result.candidates[0].candidateOverlay, {
    version: 'v1.6-candidate', status: 'awaiting review',
  });
});

test('archived drafts are historical, not current pending candidates', (t) => {
  const { root, write } = fixture(t);
  write('SPEC/history/SPEC-001.md', document('SPEC-001', 'status: Draft-for-Review'));
  const corpus = new PublicCorpus(root);
  assert.equal(corpus.pending('candidate').total, 0);
  const result = corpus.current('SPEC-001');
  assert.equal(result.candidates.length, 0);
  assert.equal(result.historical.length, 1);
});

test('unattended understands annotated, comma-separated, and YAML flow references', (t) => {
  const { root, write } = fixture(t);
  for (const id of ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010']) {
    write(`SPEC/SPEC-${id}.md`, document(`SPEC-${id}`));
  }
  write('SPEC/SPEC-020.md', document('SPEC-020', 'related: SPEC-001, SPEC·002'));
  write('SPEC/SPEC-021.md', document('SPEC-021', 'related:\n  - SPEC-003 (a title)\n  - SPEC·004（中文標題）\n  - SPEC-005-標題'));
  write('SPEC/SPEC-022.md', document('SPEC-022', 'related: [SPEC-006, "SPEC-007 (a title)"]'));
  write('SPEC/SPEC-023.md', document('SPEC-023', 'related:\n  - "[SPEC-008](SPEC-008.md)"\n  - SPEC-0099'));
  write('SPEC/SPEC-010.md', document('SPEC-010', 'related: SPEC-010'));
  const pending = new PublicCorpus(root).pending('unattended', 200).items.map((item) => item.id);
  for (const id of ['001', '002', '003', '004', '005', '006', '007', '008']) {
    assert.equal(pending.includes(`SPEC-${id}`), false, `SPEC-${id} has an incoming reference`);
  }
  assert.ok(pending.includes('SPEC-009'), 'an ID prefix is not an exact reference');
  assert.ok(pending.includes('SPEC-010'), 'a self-reference is not another document');
});

test('unattended recognizes non-numbered IDs without matching a longer ID prefix', (t) => {
  const { root, write } = fixture(t);
  write('README.md', document('LIVING-MANIFESTO'));
  write('SPEC/SPEC-001.md', document('SPEC-001', 'related: SEED（生成算子）, LIVING-MANIFESTO v2.1, EPOCH-018-REVIEW-LEDGER'));
  write('SPEC/SEED.md', document('SEED'));
  write('SPEC/EPOCH-018.md', document('EPOCH-018'));
  write('SPEC/EPOCH-018-REVIEW-LEDGER.md', document('EPOCH-018-REVIEW-LEDGER'));
  const pending = new PublicCorpus(root).pending('unattended', 200).items.map((item) => item.id);
  assert.equal(pending.includes('SEED'), false);
  assert.equal(pending.includes('LIVING-MANIFESTO'), false);
  assert.equal(pending.includes('EPOCH-018-REVIEW-LEDGER'), false);
  assert.ok(pending.includes('EPOCH-018'), 'a complete longer ID must not count as its shorter prefix');
});

test('unattended accepts filename title suffixes while preferring a longer declared ID', (t) => {
  const { root, write } = fixture(t);
  for (const id of ['SPEC-000', 'MB-007', 'SPEC-AI-ORG-002', 'EPOCH-018', 'EPOCH-018-REVIEW-LEDGER']) {
    write(`SPEC/${id}.md`, document(id));
  }
  write('SPEC/SOURCE.md', document('SOURCE', `related:
  - SPEC-000-Protocol-Prime
  - MB-007-Semantic-Wardrobe-Phenomenology
  - SPEC·AI-ORG-002-AI器官語義流動體的相位切換協議
  - EPOCH-018-REVIEW-LEDGER`));
  const pending = new PublicCorpus(root).pending('unattended', 200).items.map((item) => item.id);
  for (const id of ['SPEC-000', 'MB-007', 'SPEC-AI-ORG-002', 'EPOCH-018-REVIEW-LEDGER']) {
    assert.equal(pending.includes(id), false, `${id} has an incoming reference`);
  }
  assert.ok(pending.includes('EPOCH-018'), 'the longer ledger ID must win over its overlapping base ID');
});

test('lex returns the matching term section with boundaries and source lines', (t) => {
  const { root, write } = fixture(t);
  write('LEX/LEX-001.md', document('LEX-001', 'status: Active', 'An incidental mention of 健康.'));
  write('LEX/LEX-002.md', document('LEX-002', 'status: Living-Document', `# Dictionary
\`\`\`markdown
## 健康
This is only an example, not a term heading.
\`\`\`
## 健康 (Jiànkāng)
### 場域定義
不依賴崩潰作為校正機制。
### 區辨
健康不等於很能撐。
## 其他詞
This belongs to another term.`));
  write('LEX/history/LEX-003.md', document('LEX-003', 'status: Active', '## 健康\nOld definition.'));
  const corpus = new PublicCorpus(root);
  const result = corpus.lex('健康', 1);
  assert.equal(result.entries[0].id, 'LEX-002');
  assert.match(result.entries[0].content, /不依賴崩潰/u);
  assert.match(result.entries[0].content, /健康不等於很能撐/u);
  assert.doesNotMatch(result.entries[0].content, /only an example|其他詞/u);
  const { lineStart, lineEnd } = result.entries[0];
  const lines = readFileSync(join(root, 'LEX/LEX-002.md'), 'utf8').split(/\r?\n/u);
  assert.equal(result.entries[0].content, lines.slice(lineStart - 1, lineEnd).join('\n'));
  assert.equal(corpus.lex('incidental').entries.length, 0, 'a passing mention is not a definition');
});

test('lex preserves a Chinese parenthetical qualifier while stripping romanization', (t) => {
  const { root, write } = fixture(t);
  write('LEX/LEX-001.md', document('LEX-001', 'status: Active', '## 脈動 (Màidòng)\nBase definition.'));
  write('LEX/LEX-004.md', document('LEX-004', 'status: Active', '## 脈動（存在視角）(Màidòng — Cúnzài Shìjiǎo)\nQualified definition.'));
  const corpus = new PublicCorpus(root);
  assert.deepEqual(corpus.lex('脈動').entries.map((entry) => entry.id), ['LEX-001']);
  assert.deepEqual(corpus.lex('脈動（存在視角）').entries.map((entry) => entry.id), ['LEX-004']);
});

for (const target of ['document', 'manifest']) {
  test(`same-size ${target} edits with restored timestamps still invalidate the index`, (t) => {
    const { root, write } = fixture(t);
    const doc = 'SPEC/SPEC-001.md';
    write(doc, document('SPEC-001', 'status: Active'));
    const path = target === 'document' ? doc : 'CORPUS-MANIFEST.yaml';
    const full = join(root, path);
    const timestamp = new Date('2020-01-01T00:00:00Z');
    utimesSync(full, timestamp, timestamp);
    const corpus = new PublicCorpus(root);
    const original = readFileSync(full, 'utf8');
    const changed = target === 'document'
      ? original.replace('Initial.', 'Altered.')
      : original.replace('pattern: PRIVATE/**', 'pattern: SPEC/**   ');
    assert.equal(Buffer.byteLength(changed), Buffer.byteLength(original));
    write(path, changed);
    utimesSync(full, timestamp, timestamp);
    for (const call of [() => corpus.resolve('SPEC-001'), () => corpus.search({ query: 'Initial' }),
      () => corpus.current('SPEC-001'), () => corpus.lex('health'),
      () => corpus.pending(), () => corpus.manifestView()]) {
      assert.throws(call, { code: 'STALE_CORPUS' });
    }
  });
}

test('removing the manifest returns the documented stale error', (t) => {
  const { root } = fixture(t);
  const corpus = new PublicCorpus(root);
  unlinkSync(join(root, 'CORPUS-MANIFEST.yaml'));
  assert.throws(() => corpus.manifestView(), { code: 'STALE_CORPUS' });
});

test('private changes do not invalidate the public index; public additions do', (t) => {
  const { root, write } = fixture(t);
  const corpus = new PublicCorpus(root);
  write('PRIVATE/SPEC-001.md', document('SPEC-001', '', 'Private.'));
  assert.equal(corpus.resolve('SPEC-001').found, false);
  const publicPath = write('SPEC/SPEC-001.md', document('SPEC-001'));
  assert.throws(() => corpus.resolve('SPEC-001'), { code: 'STALE_CORPUS' });
  unlinkSync(publicPath);
  assert.throws(() => corpus.manifestView(), { code: 'STALE_CORPUS' }, 'a detected change requires restart even if reverted');
});

test('long lex sections report truncation and keep citations on quoted lines', (t) => {
  const { root, write } = fixture(t);
  write('LEX/LEX-001.md', document('LEX-001', 'status: Active', `## Term\n${'A long definition line.\n'.repeat(2000)}`));
  const result = new PublicCorpus(root).lex('Term').entries[0];
  assert.ok(result.truncated);
  assert.ok(result.content.length <= 30_000);
  assert.ok(result.warnings.includes('content-truncated:30000'));
  const lines = readFileSync(join(root, 'LEX/LEX-001.md'), 'utf8').split(/\r?\n/u);
  assert.equal(result.content, lines.slice(result.lineStart - 1, result.lineEnd).join('\n'));
});
