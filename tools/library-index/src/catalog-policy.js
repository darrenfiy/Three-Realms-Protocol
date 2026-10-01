import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lookupKey } from '../../trp-mcp/src/corpus.js';
import { assertUniqueRoutes, routePathFor } from './route-path.js';
import { sourceLocaleFor } from './source-locale.js';

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_POLICY_PATH = resolve(here, '..', 'catalog-policy.json');

function textCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function unique(values) {
  return new Set(values).size === values.length;
}

export function loadCatalogPolicy(path = DEFAULT_POLICY_PATH) {
  const policy = JSON.parse(readFileSync(path, 'utf8'));
  if (policy.revision !== '1' || policy.generatorRevision !== '2') {
    throw new Error(`不支援的 catalog／generator revision：${policy.revision}/${policy.generatorRevision}`);
  }
  const preview = policy.profiles?.['walking-skeleton']?.paths;
  const full = policy.profiles?.full?.corpora;
  if (!Array.isArray(preview) || preview.length !== 11 || !unique(preview)) {
    throw new Error('walking-skeleton 必須恰有 11 個不重複 path。');
  }
  if (!Array.isArray(full) || !unique(full) || !['spec', 'mb', 'docs', 'lex', 'epoch'].every((id) => full.includes(id))) {
    throw new Error('full profile 必須明列五個 corpus。');
  }
  if (!Array.isArray(policy.rootPaths) || !policy.rootPaths.includes(policy.atlasPath)) {
    throw new Error('catalog policy 必須把 Atlas 列為 root navigation。');
  }
  for (const pattern of policy.navigationPatterns || []) new RegExp(pattern, 'iu');
  return policy;
}

function filenameStem(path) {
  return basename(path).replace(/\.md$/iu, '');
}

function cleanHeading(value) {
  return value
    .replace(/\s+#+\s*$/u, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/[*_`]/gu, '')
    .trim();
}

function firstMarkdownHeading(content, level) {
  const lines = String(content || '').split(/\r?\n/u);
  let inFrontmatter = lines[0]?.trim() === '---';
  let fence = null;
  for (let index = inFrontmatter ? 1 : 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false;
      continue;
    }
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`, 'u').test(line)) fence = null;
      continue;
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/u);
    if (opening) {
      fence = opening[1];
      continue;
    }
    const heading = line.match(new RegExp(`^ {0,3}#{${level}}(?!#)\\s+(.+?)\\s*$`, 'u'));
    if (heading) return cleanHeading(heading[1]) || null;
  }
  return null;
}

export function firstMarkdownH1(content) {
  return firstMarkdownHeading(content, 1);
}

export function firstMarkdownH2(content) {
  return firstMarkdownHeading(content, 2);
}

export function displayTitleFor(entry) {
  const stem = filenameStem(entry.path);
  if (entry.title && entry.title !== stem) return { title: entry.title, titleBasis: 'metadata' };
  const heading = firstMarkdownH1(entry.content);
  if (heading && entry.idRaw && lookupKey(heading) === lookupKey(entry.idRaw)) {
    const subtitle = firstMarkdownH2(entry.content);
    if (subtitle) return { title: `${entry.idRaw} — ${subtitle}`, titleBasis: 'heading' };
    return { title: stem, titleBasis: 'filename' };
  }
  if (heading) return { title: heading, titleBasis: 'heading' };
  return { title: stem, titleBasis: 'filename' };
}

function isEligible(entry, policy) {
  return policy.rootPaths.includes(entry.path) || policy.profiles.full.corpora.includes(entry.corpus);
}

function nodeKindFor(entry, policy) {
  if (entry.path === policy.atlasPath) return 'navigation';
  return policy.navigationPatterns.some((pattern) => new RegExp(pattern, 'iu').test(entry.path))
    ? 'navigation'
    : 'document';
}

function listingFor(entry, policy) {
  const override = policy.listingOverrides?.[entry.path];
  if (override) return override;
  if (entry.authority === 'historical' || entry.statusMachine === 'Superseded') return 'historical';
  if (policy.candidateStatuses.includes(entry.statusMachine)) return 'candidate';
  return 'primary';
}

