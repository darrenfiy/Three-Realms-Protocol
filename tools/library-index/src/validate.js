const TOP_LEVEL_KEYS = [
  'schemaVersion', 'artifactType', 'profile', 'derived', 'notice', 'readBasis',
  'catalogPolicyRevision', 'generatorRevision', 'keywordPolicyRevision', 'generation',
  'publicationGroups', 'entries',
];

const GENERATION_KEYS = ['mode', 'provider', 'model', 'promptRevision'];

const ENTRY_KEYS = [
  'key', 'path', 'routePath', 'id', 'title', 'titleBasis', 'corpus', 'shelf',
  'nodeKind', 'listing', 'authority', 'status', 'statusRaw', 'version',
  'latestActiveVersion', 'candidateOverlay', 'sourceLocale', 'sourceLocaleBasis',
  'sourceUrl', 'lookupTarget', 'keywords',
];

const PUBLICATION_GROUP_KEYS = [
  'id', 'introPath', 'introRoutePath', 'hubUrl', 'licenseLabel',
  'licenseSourcePath', 'memberPaths',
];

const FORBIDDEN_KEYS = new Set(['sha256', 'bytes', 'content']);

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} 欄位不符合 schema v2：${actual.join(', ')}`);
  }
}

function nullableString(value, label) {
  if (value !== null && typeof value !== 'string') throw new Error(`${label} 必須是 string 或 null。`);
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.length) throw new Error(`${label} 必須是非空 string。`);
}

export function validateRepoMarkdownPath(value, label) {
  if (typeof value !== 'string'
    || value.startsWith('/')
    || value.includes('\\')
    || /[\u0000-\u001f]/u.test(value)
    || !value.endsWith('.md')) {
    throw new Error(`${label} 必須是 repo-relative Markdown path。`);
  }
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`${label} 必須是 repo-relative Markdown path。`);
  }
}

function scanForbidden(value, at = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`${at}.${key} 不得出現在 library artifact。`);
    scanForbidden(child, `${at}.${key}`);
  }
}

function validateLocale(value, label) {
  nonEmptyString(value, label);
  if (value === 'und') return;
  try {
    if (!Intl.getCanonicalLocales(value).length) throw new Error();
  } catch {
    throw new Error(`${label} 不是有效的 BCP 47 locale：${value}`);
  }
}

function validateCandidateOverlay(value, label) {
  if (value === null) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 必須是 object 或 null。`);
  exactKeys(value, ['version', 'status'], label);
  nullableString(value.version, `${label}.version`);
  nullableString(value.status, `${label}.status`);
}

function validateLookupTarget(entry, label) {
  const target = entry.lookupTarget;
  if (entry.nodeKind === 'navigation') {
    if (target !== null) throw new Error(`${label} 是 navigation，lookupTarget 必須是 null。`);
    return;
  }
  if (!target || typeof target !== 'object' || Array.isArray(target)) throw new Error(`${label}.lookupTarget 必須是 object。`);
  if (target.kind === 'resolve') {
    exactKeys(target, ['kind', 'id'], `${label}.lookupTarget`);
    if (!target.id || target.id !== entry.id) throw new Error(`${label} 的 resolve id 必須等於 entry.id。`);
    return;
  }
  if (target.kind === 'fetch') {
    exactKeys(target, ['kind', 'path'], `${label}.lookupTarget`);
    if (target.path !== entry.path) throw new Error(`${label} 的 fetch path 必須等於 entry.path。`);
    return;
  }
  throw new Error(`${label}.lookupTarget.kind 不支援：${target.kind}`);
}

