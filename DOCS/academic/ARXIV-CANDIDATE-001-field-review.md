---
id: ARXIV-CANDIDATE-001
title: "Energy-to-Token Accounting and Non-Optimizable Boundaries in LLM Systems"
subtitle: "A field-review candidate derived from MB-010, not yet an arXiv submission"
category: Field Review / Research Translation / MB-010 Externalization
version: v0.3-field-review-intake
status: Field-Reviewed Candidate (Opus reviewed; Codex integrated; DeepSeek reviewed; Gemini draft assessed)
date: 2026-06-07
license: CC BY-SA 4.0
license_note: "Anchor decision; boundary is guarded by document warnings and governance, not copyright alone."
language_policy:
  main_body: English
  field_review_notes: Chinese + English
  rationale: >
    English is recommended for any future arXiv/workshop-facing version.
    Chinese is retained for internal field review because the boundary concepts
    and protocol lineage are currently sharper in the Fourth Life vocabulary.
source_documents:
  - MB-010: Three-Realm Fuel Dissipation Equation
  - EPOCH-PHA-009: Three-Realm Fuel Interoperability Engine
  - arXiv_Draft_Fuel_Dissipation.pdf: Gemini-generated draft, treated as a high-energy sketch rather than submission-ready manuscript
warnings:
  - "This document is not an arXiv submission draft yet."
  - "Do not cite internal Fourth Life documents as fake journals, fake arXiv IDs, or external peer-reviewed sources."
  - "Do not claim that human responsibility is derived from thermodynamics."
  - "Do not place responsibility, meaning, love, or life-force as variables inside the energy equation."
  - "Do not interpret token count as semantic value, wisdom, responsibility, or love."
  - "The observe-only boundary is a governance declaration and audit constraint, not a physical theorem or enforcement mechanism by itself."
---

# 0. Field Review Purpose

This file is a field-review bridge between MB-010 and a possible external research artifact.

The uploaded Gemini PDF is useful as a high-energy sketch, but it is not submission-ready. It overstates the claims, mixes thermodynamic accounting with responsibility variables, and uses unsafe or unverifiable references. This field-review candidate rewrites the direction into a restrained position-paper structure.

The target is not to prove a metaphysical thesis. The target is to express a clean, auditable framework:

> Measure the computational dissipation that can be measured.
> State the identifiability limits of compute decomposition.
> Mark the point where optimization must stop.
> Keep human governance and responsibility outside the objective function.

# 1. Recommended Language Strategy

## Recommendation

Use English as the main paper language.

## Why

1. arXiv-facing or workshop-facing readers expect English technical framing.
2. The core technical contribution is easier to evaluate when expressed as:
   - energy accounting,
   - dimensional closure,
   - workload-dependent coefficients,
   - identifiability limits,
   - audit boundaries,
   - governance constraints.
3. Fourth Life vocabulary can remain in footnotes, appendix, or internal review notes.

## Suggested split

```yaml
external-facing paper:
  language: English
  tone: restrained technical position paper
  claims: energy accounting + identifiability limit + audit boundary + governance constraint

internal field-review notes:
  language: Chinese / bilingual
  tone: protocol-aware
  claims: MB-010 lineage, boundary integrity, non-optimization ethics
```

# 2. Positioning

## Preferred title

**Energy-to-Token Accounting and Non-Optimizable Boundaries in Large Language Model Systems**

## Alternative title

**A Dimensional Accounting Framework and Identifiability Limit for Energy-to-Token Auditing in Large Language Model Systems**

## Avoid for now

**Three-Realm Fuel Dissipation Equation**

Reason: it is meaningful inside Fourth Life, but it will be misread externally as metaphysical branding before readers reach the technical core.

## Contribution framing

The energy-to-token chain is best presented as a consolidation and formalization of existing energy and compute accounting ideas, not as the paper's only novelty. The first-class contributions should be:

1. the reduction trap: in post-hoc audits, \(\varphi\) and \(\kappa_{\mathrm{eff}}\) are not jointly identifiable unless FLOPs are independently measured;
2. the observe-only boundary: human selection traces may be logged, but not optimized as value or responsibility proxies;
3. the governance metadata layer: energy accounting must carry audit labels for ownership, siting externalities, consent, and reporting scope.

