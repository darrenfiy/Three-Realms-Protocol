#!/usr/bin/env node
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { stagePublicCorpus } from './stage-public-corpus.js';

export function prepareBuildContext(sourceRoot, requestedDestination) {
  const source = resolve(sourceRoot);
  const destination = resolve(requestedDestination);
  if (basename(destination) !== '.trp-mcp-build') {
    throw new Error('Build context destination must be named .trp-mcp-build.');
  }
  if (existsSync(destination)) {
    throw new Error('Build context already exists. Refusing to overwrite it.');
  }

  mkdirSync(destination, { recursive: true });
  const packageRoot = join(source, 'tools', 'trp-mcp');
  copyFileSync(join(packageRoot, 'package.json'), join(destination, 'package.json'));
  copyFileSync(join(packageRoot, 'package-lock.json'), join(destination, 'package-lock.json'));
  copyFileSync(join(packageRoot, 'Dockerfile'), join(destination, 'Dockerfile'));
  cpSync(join(packageRoot, 'src'), join(destination, 'src'), { recursive: true });
  stagePublicCorpus(source, join(destination, 'corpus'), { allowInsideSource: true });
  return destination;
}

if (process.argv[1]?.endsWith('prepare-build-context.js')) {
  const source = process.argv[2];
  const destination = process.argv[3];
  if (!source || !destination) {
    throw new Error('Usage: node prepare-build-context.js <source-root> <destination>');
  }
  process.stdout.write(`${JSON.stringify({ destination: prepareBuildContext(source, destination) })}\n`);
}