function validateEntry(entry, artifact, index) {
  const label = `entries[${index}]`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`${label} 必須是 object。`);
  exactKeys(entry, ENTRY_KEYS, label);
  validateRepoMarkdownPath(entry.path, `${label}.path`);
  if (entry.key !== entry.path) throw new Error(`${label}.key/path 必須相同。`);
  if (typeof entry.routePath !== 'string' || !/^library(?:\/[\p{Letter}\p{Number}-]+)*$/u.test(entry.routePath)) {
    throw new Error(`${label}.routePath 不合法：${entry.routePath}`);
  }
  nullableString(entry.id, `${label}.id`);
  nonEmptyString(entry.title, `${label}.title`);
  if (!['metadata', 'heading', 'filename'].includes(entry.titleBasis)) throw new Error(`${label}.titleBasis 不合法。`);
  nullableString(entry.corpus, `${label}.corpus`);
  nonEmptyString(entry.shelf, `${label}.shelf`);
  if (!['document', 'navigation'].includes(entry.nodeKind)) throw new Error(`${label}.nodeKind 不合法。`);
  if (!['primary', 'candidate', 'historical'].includes(entry.listing)) throw new Error(`${label}.listing 不合法。`);
  nonEmptyString(entry.authority, `${label}.authority`);
  nullableString(entry.status, `${label}.status`);
  nullableString(entry.statusRaw, `${label}.statusRaw`);
  nullableString(entry.version, `${label}.version`);
  nullableString(entry.latestActiveVersion, `${label}.latestActiveVersion`);
  validateCandidateOverlay(entry.candidateOverlay, `${label}.candidateOverlay`);
  validateLocale(entry.sourceLocale, `${label}.sourceLocale`);
  if (!['catalog-override', 'metadata', 'script-dominance', 'und'].includes(entry.sourceLocaleBasis)) throw new Error(`${label}.sourceLocaleBasis 不合法。`);
  const encodedPath = entry.path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const expectedSourceUrl = `https://github.com/darrenfiy/Three-Realms-Protocol/blob/${artifact.readBasis}/${encodedPath}`;
  if (entry.sourceUrl !== expectedSourceUrl) {
    throw new Error(`${label}.sourceUrl 沒有釘在 readBasis。`);
  }
  validateLookupTarget(entry, label);
  if (!Array.isArray(entry.keywords)
    || entry.keywords.length > 10
    || entry.keywords.some((keyword) => typeof keyword !== 'string' || !keyword.length)
    || new Set(entry.keywords).size !== entry.keywords.length) {
    throw new Error(`${label}.keywords 不合法。`);
  }
  if (artifact.keywordPolicyRevision === null && entry.keywords.length !== 0) {
    throw new Error(`${label}.keywords 在 P1 必須為空。`);
  }
}

