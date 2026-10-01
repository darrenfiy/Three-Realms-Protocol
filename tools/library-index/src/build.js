import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PublicCorpus, classifyPath, findRepoRoot } from '../../trp-mcp/src/corpus.js';
import { entriesForProfile, loadCatalogPolicy, publicationGroupsForArtifact } from './catalog-policy.js';
import { validateArtifact } from './validate.js';

const here = dirname(fileURLToPath(import.meta.url));
const toolRoot = resolve(here, '..');

function git(root, args, { trim = true } = {}) {
  const output = execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return trim ? output.trim() : output;
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

function nulSeparatedPaths(output) {
  return output.split('\0').filter(Boolean).map((path) => posix(path));
}

function changedPaths(root, readBasis) {
  const tracked = git(root, ['diff', '--no-renames', '--name-only', '-z', '--diff-filter=ACDMRTUXB', readBasis, '--'], { trim: false });
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z'], { trim: false });
  return [...new Set([...nulSeparatedPaths(tracked), ...nulSeparatedPaths(untracked)])];
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

function assembleArtifact({ profile, readBasis, policy, entries, publicationGroups }) {
  return {
    schemaVersion: 2,
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
    publicationGroups,
    entries,
  };
}

function headerOf(artifact) {
  const { entries, publicationGroups, ...header } = artifact;
  return header;
}

// 寫出 artifact 時 requireFresh 必須為 true：readBasis 之後的來源變動不能被標成 readBasis 的內容。
// 只有比對與測試會關掉它，用工作樹內容配上舊 readBasis 的網址，逐筆對照已提交的條目。
export function buildArtifact({
  root = findRepoRoot(),
  profile = 'walking-skeleton',
  readBasis = currentCommit(root),
  policy = loadCatalogPolicy(),
  requireFresh = true,
} = {}) {
  const corpus = corpusAt(root, readBasis);
  if (requireFresh) assertSourceFresh(root, readBasis, corpus);
  const entries = entriesForProfile(corpus, policy, profile);
  return validateArtifact(assembleArtifact({
    profile,
    readBasis,
    policy,
    entries,
    publicationGroups: publicationGroupsForArtifact(corpus, policy, profile, entries),
  }));
}

// 只有 DOCS 底下（案例、應用、出版、學術）的新增與欄位變動可以累積到下次重建。
// 公開邊界、generator／policy、主要語料（SPEC／LEX／EPOCH／MB 與根目錄文件）的條目變動，
// 任何條目刪除，以及來源沒動條目卻變了，都必須重建。
const ACCUMULABLE_CORPORA = new Set(['docs']);

export function classifyDrift({ artifact, expectedHeader, currentEntries, changedSources, buildError = null }) {
  const changed = new Set(changedSources);
  const major = [];
  const minor = [];
  if (changed.has('CORPUS-MANIFEST.yaml')) major.push({ path: 'CORPUS-MANIFEST.yaml', reason: 'public-boundary' });
  if (JSON.stringify(headerOf(artifact)) !== JSON.stringify(expectedHeader)) {
    major.push({ path: null, reason: 'generator-or-policy' });
  }
  if (buildError) {
    major.push({ path: null, reason: 'build-error', detail: buildError });
    return { changedSources: [...changed], major, minor };
  }

  const bucketFor = (entry) => (ACCUMULABLE_CORPORA.has(entry.corpus) ? minor : major);
  const current = new Map(currentEntries.map((entry) => [entry.path, entry]));
  const committed = new Map(artifact.entries.map((entry) => [entry.path, entry]));
  for (const [path, entry] of committed) {
    const now = current.get(path);
    if (!now) major.push({ path, reason: 'removed' });
    else if (JSON.stringify(now) === JSON.stringify(entry)) continue;
    else if (!changed.has(path)) major.push({ path, reason: 'changed-without-source-change' });
    else bucketFor(entry).push({ path, reason: 'changed' });
  }
  for (const [path, entry] of current) {
    if (!committed.has(path)) bucketFor(entry).push({ path, reason: 'added' });
  }
  return { changedSources: [...changed], major, minor };
}

export function catalogDrift({ root = findRepoRoot(), artifact, policy = loadCatalogPolicy() }) {
  const corpus = corpusAt(root, artifact.readBasis);
  const changedSources = sourceChangesSince(root, artifact.readBasis, corpus);
  let currentEntries = [];
  let currentPublicationGroups = [];
  let buildError = null;
  try {
    currentEntries = entriesForProfile(corpus, policy, artifact.profile);
    currentPublicationGroups = publicationGroupsForArtifact(
      corpus, policy, artifact.profile, currentEntries,
    );
  } catch (error) {
    buildError = error.message;
  }
  const expectedHeader = headerOf(assembleArtifact({
    profile: artifact.profile,
    readBasis: artifact.readBasis,
    policy,
    entries: currentEntries,
    publicationGroups: currentPublicationGroups,
  }));
  return classifyDrift({ artifact, expectedHeader, currentEntries, changedSources, buildError });
}

function formatDriftItems(items) {
  return items.map(({ path, reason, detail }) => `  ${reason}: ${path || '(artifact)'}${detail ? ` — ${detail}` : ''}`).join('\n');
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

function checkCommittedArtifact({ root, output, profile, readBasis }) {
  if (!existsSync(output)) throw new Error(`--check 找不到 artifact：${output}`);
  const existing = readFileSync(output, 'utf8');
  const artifact = validateArtifact(JSON.parse(existing));
  if (artifact.profile !== profile) throw new Error(`artifact profile 是 ${artifact.profile}，不是 ${profile}：${output}`);
  if (readBasis && readBasis !== artifact.readBasis) throw new Error(`artifact readBasis 是 ${artifact.readBasis}，不是 ${readBasis}：${output}`);
  if (serializeArtifact(artifact) !== existing) throw new Error(`artifact 不是 generator 的標準序列化：${output}`);

  const policy = loadCatalogPolicy();
  const drift = catalogDrift({ root, artifact, policy });
  if (drift.major.length) {
    throw new Error(`artifact 有必須重建的變動；請 commit 來源後以新的 HEAD 重建：\n${formatDriftItems(drift.major)}`);
  }
  if (!drift.minor.length) {
    const rebuilt = serializeArtifact(buildArtifact({ root, profile, readBasis: artifact.readBasis, policy, requireFresh: false }));
    if (rebuilt !== existing) throw new Error(`artifact 與 generator／policy 不一致：${output}`);
  }

  const lines = [`library-index check passed: ${profile}, ${artifact.readBasis}`];
  if (drift.minor.length) {
    lines.push(`累積 ${drift.minor.length} 筆 DOCS 一般變動，下次重建時一併收入：`, formatDriftItems(drift.minor));
  } else if (drift.changedSources.length) {
    lines.push(`來源有 ${drift.changedSources.length} 筆變動，目錄欄位不受影響。`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = findRepoRoot();
  const output = resolve(args.output || defaultOutput(args.profile));

  if (args.check) {
    checkCommittedArtifact({ root, output, profile: args.profile, readBasis: args.readBasis });
    return;
  }

  const readBasis = args.readBasis || currentCommit(root);
  const serialized = serializeArtifact(buildArtifact({ root, profile: args.profile, readBasis }));
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
