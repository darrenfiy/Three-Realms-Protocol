import { readFileSync } from 'node:fs';

export const TITLE_LOCALES = Object.freeze(['en', 'zh-tw', 'ja', 'ko', 'es', 'fr', 'de']);
export const TITLE_TRANSLATION_NOTICE = 'Model-generated navigation titles; Protocol source titles remain authoritative.';

const ROOT_KEYS = [
  'schemaVersion', 'artifactType', 'profile', 'derived', 'notice',
  'catalogReadBasis', 'catalogSchemaVersion', 'catalogGeneratorRevision',
  'titlePolicyRevision', 'locales', 'generation', 'entries',
];
const GENERATION_KEYS = [
  'mode', 'provider', 'model', 'interface', 'generatedAt', 'reviewer',
  'glossaryRevision', 'sampleReview',
];
const SAMPLE_REVIEW_KEYS = ['method', 'sampleSize', 'disposition'];
const ENTRY_KEYS = ['path', 'sourceTitle', 'sourceLocale', 'titles'];

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`${label} fields do not match the P2 contract.`);
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} must be a non-empty string.`);
  if (/\r|\n|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new Error(`${label} contains a forbidden control character.`);
}

function canonicalEntries(catalog) {
  const intros = new Set(catalog.publicationGroups.map((group) => group.introPath));
  return catalog.entries.filter((entry) => entry.shelf !== 'publications' || intros.has(entry.path));
}

export function validateTitleTranslations(artifact, catalog) {
  exactKeys(artifact, ROOT_KEYS, 'title translation artifact');
  if (artifact.schemaVersion !== 1 || artifact.artifactType !== 'trp-library-title-translations' || artifact.profile !== 'full') {
    throw new Error('Title translation artifact identity is unsupported.');
  }
  if (artifact.derived !== true || artifact.notice !== TITLE_TRANSLATION_NOTICE) throw new Error('Title translations must identify themselves as derived navigation data.');
  if (!/^[0-9a-f]{40}$/u.test(artifact.catalogReadBasis) || artifact.catalogReadBasis !== catalog.readBasis) throw new Error('Title translations do not match the catalog readBasis.');
  if (artifact.catalogSchemaVersion !== catalog.schemaVersion || artifact.catalogGeneratorRevision !== catalog.generatorRevision) throw new Error('Title translations do not match the catalog schema/generator.');
  if (artifact.titlePolicyRevision !== '1') throw new Error('Unsupported title translation policy revision.');
  if (JSON.stringify(artifact.locales) !== JSON.stringify(TITLE_LOCALES)) throw new Error('Title translation locales or locale order changed.');

  exactKeys(artifact.generation, GENERATION_KEYS, 'generation');
  if (artifact.generation.mode !== 'machine-translation-with-human-sample-review') throw new Error('Unexpected title generation mode.');
  for (const key of ['provider', 'model', 'interface', 'generatedAt', 'reviewer', 'glossaryRevision']) nonEmptyString(artifact.generation[key], `generation.${key}`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(artifact.generation.generatedAt)) throw new Error('generation.generatedAt must be an ISO date.');
  exactKeys(artifact.generation.sampleReview, SAMPLE_REVIEW_KEYS, 'generation.sampleReview');
  nonEmptyString(artifact.generation.sampleReview.method, 'generation.sampleReview.method');
  nonEmptyString(artifact.generation.sampleReview.disposition, 'generation.sampleReview.disposition');
  if (!['pending', 'accept', 'accept-with-corrections'].includes(artifact.generation.sampleReview.disposition)) throw new Error('generation.sampleReview.disposition is unsupported.');
  if (!Number.isInteger(artifact.generation.sampleReview.sampleSize) || artifact.generation.sampleReview.sampleSize < 1) throw new Error('generation.sampleReview.sampleSize must be positive.');

  if (!Array.isArray(artifact.entries)) throw new Error('Title translation entries must be an array.');
  const expected = canonicalEntries(catalog);
  if (artifact.entries.length !== expected.length) throw new Error(`Title translations cover ${artifact.entries.length}/${expected.length} canonical entries.`);
  for (const [index, item] of artifact.entries.entries()) {
    exactKeys(item, ENTRY_KEYS, `entries[${index}]`);
    const source = expected[index];
    if (item.path !== source.path || item.sourceTitle !== source.title || item.sourceLocale !== source.sourceLocale) {
      throw new Error(`entries[${index}] does not match the catalog entry order/title/locale: ${source.path}`);
    }
    exactKeys(item.titles, TITLE_LOCALES, `entries[${index}].titles`);
    for (const locale of TITLE_LOCALES) nonEmptyString(item.titles[locale], `entries[${index}].titles.${locale}`);
  }
  if (new Set(artifact.entries.map((entry) => entry.path)).size !== artifact.entries.length) throw new Error('Title translation paths must be unique.');
  return artifact;
}

export function readAndValidateTitleTranslations({ artifactPath, catalogPath }) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
  return validateTitleTranslations(artifact, catalog);
}

export function serializeTitleTranslations(artifact, catalog) {
  return `${JSON.stringify(validateTitleTranslations(artifact, catalog), null, 2)}\n`;
}