function shelfFor(entry, policy) {
  if (!entry.corpus) return 'orientation';
  if (entry.corpus !== 'docs') return entry.corpus;
  if (entry.authority === 'publication') return 'publications';
  return policy.docsShelves.find(({ prefix }) => entry.path.startsWith(prefix))?.shelf || 'other';
}

function idCounts(entries) {
  const result = new Map();
  for (const entry of entries) {
    const key = lookupKey(entry.idRaw);
    if (!key) continue;
    result.set(key, (result.get(key) || 0) + 1);
  }
  return result;
}

export function canonicalRouteIdKeys(entries, policy) {
  const counts = idCounts(entries.filter((entry) => listingFor(entry, policy) !== 'historical'));
  return new Set([...counts.entries()].filter(([, count]) => count === 1).map(([key]) => key));
}

function lookupTargetFor(entry, nodeKind, idIsUnique) {
  if (nodeKind === 'navigation') return null;
  if (entry.idRaw && idIsUnique) return { kind: 'resolve', id: entry.idRaw };
  return { kind: 'fetch', path: entry.path };
}

function cloneCandidateOverlay(value) {
  if (!value) return null;
  return { version: value.version || null, status: value.status || null };
}

function describeEntry(entry, corpus, policy, lookupCounts, canonicalRouteKeys) {
  const nodeKind = nodeKindFor(entry, policy);
  const key = lookupKey(entry.idRaw);
  const idIsUnique = Boolean(key && lookupCounts.get(key) === 1);
  const useIdRoute = Boolean(key && canonicalRouteKeys.has(key)
    && listingFor(entry, policy) !== 'historical');
  const title = displayTitleFor(entry);
  const locale = sourceLocaleFor(entry, policy);
  const routePath = routePathFor(entry, { useIdRoute, nodeKind, policy });
  const sourceUrl = corpus.sourceUrl(entry.path);
  if (!sourceUrl) throw new Error(`無法為來源產生 commit-pinned URL：${entry.path}`);

  return {
    key: entry.path,
    path: entry.path,
    routePath,
    id: entry.idRaw || null,
    title: title.title,
    titleBasis: title.titleBasis,
    corpus: entry.corpus || null,
    shelf: shelfFor(entry, policy),
    nodeKind,
    listing: listingFor(entry, policy),
    authority: entry.authority,
    status: entry.statusMachine || null,
    statusRaw: entry.statusRaw || null,
    version: entry.versionRaw || null,
    latestActiveVersion: entry.latestActiveVersion || null,
    candidateOverlay: cloneCandidateOverlay(entry.candidateOverlay),
    sourceLocale: locale.sourceLocale,
    sourceLocaleBasis: locale.sourceLocaleBasis,
    sourceUrl,
    lookupTarget: lookupTargetFor(entry, nodeKind, idIsUnique),
    keywords: [],
  };
}

export function allCatalogEntries(corpus, policy) {
  const lookupCounts = idCounts(corpus.entries);
  const canonicalRouteKeys = canonicalRouteIdKeys(corpus.entries, policy);
  const entries = corpus.entries
    .filter((entry) => isEligible(entry, policy))
    .map((entry) => describeEntry(entry, corpus, policy, lookupCounts, canonicalRouteKeys));
  assertUniqueRoutes(entries);
  return entries.sort((left, right) => textCompare(left.routePath, right.routePath) || textCompare(left.path, right.path));
}

export function entriesForProfile(corpus, policy, profile) {
  const all = allCatalogEntries(corpus, policy);
  if (profile === 'full') return all;
  if (profile !== 'walking-skeleton') throw new Error(`未知的 library-index profile：${profile}`);

  const wanted = policy.profiles['walking-skeleton'].paths;
  const byPath = new Map(all.map((entry) => [entry.path, entry]));
  const missing = wanted.filter((path) => !byPath.has(path));
  if (missing.length) throw new Error(`walking-skeleton path 不在公開 catalog 候選：${missing.join(', ')}`);
  return wanted
    .map((path) => byPath.get(path))
    .sort((left, right) => textCompare(left.routePath, right.routePath) || textCompare(left.path, right.path));
}
