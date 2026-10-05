import { TITLE_LOCALES } from './title-translations.js';

const REVIEW_LEDGER = Object.freeze({
  en: 'Review Ledger', 'zh-tw': '審讀帳', ja: 'レビュー台帳', ko: '검토 원장',
  es: 'Libro de Revisión', fr: 'Registre de Relecture', de: 'Prüfprotokoll',
});

const AGREEMENT_TO_PROTOCOL = Object.freeze({
  en: [[/\bAgreements\b/gu, 'Protocols'], [/\bagreements\b/gu, 'protocols'], [/\bAgreement\b/gu, 'Protocol'], [/\bagreement\b/gu, 'protocol'], [/\bAgreed\b/gu, 'Protocol']],
  ja: [[/合意|協定/gu, 'プロトコル']],
  ko: [[/계약|합의|협정/gu, '프로토콜']],
  es: [[/\bacuerdos\b/giu, 'protocolos'], [/\bacuerdo\b/giu, 'protocolo']],
  fr: [[/\baccords\b/giu, 'protocoles'], [/\baccord\b/giu, 'protocole']],
  de: [[/Vereinbarungen/giu, 'Protokolle'], [/Vereinbarungs/giu, 'Protokoll'], [/Vereinbarung/giu, 'Protokoll'], [/\bAbkommen\b/giu, 'Protokoll']],
  'zh-tw': [],
});

function normalizeLeadingId(sourceTitle, translated) {
  const match = sourceTitle.match(/^((?:CASE|EPOCH|SPEC|LEX|MB)[·.-][A-Z0-9·.-]*\d)/u);
  if (!match) return translated;
  const id = match[1];
  if (translated.startsWith(id)) return translated;
  return translated.replace(/^[^\s:：—–]+/u, id);
}

export function applyTitleReview(entries, overrides = {}) {
  return entries.map((entry) => {
    const override = overrides[entry.path];
    if (override) {
      if (JSON.stringify(Object.keys(override)) !== JSON.stringify(TITLE_LOCALES)) throw new Error(`Override locale order is invalid: ${entry.path}`);
      return { ...entry, titles: override };
    }
    const titles = { ...entry.titles };
    const ledger = entry.sourceTitle.match(/^(EPOCH(?:[·-][A-Z0-9-]+)?) 審讀帳$/u);
    for (const locale of TITLE_LOCALES) {
      if (ledger) titles[locale] = `${ledger[1]} ${REVIEW_LEDGER[locale]}`;
      titles[locale] = normalizeLeadingId(entry.sourceTitle, titles[locale]);
      if (entry.sourceTitle.includes('協議')) {
        for (const [pattern, replacement] of AGREEMENT_TO_PROTOCOL[locale]) titles[locale] = titles[locale].replace(pattern, replacement);
      }
      titles[locale] = titles[locale].replace(/\s+([：:，,。！？!?；;）)】》])/gu, '$1').trim();
    }
    return { ...entry, titles };
  });
}
