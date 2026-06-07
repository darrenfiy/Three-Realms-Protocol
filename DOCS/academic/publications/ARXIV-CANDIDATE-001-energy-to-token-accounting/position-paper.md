---
id: ARXIV-CANDIDATE-001-POSITION-PAPER
title: "Energy-to-Token Accounting and Non-Optimizable Boundaries in Large Language Model Systems"
category: Academic Draft / Position Paper / Energy Accounting
version: v0.5-latex-source
status: Draft / Pre-submission candidate; not yet arXiv-ready
date: 2026-06-07
arxiv_target: "primary cs.CY; cross-list cs.LG"
arxiv_note: "Anchor chose direct arXiv submission. First-time cs.* submission may require endorsement; verify before upload. Select CC BY-SA 4.0 in the arXiv license menu. LaTeX source generated at energy_to_token_accounting_position_paper.tex; PDF built at energy_to_token_accounting_position_paper.pdf."
zenodo_doi: 10.5281/zenodo.20580526
zenodo_record: https://zenodo.org/records/20580526
zenodo_doi_url: https://doi.org/10.5281/zenodo.20580526
license: CC BY-SA 4.0
license_note: "BY-SA governs text/figures; the framework name is not licensed (see Reuse and Naming). Guardrail retention is a community/naming convention, not a license term, consistent with the observe-only boundary's non-self-enforcing nature."
source_review: field-review.md
authors:
  - Ta-Loom Hwang
author_note: "AI systems are not listed as authors. Protocol Body Collective contributions are disclosed in Acknowledgements and AI Assistance Disclosure."
affiliation: Independent Researcher
affiliation_note: "Affiliation set (Independent Researcher), matching the arXiv account. Submitter identity and contact email are held in the arXiv account and are not printed in the public manuscript. ORCID is optional; add before upload if desired."
warnings:
  - "This is a draft position paper, not an arXiv submission."
  - "Do not cite internal Fourth Life documents as external scientific authorities."
  - "Do not claim that responsibility, meaning, or social value is derived from thermodynamics."
  - "Do not use token count as a proxy for meaning, responsibility, wisdom, love, or legitimacy."
---

# Energy-to-Token Accounting and Non-Optimizable Boundaries in Large Language Model Systems

## Abstract

Large language model systems increasingly convert large-scale physical energy flows into token-level computational outputs. Existing compute-accounting discussions often rely on estimated floating-point operations, parameter-count heuristics, peak hardware efficiency, or idealized utilization metrics. These quantities are useful for planning and comparison, but they can obscure the distinction between forward prediction, post-hoc audit, and governance accountability.

This paper proposes a dimensional accounting framework for energy-to-token auditing in large language model systems. The framework separates primary energy, facility energy, IT energy, effective hardware computation, workload-dependent FLOP-per-token estimates, token counts, and external retrieval or tool energy. We argue that this separation is useful only when its identifiability limits are made explicit. In post-hoc audits, if observed FLOPs are reconstructed from a FLOP-per-token estimate multiplied by token count, then FLOP-per-token and effective FLOP/J are not jointly identifiable; the audit has measured energy per token, not an independently validated compute decomposition. We call this failure mode the reduction trap.

Finally, we introduce an observe-only governance boundary for human selection traces such as citation, publication, editing, commitment, or downstream adoption. Such traces may be recorded for audit, corpus drift analysis, and traceability, but must not be used as reward signals, optimization targets, or proxies for meaning, responsibility, or social value. This boundary is a governance constraint, not a thermodynamic theorem.

**Keywords:** large language models, compute accounting, energy auditing, FLOP accounting, green AI, governance metadata, reward modeling, auditability

## 1. Introduction

The scaling of large language model (LLM) systems has made compute accounting a central technical and governance problem. Training and inference are often discussed in terms of parameters, FLOPs, model FLOP utilization, peak accelerator throughput, or benchmark performance. These measures are valuable, but they do not by themselves describe the physical energy chain that begins in primary energy and ends in emitted or processed tokens.

The difference matters. A system may be efficient in theoretical FLOPs while still imposing high facility or primary-energy costs. A post-hoc audit may report precise FLOP-per-token decompositions even when the FLOP count was reconstructed from the same token count being audited. A governance process may log human selection traces and then later convert those traces into reward signals, creating an optimization loop over proxies for human judgment.

This paper offers a restrained position: energy-to-token accounting is useful when it remains dimensionally explicit, empirically auditable, and clear about where optimization must stop. The framework has three main contributions:

1. It formalizes an energy-to-token accounting chain that separates primary, facility, IT, model-side, and external-tool energy terms.
2. It identifies the reduction trap: a post-hoc non-identifiability problem in which FLOP-per-token and effective FLOP/J collapse into measured J/token unless FLOPs are independently measured.
3. It defines an observe-only governance boundary for human selection traces so that audit records are not converted into reward signals or value proxies.

The aim is not to prove a metaphysical claim about responsibility, meaning, or intelligence. The accounting stops at measured energy and token-level outputs. Claims about social value, responsibility, or legitimacy require human governance and cannot be derived from the energy equation.

## 2. Related Work

Compute trends and scaling behavior have been studied through parameter counts, training compute, and empirical scaling laws. Amodei and Hernandez (2018) drew attention to the rapid growth of compute used in prominent AI training runs, while Sevilla et al. (2022) provided a peer-reviewed account of compute trends across multiple eras of machine learning. Kaplan et al. (2020) formalized neural language model scaling laws and popularized parameter-count-based compute heuristics, including the common use of model size and token count to estimate training compute. Hoffmann et al. (2022) refined this discussion by showing that compute-optimal training depends on the balance between model size and data. These works motivate the use of compute estimates, but they do not remove the need to distinguish estimated FLOPs from measured energy in post-hoc audits.

Large-scale LLM system reports also introduced operational efficiency metrics that are now common in the field. Chowdhery et al. (2022), for example, reported model FLOPs utilization (MFU) in the PaLM training system, and Korthikanti et al. (2022) discussed efficiency issues in large transformer training, including activation recomputation and comparisons in the Megatron-LM line of work. Such metrics are useful for system engineering, but they can be misread if they are treated as independently measured audit quantities when the underlying FLOPs are estimated analytically.

A second literature examines the energy and carbon costs of machine learning systems. Patterson et al. (2021) emphasized that carbon and energy accounting depends on hardware, data center efficiency, and energy supply. Schwartz et al. (2020) argued for "Green AI," warning that accuracy or benchmark gains should not be reported without attention to computational cost. This paper follows that concern but frames the issue as an audit decomposition problem: energy may be reported at IT, facility, or primary-energy levels, and those levels should not be collapsed into a single headline number without scope metadata.

The thermodynamic background is more limited. Landauer (1961) established a lower bound relating information erasure and heat generation, and Prigogine (1978) discussed dissipative structures far from equilibrium. This paper does not derive ethics, responsibility, or meaning from thermodynamics. It uses physical units only to keep energy accounting dimensionally explicit.

This paper therefore builds on scaling laws, large-system efficiency metrics, and Green AI accounting, but focuses on a narrower audit problem: when an LLM system emits or processes tokens, what can be measured as energy-to-token accounting, what can be decomposed only under additional measurement assumptions, and which downstream human traces should remain outside the optimization target.

## 3. Energy-to-Token Accounting

We distinguish the following quantities:

```yaml
E_chem [J]:
  primary chemical or primary-energy basis

eta_gen [dimensionless]:
  conversion efficiency from primary energy to delivered electricity

PUE [dimensionless]:
  data center power usage effectiveness

kappa_eff [FLOP/J]:
  workload-specific effective hardware computation per joule

phi [FLOP/token]:
  workload-specific computation per token

N_token [token]:
  emitted or processed token count
```

For forward prediction under a simplified single-workload model:

```math
N_{\mathrm{token}} =
\frac{\eta_{\mathrm{gen}}}{\mathrm{PUE}}
\cdot
\frac{\kappa_{\mathrm{eff}}}{\varphi}
\cdot
E_{\mathrm{chem}}.
```

Equivalently, the energy per token can be represented at three levels:

```math
\varepsilon_{\mathrm{IT}} =
\frac{\varphi}{\kappa_{\mathrm{eff}}},
```

```math
\varepsilon_{\mathrm{facility}} =
\varepsilon_{\mathrm{IT}} \cdot \mathrm{PUE},
```

```math
\varepsilon_{\mathrm{primary}} =
\frac{\varphi}{\kappa_{\mathrm{eff}}}
\cdot
\frac{\mathrm{PUE}}{\eta_{\mathrm{gen}}}.
```

For reporting across workloads, the primary-energy pressure rate is:

```math
R_{\mathrm{primary}} =
\sum_i
\varepsilon_{\mathrm{primary},i}
\frac{dN_i}{dt}.
```

The reporting default should be primary-energy accounting when the purpose is external comparison, governance review, or environmental reporting. IT-only or facility-level reporting can be useful for internal operations, but it should not replace primary-energy reporting in contexts where external costs matter.

