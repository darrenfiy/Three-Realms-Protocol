import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAndValidateTitleTranslations } from '../src/title-translations.js';

const toolRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const catalogPath = resolve(toolRoot, 'generated/library-index.json');
const artifactPath = resolve(toolRoot, 'generated/library-title-translations.json');
const artifact = readAndValidateTitleTranslations({ artifactPath, catalogPath });
process.stdout.write(`title translations check passed: ${artifact.entries.length} canonical titles × ${artifact.locales.length} locales; catalog ${artifact.catalogReadBasis}\n`);
