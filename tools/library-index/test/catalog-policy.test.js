import assert from 'node:assert/strict';
import test from 'node:test';

import { displayTitleFor, firstMarkdownH1, loadCatalogPolicy } from '../src/catalog-policy.js';
import { routePathFor, slugSegment } from '../src/route-path.js';
import { sourceLocaleFor } from '../src/source-locale.js';
import { validateArtifact, validateRepoMarkdownPath } from '../src/validate.js';

const policy = loadCatalogPolicy();

test('route slug rules are explicit and stable for separators and semantic symbols', () => {
  assert.equal(slugSegment('SPEC·X', policy.routePolicy), 'spec-x');
  assert.equal(slugSegment('SPEC·∆', policy.routePolicy), 'spec-delta');
  assert.equal(slugSegment('SPEC·∞', policy.routePolicy), 'spec-infinity');
  assert.equal(slugSegment('3D_PSM　Theory', policy.routePolicy), '3d-psm-theory');
});

test('path routing is used for ambiguous IDs and strips a true navigation README', () => {
  const document = {
    path: 'MB/MB-008-節律鏡像推論協議.md', corpus: 'mb', idRaw: 'MB·008',
  };
  assert.equal(routePathFor(document, { idIsUnique: false, nodeKind: 'document', policy }),
    'library/mb/mb-008-節律鏡像推論協議');

  const navigation = { path: 'DOCS/README.md', corpus: 'docs', idRaw: 'README-DOC' };
  assert.equal(routePathFor(navigation, { idIsUnique: true, nodeKind: 'navigation', policy }), 'library/docs');
});

test('H1 fallback ignores frontmatter and fenced examples', () => {
  const content = `---
title: ignored by this focused helper
---

\`\`\`md
# Not this one
\`\`\`

# Visible **title**
`;
  assert.equal(firstMarkdownH1(content), 'Visible title');
  assert.deepEqual(displayTitleFor({ path: 'DOCS/theory.md', title: 'theory', content }),
    { title: 'Visible title', titleBasis: 'heading' });
});

test('source locale uses overrides, then declared metadata, otherwise und', () => {
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/applications/3D-PSM/theory.md', content: '' }, policy),
    { sourceLocale: 'zh-Hans', sourceLocaleBasis: 'catalog-override' });
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/example.md', content: '---\nlanguage: fr\ntitle: Exemple\n---\n' }, policy),
    { sourceLocale: 'fr', sourceLocaleBasis: 'metadata' });
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/unknown.md', content: '# 無宣告\n' }, policy),
    { sourceLocale: 'und', sourceLocaleBasis: 'und' });
});

test('schema validator fails closed on forbidden source data and unsafe paths', () => {
  const minimal = {
    schemaVersion: 1,
    artifactType: 'trp-library-index',
    profile: 'walking-skeleton',
    derived: true,
    notice: 'Derived navigation data; not protocol source text.',
    readBasis: 'a'.repeat(40),
    catalogPolicyRevision: '1',
    generatorRevision: '1',
    keywordPolicyRevision: null,
    generation: { mode: 'deterministic', provider: null, model: null, promptRevision: null },
    entries: [],
  };
  assert.deepEqual(validateArtifact(structuredClone(minimal)), minimal);
  const poisoned = structuredClone(minimal);
  poisoned.content = 'must not ship';
  assert.throws(() => validateArtifact(poisoned), /content.*不得出現/u);

  assert.doesNotThrow(() => validateRepoMarkdownPath('DOCS/example.md', 'path'));
  assert.throws(() => validateRepoMarkdownPath('../outside.md', 'path'), /repo-relative/u);
  assert.throws(() => validateRepoMarkdownPath('/absolute.md', 'path'), /repo-relative/u);
  assert.throws(() => validateRepoMarkdownPath('DOCS\\outside.md', 'path'), /repo-relative/u);
});
