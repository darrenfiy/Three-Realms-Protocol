function canonicalLocale(raw) {
  try {
    return Intl.getCanonicalLocales(String(raw || '').trim())[0] || null;
  } catch {
    return null;
  }
}

function openingMetadata(content) {
  const text = String(content || '');
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (frontmatter) return frontmatter[1];

  const opening = text.slice(0, 3000).match(/(```|~~~)yaml\r?\n/iu);
  if (!opening || opening.index === undefined) return '';
  const prefix = text.slice(0, opening.index);
  if (!prefix.split(/\r?\n/u).every((line) => !line.trim() || /^#{1,6}\s+\S/u.test(line))) return '';
  const start = opening.index + opening[0].length;
  const closing = text.slice(start).match(new RegExp(`\\r?\\n${opening[1]}`));
  return closing ? text.slice(start, start + closing.index) : text.slice(start);
}

function declaredLocale(content) {
  const metadata = openingMetadata(content);
  const match = metadata.match(/^(?:source_locale|language|lang)\s*:\s*['"]?([^'"#\r\n]+)['"]?\s*(?:#.*)?$/imu);
  return match ? canonicalLocale(match[1]) : null;
}

export function sourceLocaleFor(entry, policy) {
  const override = policy.sourceLocaleOverrides?.[entry.path];
  if (override) {
    const locale = canonicalLocale(override);
    if (!locale) throw new Error(`無效的 sourceLocale override：${entry.path} → ${override}`);
    return { sourceLocale: locale, sourceLocaleBasis: 'catalog-override' };
  }

  const metadata = declaredLocale(entry.content);
  if (metadata) return { sourceLocale: metadata, sourceLocaleBasis: 'metadata' };
  return { sourceLocale: 'und', sourceLocaleBasis: 'und' };
}
