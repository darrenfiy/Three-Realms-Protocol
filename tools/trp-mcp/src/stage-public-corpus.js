#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import { PublicCorpus, findRepoRoot } from './corpus.js';

function safeDestination(source, requested, allowInsideSource = false) {
  const destination = resolve(requested);
  const fromSource = relative(source, destination);
  const fromDestination = relative(destination, source);
  if (!isAbsolute(destination)
    || destination === source
    || destination === dirname(destination)
    || fromDestination === ''
    || (!fromDestination.startsWith('..') && !isAbsolute(fromDestination))
    || (!allowInsideSource && !fromSource.startsWith('..') && !isAbsolute(fromSource))) {
    throw new Error('Staging destination must be a dedicated directory outside the source repository.');
  }
  if (existsSync(destination)) {
    throw new Error('Staging destination must not already exist. Refusing to delete or overwrite it.');
  }
  return destination;
}

export function stagePublicCorpus(sourceRoot, requestedDestination, { allowInsideSource = false } = {}) {
  const source = resolve(sourceRoot || findRepoRoot());
  const destination = safeDestination(source, requestedDestination, allowInsideSource);
  const corpus = new PublicCorpus(source);

  mkdirSync(destination, { recursive: true });
  copyFileSync(join(source, 'CORPUS-MANIFEST.yaml'), join(destination, 'CORPUS-MANIFEST.yaml'));
  for (const entry of corpus.entries) {
    const target = join(destination, entry.path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(source, entry.path), target);
  }

  const bytes = corpus.entries.reduce((sum, entry) => sum + statSync(join(source, entry.path)).size, 0);
  return { destination, files: corpus.entries.length + 1, bytes, digest: corpus.digest };
}

if (process.argv[1]?.endsWith('stage-public-corpus.js')) {
  const source = process.argv[2] || findRepoRoot();
  const destination = process.argv[3];
  if (!destination) throw new Error('Usage: node stage-public-corpus.js <source-root> <destination>');
  process.stdout.write(`${JSON.stringify(stagePublicCorpus(source, destination))}\n`);
}