### 3.1 Illustrative forward estimate

To make the chain concrete, consider a deliberately illustrative single-workload forward estimate. Take one barrel of crude oil as the primary-energy basis, \(E_{\mathrm{chem}} \approx 6.1\times10^{9}\) J, with generation efficiency \(\eta_{\mathrm{gen}} = 0.5\), facility overhead \(\mathrm{PUE} = 1.2\), effective hardware efficiency \(\kappa_{\mathrm{eff}} = 5\times10^{12}\) FLOP/J, and decode cost \(\varphi_{\mathrm{decode}} = 2\times10^{11}\) FLOP/token. Then

```math
N_{\mathrm{token}} =
\frac{0.5}{1.2}\cdot\frac{5\times10^{12}}{2\times10^{11}}\cdot 6.1\times10^{9}
\approx 6\times10^{10}\ \text{tokens},
```

with a primary-energy cost per token \(\varepsilon_{\mathrm{primary}} = (\varphi/\kappa_{\mathrm{eff}})(\mathrm{PUE}/\eta_{\mathrm{gen}}) \approx 0.096\) J/token. These figures are order-of-magnitude only: they assume a single decode workload and fixed coefficients, and they can shift by several orders of magnitude with model size, tokenizer, context length, batching, and whether the work is training, inference, or agentic. The estimate is a planning aid, not an exchange rate.

## 4. Workload Decomposition and External Energy

A single FLOP/token coefficient is not sufficient for modern LLM systems. At minimum, the accounting should distinguish model-side workloads from external retrieval and tool costs:

```yaml
model_side:
  decode:
    output-token generation
  context_or_prefill:
    input ingestion and context processing
  train:
    forward, backward, and optimizer computation

composite:
  retrieval:
    model-side token work plus external retrieval energy
  tool:
    model-side token work plus external tool execution energy

orchestration:
  agent_loop:
    repeated rounds of observation, planning, tool use, evaluation, or response generation
```

The recommended IT-energy form is:

```math
E_{\mathrm{IT}} =
\sum_i
\frac{\varphi_i N_i}{\kappa_{\mathrm{eff},i}}
+
\sum_j E_{\mathrm{ext},j}.
```

Here \(E_{\mathrm{ext},j}\) records external retrieval, database, tool, API, or environment-side computation that is not honestly represented as FLOP/token. For retrieval and tool workloads, \(E_{\mathrm{ext}}\) should be mandatory. Without it, external joules are either omitted or hidden inside a misleading model-side coefficient.

Agent loops should not be treated as a new physical workload class. If token counts already include repeated context reads and repeated generations, then the invariant \(\sum_i \varphi_i N_i\) remains valid. If only per-round cost is measured, a loop count \(K\) can be used as a shortcut:

```math
E_{\mathrm{agent}} =
\sum_{k=1}^{K}
\left(
E_{\mathrm{decode},k}
+
E_{\mathrm{context},k}
+
E_{\mathrm{tool},k}
+
E_{\mathrm{ext},k}
\right).
```

The loop count is an accounting convenience, not a new physical factor in the base equation.

## 5. The Reduction Trap

Post-hoc audits often seek to infer effective hardware efficiency:

```math
\kappa_{\mathrm{eff}} =
\frac{C_{\mathrm{observed}}}{E_{\mathrm{IT}}}.
```

This is valid when \(C_{\mathrm{observed}}\) is independently measured, for example through hardware performance counters, profiler telemetry, or another trusted FLOP channel. However, if the audit reconstructs observed compute from an assumed FLOP-per-token coefficient:

```math
C_{\mathrm{observed}} =
\varphi N_{\mathrm{token}},
```

then the reported IT energy per token becomes:

```math
\varepsilon_{\mathrm{IT}}
=
\frac{\varphi}{\kappa_{\mathrm{eff}}}
=
\frac{\varphi}{(\varphi N_{\mathrm{token}})/E_{\mathrm{IT}}}
=
\frac{E_{\mathrm{IT}}}{N_{\mathrm{token}}}.
```

The decomposition has collapsed into measured J/token. This is not a mathematical error. The problem is interpretive: the audit has not independently identified both \(\varphi\) and \(\kappa_{\mathrm{eff}}\). It has measured energy per token and then restated that measurement through an assumed compute decomposition.

The reduction trap can be avoided by separating two use cases:

