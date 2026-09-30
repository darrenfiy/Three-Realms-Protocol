import { basename, posix } from 'node:path';

function assertSupportedPolicy(policy) {
  if (policy.unicodeNormalization !== 'NFKC'
    || policy.case !== 'lower'
    || policy.separatorCharacters !== '·_whitespace'
    || policy.otherPunctuation !== 'hyphen'
    || policy.duplicateIdStrategy !== 'path'
    || policy.idRouteEligibility !== 'single-non-historical'
    || policy.historicalRouteStrategy !== 'path') {
    throw new Error(`不支援的 route policy revision：${policy.revision || 'unknown'}`);
  }
}

export function slugSegment(value, routePolicy) {
  assertSupportedPolicy(routePolicy);
  let result = String(value || '').normalize('NFKC');
  for (const [symbol, word] of Object.entries(routePolicy.symbolWords || {})) {
    result = result.replaceAll(symbol, ` ${word} `);
  }
  result = result
    .toLocaleLowerCase('en-US')
    .replace(/[·_\s]+/gu, '-')
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
  if (!result) throw new Error(`無法產生 route slug：${value}`);
  return result;
}

function pathSegments(entry, nodeKind, routePolicy) {
  const withoutExtension = entry.path.replace(/\.md$/iu, '');
  const parts = withoutExtension.split('/');
  if (entry.corpus && parts[0]?.toLocaleLowerCase('en-US') === entry.corpus) parts.shift();

  if (nodeKind === 'navigation') {
    const file = basename(entry.path);
    if ((routePolicy.navigationIndexNames || []).some((name) => name.toLocaleLowerCase('en-US') === file.toLocaleLowerCase('en-US'))) {
      parts.pop();
    }
  }
  return parts.map((part) => slugSegment(part, routePolicy));
}

export function routePathFor(entry, { useIdRoute, nodeKind, policy }) {
  const override = policy.routeOverrides?.[entry.path];
  if (override) return override;

  const corpusSegment = entry.corpus || 'orientation';
  if (nodeKind !== 'navigation' && entry.idRaw && useIdRoute) {
    return posix.join('library', corpusSegment, slugSegment(entry.idRaw, policy.routePolicy));
  }

  return posix.join('library', corpusSegment, ...pathSegments(entry, nodeKind, policy.routePolicy));
}

export function assertUniqueRoutes(entries) {
  const byRoute = new Map();
  for (const entry of entries) {
    if (!byRoute.has(entry.routePath)) byRoute.set(entry.routePath, []);
    byRoute.get(entry.routePath).push(entry.path);
  }
  const collisions = [...byRoute.entries()].filter(([, paths]) => paths.length > 1);
  if (collisions.length) {
    const detail = collisions.map(([route, paths]) => `${route}: ${paths.join(', ')}`).join('\n');
    throw new Error(`Library route collision；請用版本化 routeOverrides 明確處理：\n${detail}`);
  }
}