function validatePublicationGroups(artifact) {
  if (!Array.isArray(artifact.publicationGroups)) throw new Error('publicationGroups 必須是 array。');
  if (artifact.profile === 'walking-skeleton') {
    if (artifact.publicationGroups.length !== 0) throw new Error('walking-skeleton 不輸出 publicationGroups。');
    return;
  }
  if (artifact.publicationGroups.length !== 4) throw new Error('full artifact 必須恰有四個 publicationGroups。');

  const entryByPath = new Map(artifact.entries.map((entry) => [entry.path, entry]));
  const assigned = new Set();
  const ids = new Set();
  const intros = new Set();
  for (const [index, group] of artifact.publicationGroups.entries()) {
    const label = `publicationGroups[${index}]`;
    if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error(`${label} 必須是 object。`);
    exactKeys(group, PUBLICATION_GROUP_KEYS, label);
    if (typeof group.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(group.id)) {
      throw new Error(`${label}.id 不合法。`);
    }
    if (ids.has(group.id)) throw new Error(`publicationGroups 有重複 id：${group.id}`);
    ids.add(group.id);
    validateRepoMarkdownPath(group.introPath, `${label}.introPath`);
    validateRepoMarkdownPath(group.licenseSourcePath, `${label}.licenseSourcePath`);
    if (group.licenseSourcePath !== group.introPath) throw new Error(`${label} 的授權來源必須是介紹頁。`);
    if (intros.has(group.introPath)) throw new Error(`publicationGroups 有重複 intro：${group.introPath}`);
    intros.add(group.introPath);
    if (typeof group.introRoutePath !== 'string'
      || !/^library(?:\/[\p{Letter}\p{Number}-]+)*$/u.test(group.introRoutePath)) {
      throw new Error(`${label}.introRoutePath 不合法。`);
    }
    const intro = entryByPath.get(group.introPath);
    if (!intro || intro.shelf !== 'publications' || intro.routePath !== group.introRoutePath) {
      throw new Error(`${label} 的 intro path／route 不符合 entry。`);
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
    nonEmptyString(group.licenseLabel, `${label}.licenseLabel`);
    if (!Array.isArray(group.memberPaths) || group.memberPaths.length === 0
      || new Set(group.memberPaths).size !== group.memberPaths.length) {
      throw new Error(`${label}.memberPaths 必須是非空且不重複的 array。`);
    }
    const sorted = [...group.memberPaths].sort();
    if (JSON.stringify(sorted) !== JSON.stringify(group.memberPaths)) {
      throw new Error(`${label}.memberPaths 必須排序。`);
    }
    if (!group.memberPaths.includes(group.introPath)
      || !group.memberPaths.includes(group.licenseSourcePath)) {
      throw new Error(`${label} 必須包含 intro／license source。`);
    }
    for (const [memberIndex, path] of group.memberPaths.entries()) {
      validateRepoMarkdownPath(path, `${label}.memberPaths[${memberIndex}]`);
      if (assigned.has(path)) throw new Error(`publication member 被分到多組：${path}`);
      const entry = entryByPath.get(path);
      if (!entry || entry.shelf !== 'publications') throw new Error(`publication member 不在書架：${path}`);
      assigned.add(path);
    }
  }

  const publications = artifact.entries.filter((entry) => entry.shelf === 'publications').map((entry) => entry.path);
  if (assigned.size !== publications.length || publications.some((path) => !assigned.has(path))) {
    throw new Error('publicationGroups 必須 exactly-once 覆蓋 publications shelf。');
  }
}

export function validateArtifact(artifact) {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) throw new Error('library artifact 必須是 object。');
  scanForbidden(artifact);
  exactKeys(artifact, TOP_LEVEL_KEYS, 'artifact');
  if (artifact.schemaVersion !== 2 || artifact.artifactType !== 'trp-library-index') throw new Error('artifact identity 不符合 schema v2。');
  if (!['walking-skeleton', 'full'].includes(artifact.profile)) throw new Error(`未知 profile：${artifact.profile}`);
  if (artifact.derived !== true || artifact.notice !== 'Derived navigation data; not protocol source text.') throw new Error('artifact 必須明標 derived navigation data。');
  if (!/^[0-9a-f]{40}$/u.test(artifact.readBasis)) throw new Error('readBasis 必須是完整 40-hex commit。');
  if (artifact.catalogPolicyRevision !== '2' || artifact.generatorRevision !== '3' || artifact.keywordPolicyRevision !== null) {
    throw new Error('artifact revision 不符合 v2。');
  }
  exactKeys(artifact.generation, GENERATION_KEYS, 'generation');
  if (artifact.generation.mode !== 'deterministic'
    || artifact.generation.provider !== null
    || artifact.generation.model !== null
    || artifact.generation.promptRevision !== null) {
    throw new Error('P1 generation 必須是無模型的 deterministic 模式。');
  }
  if (!Array.isArray(artifact.entries)) throw new Error('entries 必須是 array。');
  artifact.entries.forEach((entry, index) => validateEntry(entry, artifact, index));
  const keys = artifact.entries.map((entry) => entry.key);
  const routes = artifact.entries.map((entry) => entry.routePath);
  if (new Set(keys).size !== keys.length) throw new Error('artifact 有重複 key。');
  if (new Set(routes).size !== routes.length) throw new Error('artifact 有 route collision。');
  validatePublicationGroups(artifact);
  return artifact;
}