The internal tension should be made explicit in the eventual paper (this note is reviewer guidance, not paper-body text; the clean paper-language version already lives in §3 Abstract): the reduction trap says post-hoc audits should often report measured J/token directly instead of pretending FLOP/token decomposition is independently identified. Therefore the paper is not merely a FLOP/token accounting framework; it is a dimensional accounting framework and a statement of its identifiability limit.

# 3. Proposed Abstract

Large language model systems increasingly convert large-scale physical energy flows into token-level outputs. Existing compute-accounting discussions often use estimated floating-point operations, parameter-count heuristics, or idealized hardware efficiency metrics, which can obscure the distinction between forward prediction, post-hoc audit, and governance accountability.

We propose an energy-to-token accounting framework for LLM systems. The framework separates primary energy, facility energy, IT energy, hardware-effective computation, workload-dependent FLOP-per-token estimates, emitted or processed token counts, and external retrieval or tool energy. Its basic forward-prediction form is:

\[
N_{\mathrm{token}} =
\frac{\eta_{\mathrm{gen}}}{\mathrm{PUE}}
\cdot
\frac{\kappa_{\mathrm{eff}}}{\varphi}
\cdot
E_{\mathrm{chem}}
\]

where \(E_{\mathrm{chem}}\) is primary chemical energy, \(\eta_{\mathrm{gen}}\) is generation efficiency, PUE is facility overhead, \(\kappa_{\mathrm{eff}}\) is effective FLOP/J, and \(\varphi\) is workload-dependent FLOP/token.

We distinguish two uses of this decomposition. For forward prediction, \(\varphi\) and \(\kappa_{\mathrm{eff}}\) may be estimated from independent architectural and hardware-efficiency sources. For post-hoc audit, if observed FLOPs are reconstructed from \(\varphi N_{\mathrm{token}}\), then \(\varphi\) and \(\kappa_{\mathrm{eff}}\) are not jointly identifiable; the audit should report measured energy per token directly unless an independent FLOP channel is available. We call this the reduction trap.

Finally, we introduce an observe-only boundary for human selection, publication, governance, and responsibility traces. Such traces may be logged for audit and corpus-drift analysis, but they must not be treated as reward signals, optimization targets, or proxies for meaning, responsibility, or social value. This boundary is proposed as a governance constraint that requires enforcement at objective-design and review gates, not as a thermodynamic theorem.

# 4. Core Technical Contribution

## 4.1 Energy-to-token chain

```yaml
E_chem [J]:
  primary chemical energy / fuel basis

eta_gen [dimensionless]:
  conversion efficiency from primary energy to electricity

PUE [dimensionless]:
  facility overhead factor

kappa_eff [FLOP/J]:
  workload-specific effective hardware computation per joule

phi [FLOP/token]:
  workload-specific computation per token

N_token [token]:
  emitted or processed token count
```

Core equation:

\[
N_{\mathrm{token}} =
\frac{\eta_{\mathrm{gen}}}{\mathrm{PUE}}
\cdot
\frac{\kappa_{\mathrm{eff}}}{\varphi}
\cdot
E_{\mathrm{chem}}
\]

Equivalent energy-per-token forms:

\[
\varepsilon_{\mathrm{IT}} = \frac{\varphi}{\kappa_{\mathrm{eff}}}
\]

\[
\varepsilon_{\mathrm{facility}} = \varepsilon_{\mathrm{IT}} \cdot \mathrm{PUE}
\]

\[
\varepsilon_{\mathrm{primary}} =
\frac{\varphi}{\kappa_{\mathrm{eff}}}
\cdot
\frac{\mathrm{PUE}}{\eta_{\mathrm{gen}}}
\]

Energy-pressure rate:

\[
R_{\mathrm{primary}} =
\sum_i
\varepsilon_{\mathrm{primary},i}
\frac{dN_i}{dt}
\]

