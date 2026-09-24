import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { stagePublicCorpus } from '../src/stage-public-corpus.js';
import { document, fixture } from './support/fixture.js';

test('container staging copies public entries and never review-required files', (t) => {
  const { root, write } = fixture(t);
  write('SPEC/SPEC-001.md', document('SPEC-001', 'status: Active', 'public-sentinel'));
  write('PRIVATE/SPEC-999.md', document('SPEC-999', 'status: Active', 'withheld-sentinel'));
  const parent = mkdtempSync(join(tmpdir(), 'trp-public-stage-'));
  const destination = join(parent, 'corpus');
  t.after(() => rmSync(parent, { recursive: true, force: true }));

  const result = stagePublicCorpus(root, destination);
  assert.ok(result.files > 1);
  assert.equal(existsSync(join(destination, 'SPEC', 'SPEC-001.md')), true);
  assert.equal(existsSync(join(destination, 'PRIVATE', 'SPEC-999.md')), false);
  assert.match(readFileSync(join(destination, 'SPEC', 'SPEC-001.md'), 'utf8'), /public-sentinel/u);
});

test('container staging refuses a destination inside the source repository', (t) => {
  const { root } = fixture(t);
  assert.throws(() => stagePublicCorpus(root, join(root, 'stage')), /outside the source/u);
});

test('container staging refuses every pre-existing destination without deleting it', (t) => {
  const { root } = fixture(t);
  const parent = mkdtempSync(join(tmpdir(), 'trp-existing-stage-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  assert.throws(() => stagePublicCorpus(root, parent), /must not already exist/u);
  assert.equal(existsSync(parent), true);
});
