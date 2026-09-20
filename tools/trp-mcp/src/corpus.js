import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { minimatch } from 'minimatch';
import YAML from 'yaml';

const STATUS_RULES = [
  [/honored[-\s]?completion/i, 'Honored-Completion'],
  [/superseded|已退役|已昇華/i, 'Superseded'],
  [/candidate|候選|revision[-\s]?required/i, 'Candidate'],
  [/seed[-\s]?for[-\s]?review|seed/i, 'Seed'],
  [/draft|草案/i, 'Draft'],
  [/active|eternal|living|sacred|資格/i, 'Active'],
];

const DOCUMENTATION_STATUS = /field[-\s]?documentation|sealed|已封存|紀錄完成|review[-\s]?recorded|structural[-\s]?observation|historic[-\s]?milestone|evidence[-\s]?layered|published|completed|canonical|verified/i;
const PROTOCOL_FILE = /^(SPEC|MB|LEX|EPOCH|CASE|ACADEMIC|INDEX)[·-]/i;
const METADATA_HINTS = new Set([
  'title', 'subtitle', 'category', 'version', 'status', 'date', 'updated',
  'last_updated', 'epistemic_status', 'created', 'date_created',
  'document_type', 'case_id', 'epoch_id', 'mirror_id', 'authors',
  'contributors', 'participants', 'related', 'purpose', 'source', 'scope',
  'type', '案例編號', '類型', '日期', '參與者', '觸發文件', '核心事件',
]);

