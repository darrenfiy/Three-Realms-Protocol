import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTitleReview } from '../src/title-review.js';
import { serializeTitleTranslations } from '../src/title-translations.js';

const toolRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const catalog = JSON.parse(readFileSync(resolve(toolRoot, 'generated/library-index.json'), 'utf8'));
const artifactPath = resolve(toolRoot, 'generated/library-title-translations.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
const overrides = JSON.parse(readFileSync(resolve(toolRoot, 'title-translation-overrides.json'), 'utf8'));

artifact.entries = applyTitleReview(artifact.entries, overrides);
artifact.generation.sampleReview.disposition = 'accept-with-corrections';
writeFileSync(artifactPath, serializeTitleTranslations(artifact, catalog), 'utf8');
process.stdout.write(`applied title review: ${artifact.entries.length} entries; ${Object.keys(overrides).length} full overrides\n`);
