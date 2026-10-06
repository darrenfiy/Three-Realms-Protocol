#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import YAML from 'yaml';

import { PublicCorpus, classifyPath, findRepoRoot, validateManifest } from './corpus.js';

const GIT_OUTPUT_LIMIT = 128 * 1024 * 1024;

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

function git(source, args, encoding = null) {
  return execFileSync('git', ['-C', source, ...args], {
    encoding,
    maxBuffer: GIT_OUTPUT_LIMIT,
    windowsHide: true,
  });
}

function gitBlobs(source, specs) {
  if (specs.some((spec) => /[\r\n]/u.test(spec))) throw new Error('Git blob paths may not contain newlines.');
  const output = execFileSync('git', ['-C', source, 'cat-file', '--batch'], {
    input: `${specs.join('\n')}\n`,
    maxBuffer: GIT_OUTPUT_LIMIT,
    windowsHide: true,
  });
  const blobs = [];
  let offset = 0;
  for (const spec of specs) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) throw new Error(`Git batch response is incomplete for ${spec}.`);
    const header = output.subarray(offset, headerEnd).toString('utf8');
    const match = header.match(/^[0-9a-f]+ blob (\d+)$/u);
    if (!match) throw new Error(`Git could not read ${spec}: ${header}`);
    const size = Number(match[1]);
    const start = headerEnd + 1;
    const end = start + size;
    if (end >= output.length || output[end] !== 0x0a) throw new Error(`Git batch body is incomplete for ${spec}.`);
    blobs.push(output.subarray(start, end));
    offset = end + 1;
  }
  return blobs;
}

/**
 * Materialize only the public corpus from one committed Git tree. The working
 * tree is never read, so drafts and unpushed commits cannot enter this stage.
 */
export function stagePublicCorpusRevision(
  sourceRoot,
  requestedDestination,
  revision = '@{upstream}',
) {
  const source = resolve(sourceRoot || findRepoRoot());
  const destination = safeDestination(source, requestedDestination);
  const commit = String(git(source, ['rev-parse', '--verify', `${revision}^{commit}`], 'utf8')).trim();
  if (!/^[0-9a-f]{40}$/iu.test(commit)) throw new Error(`Git revision did not resolve to a commit: ${revision}`);

  const manifestBytes = git(source, ['show', `${commit}:CORPUS-MANIFEST.yaml`]);
  const manifest = validateManifest(YAML.parse(manifestBytes.toString('utf8')));
  const paths = git(source, ['ls-tree', '-r', '-z', '--name-only', commit])
    .toString('utf8')
    .split('\0')
    .filter(Boolean);

  const publicPaths = paths.filter((rel) =>
    rel.toLowerCase().endsWith('.md') && classifyPath(rel, manifest).disposition === 'index');
  const contents = gitBlobs(source, publicPaths.map((rel) => `${commit}:${rel}`));

  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'CORPUS-MANIFEST.yaml'), manifestBytes);
  let bytes = manifestBytes.length;
  let files = 1;
  for (const [index, rel] of publicPaths.entries()) {
    const content = contents[index];
    const target = join(destination, ...rel.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    bytes += content.length;
    files += 1;
  }

  const corpus = new PublicCorpus(destination);
  return { destination, files, bytes, digest: corpus.digest, commit, revision };
}

if (process.argv[1]?.endsWith('stage-public-corpus.js')) {
  const source = process.argv[2] || findRepoRoot();
  const destination = process.argv[3];
  if (!destination) throw new Error('Usage: node stage-public-corpus.js <source-root> <destination>');
  process.stdout.write(`${JSON.stringify(stagePublicCorpus(source, destination))}\n`);
}
