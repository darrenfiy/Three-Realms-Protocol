import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  canonicalRouteIdKeys, displayTitleFor, firstMarkdownH1, firstMarkdownH2, loadCatalogPolicy,
} from '../src/catalog-policy.js';
import { assertUniqueRoutes, routePathFor, slugSegment } from '../src/route-path.js';
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
  assert.equal(routePathFor(document, { useIdRoute: false, nodeKind: 'document', policy }),
    'library/mb/mb-008-節律鏡像推論協議');

  const navigation = { path: 'DOCS/README.md', corpus: 'docs', idRaw: 'README-DOC' };
  assert.equal(routePathFor(navigation, { useIdRoute: true, nodeKind: 'navigation', policy }), 'library/docs');
});

test('only one non-historical document may own an ID route', () => {
  const current = { idRaw: 'LEX·999', authority: 'primary', statusMachine: 'Active' };
  const history = { idRaw: 'LEX·999', authority: 'historical', statusMachine: 'Active' };
  const superseded = { idRaw: 'LEX·999', authority: 'primary', statusMachine: 'Superseded' };
  assert.equal(canonicalRouteIdKeys([current], policy).size, 1);
  assert.equal(canonicalRouteIdKeys([current, history, superseded], policy).size, 1);
  assert.equal(canonicalRouteIdKeys([history], policy).size, 0);
  assert.equal(canonicalRouteIdKeys([current, { ...current }], policy).size, 0);
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
  assert.equal(firstMarkdownH2(`${content}\n## Subtitle\n`), 'Subtitle');
  assert.deepEqual(displayTitleFor({ path: 'DOCS/theory.md', title: 'theory', content }),
    { title: 'Visible title', titleBasis: 'heading' });
});

test('an ID-only H1 is paired with H2 or falls back to the filename', () => {
  const withSubtitle = { path: 'LEX/LEX·999-完整檔名.md', idRaw: 'LEX·999', title: 'LEX·999-完整檔名', content: '# LEX·999\n\n## 可閱讀的名稱\n' };
  assert.deepEqual(displayTitleFor(withSubtitle), { title: 'LEX·999 — 可閱讀的名稱', titleBasis: 'heading' });
  const withoutSubtitle = { ...withSubtitle, content: '# LEX·999\n\n正文。\n' };
  assert.deepEqual(displayTitleFor(withoutSubtitle), { title: 'LEX·999-完整檔名', titleBasis: 'filename' });
  const metadata = { ...withSubtitle, title: 'Metadata title' };
  assert.deepEqual(displayTitleFor(metadata), { title: 'Metadata title', titleBasis: 'metadata' });
});