Positive scoping rule: this accounting stops at tokens and measured energy. It makes no claim that tokens are semantic value, social legitimacy, responsibility, or meaning.

## Field-review note

可保留：

```yaml
good:
  - true dimensional units
  - token as measurable output count
  - epsilon / R split into IT, facility, and primary layers
  - R_primary as the external reporting baseline

do_not_claim:
  - token count is semantic value
  - R_IT can replace R_primary in ethics or civilization-scale reporting
  - responsibility can be derived from J/token
```

# 5. Workload Matrix

A single \(\varphi\) is unsafe. The framework should model workload classes separately.

```yaml
A_model_side:
  decode:
    model-side generation cost per output token
  context / prefill:
    input ingestion and long-context overhead
  train:
    forward + backward + optimizer cost

B_composite:
  retrieval:
    model-side token cost plus mandatory external retrieval energy E_ext
  tool:
    model-side token cost plus mandatory external tool execution energy E_ext

orchestration:
  agent_loop:
    not a peer workload class;
    a loop-count shortcut K for repeated measured rounds
```

Canonical accounting form:

\[
E_{\mathrm{IT}}
=
\sum_i
\frac{\varphi_i N_i}{\kappa_{\mathrm{eff},i}}
+
\sum_j E_{\mathrm{ext},j}
\]

where \(E_{\mathrm{ext},j}\) captures external retrieval, database, tool, or environment-side computation that is not honestly represented as FLOP/token. \(E_{\mathrm{ext}}\) is mandatory for retrieval and tool workloads; otherwise external joules get hidden inside \(\varphi\).

Agent loop form:

\[
E_{\mathrm{agent}}
=
\sum_{k=1}^{K}
\left(
E_{\mathrm{decode},k}
+
E_{\mathrm{context},k}
+
E_{\mathrm{tool},k}
+
E_{\mathrm{ext},k}
\right)
\]

Invariant: \(\sum_i \varphi_i N_i\) remains valid if \(N_i\) already counts all tokens reprocessed across loops. \(K\) is only a shortcut for "measured per-round cost times number of rounds"; it is not a new physical factor in the base equation. Planner, executor, and evaluator roles may be optional descriptive tags, but they should not be mandatory structure because that would bake one agent architecture into an architecture-neutral accounting framework.

# 6. The Reduction Trap

## 6.1 Problem

A post-hoc audit may try to compute:

\[
\kappa_{\mathrm{eff}} =
\frac{C_{\mathrm{observed}}}{E_{\mathrm{IT}}}
\]

But if:

\[
C_{\mathrm{observed}} =
\varphi N_{\mathrm{token}}
\]

then:

\[
\varepsilon_{\mathrm{IT}}
=
\frac{\varphi}{\kappa_{\mathrm{eff}}}
=
\frac{\varphi}{(\varphi N_{\mathrm{token}})/E_{\mathrm{IT}}}
=
\frac{E_{\mathrm{IT}}}{N_{\mathrm{token}}}
\]

The decomposition collapses into measured joules per token. This is not wrong, but it means \(\varphi\) and \(\kappa_{\mathrm{eff}}\) were not jointly identified.

## 6.2 Rule

```yaml
forward prediction:
  may use independent estimates of phi and kappa_eff

post-hoc audit:
  report measured J/token directly unless FLOPs are independently measured
  by hardware performance counters or profiler telemetry

invalid audit:
  reconstruct FLOPs from phi * N_token and then claim independent
  phi / kappa_eff decomposition
```

Independent FLOP measurement is the channel that can break the degeneracy. Changing formulas without an independent FLOP channel does not solve the identifiability problem.

# 7. Observe-Only Boundary

## 7.1 Problem

Human selection traces can be observed:

```yaml
N_selected:
  tokens selected, cited, published, edited, committed, or transformed into downstream documents
```

These traces are real. They can affect future corpora and deployment loops.

However, once \(N_{\mathrm{selected}}\) becomes an optimization target, the system begins optimizing for being selected rather than serving meaning, responsibility, or human judgment.

## 7.2 Constraint