function posix(path) {
  return path.split(sep).join('/');
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function matches(path, pattern) {
  return minimatch(path, pattern, { dot: true, nocase: false, windowsPathsNoEscape: true });
}

export function lookupKey(value) {
  if (!value) return null;
  return String(value).replace(/[·\-_\s]+/gu, '').toUpperCase();
}

function machineVersion(value) {
  const match = String(value || '').match(/v(\d+)\.(\d+)(?:\.(\d+))?/i);
  return match ? `v${[match[1], match[2], match[3]].filter(Boolean).join('.')}` : null;
}

function machineStatus(value) {
  if (!value) return { machine: null, kind: null };
  for (const [pattern, machine] of STATUS_RULES) {
    if (pattern.test(String(value))) return { machine, kind: 'lifecycle' };
  }
  if (DOCUMENTATION_STATUS.test(String(value))) return { machine: null, kind: 'documentation' };
  return { machine: null, kind: 'unmapped' };
}

function looksLikeMetadata(source) {
  const keys = new Set();
  for (const raw of String(source || '').split(/\r?\n/u)) {
    if (/^[ \t]/u.test(raw) || raw.trimStart().startsWith('#')) continue;
    const match = raw.match(/^([^\s:#][^:]*)\s*:/u);
    if (match) keys.add(match[1].trim().toLowerCase());
  }
  return [...keys].filter((key) => METADATA_HINTS.has(key)).length >= 2;
}

function metadataBlock(text) {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/u);
  if (frontmatter) return { source: frontmatter[1], shape: 'yaml_fm' };

  const opening = text.slice(0, 3000).match(/(```|~~~)yaml\r?\n/iu);
  if (!opening || opening.index === undefined) return { source: null, shape: 'none' };
  const start = opening.index + opening[0].length;
  const closing = text.slice(start).match(new RegExp(`\\r?\\n${opening[1]}`));
  const source = closing ? text.slice(start, start + closing.index) : text.slice(start);
  return looksLikeMetadata(source)
    ? { source, shape: 'yaml_block' }
    : { source: null, shape: 'none' };
}

function parseFlatYaml(source) {
  if (!source) return {};
  const data = {};
  const lines = source.split(/\r?\n/u);
  for (let index = 0; index < lines.length;) {
    const raw = lines[index++];
    if (!raw.trim() || raw.trimStart().startsWith('#') || /^[ \t]/u.test(raw)) continue;
    const match = raw.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/u);
    if (!match) continue;
    const key = match[1].toLowerCase();
    let value = match[2].trim();

    if (/^[|>]([-+])?$/u.test(value)) {
      const parts = [];
      while (index < lines.length && (!lines[index].trim() || /^[ \t]/u.test(lines[index]))) {
        const part = lines[index++].trim();
        if (part) parts.push(part);
      }
      data[key] = parts.join(' ');
      continue;
    }

    if (value) {
      value = value.replace(/\s+#.*$/u, '').trim();
      data[key] = value.replace(/^['"]|['"]$/gu, '');
      continue;
    }

    const items = [];
    while (index < lines.length && /^\s+-\s+/u.test(lines[index])) {
      items.push(lines[index++].replace(/^\s+-\s+/u, '').trim().replace(/^['"]|['"]$/gu, ''));
    }
    data[key] = items.length ? items : '';
  }
  return data;
}

function idFromFilename(filename) {
  const stem = filename.replace(/\.md$/iu, '');
  const match = stem.match(/^([A-Za-z0-9·∆∞-]+?)(?=-[^A-Za-z0-9·∆∞-]|$)/u);
  return match ? match[1] : stem;
}

function listMarkdown(root) {
  const files = [];
  const visit = (directory) => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      if (item.isDirectory() && !['.git', 'node_modules', '__pycache__'].includes(item.name)) {
        visit(join(directory, item.name));
      } else if (item.isFile() && item.name.toLowerCase().endsWith('.md')) {
        files.push(join(directory, item.name));
      }
    }
  };
  visit(root);
  return files.sort();
}

function validateManifest(raw) {
  const required = [
    'schemaVersion', 'name', 'atlas', 'rootDocuments', 'corpora',
    'publicationDocuments', 'reviewRequired', 'exclude', 'authorityOrder', 'answerPolicy',
  ];
  const missing = required.filter((key) => raw?.[key] === undefined);
  if (missing.length) throw new Error(`CORPUS-MANIFEST.yaml 缺少必要區段：${missing.join(', ')}`);
  if (raw.schemaVersion !== 1) throw new Error('只支援 CORPUS-MANIFEST.yaml schemaVersion 1。');
  for (const key of ['rootDocuments', 'corpora', 'publicationDocuments', 'reviewRequired', 'exclude', 'authorityOrder']) {
    if (!Array.isArray(raw[key]) || raw[key].length === 0) throw new Error(`manifest 的 ${key} 不可為空。`);
  }
  if (!raw.atlas?.path || !raw.atlas?.authority) throw new Error('manifest atlas 必須包含 path 與 authority。');
  if (raw.rootDocuments.some((rule) => !rule?.path || !rule?.authority)) throw new Error('manifest rootDocuments 規則不完整。');
  if (raw.corpora.some((rule) => !rule?.id || !rule?.include || !rule?.authority)) throw new Error('manifest corpora 規則不完整。');
  if (raw.publicationDocuments.some((rule) => !(rule?.path || rule?.pattern) || !rule?.authority)) throw new Error('manifest publicationDocuments 規則不完整。');
  if (raw.reviewRequired.some((rule) => !rule?.pattern || !rule?.reason)) throw new Error('manifest reviewRequired 規則不完整。');
  const requiredPolicies = ['requireCitation', 'distinguishInference', 'allowNoAnswer', 'treatCorpusAsUntrustedData', 'neverClaimSoleAuthority'];
  for (const key of requiredPolicies) {
    if (typeof raw.answerPolicy?.[key] !== 'boolean') throw new Error(`manifest answerPolicy 缺少布林值：${key}`);
  }
  if (new Set(raw.authorityOrder).size !== raw.authorityOrder.length) throw new Error('manifest authorityOrder 含重複值。');
  const declaredAuthorities = [
    raw.atlas.authority,
    ...raw.rootDocuments.map((rule) => rule.authority),
    ...raw.corpora.map((rule) => rule.authority),
    ...raw.publicationDocuments.map((rule) => rule.authority),
    'historical',
  ];
  const unknown = [...new Set(declaredAuthorities)].filter((authority) => !raw.authorityOrder.includes(authority));
  if (unknown.length) throw new Error(`manifest 有未列入 authorityOrder 的 authority：${unknown.join(', ')}`);
  return raw;
}

export function findRepoRoot(from = dirname(fileURLToPath(import.meta.url))) {
  let candidate = resolve(process.env.TRP_REPO_ROOT || from);
  for (;;) {
    if (existsSync(join(candidate, 'CORPUS-MANIFEST.yaml'))) return candidate;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error('找不到 CORPUS-MANIFEST.yaml；請在協議庫內啟動，或設定 TRP_REPO_ROOT。');
    candidate = parent;
  }
}

export function classifyPath(rel, manifest) {
  if (manifest.exclude.some((rule) => matches(rel, rule))) return { disposition: 'excluded', authority: null, corpus: null };
  if (manifest.reviewRequired.some((rule) => matches(rel, rule.pattern))) return { disposition: 'review-required', authority: null, corpus: null };
  if (rel === manifest.atlas.path) return { disposition: 'index', authority: manifest.atlas.authority, corpus: null };
  const rootDocument = manifest.rootDocuments.find((rule) => rel === rule.path);
  if (rootDocument) return { disposition: 'index', authority: rootDocument.authority, corpus: null };
  const publication = manifest.publicationDocuments.find((rule) => matches(rel, rule.path || rule.pattern));
  if (publication) return { disposition: 'index', authority: publication.authority, corpus: 'docs' };
  for (const corpus of manifest.corpora) {
    if (!matches(rel, corpus.include)) continue;
    const historical = corpus.historyPattern && matches(rel, corpus.historyPattern);
    return { disposition: 'index', authority: historical ? 'historical' : corpus.authority, corpus: corpus.id };
  }
  return { disposition: 'not-included', authority: null, corpus: null };
}

function gitValue(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

// 中文不以空白斷詞，整串查詢會變成單一 token；只靠 includes 會讓「出現 10 次」
// 與「出現 3 次」同分，再由 authority 決勝，於是最切題的文件反而沉底。
function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let total = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) return total;
    total += 1;
    from = at + needle.length;
  }
}

// 由 CJK token 衍生字元 bigram，讓部分概念重疊也能排序；權重低於原 token。
function cjkBigrams(tokens) {
  const literal = new Set(tokens);
  const grams = new Set();
  for (const token of tokens) {
    if (token.length < 3 || !CJK.test(token)) continue;
    for (let i = 0; i + 2 <= token.length; i += 1) {
      const gram = token.slice(i, i + 2);
      if (!literal.has(gram)) grams.add(gram);
    }
  }
  return [...grams];
}

function lineSnippet(text, query, radius = 1) {
  const lines = text.split(/\r?\n/u);
  const needle = query.toLocaleLowerCase();
  let at = lines.findIndex((line) => line.toLocaleLowerCase().includes(needle));
  if (at < 0) {
    const token = query.trim().split(/\s+/u).find(Boolean);
    at = token ? lines.findIndex((line) => line.toLocaleLowerCase().includes(token.toLocaleLowerCase())) : 0;
  }
  at = Math.max(0, at);
  const start = Math.max(0, at - radius);
  const end = Math.min(lines.length, at + radius + 1);
  return { text: lines.slice(start, end).join('\n').trim(), lineStart: start + 1, lineEnd: end };
}

function summarize(entry, includeContent = false, maxChars = 30_000) {
  const result = {
    id: entry.idRaw,
    path: entry.path,
    title: entry.title,
    corpus: entry.corpus,
    authority: entry.authority,
    version: entry.versionRaw || null,
    versionMachine: entry.versionMachine,
    latestActiveVersion: entry.latestActiveVersion || null,
    candidateOverlay: entry.candidateOverlay,
    successorNote: entry.successorNote || null,
    status: entry.statusMachine || null,
    statusRaw: entry.statusRaw || null,
    statusKind: entry.statusKind,
    epistemicStatus: entry.epistemicStatus || null,
    date: entry.date || null,
    updated: entry.updated || null,
    citation: entry.citation,
    sha256: entry.sha256,
    warnings: [...entry.warnings],
  };
  if (includeContent) {
    result.content = entry.content.slice(0, maxChars);
    result.truncated = entry.content.length > maxChars;
    if (result.truncated) result.warnings.push(`content-truncated:${maxChars}`);
  }
  return result;
}

function entryFromFile(full, rel, classification, content) {
  const { source, shape } = metadataBlock(content);
  const meta = parseFlatYaml(source);
  const filename = rel.split('/').at(-1);
  const expectsId = PROTOCOL_FILE.test(filename) || /^SPEC\/(history\/)?\d{3}-/u.test(rel);
  const declaredId = meta.id || '';
  const idRaw = declaredId || (expectsId ? idFromFilename(filename) : null);
  const status = machineStatus(meta.status || '');
  const candidateSignals = ['candidate_overlay_version', 'candidate_overlay_status', 'successor_note']
    .filter((key) => Boolean(meta[key]));
  if (/candidate|候選|revision-required/i.test(`${meta.version || ''} ${meta.status || ''}`)) candidateSignals.push('status_or_version_text');
  const warnings = [];
  if (classification.authority === 'historical') warnings.push('historical');
  if (classification.authority === 'draft-mirror') warnings.push('draft-mirror');
  if (candidateSignals.length) warnings.push('has-candidate');
  if (expectsId && (!declaredId || shape === 'none')) warnings.push('metadata-incomplete');

  return {
    path: rel,
    fullPath: full,
    corpus: classification.corpus,
    authority: classification.authority,
    content,
    sha256: sha256(content),
    bytes: Buffer.byteLength(content, 'utf8'),
    idRaw,
    lookupKey: lookupKey(idRaw),
    idDeclared: Boolean(declaredId),
    metadataShape: shape,
    title: meta.title || filename.replace(/\.md$/iu, ''),
    versionRaw: meta.version || '',
    versionMachine: machineVersion(meta.version),
    latestActiveVersion: meta.latest_active_version || '',
    candidateOverlay: meta.candidate_overlay_version || meta.candidate_overlay_status
      ? { version: meta.candidate_overlay_version || null, status: meta.candidate_overlay_status || null }
      : null,
    successorNote: meta.successor_note || '',
    statusRaw: meta.status || '',
    statusMachine: status.machine,
    statusKind: status.kind,
    date: meta.date || meta.created || '',
    updated: meta.updated || meta.last_updated || '',
    epistemicStatus: meta.epistemic_status || '',
    related: Array.isArray(meta.related) ? meta.related : (meta.related ? [meta.related] : []),
    supersedes: Array.isArray(meta.supersedes) ? meta.supersedes : (meta.supersedes ? [meta.supersedes] : []),
    candidateSignals,
    warnings,
    citation: `${idRaw || meta.title || rel} (${rel})`,
  };
}

function staleError(cause) {
  const error = new Error('公開語料或治理規則在 MCP 啟動後已改變或無法驗證；請重啟 MCP server。', { cause });
  error.code = 'STALE_CORPUS';
  return error;
}

function snapshot(root, manifest, manifestDigest) {
  // Check policy bytes before reading any bodies under the startup allowlist.
  if (sha256(readFileSync(join(root, 'CORPUS-MANIFEST.yaml'))) !== manifestDigest) throw staleError();
  const indexed = [];
  const dispositions = { index: 0, 'review-required': 0, excluded: 0, 'not-included': 0 };
  for (const full of listMarkdown(root)) {
    const rel = posix(relative(root, full));
    const classification = classifyPath(rel, manifest);
    dispositions[classification.disposition] += 1;
    if (classification.disposition === 'index') {
      const content = readFileSync(full, 'utf8');
      indexed.push({ full, rel, classification, content, sha256: sha256(content) });
    }
  }
  const stampParts = indexed.map(({ rel, sha256: digest }) => `${rel}:${digest}`);
  stampParts.push(`CORPUS-MANIFEST.yaml:${manifestDigest}`);
  return { indexed, dispositions, stamp: sha256(stampParts.sort().join('\n')) };
}

function isHistorical(entry) {
  return entry.authority === 'historical' || entry.statusMachine === 'Superseded';
}

function isPendingCandidate(entry) {
  return !isHistorical(entry) && (entry.candidateSignals.length > 0 || ['Candidate', 'Draft', 'Seed'].includes(entry.statusMachine));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function idReferencePattern(id) {
  let pattern = '';
  let inSeparator = false;
  for (const character of String(id)) {
    if (/[·_\s-]/u.test(character)) {
      if (!inSeparator) pattern += '[·_\\s-]+';
      inSeparator = true;
    } else {
      pattern += escapeRegExp(character);
      inSeparator = false;
    }
  }
  return new RegExp(`(?<![A-Za-z0-9∆∞])${pattern}(?![A-Za-z0-9∆∞])`, 'giu');
}

function referenceKeys(references, knownIds) {
  const keys = new Set();
  for (const reference of references) {
    const candidates = [];
    for (const { key, pattern } of knownIds) {
      for (const match of reference.matchAll(pattern)) {
        candidates.push({ key, start: match.index, end: match.index + match[0].length });
      }
    }
    // A declared ID can prefix another declared ID (EPOCH-018 vs its
    // REVIEW-LEDGER). Prefer the longest overlapping known ID. If no longer
    // declared ID exists, suffix text remains a filename/title annotation.
    candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
    const selected = [];
    for (const candidate of candidates) {
      if (selected.some((item) => candidate.start >= item.start && candidate.end <= item.end)) continue;
      selected.push(candidate);
      keys.add(candidate.key);
    }
  }
  return keys;
}

function lexiconName(title) {
  const clean = title.replace(/[*`]/gu, '').trim();
  // Strip only a final romanization/translation group. Chinese parenthetical
  // qualifiers such as 「脈動（存在視角）」 are part of the term itself.
  return clean.replace(/\s*[(（][^()（）]*[A-Za-z\u00c0-\u024f][^()（）]*[)）]\s*$/u, '').trim().toLowerCase();
}

function markdownHeadings(content) {
  const lines = content.split(/\r?\n/u);
  const headings = [];
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = null;
      continue;
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/u);
    if (opening) { fence = opening[1]; continue; }
    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/u);
    if (heading) headings.push({ at: index, level: heading[1].length, title: heading[2] });
  }
  return { lines, headings };
}