test('source locale uses overrides, declared metadata, then deterministic script dominance', () => {
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/applications/3D-PSM/theory.md', content: '' }, policy),
    { sourceLocale: 'zh-Hans', sourceLocaleBasis: 'catalog-override' });
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/example.md', content: '---\nlanguage: fr\ntitle: Exemple\n---\n' }, policy),
    { sourceLocale: 'fr', sourceLocaleBasis: 'metadata' });

  const traditional = '# 原文\n\n這是一份繁體中文文件，說明協議如何保護關係與選擇。'.repeat(3)
    + '\n```js\nconst englishNoise = "must not win classification";\n```\n'
    + '[來源](https://example.com/a/very/long/english/path)';
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/traditional.md', content: traditional }, policy),
    { sourceLocale: 'zh-TW', sourceLocaleBasis: 'script-dominance' });

  const simplified = '# 原文\n\n这是一份简体中文文件，说明协议如何保护关系与选择。'.repeat(3);
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/simplified.md', content: simplified }, policy),
    { sourceLocale: 'zh-Hans', sourceLocaleBasis: 'script-dominance' });

  const english = '# Source\n\nThis document is written in English and remains the original source text.';
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/english.md', content: english }, policy),
    { sourceLocale: 'en', sourceLocaleBasis: 'script-dominance' });

  const technicalIndex = '# 中文工作台\n\n這裡收納協議文件與章節工作包；這些記錄維持繁體原文，並保護閱讀者的選擇。\n'
    + Array.from({ length: 20 }, (_, index) => `- [TRP_AI_FIRST_CH${index}_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH${index}_DRAFT_v0.1.md)`).join('\n');
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/technical-index.md', content: technicalIndex }, policy),
    { sourceLocale: 'zh-TW', sourceLocaleBasis: 'script-dominance' });

  const mixed = `${'這是繁體中文內容'.repeat(6)} ${'This is English content '.repeat(3)}`;
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/mixed.md', content: mixed }, policy),
    { sourceLocale: 'und', sourceLocaleBasis: 'und' });
  const variantAmbiguous = '天地人心生死日月山水火木金土'.repeat(3);
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/variant-ambiguous.md', content: variantAmbiguous }, policy),
    { sourceLocale: 'und', sourceLocaleBasis: 'und' });

  const scriptBoundary = '這國語體學術實義頭條變當將abcdefg';
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/script-boundary.md', content: scriptBoundary }, policy),
    { sourceLocale: 'zh-TW', sourceLocaleBasis: 'script-dominance' });
  const belowScriptBoundary = '這國語體學術實義頭條變當abcdefgh';
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/below-script-boundary.md', content: belowScriptBoundary }, policy),
    { sourceLocale: 'und', sourceLocaleBasis: 'und' });

  const variantBoundary = '這國語體汉天地人心生死日月山水火木金土佛';
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/variant-boundary.md', content: variantBoundary }, policy),
    { sourceLocale: 'zh-TW', sourceLocaleBasis: 'script-dominance' });
  const mixedVariants = '這國語汉体天地人心生死日月山水火木金土佛';
  assert.deepEqual(sourceLocaleFor({ path: 'DOCS/mixed-variants.md', content: mixedVariants }, policy),
    { sourceLocale: 'und', sourceLocaleBasis: 'und' });
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
    generatorRevision: '2',
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

test('manual validator rejects every non-string field required as a schema string', () => {
  const committed = JSON.parse(readFileSync(new URL('../generated/library-index.preview.json', import.meta.url), 'utf8'));
  for (const [field, value] of [['title', 42], ['shelf', {}], ['authority', true], ['sourceLocale', ['en']], ['keywords', [42]]]) {
    const mutated = structuredClone(committed);
    mutated.entries[0][field] = value;
    assert.throws(() => validateArtifact(mutated), new RegExp(field, 'u'));
  }
});

test('JSON schema and manual validator share path and P1 keyword limits', () => {
  const schema = JSON.parse(readFileSync(new URL('../schema/library-index.schema.json', import.meta.url), 'utf8'));
  const pathPattern = new RegExp(schema.$defs.entry.properties.path.pattern, 'u');
  assert.equal(pathPattern.test('DOCS/example.md'), true);
  assert.equal(pathPattern.test('DOCS//example.md'), false);
  assert.throws(() => validateRepoMarkdownPath('DOCS//example.md', 'path'), /repo-relative/u);
  assert.equal(schema.$defs.entry.properties.keywords.maxItems, 0);

  const committed = JSON.parse(readFileSync(new URL('../generated/library-index.preview.json', import.meta.url), 'utf8'));
  committed.entries[0].keywords = ['not-yet'];
  assert.throws(() => validateArtifact(committed), /keywords 在 P1 必須為空/u);
});

test('unknown policy revisions, route collisions, and duplicate fixtures fail closed', (t) => {
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'trp-library-policy-'));
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));
  const unknownPath = resolve(fixtureRoot, 'unknown-policy.json');
  writeFileSync(unknownPath, JSON.stringify({ ...policy, revision: '999' }), 'utf8');
  assert.throws(() => loadCatalogPolicy(unknownPath), /不支援/u);

  assert.throws(() => assertUniqueRoutes([
    { routePath: 'library/lex/same', path: 'LEX/one.md' },
    { routePath: 'library/lex/same', path: 'LEX/two.md' },
  ]), /route collision/u);

  const duplicatePolicyPath = resolve(fixtureRoot, 'duplicate-policy.json');
  const duplicate = structuredClone(policy);
  duplicate.profiles['walking-skeleton'].paths[1] = duplicate.profiles['walking-skeleton'].paths[0];
  writeFileSync(duplicatePolicyPath, JSON.stringify(duplicate), 'utf8');
  assert.throws(() => loadCatalogPolicy(duplicatePolicyPath), /11 個不重複/u);
});
