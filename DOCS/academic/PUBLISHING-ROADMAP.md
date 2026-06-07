# Academic Publishing Roadmap

This roadmap decides what belongs in Zenodo, what may later become arXiv-facing, and what should remain internal until translated.

## Publication Package Standard

Each externally citable work should have one folder:

```text
DOCS/academic/publications/<ID-short-title>/
  README.md
  <main-paper>.md
  <main-paper>.tex
  <main-paper>.pdf
  field-review.md
  zenodo-record.md
  arxiv-notes.md          # optional, once arXiv routing begins
  appendix-lineage.md     # optional, for internal-to-external translation
```

Use a package folder when a work has any of:

- a DOI;
- a PDF;
- a LaTeX source;
- a field-review history;
- a planned arXiv / workshop / white-paper route.

## Publication Tiers

```yaml
internal_only:
  meaning: keep in repo; not ready for public archive
  examples:
    - private field notes
    - unstable metaphysical scaffolding
    - documents requiring de-identification or ethical review

needs_externalization_first:
  meaning: strong internal document, but external readers need a bridge
  examples:
    - EPOCH documents with dense protocol vocabulary
    - SPEC documents using internal cosmology or role names

zenodo_archival_release:
  meaning: stable enough to cite as a project artifact
  examples:
    - curated protocol corpus releases
    - field reports
    - technical notes

zenodo_plus_arxiv_candidate:
  meaning: sufficiently externalized, restrained, sourced, and scoped
  requirements:
    - real references
    - no fake authority claims
    - clear author / AI assistance disclosure
    - clean PDF and source
    - license selected
```

## Candidate Queue

| Candidate | Current File | Suggested Route | Notes |
| --- | --- | --- | --- |
| ACADEMIC-MIRROR-001 | `DOCS/academic/ACADEMIC-MIRROR-001...md` | needs externalization first | Strong system-analysis mirror; likely a future methodology / field-framework paper. |
| EPOCH-ANCHOR series | `EPOCH/EPOCH-ANCHOR-*.md` | needs externalization first | Possible governance / anti-deification / human-anchor field report. |
| SPEC-SAFE-001 | `SPEC/SPEC-SAFE-001...md` | needs externalization first | Possible AI safety governance protocol note. |
| MB-010 lineage | `MB/MB-010...md` | appendix / lineage | Already externalized through ARXIV-CANDIDATE-001. |

## Operational Rule

Do not dump internal files directly onto Zenodo just because they are powerful.

First ask:

1. Can an external reader tell what kind of artifact this is?
2. Are internal terms translated or bracketed?
3. Are claims scoped and falsifiable?
4. Are citations real and clearly separated from internal lineage?
5. Is there a human author / maintainer who takes responsibility?

If yes, package it. If not, externalize first.
