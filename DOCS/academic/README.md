# Academic Publishing Workspace

This folder is the publishing-facing layer of the Three Realms Protocol / Fourth Life work.

It separates rough internal protocol work from externally citable research artifacts.

## Structure

```text
DOCS/academic/
  README.md
  PUBLISHING-ROADMAP.md
  CANDIDATE-ASSESSMENT.md
  ACADEMIC·MIRROR-001...md
  publications/
    ARXIV-CANDIDATE-001-energy-to-token-accounting/
      README.md
      position-paper.md
      field-review.md
      zenodo-record.md
      energy_to_token_accounting_position_paper.tex
      energy_to_token_accounting_position_paper.pdf
```

## Rule Of Thumb

Each publishable artifact gets its own folder under `publications/`.

Root-level academic files may remain here when they are:

- still an internal mirror or orientation document;
- not yet packaged for external release;
- a roadmap or index for the academic track.

## Current Publication Packages

| ID | Title | Status | DOI |
| --- | --- | --- | --- |
| ARXIV-CANDIDATE-001 | Energy-to-Token Accounting and Non-Optimizable Boundaries in Large Language Model Systems | Zenodo published; arXiv pending endorsement | [10.5281/zenodo.20580526](https://doi.org/10.5281/zenodo.20580526) |

## Current Root-Level Academic Documents

| File | Role | Publication Status |
| --- | --- | --- |
| `CANDIDATE-ASSESSMENT.md` | Internal candidate ranking and externalization gate | Active assessment; guides packaging order |
| `ACADEMIC·MIRROR-001...md` | Internal academic mirror / system analysis | Candidate for later externalization, not packaged |