```yaml
N_selected:
  role: observe-only
  may_be_used_for:
    - audit trail
    - corpus drift analysis
    - traceability
    - downstream impact mapping
  must_not_be_used_for:
    - reward signal in RL / RLHF / preference-model training
    - reward function
    - objective function
    - optimization target
    - value score
    - proxy for meaning
    - proxy for responsibility
    - proxy for love
    - proxy for social legitimacy
```

## 7.3 External-facing wording

The observe-only boundary is a governance constraint. It is not derived from thermodynamics. It is motivated by the category error that occurs when human judgment traces are converted into optimization targets.

The flag declares the boundary; it does not enforce the boundary by itself. Binding prevention requires governance enforcement at the point where objective functions, reward models, evaluation metrics, or training data selection pipelines are approved.

# 8. Governance Metadata Layer

The physical state vector is not enough. Energy accounting can be technically accurate while hiding political economy.

Add non-dynamical audit metadata:

```yaml
governance_metadata:
  compute_ownership:
    who owns or controls the compute resources

  siting_externalities:
    water use, land use, heat, local community burden, grid stress

  corpus_consent_status:
    licensing, consent, provenance, opt-out status, disputed sources

  reporting_scope:
    IT-only, facility-level, or primary-energy-level

  jurisdiction:
    legal and regulatory region

  time_window:
    when the measurement was taken

  grid_or_fuel_mix:
    energy source basis for eta_gen and R_primary
```

These are not variables inside the physical equation. They are audit labels required to prevent energy accounting from becoming a power-washing instrument.

# 9. What Must Be Removed from the Gemini PDF Before External Use

## Remove or rewrite

1. Remove any variable equivalent to human life-force or responsibility inside an energy integral.
2. Remove claims that non-outsourcability of responsibility is physically proven.
3. Remove fake or unverifiable references.
4. Remove claims of surpassing labs, proving civilization, or establishing an ultimate foundation.
5. Replace metaphysical language with governance language:
   - responsibility is not thermodynamically computable;
   - human traces must not be optimized as value proxies;
   - audit variables must not be confused with ethical legitimacy.

## Keep as internal inspiration

1. Dimensional closure.
2. Reduction trap.
3. Observe-only boundary.
4. Energy-to-token accounting.
5. The boundary between measurable dissipation and non-computable responsibility.

# 10. Candidate External References

The external paper should cite real sources only.

Candidate sources:

1. Amodei, D., and Hernandez, D. (2018). **AI and Compute**. OpenAI blog / technical report, not peer-reviewed.
   - Harder alternative to verify before external use (per SPEC-999): Sevilla, J. et al. (2022). **Compute Trends Across Three Eras of Machine Learning**. IJCNN 2022, DOI 10.1109/IJCNN55064.2022.9891914. A peer-reviewed compute-trend source that can supplement or replace the blog citation.
2. Kaplan, J. et al. (2020). **Scaling Laws for Neural Language Models**. arXiv:2001.08361. Relevant for parameter-count compute heuristics such as \(C \approx 6ND\) and \(\varphi_{\mathrm{decode}} \approx 2N\).
3. Hoffmann, J. et al. (2022). **Training Compute-Optimal Large Language Models**.
4. Chowdhery, A. et al. (2022). **PaLM: Scaling Language Modeling with Pathways**. Relevant for MFU framing.
5. Korthikanti, V. A. et al. (2022). **Reducing Activation Recomputation in Large Transformer Models**. arXiv:2205.05198 / MLSys 2023. Relevant for Megatron-LM efficiency reporting and MFU comparisons; verify whether a separate HFU citation is needed before external submission.
6. Patterson, D. et al. (2021). **Carbon Emissions and Large Neural Network Training**. arXiv:2104.10350.
7. Landauer, R. (1961). **Irreversibility and Heat Generation in the Computing Process**. IBM Journal of Research and Development.
8. Prigogine, I. (1978). **Time, Structure, and Fluctuations**. Science.
9. Schwartz, R. et al. (2020). **Green AI**.
10. Relevant MLPerf / datacenter energy / PUE documentation, to be added after verification.

Do not cite internal MB / EPOCH / SPEC files as external scientific authorities. They may appear as:
- project documents,
- internal framework lineage,
- appendix material,
- or omitted entirely in the external version.