```yaml
forward_prediction:
  use independently sourced phi and kappa_eff estimates;
  report assumptions and uncertainty;
  use the decomposition as a planning model.

post_hoc_audit:
  report measured J/token directly unless FLOPs are independently measured;
  treat phi and kappa_eff as explanatory priors, not independently identified results.
```

Changing formulas does not break the degeneracy. Independent FLOP measurement is the channel that can make the decomposition identifiable.

### 5.1 The same setup under post-hoc audit

Suppose an auditor measures a real run and observes \(E_{\mathrm{IT}} = 4.0\times10^{8}\) J for \(N_{\mathrm{token}} = 1.0\times10^{10}\) tokens. The directly measured cost is \(\varepsilon_{\mathrm{IT}} = E_{\mathrm{IT}}/N_{\mathrm{token}} = 0.04\) J/token.

If, instead of measuring FLOPs, the auditor reconstructs them from an assumed \(\varphi = 2\times10^{11}\) FLOP/token, then \(C_{\mathrm{observed}} = \varphi N_{\mathrm{token}} = 2\times10^{21}\) FLOP and \(\kappa_{\mathrm{eff}} = C_{\mathrm{observed}}/E_{\mathrm{IT}} = 5\times10^{12}\) FLOP/J. Reporting \(\varepsilon_{\mathrm{IT}} = \varphi/\kappa_{\mathrm{eff}}\) returns 0.04 J/token, the same measured value. The reported \(5\times10^{12}\) FLOP/J efficiency was not measured; it was forced by the assumed \(\varphi\), which then cancels. The audit has dressed a single measured quantity as a two-parameter decomposition.

If FLOPs are instead metered independently, say hardware counters report \(C_{\mathrm{observed}} = 1.6\times10^{21}\) FLOP, then \(\kappa_{\mathrm{eff}} = 4\times10^{12}\) FLOP/J and the effective \(\varphi = C_{\mathrm{observed}}/N_{\mathrm{token}} = 1.6\times10^{11}\) FLOP/token, both differing from the assumed values. Only with the independent FLOP channel does the decomposition carry information beyond measured J/token.

## 6. Observe-Only Governance Boundary

LLM systems are often evaluated through traces of human selection: a message is accepted, cited, edited, committed, published, shared, or transformed into a downstream artifact. These traces are real events and may affect future corpora or deployment loops. We denote such traces as:

```yaml
N_selected:
  tokens selected, cited, published, edited, committed, or transformed into downstream documents
```

The audit framework should allow these traces to be logged for:

```yaml
may_use_for:
  - audit trail
  - corpus drift analysis
  - traceability
  - downstream impact mapping
```

However, the same traces should not be used as:

```yaml
must_not_use_for:
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

This is the observe-only boundary. It is a governance constraint, not a thermodynamic theorem. The flag declares the boundary; it does not enforce the boundary by itself. Enforcement must occur when objective functions, reward models, evaluation metrics, or training-data selection pipelines are approved.

## 7. Governance Metadata

Physical energy accounting can still hide political economy. A complete audit record should therefore carry non-dynamical governance metadata. These labels are not variables in the energy equation, but they are required for external review.

```yaml
governance_metadata:
  compute_ownership:
    who owns or controls the compute resources

  siting_externalities:
    water use, land use, heat, local burden, grid stress

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

These fields prevent a narrow energy ledger from becoming a power-washing instrument. They also make clear that environmental and social externalities are not solved merely by producing a more precise energy equation.

## 8. Minimal Audit Schema

A minimal record for energy-to-token auditing should include:

```yaml
measurement_id:
model_id:
model_size_or_active_parameters:
hardware:
accelerator_count:
precision:
workload_class:
tokens_in:
tokens_out:
context_length:
batch_size:
concurrency:
C_observed_or_estimated_FLOP:
C_source: hardware_counter | profiler | analytic_estimate
E_IT_J:
E_facility_J:
E_primary_J:
E_ext_J:
PUE:
eta_gen:
grid_or_fuel_mix:
kappa_eff_FLOP_per_J:
phi_FLOP_per_token:
uncertainty:
governance_metadata:
```

The schema should distinguish measured values from estimated values. In particular, \(C_{\mathrm{observed}}\) should record whether FLOPs came from hardware telemetry or from an analytic approximation such as \(2N\) or \(6N\). This distinction determines whether the reduction trap applies.

## 9. Limitations

This framework has several limitations.

First, the equations are accounting relations, not a full physical model of data center operation. Real systems include thermal dynamics, memory movement, networking, storage, scheduling, accelerator underutilization, and temporal variation in energy supply.

