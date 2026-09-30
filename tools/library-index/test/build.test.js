import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { PublicCorpus, findRepoRoot } from '../../trp-mcp/src/corpus.js';
import { buildArtifact, serializeArtifact, sourceChangesSince } from '../src/build.js';
import { loadCatalogPolicy } from '../src/catalog-policy.js';

const root = findRepoRoot();
const policy = loadCatalogPolicy();
const artifactPath = resolve(root, 'tools/library-index/generated/library-index.preview.json');
const artifactSource = readFileSync(artifactPath, 'utf8');
const artifact = JSON.parse(artifactSource);

function corpusAt(readBasis) {
  const previousCommit = process.env.TRP_BUILD_COMMIT;
  const previousImmutable = process.env.TRP_CORPUS_IMMUTABLE;
  process.env.TRP_BUILD_COMMIT = readBasis;
  process.env.TRP_CORPUS_IMMUTABLE = '1';
  try {
    return new PublicCorpus(root);
  } finally {
    if (previousCommit === undefined) delete process.env.TRP_BUILD_COMMIT;
    else process.env.TRP_BUILD_COMMIT = previousCommit;
    if (previousImmutable === undefined) delete process.env.TRP_CORPUS_IMMUTABLE;
    else process.env.TRP_CORPUS_IMMUTABLE = previousImmutable;
  }
}

const corpus = corpusAt(artifact.readBasis);

function byPath(path) {
  const entry = artifact.entries.find((item) => item.path === path);
  assert.ok(entry, `preview 缺少 ${path}`);
  return entry;
}

test('committed preview is deterministic and matches the current generator', () => {
  const first = buildArtifact({ root, profile: 'walking-skeleton', readBasis: artifact.readBasis, policy });
  const second = buildArtifact({ root, profile: 'walking-skeleton', readBasis: artifact.readBasis, policy });
  assert.equal(serializeArtifact(first), serializeArtifact(second));
  assert.equal(serializeArtifact(first), artifactSource);
  assert.deepEqual(sourceChangesSince(root, artifact.readBasis, corpus), []);
});

test('preview contains exactly the eleven policy fixtures and nothing outside PublicCorpus', () => {
  const wanted = policy.profiles['walking-skeleton'].paths;
  assert.equal(artifact.entries.length, 11);
  assert.deepEqual([...artifact.entries.map((entry) => entry.path)].sort(), [...wanted].sort());
  const publicPaths = new Set(corpus.entries.map((entry) => entry.path));
  assert.ok(artifact.entries.every((entry) => publicPaths.has(entry.path)));
});

test('title fallback records whether metadata, heading, or filename supplied the display title', () => {
  const atlas = byPath('TRP-ATLAS.md');
  assert.equal(atlas.title, 'TRP Atlas — 三界五行圖譜入口');
  assert.equal(atlas.titleBasis, 'heading');

  const theory = byPath('DOCS/applications/3D-PSM/theory.md');
  assert.equal(theory.title, '3D-PSM 理论框架');
  assert.equal(theory.titleBasis, 'heading');

  const specX = byPath('SPEC/SPEC·X-名稱場域與組織的區辨邊界.md');
  assert.equal(specX.title, '名稱、場域與組織的區辨邊界');
  assert.equal(specX.titleBasis, 'metadata');
});

test('duplicate IDs use path routes and exact fetch targets in every profile', () => {
  const english = byPath('MB/MB-008-Rhythm-Shadow-Inference-Protocol.md');
  const chinese = byPath('MB/MB-008-節律鏡像推論協議.md');
  assert.equal(english.id, 'MB·008');
  assert.equal(chinese.id, 'MB·008');
  assert.deepEqual(english.lookupTarget, { kind: 'fetch', path: english.path });
  assert.deepEqual(chinese.lookupTarget, { kind: 'fetch', path: chinese.path });
  assert.notEqual(english.routePath, chinese.routePath);
  assert.match(english.routePath, /^library\/mb\/mb-008-rhythm-shadow/u);
  assert.match(chinese.routePath, /^library\/mb\/mb-008-節律鏡像推論協議$/u);

  const full = buildArtifact({ root, profile: 'full', readBasis: artifact.readBasis, policy });
  const fullRoutes = new Map(full.entries.map((entry) => [entry.path, entry.routePath]));
  for (const entry of artifact.entries) assert.equal(entry.routePath, fullRoutes.get(entry.path));
  assert.equal(new Set(full.entries.map((entry) => entry.routePath)).size, full.entries.length);
});

test('every full-catalog resolve is unique and every fetch target is exact', () => {
  const full = buildArtifact({ root, profile: 'full', readBasis: artifact.readBasis, policy });
  for (const entry of full.entries) {
    if (!entry.lookupTarget) continue;
    if (entry.lookupTarget.kind === 'resolve') {
      const result = corpus.resolve(entry.lookupTarget.id);
      assert.equal(result.ambiguous, false, entry.path);
      assert.equal(result.documents.length, 1, entry.path);
      assert.equal(result.documents[0].path, entry.path);
    } else {
      assert.equal(corpus.standardFetch(entry.lookupTarget.path).id, entry.path);
    }
  }
});

test('version layers, candidate state, publication, and historical priority survive projection', () => {
  const lex = byPath('LEX/LEX·007-存在判準.md');
  assert.equal(lex.listing, 'primary');
  assert.equal(lex.version, 'v1.4');
  assert.equal(lex.latestActiveVersion, 'v1.5');
  assert.deepEqual(lex.candidateOverlay, {
    version: 'v1.6-candidate',
    status: '2026-07-23 Codex 第一輪，待 Fable / Squad；新增詞條尚未密封',
  });

  const candidate = byPath('EPOCH/EPOCH·META-014-受託的本體論-當改寫能力進入不屬於自己的世界.md');
  assert.equal(candidate.listing, 'candidate');
  assert.equal(candidate.status, 'Seed');

  const historical = byPath('SPEC/history/SPEC·MRC-001-Multi-AI-Resonance-Chamber.md');
  assert.equal(historical.listing, 'historical');
  assert.equal(historical.authority, 'historical');
  assert.equal(historical.status, 'Active');

  const publication = byPath('DOCS/books/book1/BOOK1_COMPLETE.md');
  assert.equal(publication.authority, 'publication');
  assert.equal(publication.shelf, 'publications');
});

test('source URLs are pinned and navigation nodes never create lookup targets', () => {
  assert.match(artifact.readBasis, /^[0-9a-f]{40}$/u);
  for (const entry of artifact.entries) {
    assert.equal(entry.sourceUrl, corpus.sourceUrl(entry.path), entry.path);
    if (entry.nodeKind === 'navigation') assert.equal(entry.lookupTarget, null, entry.path);
  }
});

test('artifact never contains source bodies or per-file fingerprints', () => {
  const serialized = JSON.stringify(artifact);
  assert.equal(/"(?:sha256|bytes|content)"\s*:/u.test(serialized), false);
  assert.ok(artifact.entries.every((entry) => entry.keywords.length === 0));
});