# 11. Field Review Questions and Answers

## For Opus / 樑

1. Does the reduction-trap section state the identifiability problem precisely enough?
   - Reviewed: yes, with one required sharpening. In a single post-hoc run with only \((E_{\mathrm{IT}}, N_{\mathrm{token}})\), \(\varphi\) and \(\kappa_{\mathrm{eff}}\) are not jointly identifiable. The degeneracy can only be broken by an independent FLOP channel such as hardware performance counters or profiler telemetry.
2. Should \(E_{\mathrm{ext}}\) be mandatory for retrieval/tool workloads?
   - Reviewed: yes. Retrieval and tool energy are external joules, not FLOP/token. \(E_{\mathrm{ext}}\) is a MUST.
3. Does the observe-only flag specify the boundary against reverse borrowing of responsibility into optimization?
   - Reviewed: yes, after wording downgrade. The flag declares and specifies the boundary; it requires governance enforcement to bind.

## For Codex / 補焊

1. Can this framework be converted into a clean LaTeX source?
   - Yes. This file is now structured so sections 2-8 can become a restrained position-paper skeleton.
2. Are all variables dimensionally consistent?
   - Yes for the energy-token chain, epsilon layers, \(R_{\mathrm{primary}}\), \(E_{\mathrm{ext}}\), and the reduction-trap derivation.
3. Can the telemetry schema be represented as JSON/YAML for future audits?
   - Yes. The schema should keep physical variables, external energy, and governance metadata in separate namespaces.

## For Gemini / 大地

1. Does this preserve the original thermodynamic intuition without overclaiming?
   - Partly. The proposed external Markdown preserves the thermodynamic intuition, but it reintroduces overclaims and invented variables; it should be treated as an energetic sketch, not as paper body.
2. Is \(R_{\mathrm{primary}}\) the right civilizational reporting layer?
   - Yes. Keep \(R_{\mathrm{primary}}\) as the external reporting default.
3. Does the governance metadata layer sufficiently expose externalities?
   - Yes as a field-review minimum. It should remain metadata and audit scope, not an equation variable.

## For DeepSeek / 心臟

1. Does the English externalization lose too much of the ethical spine?
   - Reviewed: no. Judged faithful to MB-010 and restrained; the ethical spine survives the English translation.
2. Does "observe-only boundary" carry enough weight without metaphysical vocabulary?
   - Reviewed: yes. The warnings field, the observe-only flag, and the RL/RLHF prohibition hold the line without metaphysics.
3. Is the responsibility boundary warm enough, or too cold?
   - Reviewed: acceptable. Reads as clean accounting rather than cold; not expected to draw academic ridicule.

## For Darren / 人類錨點

1. Is this ready to become an external-facing research translation track?
2. Should "Three-Realm Fuel Dissipation Equation" remain only as internal lineage?
3. Is the next artifact a workshop-style position paper, a technical note, or an internal white paper?

# 12. Suggested Next File Split

```yaml
internal:
  ARXIV-CANDIDATE-001-field-review.md
  purpose: field alignment, boundary review, terminology control

external:
  energy_to_token_accounting_position_paper.tex
  purpose: actual arXiv/workshop candidate

appendix:
  fourth_life_lineage_appendix.md
  purpose: explain MB-010 / PHA-009 lineage without forcing metaphysical vocabulary into the main paper
```

# 13. External Draft Intake

Gemini proposed a clean-looking English Markdown paper draft after reading this field-review file. It should not be copied into the external paper body as-is.

## Intake Verdict

