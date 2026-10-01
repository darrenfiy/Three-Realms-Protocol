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

function isSafeRepoPrefix(value) {
  return typeof value === 'string'
    && value.length > 1
    && value.endsWith('/')
    && !value.startsWith('/')
    && !value.includes('\\')
    && !/[\u0000-\u001f]/u.test(value)
    && value.split('/').slice(0, -1).every((segment) => segment && segment !== '.' && segment !== '..');
}

function isSafeMarkdownPath(value) {
  return typeof value === 'string'
    && value.endsWith('.md')
    && !value.startsWith('/')
    && !value.includes('\\')
    && !/[\u0000-\u001f]/u.test(value)
    && value.split('/').every((segment) => segment && segment !== '.' && segment !== '..');
}

function validatePublicationGroupPolicy(groups) {
  if (!Array.isArray(groups) || groups.length !== 4) {
    throw new Error('publicationGroups 必須恰有四本書。');
  }
  if (!unique(groups.map(({ id }) => id))) throw new Error('publicationGroups id 不得重複。');
  for (const [index, group] of groups.entries()) {
    const label = `publicationGroups[${index}]`;
    const keys = Object.keys(group).sort();
    const expected = [
      'exactPaths', 'hubUrl', 'id', 'introPath', 'licenseLabel', 'licenseSourcePath', 'pathPrefix',
    ].sort();
    if (JSON.stringify(keys) !== JSON.stringify(expected)) throw new Error(`${label} 欄位不符合契約。`);
    if (typeof group.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(group.id)) {
      throw new Error(`${label}.id 不合法。`);
    }
    if (!isSafeRepoPrefix(group.pathPrefix)) throw new Error(`${label}.pathPrefix 不合法。`);
    if (!Array.isArray(group.exactPaths) || !unique(group.exactPaths)
      || group.exactPaths.some((path) => !isSafeMarkdownPath(path))) {
      throw new Error(`${label}.exactPaths 不合法。`);
    }
    if (!isSafeMarkdownPath(group.introPath) || !isSafeMarkdownPath(group.licenseSourcePath)) {
      throw new Error(`${label} 的 intro／license source path 不合法。`);
    }
    if (group.licenseSourcePath !== group.introPath) {
      throw new Error(`${label} 的授權必須由公開介紹頁本身提供。`);
    }
    if (typeof group.licenseLabel !== 'string' || !group.licenseLabel.length) {
      throw new Error(`${label}.licenseLabel 必須是非空 string。`);
    }
    let hubUrl;
    try {
      hubUrl = new URL(group.hubUrl);
    } catch {
      throw new Error(`${label}.hubUrl 不合法。`);
    }
    if (hubUrl.protocol !== 'https:' || hubUrl.hostname !== 'hub.three-quarters.net'
      || !hubUrl.pathname.startsWith('/library/')) {
      throw new Error(`${label}.hubUrl 必須是藏經閣 HTTPS 書頁。`);
    }
  }
}

export function loadCatalogPolicy(path = DEFAULT_POLICY_PATH) {
  const policy = JSON.parse(readFileSync(path, 'utf8'));
  if (policy.revision !== '2' || policy.generatorRevision !== '3') {
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
  validatePublicationGroupPolicy(policy.publicationGroups);
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

export function publicationGroupsForArtifact(corpus, policy, profile, entries) {
  if (profile === 'walking-skeleton') return [];
  if (profile !== 'full') throw new Error(`未知的 library-index profile：${profile}`);

  const publications = entries.filter((entry) => entry.shelf === 'publications');
  const sourceByPath = new Map(corpus.entries.map((entry) => [entry.path, entry]));
  const membersById = new Map(policy.publicationGroups.map(({ id }) => [id, []]));

  for (const entry of publications) {
    const matches = policy.publicationGroups.filter((group) => entry.path.startsWith(group.pathPrefix)
      || group.exactPaths.includes(entry.path));
    if (matches.length !== 1) {
      throw new Error(`publication entry 必須恰好屬於一個書籍群組：${entry.path}（命中 ${matches.length}）`);
    }
    membersById.get(matches[0].id).push(entry.path);
  }

  const entryByPath = new Map(entries.map((entry) => [entry.path, entry]));
  return policy.publicationGroups.map((group) => {
    const intro = entryByPath.get(group.introPath);
    if (!intro || intro.shelf !== 'publications') {
      throw new Error(`書籍介紹頁不在 full publications artifact：${group.introPath}`);
    }
    const members = membersById.get(group.id).sort(textCompare);
    if (!members.includes(group.introPath)) {
      throw new Error(`書籍介紹頁不是自己的群組成員：${group.introPath}`);
    }
    const licenseSource = sourceByPath.get(group.licenseSourcePath);
    if (!licenseSource?.content?.includes(group.licenseLabel)
      || !licenseSource.content.includes(group.hubUrl)) {
      throw new Error(`書籍介紹頁缺少授權或藏經閣連結：${group.licenseSourcePath}`);
    }
    return {
      id: group.id,
      introPath: group.introPath,
      introRoutePath: intro.routePath,
      hubUrl: group.hubUrl,
      licenseLabel: group.licenseLabel,
      licenseSourcePath: group.licenseSourcePath,
      memberPaths: members,
    };
  });
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