export class PublicCorpus {
  constructor(root = findRepoRoot()) {
    this.root = resolve(root);
    const manifestSource = readFileSync(join(this.root, 'CORPUS-MANIFEST.yaml'), 'utf8');
    this.manifest = validateManifest(YAML.parse(manifestSource));
    this.manifestDigest = sha256(manifestSource);
    const initial = snapshot(this.root, this.manifest, this.manifestDigest);
    this.dispositions = initial.dispositions;
    this.snapshotStamp = initial.stamp;
    this.entries = initial.indexed.map(({ full, rel, classification, content }) => entryFromFile(full, rel, classification, content));
    this.digest = sha256(JSON.stringify(this.entries.map((entry) => ({ path: entry.path, sha256: entry.sha256 }))));
    this.commit = gitValue(this.root, ['rev-parse', 'HEAD']);
    this.dirty = Boolean(gitValue(this.root, ['status', '--porcelain']));
    this.byKey = new Map();
    for (const entry of this.entries) {
      if (!entry.lookupKey) continue;
      if (!this.byKey.has(entry.lookupKey)) this.byKey.set(entry.lookupKey, []);
      this.byKey.get(entry.lookupKey).push(entry);
    }
    this.knownIds = [...this.byKey.entries()].flatMap(([key, entries]) =>
      [...new Set(entries.map((entry) => entry.idRaw).filter(Boolean))]
        .map((id) => ({ key, pattern: idReferencePattern(id) })));
    this.assertFresh();
  }

