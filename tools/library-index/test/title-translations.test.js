import assert from 'node:assert/strict';
import test from 'node:test';
import { TITLE_LOCALES, TITLE_TRANSLATION_NOTICE, validateTitleTranslations } from '../src/title-translations.js';

function catalog() {
  return {
    schemaVersion: 2,
    generatorRevision: '3',
    readBasis: 'a'.repeat(40),
    publicationGroups: [{ introPath: 'DOCS/books/example/ORIGIN.md', memberPaths: ['DOCS/books/example/ORIGIN.md', 'DOCS/books/example/chapter.md'] }],
    entries: [
      { path: 'TRP-ATLAS.md', title: 'TRP Atlas', sourceLocale: 'en', shelf: 'orientation' },
      { path: 'DOCS/books/example/ORIGIN.md', title: '公開緣起', sourceLocale: 'zh-TW', shelf: 'publications' },
      { path: 'DOCS/books/example/chapter.md', title: '第一章', sourceLocale: 'zh-TW', shelf: 'publications' },
    ],
  };
}

function artifact() {
  const translations = (en, zh) => ({ en, 'zh-tw': zh, ja: '日本語', ko: '한국어', es: 'Español', fr: 'Français', de: 'Deutsch' });
  return {
    schemaVersion: 1,
    artifactType: 'trp-library-title-translations',
    profile: 'full', derived: true, notice: TITLE_TRANSLATION_NOTICE,
    catalogReadBasis: 'a'.repeat(40), catalogSchemaVersion: 2, catalogGeneratorRevision: '3',
    titlePolicyRevision: '1', locales: TITLE_LOCALES,
    generation: {
      mode: 'machine-translation-with-human-sample-review', provider: 'Fixture', model: 'fixture-v1', interface: 'test',
      generatedAt: '2026-10-06', reviewer: 'Codex（模型未提供）', glossaryRevision: '1',
      sampleReview: { method: 'fixture', sampleSize: 1, disposition: 'accept' },
    },
    entries: [
      { path: 'TRP-ATLAS.md', sourceTitle: 'TRP Atlas', sourceLocale: 'en', titles: translations('TRP Atlas', 'TRP 圖譜') },
      { path: 'DOCS/books/example/ORIGIN.md', sourceTitle: '公開緣起', sourceLocale: 'zh-TW', titles: translations('Public Origin', '公開緣起') },
    ],
  };
}

test('accepts exact canonical title coverage and excludes publication redirects', () => {
  assert.equal(validateTitleTranslations(artifact(), catalog()).entries.length, 2);
});

test('fails closed on missing locale and source-title drift', () => {
  const missing = artifact(); delete missing.entries[0].titles.de;
  assert.throws(() => validateTitleTranslations(missing, catalog()));
  const drift = artifact(); drift.entries[0].sourceTitle = 'Changed';
  assert.throws(() => validateTitleTranslations(drift, catalog()));
});
