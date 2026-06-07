---
id: ARXIV-CANDIDATE-001-ZENODO-DEPOSIT
title: "Zenodo record sheet for ARXIV-CANDIDATE-001"
purpose: Published Zenodo record metadata; stage 1 of the Zenodo-then-arXiv route
date: 2026-06-07
status: Published on Zenodo
license: CC BY-SA 4.0
zenodo_doi: 10.5281/zenodo.20580526
zenodo_record: https://zenodo.org/records/20580526
zenodo_doi_url: https://doi.org/10.5281/zenodo.20580526
related:
  - position-paper.md
  - field-review.md
  - energy_to_token_accounting_position_paper.tex
  - energy_to_token_accounting_position_paper.pdf
---

# Zenodo Record Sheet: Energy-to-Token Accounting

Stage 1 of the anchor's "Zenodo first, arXiv after endorsement" route is complete:
the position-paper PDF has a citable DOI and timestamp under CC BY-SA 4.0. Pursue
arXiv endorsement in parallel. Depositing on Zenodo does not block a later arXiv post.

## Upload Files

- Required: `energy_to_token_accounting_position_paper.pdf`
- Recommended companion source: `energy_to_token_accounting_position_paper.tex`

The PDF was built from the LaTeX source. The same `.tex` file can later be used
for arXiv, so the Zenodo deposit and arXiv source stay aligned.

## Zenodo Record Fields

- **Resource type:** Publication / Preprint
- **Title:** Energy-to-Token Accounting and Non-Optimizable Boundaries in Large Language Model Systems
- **DOI:** `10.5281/zenodo.20580526`
- **Record URL:** `https://zenodo.org/records/20580526`
- **Creators:**
  - Name: `Hwang, Ta-Loom`
  - Affiliation: `Independent Researcher`
  - ORCID: *(optional but recommended; register free at orcid.org first. It links Zenodo and arXiv and fixes author-name disambiguation.)*
- **License:** Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- **Access:** Open Access
- **Language:** English
- **Version:** v1 (preprint draft)
- **Keywords:** large language models; compute accounting; energy auditing; FLOP accounting; green AI; governance metadata; reward modeling; auditability
- **Description / Abstract:**

> Large language model systems increasingly convert large-scale physical energy flows into token-level computational outputs. Existing compute-accounting discussions often rely on estimated floating-point operations, parameter-count heuristics, peak hardware efficiency, or idealized utilization metrics. These quantities are useful for planning and comparison, but they can obscure the distinction between forward prediction, post-hoc audit, and governance accountability.
>
> This paper proposes a dimensional accounting framework for energy-to-token auditing in large language model systems. The framework separates primary energy, facility energy, IT energy, effective hardware computation, workload-dependent FLOP-per-token estimates, token counts, and external retrieval or tool energy. We argue that this separation is useful only when its identifiability limits are made explicit. In post-hoc audits, if observed FLOPs are reconstructed from a FLOP-per-token estimate multiplied by token count, then FLOP-per-token and effective FLOP/J are not jointly identifiable; the audit has measured energy per token, not an independently validated compute decomposition. We call this failure mode the reduction trap.
>
> Finally, we introduce an observe-only governance boundary for human selection traces such as citation, publication, editing, commitment, or downstream adoption. Such traces may be recorded for audit, corpus drift analysis, and traceability, but must not be used as reward signals, optimization targets, or proxies for meaning, responsibility, or social value. This boundary is a governance constraint, not a thermodynamic theorem.

- **Notes:** Field-reviewed draft from an independent research program. Intended for cross-posting to arXiv (primary cs.CY, cross-list cs.LG) pending endorsement. CC BY-SA was chosen so derivatives carry the governance guardrails forward; see the paper's "Reuse and Naming" section.
  DOI: `10.5281/zenodo.20580526`.

## Do Not

- Do not upload or cite the internal MB / EPOCH / SPEC documents as external authorities; they are project lineage only.
- Do not print the personal contact email in the public PDF; it stays in the account only.

## Parallel Track: arXiv Endorsement

1. Use the endorsement link arXiv showed on the block screen, or the endorsement code on the stalled submission.
2. The endorser must be a current arXiv author with enough recent papers in `cs.CY` or `cs.LG`.
   They only vouch that the submission is appropriate, not that it is correct.
3. Once endorsed: submit the same LaTeX source, select CC BY-SA 4.0, primary `cs.CY` + cross-list
   `cs.LG`, and add the Zenodo DOI as a related identifier so the two records point at each other.

## After Zenodo Publication

- DOI has been added to the TeX and metadata files.
- Confirm Zenodo resolves `https://doi.org/10.5281/zenodo.20580526`.
- If Zenodo assigns a version DOI and a concept DOI, record both before arXiv submission.