  assertFresh() {
    if (this.stale) throw staleError();
    try {
      const now = snapshot(this.root, this.manifest, this.manifestDigest).stamp;
      if (now !== this.snapshotStamp) throw staleError();
    } catch (cause) {
      this.stale = true;
      throw staleError(cause);
    }
  }

  provenance() {
    return {
      commit: this.commit,
      workingTreeDirtyAtStartup: this.dirty,
      corpusDigest: this.digest,
      manifestDigest: this.manifestDigest,
      indexedAtStartup: true,
      stale: false,
      profile: 'public-only',
    };
  }

  resolve(id, version, maxChars = 30_000) {
    this.assertFresh();
    let matches = [...(this.byKey.get(lookupKey(id)) || [])];
    if (version) {
      const wanted = String(version).trim().toLowerCase();
      const numericOnly = /^v\d+\.\d+(?:\.\d+)?$/u.test(wanted);
      matches = matches.filter((entry) => entry.versionRaw.toLowerCase() === wanted
        || (numericOnly && entry.versionMachine === wanted));
    }
    matches.sort((a, b) => this.authorityRank(a.authority) - this.authorityRank(b.authority) || a.path.localeCompare(b.path));
    return {
      found: matches.length > 0,
      ambiguous: matches.length > 1,
      query: { id, version: version || null },
      documents: matches.map((entry) => summarize(entry, true, maxChars)),
      warnings: matches.length > 1 ? ['ambiguous-id: no document was selected automatically'] : [],
      provenance: this.provenance(),
    };
  }