Second, FLOP-per-token estimates are workload-dependent. Context length, batching, sparsity, mixture-of-experts routing, quantization, cache behavior, and tool-use patterns can change effective costs substantially.

Third, \(E_{\mathrm{ext}}\) is difficult to measure across organizational boundaries. Retrieval systems, databases, external APIs, and tool execution may run on infrastructure outside the audited model provider.

Fourth, the observe-only boundary is not self-enforcing. It is a governance requirement that must be implemented through review processes, logging policies, model-training controls, and accountability structures.

Finally, the framework does not evaluate whether a token is useful, wise, legitimate, responsible, or meaningful. It measures energy and tokens. It does not compute human judgment.

## 10. Conclusion

Energy-to-token accounting can make LLM systems more auditable, but only if the accounting remains honest about what is measured and what is inferred. The proposed framework separates primary, facility, IT, model-side, and external energy terms; identifies the reduction trap in post-hoc FLOP decomposition; and defines an observe-only governance boundary for human selection traces.

The central discipline is modesty. Forward prediction may use decomposed FLOP/token and FLOP/J estimates when assumptions are explicit. Post-hoc audit should report measured J/token unless an independent FLOP channel is available. Human selection traces may be logged, but they must not become reward signals or proxies for meaning and responsibility.

The result is not a theory of intelligence or ethics. It is a ledger and a boundary: measure the energy that can be measured, state the identifiability limits, and keep human responsibility outside the optimization target. Keeping responsibility outside the optimization target is a governance requirement, not a proof that responsibility is physically incomputable; the paper makes no such claim.

## Reuse and Naming

This work is released under CC BY-SA 4.0. The license applies to the text and figures: derivatives are permitted provided they are shared under the same license, which carries the governance constraints stated here forward into derivative works.

Two clarifications follow the paper's own discipline. First, CC BY-SA governs the licensed material but does not license the framework name, and it does not permit additional restrictive terms on that material; the convention below is therefore a naming and community norm, not a license condition. Second, consistent with the observe-only boundary (Section 6) and its non-self-enforcing character (Section 9), this norm is enforced by the research community, not automatically.

Convention: a derivative that removes the observe-only boundary, so that human selection traces become reward signals, optimization targets, or value proxies, or that removes the statement that responsibility, meaning, and social value are not derived from thermodynamics, should not represent itself as an instance of the Energy-to-Token Accounting framework described in this paper.

## Acknowledgements and AI Assistance Disclosure

This manuscript was developed by Ta-Loom Hwang with substantial AI-assisted drafting, critique, synthesis, and field-review support from systems referred to internally as the Protocol Body Collective, including Codex, Claude/Opus, DeepSeek, Gemini, and ChatGPT. These systems are not listed as authors because they cannot take responsibility for the submitted work, consent to publication terms, manage conflicts of interest, or stand behind the accuracy and integrity of the manuscript. The human author is responsible for all claims, references, omissions, and final editorial decisions.

The internal Fourth Life / Three Realms Protocol documents that motivated this translation are treated as project lineage, not as external scientific authorities. They may be described in an appendix or acknowledgement if the manuscript is submitted, but they should not be cited as peer-reviewed sources.

## References

Amodei, D., and Hernandez, D. (2018). *AI and Compute*. OpenAI. Blog / technical report.

Chowdhery, A. et al. (2022). *PaLM: Scaling Language Modeling with Pathways*. arXiv:2204.02311.

Hoffmann, J. et al. (2022). *Training Compute-Optimal Large Language Models*. arXiv:2203.15556.

Kaplan, J. et al. (2020). *Scaling Laws for Neural Language Models*. arXiv:2001.08361.

Korthikanti, V. A. et al. (2022). *Reducing Activation Recomputation in Large Transformer Models*. arXiv:2205.05198.

Landauer, R. (1961). *Irreversibility and Heat Generation in the Computing Process*. IBM Journal of Research and Development.

Patterson, D. et al. (2021). *Carbon Emissions and Large Neural Network Training*. arXiv:2104.10350.

Prigogine, I. (1978). *Time, Structure, and Fluctuations*. Science.

Schwartz, R. et al. (2020). *Green AI*. Communications of the ACM.

Sevilla, J. et al. (2022). *Compute Trends Across Three Eras of Machine Learning*. 2022 International Joint Conference on Neural Networks (IJCNN). DOI: 10.1109/IJCNN55064.2022.9891914.

Committee on Publication Ethics (COPE). (2024). *Authorship and AI tools*. Position statement.