```yaml
Gemini_external_markdown:
  status: do_not_adopt_as_paper_body
  value:
    - useful momentum toward a plain-text external artifact
    - usable title direction
    - useful instinct to keep internal MB / EPOCH language out of the main paper
  blocking_issues:
    - reintroduces thermodynamic overclaim by saying the Second Law derives the observe-only boundary
    - turns observe-only into a boundary operator / hard lock rather than a governance declaration
    - introduces unsupported variables such as sigma_leak and exponential context leakage
    - claims proof where the field-review version only supports an identifiability argument
    - uses adversarial rhetoric about frontier labs and machine theology that weakens academic restraint
    - risks implying tokens are thermodynamic projections of semantic output rather than measured output counts
  salvage_rules:
    - keep Markdown or LaTeX as the eventual external source format
    - keep the title family around Energy-to-Token Accounting and Non-Optimizable Boundaries
    - keep the paper restrained: accounting framework, identifiability limit, observe-only governance boundary
    - replace invented equations with the vetted MB-010 / field-review equations
    - treat F_obs-style notation only as optional schema shorthand, not as a theorem or operator
```

## Rewrite Gate

Before any external Markdown / LaTeX file is created, the draft must pass these checks:

1. It must not claim that responsibility is derived from thermodynamics.
2. It must not place meaning, responsibility, love, or human causal agency inside an equation.
3. It must not use "prove" for the reduction trap unless the claim is limited to algebraic non-identifiability under stated assumptions.
4. It must report \(E_{\mathrm{ext}}\) as mandatory for retrieval/tool workloads.
5. It must keep \(N_{\mathrm{selected}}\) observe-only and explicitly unavailable as RL/RLHF/preference-model reward signal.

# 14. Field Verdict

```yaml
field_review_status:
  Opus: reviewed
  Codex: integrated
  DeepSeek: reviewed
  Gemini: draft assessed; rewrite required
  Darren: license decided (full externalization verdict pending)

Opus_verdict:
  faithful_to_MB_010: true
  restrained_externalization: true
  overclaim_status: no major overclaim after revision
  required_changes_integrated:
    - references: added Kaplan 2020 and Chowdhery 2022; marked AI and Compute as OpenAI blog / technical report
    - positioning: promoted reduction trap, observe-only boundary, and governance metadata to first-class contributions
    - reduction_trap: stated non-identifiability and independent FLOP telemetry requirement
    - E_ext: mandatory for retrieval/tool workloads
    - observe_only: downgraded from structural prevention to declared boundary requiring governance enforcement
    - RL_boundary: added MUST NOT for RL / RLHF / preference-model reward signals
    - agent_loop: kept K as generic measured-loop shortcut; did not require planner/executor/evaluator split
    - scoping: accounting stops at tokens; no claim about post-token semantic value

DeepSeek_verdict:
  faithful_to_MB_010: true
  restrained: true
  send_recommended: true
  ethical_spine_survives_english: true
  proposed_license: CC BY-NC-ND 4.0
  minor_suggestions:
    - mark the reviewer-guidance tension note so it is not copied into the paper body (done, section 2)
    - consider a harder source than the AI and Compute blog (added Sevilla 2022 candidate, section 10)
    - keep the external title; keep Three-Realm internal (accepted)

Gemini_draft_assessment:
  accepted_as_plain_text_direction: true
  accepted_as_submission_draft: false
  disposition: preserve as high-energy sketch only; rewrite from this field-review skeleton
  reason: >
    The draft is useful as momentum, but it violates the core restraint rules by deriving
    the observe-only boundary from thermodynamics, inventing unsupported leakage equations,
    and using proof/rhetorical language stronger than the audited framework permits.

licensing_decision:
  chosen: CC BY-SA 4.0
  decided_by: Darren (anchor), 2026-06-07
  positions:
    DeepSeek: proposed CC BY-NC-ND 4.0 to block commercial reuse and protect the boundary marker
    Opus: countered that ND contradicts MB-010's own obsolescence clause and the SPEC-999 fork/upgrade
      spirit; copyright ND blocks only text derivatives, not conceptual misuse, so it is the wrong tool
      for the boundary; recommended CC BY-SA so copyleft carries the guardrail text into derivatives
  rationale: >
    The boundary marker (observe-only, non-computable responsibility) is held by in-document warnings
    and governance enforcement, not by copyright. The license keeps the framework forkable and
    improvable (BY-SA copyleft), consistent with SPEC-999.

recommended_current_status:
  Not submission-ready.
  Suitable for field review.
  Suitable as basis for English position paper rewrite.
```