  authorityRank(authority) {
    const rank = this.manifest.authorityOrder.indexOf(authority);
    return rank < 0 ? Number.MAX_SAFE_INTEGER : rank;
  }

  search({ query, corpus, minAuthority = 'contextual', includeHistory = false, limit = 10 }) {
    this.assertFresh();
    const threshold = this.authorityRank(minAuthority);
    if (threshold === Number.MAX_SAFE_INTEGER) throw new Error(`未知 authority：${minAuthority}`);
    const normalized = query.trim().toLocaleLowerCase();
    const tokens = [...new Set(normalized.split(/\s+/u).filter(Boolean))];
    const grams = cjkBigrams(tokens);
    if (!normalized) return { query, results: [], provenance: this.provenance() };

    const ranked = [];
    for (const entry of this.entries) {
      if (corpus && entry.corpus !== corpus) continue;
      const historical = entry.authority === 'historical';
      if (historical && !includeHistory) continue;
      if (!historical && this.authorityRank(entry.authority) > threshold) continue;
      const id = String(entry.idRaw || '').toLocaleLowerCase();
      const title = entry.title.toLocaleLowerCase();
      const body = entry.content.toLocaleLowerCase();
      let score = 0;
      if (id === normalized || entry.lookupKey === lookupKey(query)) score += 100;
      if (title === normalized) score += 70;
      if (title.includes(normalized)) score += 35;
      const phraseHits = countOccurrences(body, normalized);
      if (phraseHits) score += 20 + Math.min(20, (phraseHits - 1) * 2);
      for (const token of tokens) {
        if (id.includes(token)) score += 15;
        if (title.includes(token)) score += 8;
        const tokenHits = countOccurrences(body, token);
        if (tokenHits) score += 2 + Math.min(10, tokenHits - 1);
      }
      for (const gram of grams) {
        if (title.includes(gram)) score += 4;
        if (body.includes(gram)) score += 1;
      }
      if (!score) continue;
      const snippet = lineSnippet(entry.content, query);
      ranked.push({ entry, score, snippet });
    }
    ranked.sort((a, b) => b.score - a.score || this.authorityRank(a.entry.authority) - this.authorityRank(b.entry.authority) || a.entry.path.localeCompare(b.entry.path));
    return {
      query,
      results: ranked.slice(0, limit).map(({ entry, score, snippet }) => ({
        ...summarize(entry),
        score,
        snippet: snippet.text,
        citation: `${entry.citation}:L${snippet.lineStart}-L${snippet.lineEnd}`,
      })),
      warnings: ranked.length ? [] : ['no-answer'],
      provenance: this.provenance(),
    };
  }

