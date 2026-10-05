import assert from 'node:assert/strict';
import test from 'node:test';
import { applyTitleReview } from '../src/title-review.js';

const titles = (value) => ({ en: value, 'zh-tw': value, ja: value, ko: value, es: value, fr: value, de: value });

test('review keeps protocol identifiers stable and repairs agreement-as-protocol', () => {
  const [entry] = applyTitleReview([{
    path: 'DOCS/cases/example.md', sourceTitle: 'CASE·META-007 — 協議身體', sourceLocale: 'zh-TW',
    titles: { ...titles('CASO·META-007 Agreement body'), de: 'FALL·META-007 – Vereinbarungskörper' },
  }]);
  assert.match(entry.titles.en, /Protocol/u);
  assert.equal(entry.titles.de.startsWith('CASE·META-007'), true);
  assert.match(entry.titles.de, /Protokoll/u);
});

test('review standardizes exact review-ledger titles and applies full overrides', () => {
  const input = { path: 'EPOCH/reviews/EPOCH-018.md', sourceTitle: 'EPOCH-018 審讀帳', sourceLocale: 'zh-TW', titles: titles('bad') };
  const [ledger] = applyTitleReview([input]);
  assert.equal(ledger.titles.en, 'EPOCH-018 Review Ledger');
  const [overridden] = applyTitleReview([input], { [input.path]: titles('curated') });
  assert.equal(overridden.titles.fr, 'curated');
});
