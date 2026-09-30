import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PublicCorpus, classifyPath, findRepoRoot } from '../../trp-mcp/src/corpus.js';
import { entriesForProfile, loadCatalogPolicy } from './catalog-policy.js';
import { validateArtifact } from './validate.js';

const here = dirname(fileURLToPath(import.meta.url));
const toolRoot = resolve(here, '..');

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function posix(path) {
  return path.replace(/\\/gu, '/');
}

export function currentCommit(root = findRepoRoot()) {
  const commit = git(root, ['rev-parse', 'HEAD']);
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error(`無法取得完整 Protocol commit：${commit}`);
  return commit;
}

function assertCommitAncestor(root, readBasis) {
  if (!/^[0-9a-f]{40}$/u.test(readBasis)) throw new Error('readBasis 必須是完整 40-hex commit。');
  try {
    git(root, ['cat-file', '-e', `${readBasis}^{commit}`]);
    git(root, ['merge-base', '--is-ancestor', readBasis, 'HEAD']);
  } catch {
    throw new Error(`readBasis 不是目前 Protocol HEAD 的可用祖先 commit：${readBasis}`);
  }
}

function changedPaths(root, readBasis) {
  const tracked = git(root, ['diff', '--name-only', '--diff-filter=ACDMRTUXB', readBasis, '--']);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard']);
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/u).map((path) => posix(path.trim())).filter(Boolean))];
}

export function sourceChangesSince(root, readBasis, corpus) {
  assertCommitAncestor(root, readBasis);
  return changedPaths(root, readBasis).filter((path) => path === 'CORPUS-MANIFEST.yaml'
    || classifyPath(path, corpus.manifest).disposition === 'index');
}

export function assertSourceFresh(root, readBasis, corpus) {
  const changed = sourceChangesSince(root, readBasis, corpus);
  if (changed.length) {
    throw new Error(`library artifact 的來源自 readBasis 後已變動；請以新的來源 commit 重建：\n${changed.join('\n')}`);
  }
}

function corpusAt(root, readBasis) {
  const previous = process.env.TRP_BUILD_COMMIT;
  process.env.TRP_BUILD_COMMIT = readBasis;
  try {
    return new PublicCorpus(root);
  } finally {
    if (previous === undefined) delete process.env.TRP_BUILD_COMMIT;
    else process.env.TRP_BUILD_COMMIT = previous;
  }
}

export function buildArtifact({
  root = findRepoRoot(),
  profile = 'walking-skeleton',
  readBasis = currentCommit(root),
  policy = loadCatalogPolicy(),
} = {}) {
  const corpus = corpusAt(root, readBasis);
  assertSourceFresh(root, readBasis, corpus);
  const artifact = {
    schemaVersion: 1,
    artifactType: 'trp-library-index',
    profile,
    derived: true,
    notice: 'Derived navigation data; not protocol source text.',
    readBasis,
    catalogPolicyRevision: policy.revision,
    generatorRevision: policy.generatorRevision,
    keywordPolicyRevision: null,
    generation: {
      mode: 'deterministic',
      provider: null,
      model: null,
      promptRevision: null,
    },
    entries: entriesForProfile(corpus, policy, profile),
  };
  return validateArtifact(artifact);
}

export function serializeArtifact(artifact) {
  return `${JSON.stringify(validateArtifact(artifact), null, 2)}\n`;
}

function parseArgs(argv) {
  const result = { profile: 'walking-skeleton', output: null, readBasis: null, check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') result.check = true;
    else if (arg === '--profile' || arg === '--output' || arg === '--read-basis') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} 缺少值。`);
      index += 1;
      if (arg === '--profile') result.profile = value;
      else if (arg === '--output') result.output = value;
      else result.readBasis = value;
    } else {
      throw new Error(`未知參數：${arg}`);
    }
  }
  return result;
}

function defaultOutput(profile) {
  return resolve(toolRoot, 'generated', profile === 'walking-skeleton' ? 'library-index.preview.json' : 'library-index.json');
}

function existingReadBasis(path) {
  if (!existsSync(path)) throw new Error(`--check 找不到 artifact：${path}`);
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!/^[0-9a-f]{40}$/u.test(parsed.readBasis || '')) throw new Error(`既有 artifact 沒有有效 readBasis：${path}`);
  return parsed.readBasis;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = findRepoRoot();
  const output = resolve(args.output || defaultOutput(args.profile));
  const readBasis = args.readBasis || (args.check ? existingReadBasis(output) : currentCommit(root));
  const serialized = serializeArtifact(buildArtifact({ root, profile: args.profile, readBasis }));

  if (args.check) {
    const existing = readFileSync(output, 'utf8');
    if (existing !== serialized) throw new Error(`artifact 與 generator／policy 不一致：${output}`);
    process.stdout.write(`library-index check passed: ${args.profile}, ${readBasis}\n`);
    return;
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, serialized, 'utf8');
  process.stdout.write(`library-index written: ${output}\nreadBasis: ${readBasis}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
