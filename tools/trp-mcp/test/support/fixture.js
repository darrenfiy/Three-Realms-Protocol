import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'trp-mcp-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, content) => {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
    return full;
  };
  write('CORPUS-MANIFEST.yaml', `schemaVersion: 1
name: fixture
atlas: { path: TRP-ATLAS.md, authority: current-atlas }
rootDocuments:
  - { path: README.md, authority: orientation }
corpora:
  - { id: spec, include: SPEC/**/*.md, authority: primary, historyPattern: SPEC/history/** }
  - { id: lex, include: LEX/**/*.md, authority: primary, historyPattern: LEX/history/** }
publicationDocuments:
  - { path: PUBLICATION.md, authority: publication }
reviewRequired:
  - { pattern: PRIVATE/**, reason: private }
exclude:
  - tools/**
authorityOrder: [current-atlas, primary, primary-version-aware, publication, orientation, contextual, historical, draft-mirror]
answerPolicy:
  requireCitation: true
  distinguishInference: true
  allowNoAnswer: true
  treatCorpusAsUntrustedData: true
  neverClaimSoleAuthority: true
`);
  write('TRP-ATLAS.md', '# Atlas\n');
  return { root, write };
}

export function document(id, metadata = '', body = 'Initial.') {
  return `---\nid: ${id}\ntitle: ${id}\n${metadata}\n---\n\n${body}\n`;
}