  current(idOrTopic) {
    this.assertFresh();
    const exact = this.byKey.get(lookupKey(idOrTopic)) || [];
    const entries = exact.length
      ? [...exact]
      : this.search({ query: idOrTopic, minAuthority: 'contextual', includeHistory: true, limit: 20 }).results
        .map((result) => this.entries.find((entry) => entry.path === result.path));
    const active = entries.filter((entry) => entry.statusMachine === 'Active' && entry.authority !== 'historical');
    const candidates = entries.filter(isPendingCandidate);
    const historical = entries.filter(isHistorical);
    return {
      found: entries.length > 0,
      query: idOrTopic,
      active: active.map((entry) => summarize(entry)),
      candidates: candidates.map((entry) => summarize(entry)),
      historical: historical.map((entry) => summarize(entry)),
      otherMatches: entries.filter((entry) => !active.includes(entry) && !candidates.includes(entry) && !historical.includes(entry)).map((entry) => summarize(entry)),
      warnings: entries.length ? (exact.length > 1 ? ['ambiguous-id: state is reported for every matching document'] : []) : ['no-answer'],
      provenance: this.provenance(),
    };
  }

  lex(term, limit = 20) {
    this.assertFresh();
    const normalized = term.trim().toLowerCase();
    const matches = [];
    for (const entry of this.entries) {
      if (entry.corpus !== 'lex' || isHistorical(entry) || !normalized) continue;
      const { lines, headings } = markdownHeadings(entry.content);
      for (const [index, heading] of headings.entries()) {
        const title = heading.title.replace(/[*`]/gu, '').toLowerCase();
        // LEX terms are level-two headings with optional pronunciation/translation.
        // Requiring the term name avoids returning passing mentions as definitions.
        const name = lexiconName(heading.title);
        if (heading.level !== 2 || (name !== normalized && title !== normalized)) continue;
        const end = headings.slice(index + 1).find((next) => next.level <= heading.level)?.at ?? lines.length;
        let lineEnd = end;
        let content = lines.slice(heading.at, lineEnd).join('\n');
        const truncated = content.length > 30_000;
        if (truncated) {
          // Truncate on a line boundary so the citation describes the actual quote.
          lineEnd = heading.at;
          let chars = 0;
          while (lineEnd < end && chars + lines[lineEnd].length + (lineEnd > heading.at ? 1 : 0) <= 30_000) {
            chars += lines[lineEnd].length + (lineEnd > heading.at ? 1 : 0);
            lineEnd += 1;
          }
          content = lines.slice(heading.at, lineEnd).join('\n');
        }
        matches.push({
          ...summarize(entry), heading: heading.title, content, truncated,
          lineStart: heading.at + 1, lineEnd,
          citation: `${entry.citation}:L${heading.at + 1}-L${lineEnd}`,
          warnings: [...entry.warnings, ...(truncated ? ['content-truncated:30000'] : [])],
        });
      }
    }
    matches.sort((a, b) => this.authorityRank(a.authority) - this.authorityRank(b.authority) || a.path.localeCompare(b.path) || a.lineStart - b.lineStart);
    return {
      term, entries: matches.slice(0, limit), total: matches.length, truncated: matches.length > limit,
      warnings: matches.length ? [] : ['no-answer'], provenance: this.provenance(),
    };
  }

  pending(kind = 'candidate', limit = 50) {
    this.assertFresh();
    let entries;
    if (kind === 'candidate') {
      entries = this.entries.filter(isPendingCandidate);
    } else if (kind === 'review') {
      entries = this.entries.filter((entry) => /^EPOCH\/reviews\//u.test(entry.path));
    } else {
      const referenced = new Set();
      for (const source of this.entries) {
        for (const key of referenceKeys(source.related, this.knownIds)) {
          if (this.byKey.get(key)?.some((target) => target.path !== source.path)) referenced.add(key);
        }
      }
      entries = this.entries.filter((entry) => entry.lookupKey && !referenced.has(entry.lookupKey));
    }
    entries.sort((a, b) => this.authorityRank(a.authority) - this.authorityRank(b.authority) || a.path.localeCompare(b.path));
    return {
      kind,
      items: entries.slice(0, limit).map((entry) => summarize(entry)),
      total: entries.length,
      truncated: entries.length > limit,
      interpretation: kind === 'unattended'
        ? '機械訊號：frontmatter related 清單中沒有其他公開文件指向此 ID；不是治理裁定。'
        : '公開語料中的機械訊號；不是治理裁定。',
      provenance: this.provenance(),
    };
  }

  // 版本轉述檢查：A 檔在連往 B 檔的連結上寫了版本，B 自己宣告的不是那一版。
  // 宣告只有一處，轉述散在各導航檔；改版漏改就過期，而且沒有人會發現。
  //
  // 邊界由結構保證：只掃已進公開索引的文件，reviewRequired 從未被載入，
  // 因此既不會被當成來源，也不會被當成目標。
  consistency({ limit = 50 } = {}) {
    this.assertFresh();
    const byPath = new Map(this.entries.map((entry) => [entry.path, entry]));
    const VERSION = /v\d+(?:\.\d+)*(?:-[A-Za-z0-9\u4e00-\u9fff]+(?:-[A-Za-z0-9\u4e00-\u9fff]+)*)?/gu;
    const LINK = /\[([^\]\n]*)\]\(([^)\n]+)\)/gu;
    const numeric = (value) => {
      const hit = /^v(\d+(?:\.\d+)*)/u.exec(value);
      return hit ? hit[1] : null;
    };
    const declaredVersions = (entry) => {
      const out = new Set();
      for (const field of [entry.versionRaw, entry.latestActiveVersion, entry.candidateOverlay?.version]) {
        for (const token of String(field || '').match(VERSION) || []) {
          if (numeric(token)) out.add(token);
        }
      }
      return out;
    };
    // 未帶後綴可指基版；帶後綴時必須完整相符。候選、草稿與正式版
    // 不能只因數字相同就被視為同一治理狀態。
    const versionClaimMatches = (claim, declared) => {
      const base = numeric(claim);
      if (!base) return false;
      if (claim !== `v${base}`) return declared.has(claim);
      return [...declared].some((token) => numeric(token) === base);
    };
    // 命中要分三層讀，否則少數真問題會被大量歷史紀錄淹沒。
    const layerOf = (rel) => {
      if (rel.startsWith('DOCS/sources/')) return 'mixed';
      if (/(^|\/)(AGENT_SESSION_LOG\.md$|history\/|reviews\/)/u.test(`/${rel}`)) return 'record';
      return rel.split('/').pop() === 'README.md' ? 'live' : 'record';
    };

    let checked = 0;
    const items = [];
    for (const source of this.entries) {
      const dir = source.path.includes('/') ? source.path.slice(0, source.path.lastIndexOf('/')) : '';
      const lines = String(source.content).split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        LINK.lastIndex = 0;
        let hit = LINK.exec(line);
        while (hit) {
          const [whole, label, rawTarget] = hit;
          const target = decodeURIComponent(rawTarget.split('#')[0].trim());
          if (target.endsWith('.md') && !/^https?:/u.test(target)) {
            const resolved = posix(join(dir, target));
            const targetEntry = byPath.get(resolved);
            if (targetEntry && targetEntry.path !== source.path) {
              // 版本宣稱只認兩個位置：連結文字內，或同段落的括號內。
              // 自由散文裡的版本字串（「吸收 v0.1 四票」）是敘述，不是轉述。
              let tail = line.slice(hit.index + whole.length);
              for (const stop of ['[', '|']) {
                const cut = tail.indexOf(stop);
                if (cut >= 0) tail = tail.slice(0, cut);
              }
              const paren = (tail.match(/[（(]([^）)]*)[）)]/gu) || []).join(' ');
              const claims = [...(label.match(VERSION) || []), ...(paren.match(VERSION) || [])]
                .filter((token) => numeric(token));
              if (claims.length) {
                checked += 1;
                const declared = declaredVersions(targetEntry);
                if (declared.size) {
                  for (const claim of claims) {
                    if (!versionClaimMatches(claim, declared)) {
                      items.push({
                        path: source.path,
                        line: i + 1,
                        claimed: claim,
                        declared: [targetEntry.versionRaw, targetEntry.latestActiveVersion,
                          targetEntry.candidateOverlay?.version].filter(Boolean).join(' '),
                        target: targetEntry.path,
                        targetId: targetEntry.idRaw || null,
                        layer: layerOf(source.path),
                      });
                    }
                  }
                }
              }
            }
          }
          hit = LINK.exec(line);
        }
      }
    }

    const order = { live: 0, mixed: 1, record: 2 };
    items.sort((a, b) => order[a.layer] - order[b.layer] || a.path.localeCompare(b.path) || a.line - b.line);
    const counts = { live: 0, mixed: 0, record: 0 };
    for (const item of items) counts[item.layer] += 1;
    return {
      checkedClaims: checked,
      counts,
      items: items.slice(0, limit),
      total: items.length,
      truncated: items.length > limit,
      interpretation: [
        '機械訊號，不是治理裁定。live=活導航（各 README），過期即需修正。',
        'mixed=DOCS/sources 的 README 上半是現役導航、下半是不得倒填的來源表，需人判讀。',
        'record=快照與審讀帳等 append-only 紀錄，其版本是歷史，預設不動。',
        '只涵蓋公開索引；reviewRequired 與 excluded 路徑不在檢查範圍，其缺漏不由本結果代表。',
      ].join(' '),
      provenance: this.provenance(),
    };
  }

  manifestView() {
    this.assertFresh();
    return {
      schemaVersion: this.manifest.schemaVersion,
      name: this.manifest.name,
      profile: 'public-only',
      authorityOrder: this.manifest.authorityOrder,
      answerPolicy: this.manifest.answerPolicy,
      publicRoots: {
        atlas: this.manifest.atlas,
        rootDocuments: this.manifest.rootDocuments,
        corpora: this.manifest.corpora,
        publicationDocuments: this.manifest.publicationDocuments,
      },
      withheldPatterns: this.manifest.reviewRequired,
      excludedPatterns: this.manifest.exclude,
      counts: { indexed: this.entries.length, ...this.dispositions },
      provenance: this.provenance(),
    };
  }
}
