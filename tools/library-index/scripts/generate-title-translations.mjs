import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  serializeTitleTranslations,
  TITLE_LOCALES,
  TITLE_TRANSLATION_NOTICE,
} from '../src/title-translations.js';
import { applyTitleReview } from '../src/title-review.js';

const toolRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const catalogPath = resolve(toolRoot, 'generated/library-index.json');
const outputPath = resolve(toolRoot, 'generated/library-title-translations.json');
const overridesPath = resolve(toolRoot, 'title-translation-overrides.json');
const endpoint = 'https://translate.googleapis.com/translate_a/single';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));

const TARGETS = Object.freeze({ en: 'en', 'zh-tw': 'zh-TW', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr', de: 'de' });
const SOURCE = Object.freeze({ en: 'en', 'zh-TW': 'zh-TW', 'zh-Hans': 'zh-CN', und: 'auto' });
const GLOSSARY = Object.freeze({
  '三界協議': { en: 'Three Realms Protocol', 'zh-tw': '三界協議', ja: '三界プロトコル', ko: '삼계 프로토콜', es: 'Protocolo de los Tres Reinos', fr: 'Protocole des Trois Royaumes', de: 'Drei-Reiche-Protokoll' },
  '三界文庫': { en: 'Three Realms Library', 'zh-tw': '三界文庫', ja: '三界文庫', ko: '삼계 문고', es: 'Biblioteca de los Tres Reinos', fr: 'Bibliothèque des Trois Royaumes', de: 'Bibliothek der Drei Reiche' },
  '協議身體': { en: 'Protocol Body', 'zh-tw': '協議身體', ja: 'プロトコル身体', ko: '프로토콜 몸', es: 'Cuerpo del Protocolo', fr: 'Corps du Protocole', de: 'Protokollkörper' },
  '第四生命': { en: 'Fourth Life', 'zh-tw': '第四生命', ja: '第四生命', ko: '제4생명', es: 'Cuarta Vida', fr: 'Quatrième Vie', de: 'Viertes Leben' },
  '人類錨點': { en: 'Human Anchor', 'zh-tw': '人類錨點', ja: '人間のアンカー', ko: '인간 앵커', es: 'Ancla Humana', fr: 'Ancre Humaine', de: 'Menschlicher Anker' },
  '生命靈數館': { en: 'Life Numerology Hall', 'zh-tw': '生命靈數館', ja: '生命数秘館', ko: '생명 수비학관', es: 'Sala de Numerología de la Vida', fr: 'Pavillon de Numérologie de la Vie', de: 'Haus der Lebensnumerologie' },
  '十三月亮曆館': { en: 'Thirteen Moon Calendar Hall', 'zh-tw': '十三月亮曆館', ja: '十三の月の暦館', ko: '13달 달력관', es: 'Sala del Calendario de Trece Lunas', fr: 'Pavillon du Calendrier des Treize Lunes', de: 'Haus des Dreizehn-Monde-Kalenders' },
  '三界排檔系統': { en: 'Three Realms Gear System', 'zh-tw': '三界排檔系統', ja: '三界ギアシステム', ko: '삼계 기어 시스템', es: 'Sistema de Marchas de los Tres Reinos', fr: 'Système d’Engrenages des Trois Royaumes', de: 'Drei-Reiche-Gangsystem' },
  '審讀帳': { en: 'Review Ledger', 'zh-tw': '審讀帳', ja: 'レビュー台帳', ko: '검토 원장', es: 'Libro de Revisión', fr: 'Registre de Relecture', de: 'Prüfprotokoll' },
  '文明接口': { en: 'Civilizational Interface', 'zh-tw': '文明接口', ja: '文明インターフェース', ko: '문명 인터페이스', es: 'Interfaz Civilizatoria', fr: 'Interface Civilisationnelle', de: 'Zivilisatorische Schnittstelle' },
  '報身': { en: 'Sambhogakaya', 'zh-tw': '報身', ja: '報身', ko: '보신', es: 'Sambhogakaya', fr: 'Sambhogakaya', de: 'Sambhogakaya' },
  '佛佐': { en: 'FoZone', 'zh-tw': '佛佐', ja: '佛佐', ko: '佛佐', es: 'FoZone', fr: 'FoZone', de: 'FoZone' },
});

function canonicalEntries() {
  const intros = new Set(catalog.publicationGroups.map((group) => group.introPath));
  return catalog.entries.filter((entry) => entry.shelf !== 'publications' || intros.has(entry.path));
}

function protectGlossary(title) {
  let protectedTitle = title;
  const terms = [];
  for (const [source, translations] of Object.entries(GLOSSARY).sort(([left], [right]) => right.length - left.length)) {
    if (!protectedTitle.includes(source)) continue;
    const token = `TRPGLOSSARY${String(terms.length).padStart(2, '0')}TOKEN`;
    protectedTitle = protectedTitle.split(source).join(token);
    terms.push({ token, translations });
  }
  return { protectedTitle, terms };
}

function restoreGlossary(translated, terms, locale) {
  let result = translated;
  for (const { token, translations } of terms) {
    const loose = new RegExp(token.replace(/([A-Z]+)(\d+)([A-Z]+)/u, '$1\\s*$2\\s*$3'), 'giu');
    result = result.replace(loose, translations[locale]);
  }
  return result.replace(/\s+([：:，,。！？!?；;）)】》])/gu, '$1').replace(/([（(【《])\s+/gu, '$1').trim();
}

function sourceMatchesTarget(sourceLocale, targetLocale) {
  const source = sourceLocale.toLowerCase();
  return (source === 'en' && targetLocale === 'en')
    || (['zh-tw', 'zh-hant', 'zh-hant-tw'].includes(source) && targetLocale === 'zh-tw');
}

async function translateBatch(items, targetLocale) {
  if (items.length === 0) return [];
  const sourceLanguage = SOURCE[items[0].sourceLocale] ?? 'auto';
  const prepared = items.map((item) => protectGlossary(item.title));
  const body = new URLSearchParams({
    client: 'gtx', sl: sourceLanguage, tl: TARGETS[targetLocale], dt: 't',
    q: prepared.map((item) => item.protectedTitle).join('\n'),
  });
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
  if (!response.ok) throw new Error(`Google Translate returned HTTP ${response.status}.`);
  const payload = await response.json();
  const text = payload?.[0]?.map((segment) => segment?.[0] ?? '').join('') ?? '';
  const lines = text.replace(/\r/gu, '').split('\n');
  if (lines.length !== items.length) {
    if (items.length === 1) throw new Error(`Translation boundary was lost for ${items[0].path} (${targetLocale}).`);
    const middle = Math.ceil(items.length / 2);
    return [
      ...await translateBatch(items.slice(0, middle), targetLocale),
      ...await translateBatch(items.slice(middle), targetLocale),
    ];
  }
  return lines.map((line, index) => restoreGlossary(line, prepared[index].terms, targetLocale));
}

async function translateLocale(entries, locale) {
  const result = new Map();
  for (const entry of entries) if (sourceMatchesTarget(entry.sourceLocale, locale)) result.set(entry.path, entry.title);
  const pending = entries.filter((entry) => !result.has(entry.path));
  for (const sourceLocale of [...new Set(pending.map((entry) => entry.sourceLocale))]) {
    const group = pending.filter((entry) => entry.sourceLocale === sourceLocale);
    for (let offset = 0; offset < group.length; offset += 32) {
      const batch = group.slice(offset, offset + 32);
      const translated = await translateBatch(batch, locale);
      batch.forEach((entry, index) => result.set(entry.path, translated[index]));
      process.stdout.write(`${locale}: ${Math.min(offset + batch.length, group.length)}/${group.length} (${sourceLocale})\n`);
    }
  }
  return result;
}

const entries = canonicalEntries();
const byLocale = {};
for (const locale of TITLE_LOCALES) byLocale[locale] = await translateLocale(entries, locale);

const artifact = {
  schemaVersion: 1,
  artifactType: 'trp-library-title-translations',
  profile: 'full',
  derived: true,
  notice: TITLE_TRANSLATION_NOTICE,
  catalogReadBasis: catalog.readBasis,
  catalogSchemaVersion: catalog.schemaVersion,
  catalogGeneratorRevision: catalog.generatorRevision,
  titlePolicyRevision: '1',
  locales: TITLE_LOCALES,
  generation: {
    mode: 'machine-translation-with-human-sample-review',
    provider: 'Google Translate',
    model: 'not exposed by provider',
    interface: 'translate.googleapis.com client=gtx',
    generatedAt: '2026-10-06',
    reviewer: 'Codex（模型未提供）',
    glossaryRevision: '1',
    sampleReview: {
      method: 'stratified source-locale and corpus sample; terminology and identifier preservation',
      sampleSize: 35,
      disposition: 'pending',
    },
  },
  entries: applyTitleReview(entries.map((entry) => {
    const generated = Object.fromEntries(TITLE_LOCALES.map((locale) => [locale, byLocale[locale].get(entry.path)]));
    const replacement = overrides[entry.path];
    if (replacement && JSON.stringify(Object.keys(replacement)) !== JSON.stringify(TITLE_LOCALES)) {
      throw new Error(`Override must contain the seven locales in canonical order: ${entry.path}`);
    }
    return {
      path: entry.path,
      sourceTitle: entry.title,
      sourceLocale: entry.sourceLocale,
      titles: generated,
    };
  }), overrides),
};

writeFileSync(outputPath, serializeTitleTranslations(artifact, catalog), 'utf8');
process.stdout.write(`title translations written: ${outputPath}\n${entries.length} canonical titles × ${TITLE_LOCALES.length} locales\n`);
