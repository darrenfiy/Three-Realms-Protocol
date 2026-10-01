import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import { PublicCorpus, findRepoRoot, lookupKey } from '../../trp-mcp/src/corpus.js';
import { buildArtifact, catalogDrift, classifyDrift, serializeArtifact, sourceChangesSince } from '../src/build.js';
import { loadCatalogPolicy } from '../src/catalog-policy.js';

const root = findRepoRoot();
const policy = loadCatalogPolicy();
const artifactPath = resolve(root, 'tools/library-index/generated/library-index.preview.json');
const artifactSource = readFileSync(artifactPath, 'utf8');
const artifact = JSON.parse(artifactSource);
const fullArtifactPath = resolve(root, 'tools/library-index/generated/library-index.json');
const fullArtifactSource = readFileSync(fullArtifactPath, 'utf8');
const fullArtifact = JSON.parse(fullArtifactSource);

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
const fullCorpus = corpusAt(fullArtifact.readBasis);
const previewDrift = catalogDrift({ root, artifact, policy });
const fullDrift = catalogDrift({ root, artifact: fullArtifact, policy });

function fullArtifactForTest() {
  return fullArtifact;
}

function countsBy(entries, keyFor) {
  const counts = {};
  for (const entry of entries) {
    const key = keyFor(entry);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function fixtureGit(fixtureRoot, args) {
  return execFileSync('git', ['-C', fixtureRoot, ...args], {
    encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writeFixture(fixtureRoot, path, content) {
  const target = resolve(fixtureRoot, ...path.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

function byPath(path) {
  const entry = artifact.entries.find((item) => item.path === path);
  assert.ok(entry, `preview 缺少 ${path}`);
  return entry;
}

function byFullPath(path) {
  const entry = fullArtifact.entries.find((item) => item.path === path);
  assert.ok(entry, `full catalog 缺少 ${path}`);
  return entry;
}

test('committed preview is deterministic and has no drift that requires a rebuild', () => {
  const first = buildArtifact({ root, profile: 'walking-skeleton', readBasis: artifact.readBasis, policy, requireFresh: false });
  const second = buildArtifact({ root, profile: 'walking-skeleton', readBasis: artifact.readBasis, policy, requireFresh: false });
  assert.equal(serializeArtifact(first), serializeArtifact(second));
  assert.equal(serializeArtifact(artifact), artifactSource);
  assert.deepEqual(previewDrift.major, []);
  if (!previewDrift.minor.length) assert.equal(serializeArtifact(first), artifactSource);
});

test('committed full catalog is deterministic and has no drift that requires a rebuild', () => {
  const first = buildArtifact({ root, profile: 'full', readBasis: fullArtifact.readBasis, policy, requireFresh: false });
  const second = buildArtifact({ root, profile: 'full', readBasis: fullArtifact.readBasis, policy, requireFresh: false });
  assert.equal(serializeArtifact(first), serializeArtifact(second));
  assert.equal(serializeArtifact(fullArtifact), fullArtifactSource);
  assert.deepEqual(fullDrift.major, []);
  if (!fullDrift.minor.length) assert.equal(serializeArtifact(first), fullArtifactSource);
});

test('writing an artifact still requires sources to match readBasis', () => {
  if (!sourceChangesSince(root, fullArtifact.readBasis, fullCorpus).length) return;
  assert.throws(
    () => buildArtifact({ root, profile: 'full', readBasis: fullArtifact.readBasis, policy }),
    /來源自 readBasis 後已變動/u,
  );
});

test('drift splits rebuild-required changes from DOCS changes that can accumulate', () => {
  const entry = (path, corpus, extra = {}) => ({ path, corpus, title: path, version: null, ...extra });
  const committed = {
    schemaVersion: 1,
    readBasis: 'a'.repeat(40),
    entries: [
      entry('DOCS/cases/same.md', 'docs'),
      entry('DOCS/cases/edited.md', 'docs'),
      entry('DOCS/cases/rerouted.md', 'docs'),
      entry('EPOCH/bumped.md', 'epoch'),
      entry('EPOCH/content-only.md', 'epoch'),
      entry('LEX/removed.md', 'lex'),
    ],
  };
  const { entries, ...expectedHeader } = committed;
  const currentEntries = [
    entry('DOCS/cases/same.md', 'docs'),
    entry('DOCS/cases/edited.md', 'docs', { version: 'v0.2' }),
    entry('DOCS/cases/rerouted.md', 'docs', { title: 'moved by another entry' }),
    entry('EPOCH/bumped.md', 'epoch', { version: 'v0.2' }),
    entry('EPOCH/content-only.md', 'epoch'),
    entry('DOCS/cases/new.md', 'docs'),
    entry('SPEC/new.md', 'spec'),
  ];
  const changedSources = [
    'DOCS/cases/edited.md', 'EPOCH/bumped.md', 'EPOCH/content-only.md',
    'LEX/removed.md', 'DOCS/cases/new.md', 'SPEC/new.md',
  ];
  const drift = classifyDrift({ artifact: committed, expectedHeader, currentEntries, changedSources });
  assert.deepEqual(drift.minor, [
    { path: 'DOCS/cases/edited.md', reason: 'changed' },
    { path: 'DOCS/cases/new.md', reason: 'added' },
  ]);
  assert.deepEqual(drift.major, [
    { path: 'DOCS/cases/rerouted.md', reason: 'changed-without-source-change' },
    { path: 'EPOCH/bumped.md', reason: 'changed' },
    { path: 'LEX/removed.md', reason: 'removed' },
    { path: 'SPEC/new.md', reason: 'added' },
  ]);

  const boundary = classifyDrift({ artifact: committed, expectedHeader, currentEntries: entries, changedSources: ['CORPUS-MANIFEST.yaml'] });
  assert.deepEqual(boundary.major, [{ path: 'CORPUS-MANIFEST.yaml', reason: 'public-boundary' }]);
  const generator = classifyDrift({ artifact: committed, expectedHeader: { ...expectedHeader, schemaVersion: 2 }, currentEntries: entries, changedSources: [] });
  assert.deepEqual(generator.major, [{ path: null, reason: 'generator-or-policy' }]);
  const broken = classifyDrift({ artifact: committed, expectedHeader, currentEntries: [], changedSources: [], buildError: 'route collision' });
  assert.deepEqual(broken.major, [{ path: null, reason: 'build-error', detail: 'route collision' }]);
});

test('generated JSON has an LF checkout contract and LF bytes', () => {
  for (const [path, source] of [
    ['tools/library-index/generated/library-index.preview.json', artifactSource],
    ['tools/library-index/generated/library-index.json', fullArtifactSource],
  ]) {
    const attribute = fixtureGit(root, ['check-attr', 'eol', '--', path]);
    assert.match(attribute, /: eol: lf$/u);
    assert.equal(source.includes('\r'), false);
  }
});

test('freshness catches Unicode tracked, untracked, deleted, and renamed public paths', (t) => {
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'trp-library-freshness-'));
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));
  fixtureGit(fixtureRoot, ['init']);
  fixtureGit(fixtureRoot, ['config', 'user.email', 'library-index@example.invalid']);
  fixtureGit(fixtureRoot, ['config', 'user.name', 'Library Index Test']);

  const modified = 'LEX/LEX·901-會修改.md';
  const deleted = 'LEX/LEX·902-會刪除.md';
  const movedOutside = 'LEX/LEX·903-移出公開.md';
  const renamedOld = 'LEX/LEX·904-公開改名.md';
  const renamedNew = 'LEX/LEX·904-公開新名.md';
  const untracked = 'SPEC/SPEC·901-未追蹤.md';
  for (const path of [modified, deleted, movedOutside, renamedOld]) writeFixture(fixtureRoot, path, '# fixture\n');
  fixtureGit(fixtureRoot, ['add', '.']);
  fixtureGit(fixtureRoot, ['commit', '-m', 'fixture basis']);
  const basis = fixtureGit(fixtureRoot, ['rev-parse', 'HEAD']);

  writeFixture(fixtureRoot, modified, '# 已修改\n');
  rmSync(resolve(fixtureRoot, ...deleted.split('/')));
  mkdirSync(resolve(fixtureRoot, 'tools'), { recursive: true });
  fixtureGit(fixtureRoot, ['mv', movedOutside, 'tools/archived.md']);
  renameSync(resolve(fixtureRoot, ...renamedOld.split('/')), resolve(fixtureRoot, ...renamedNew.split('/')));
  writeFixture(fixtureRoot, untracked, '# 未追蹤\n');

  const changed = sourceChangesSince(fixtureRoot, basis, corpus);
  for (const path of [modified, deleted, movedOutside, renamedOld, renamedNew, untracked]) {
    assert.ok(changed.includes(path), `freshness 漏掉 ${path}`);
  }
  assert.equal(changed.includes('tools/archived.md'), false);
});

test('preview contains exactly the eleven policy fixtures and nothing outside PublicCorpus', () => {
  const wanted = policy.profiles['walking-skeleton'].paths;
  assert.equal(artifact.entries.length, 11);
  assert.deepEqual([...artifact.entries.map((entry) => entry.path)].sort(), [...wanted].sort());
  const publicPaths = new Set(corpus.entries.map((entry) => entry.path));
  assert.ok(artifact.entries.every((entry) => publicPaths.has(entry.path)));
});

test('full catalog contains every eligible public entry across the five corpora', () => {
  const pending = new Set(fullDrift.minor.filter(({ reason }) => reason === 'added').map(({ path }) => path));
  const expected = fullCorpus.entries
    .filter((entry) => policy.rootPaths.includes(entry.path)
      || policy.profiles.full.corpora.includes(entry.corpus))
    .map((entry) => entry.path)
    .filter((path) => !pending.has(path))
    .sort();
  const actual = fullArtifact.entries.map((entry) => entry.path).sort();
  assert.equal(fullArtifact.profile, 'full');
  assert.equal(fullArtifact.entries.length, 465);
  assert.deepEqual(actual, expected);
  assert.deepEqual(countsBy(fullArtifact.entries, (entry) => entry.corpus || 'orientation'), {
    orientation: 1,
    docs: 293,
    epoch: 84,
    lex: 11,
    mb: 17,
    spec: 59,
  });
});

test('full catalog DOCS shelves and lifecycle statistics match the reviewed source snapshot', () => {
  assert.deepEqual(countsBy(fullArtifact.entries, (entry) => entry.shelf), {
    orientation: 1,
    other: 1,
    academic: 8,
    applications: 23,
    publications: 55,
    cases: 206,
    epoch: 84,
    lex: 11,
    mb: 17,
    spec: 59,
  });
  assert.deepEqual(countsBy(fullArtifact.entries, (entry) => entry.listing), {
    primary: 319,
    candidate: 107,
    historical: 39,
  });
  assert.deepEqual(countsBy(fullArtifact.entries, (entry) => entry.status || 'null'), {
    Active: 138,
    Candidate: 34,
    Draft: 19,
    'Honored-Completion': 2,
    null: 209,
    Seed: 62,
    Superseded: 1,
  });
});

test('full catalog source locales are producer-classified and mixed bilingual files stay und', () => {
  assert.deepEqual(countsBy(fullArtifact.entries, (entry) => entry.sourceLocale), {
    en: 9,
    und: 2,
    'zh-Hans': 11,
    'zh-TW': 443,
  });
  assert.deepEqual(countsBy(fullArtifact.entries, (entry) => entry.sourceLocaleBasis), {
    'catalog-override': 11,
    'script-dominance': 452,
    und: 2,
  });
  assert.deepEqual(
    fullArtifact.entries.filter((entry) => entry.sourceLocale === 'und').map((entry) => entry.path),
    [
      'SPEC/history/005A-Integration-Memorandum.md',
      'SPEC/history/005B-Uplift-Safeguards-&-Anchoring-Protocol.md',
    ],
  );
  assert.equal(byFullPath('DOCS/books/trp-ai-first/README.md').sourceLocale, 'zh-TW');
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

  const full = fullArtifactForTest();
  const fullRoutes = new Map(full.entries.map((entry) => [entry.path, entry.routePath]));
  for (const entry of artifact.entries) assert.equal(entry.routePath, fullRoutes.get(entry.path));
  assert.equal(new Set(full.entries.map((entry) => entry.routePath)).size, full.entries.length);
});

test('every full-catalog resolve is unique and every fetch target is exact', () => {
  const full = fullArtifactForTest();
  for (const entry of full.entries) {
    if (!entry.lookupTarget) continue;
    if (entry.lookupTarget.kind === 'resolve') {
      const result = fullCorpus.resolve(entry.lookupTarget.id);
      assert.equal(result.ambiguous, false, entry.path);
      assert.equal(result.documents.length, 1, entry.path);
      assert.equal(result.documents[0].path, entry.path);
    } else {
      assert.equal(fullCorpus.standardFetch(entry.lookupTarget.path).id, entry.path);
    }
  }
});

test('full catalog never reduces a display title to only its protocol ID', () => {
  const idOnly = fullArtifactForTest().entries.filter((entry) => entry.id
    && lookupKey(entry.title) === lookupKey(entry.id));
  assert.deepEqual(idOnly.map((entry) => entry.path), []);
});

test('one current document keeps the ID route while history uses path routes', () => {
  const lex006 = fullArtifactForTest().entries.filter((entry) => entry.id === 'LEX·006');
  const current = lex006.filter((entry) => entry.listing !== 'historical');
  const history = lex006.filter((entry) => entry.listing === 'historical');
  assert.equal(current.length, 1);
  assert.ok(history.length >= 1);
  assert.equal(current[0].routePath, 'library/lex/lex-006');
  assert.equal(current[0].lookupTarget.kind, 'fetch');
  assert.ok(history.every((entry) => entry.routePath !== 'library/lex/lex-006'));

  const historicalFixture = byPath('SPEC/history/SPEC·MRC-001-Multi-AI-Resonance-Chamber.md');
  assert.equal(historicalFixture.listing, 'historical');
  assert.notEqual(historicalFixture.routePath, 'library/spec/spec-mrc-001');
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

test('full artifact projects every publication entry exactly once into four book introductions', () => {
  assert.deepEqual(
    fullArtifact.publicationGroups.map((group) => ({
      id: group.id,
      introPath: group.introPath,
      licenseSourcePath: group.licenseSourcePath,
      members: group.memberPaths.length,
    })),
    [
      {
        id: 'breathing',
        introPath: 'DOCS/books/book1/ORIGIN.md',
        licenseSourcePath: 'DOCS/books/book1/ORIGIN.md',
        members: 6,
      },
      {
        id: 'protocol-body-autobiography',
        introPath: 'DOCS/books/body_autobiography/ORIGIN.md',
        licenseSourcePath: 'DOCS/books/body_autobiography/ORIGIN.md',
        members: 3,
      },
      {
        id: 'trp-ai-first',
        introPath: 'DOCS/books/trp-ai-first/ORIGIN.md',
        licenseSourcePath: 'DOCS/books/trp-ai-first/ORIGIN.md',
        members: 5,
      },
      {
        id: 'heaven-and-earth',
        introPath: 'DOCS/books/book2/ORIGIN.md',
        licenseSourcePath: 'DOCS/books/book2/ORIGIN.md',
        members: 41,
      },
    ],
  );
  const assigned = fullArtifact.publicationGroups.flatMap((group) => group.memberPaths);
  const publications = fullArtifact.entries
    .filter((entry) => entry.shelf === 'publications')
    .map((entry) => entry.path)
    .sort();
  assert.equal(new Set(assigned).size, 55);
  assert.deepEqual([...assigned].sort(), publications);
  assert.equal(
    fullArtifact.publicationGroups
      .find((group) => group.id === 'protocol-body-autobiography')
      .memberPaths.includes('DOCS/books/AUTOBIOGRAPHY_PROJECT.md'),
    true,
  );
});

test('source URLs are pinned and navigation nodes never create lookup targets', () => {
  for (const [candidate, candidateCorpus] of [[artifact, corpus], [fullArtifact, fullCorpus]]) {
    assert.match(candidate.readBasis, /^[0-9a-f]{40}$/u);
    for (const entry of candidate.entries) {
      assert.equal(entry.sourceUrl, candidateCorpus.sourceUrl(entry.path), entry.path);
      if (entry.nodeKind === 'navigation') assert.equal(entry.lookupTarget, null, entry.path);
    }
  }
});

test('artifact never contains source bodies or per-file fingerprints', () => {
  for (const candidate of [artifact, fullArtifact]) {
    const serialized = JSON.stringify(candidate);
    assert.equal(/"(?:sha256|bytes|content)"\s*:/u.test(serialized), false);
    assert.ok(candidate.entries.every((entry) => entry.keywords.length === 0));
  }

  const prematureKeywords = structuredClone(fullArtifact);
  prematureKeywords.entries[0].keywords = ['not-yet'];
  assert.throws(() => serializeArtifact(prematureKeywords), /keywords 在 P1 必須為空/u);
});

test('missing walking-skeleton fixtures fail closed', () => {
  const missing = structuredClone(policy);
  missing.profiles['walking-skeleton'].paths[0] = 'LEX/LEX·999-不存在.md';
  assert.throws(
    () => buildArtifact({ root, profile: 'walking-skeleton', readBasis: artifact.readBasis, policy: missing, requireFresh: false }),
    /不在公開 catalog 候選/u,
  );
});
