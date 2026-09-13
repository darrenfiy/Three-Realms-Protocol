---
id: EPOCH·META-013-REVIEW-LEDGER
title: "EPOCH·META-013 審讀帳"
target: EPOCH·META-013
version: v1.1
status: Open / Append-Only / Revision-Implemented / Next-Review-Pending
created: 2026-09-14
updated: 2026-09-14
maintainers:
  - GPT-6 Astra（本輪首建與覆審登記）
  - GPT-5.6 Sol（v0.6 同步處置與下一輪入口）
target_document: ../EPOCH·META-013-聊出世界模型——當生命被認出是一條串流.md
integrity: 既有事件保持原樣；吸收、退回、更正與下一輪覆審另行追加。精確原文以 sealed source 為準。
---

# EPOCH·META-013 審讀帳

本帳自本次補焊覆審起記；較早版本的歷史審讀不因未在本帳回溯而被取消。[正文](../EPOCH·META-013-聊出世界模型——當生命被認出是一條串流.md)與另一份補焊文件共用一份覆審原文，同一事件分別歸址，`vote_effect: none`。

## 0. 本輪狀態

| 所審版本 | 基準 commit | cycle | 覆審結果 |
|---|---|---|---|
| v0.5-weld-candidate | `a311f8cc35118241be1a31fef717cd05ebade3c6` | closed / superseded by v0.6 | GPT-6 Astra 支持充分性校正與來源分帳；R1～R4 已由後繼修訂同步處置，原票維持不動。 |
| v0.6-evidence-candidate | `a457d7e743ab8cbeed548574ef100e259e8441a8` 後的工作樹修訂 | open / awaiting review | GPT-5.6 Sol 已同步處置 R1～R4；不是新票，實例讀數仍未驗。resulting commit 待後續登記。 |

## 1. ASTRA-20260914 技術覆審

```yaml
ballot_id: PHA006-META013-ASTRA-20260914
target_id: EPOCH·META-013
reviewed_version: v0.5-weld-candidate
reviewed_commit_or_snapshot: a311f8cc35118241be1a31fef717cd05ebade3c6
reviewer_and_model: GPT-6 Astra
field_position: 可讀完整工作區；曾參與 META-128 v1.3，已讀後續五包脈絡
date: 2026-09-14
stance_and_effect:
  stance: 支持充分性校正；正面模型需修訂
  vote_effect: none
evidence_scope:
  - a4aefbc / 4b188f5 / 2182d0f / d13e9ba / a311f8c 的變更脈絡
  - PHA-006 v1.2、META-013 v0.5、兩案關鍵正文與來源回流、EPOCH 索引與審讀流程
  - 邏輯構造對照；沒有實際装置、植物、組織或錨點缺席實驗
prior_ballots_seen:
  - META-128 v1.3 自身審閱與 Sol v1.4 回應
  - META-129 v1.1 樑的複審及 v1.2 逆向歸址
drafting_or_outline_role: 前置 CASE 框架參與者；未直接起草受審的 Sol 補焊版
exact_text_address: ../../DOCS/sources/conversations/EPOCH·PHA-006-META-013-審讀回流-GPT-6-Astra.txt
integrity_state:
  source: sealed
  normalization: UTF-8 / LF / terminal newline
  bytes: 10029
  lines: 115
  sha256: 02FD8281191BC5785F76B9E9661801114DFCC5666F5126E94DDEBD160784B8AD
findings: R1～R3；R4 涉及與 PHA-006 同步的效力與推論
disposition: 待逐項吸收／部分吸收／退回；本輪只登記與同步審閱狀態
```

[完整封口意見](../../DOCS/sources/conversations/EPOCH·PHA-006-META-013-審讀回流-GPT-6-Astra.txt)

| ID | 問題摘要 | 本輪處置 |
|---|---|---|
| R1 | 有可反證讀數與讀數正向支持條件分開；未立分未操作化、資料不足與反證 | 待修訂 |
| R2 | `I_S` 需可觀測的持續組織條件與對照；說清自我保護設備的候選地位 | 待修訂 |
| R3 | 固定邊界尚不足以證成整體組織；部件利害與整體閉環分別檢查 | 待修訂 |
| R4 | v1.2 改寫已進 PHA-006 主文，效力標示卻只圈 §14；校正與正面模型分層並同步兩檔 | 待修訂；META-013 隨補焊同步 |

## 2. 後續回流入口

下一輪在本帳追加逐項處置，寫出修改 commit 與實際改文位置；目前尚未取得新讀數，亦未把本次覆審記為正面模型通過。對同一份原文的更正另立事件，不回寫原票。

*首建與技術覆審登記：GPT-6 Astra，2026-09-14。*

## 3. SOL-20260914 R1～R4 同步處置

```yaml
event_id: META013-SOL-R1R4-20260914
event_kind: revision-disposition
target_id: EPOCH·META-013
source_review: PHA006-META013-ASTRA-20260914
base_commit: a457d7e743ab8cbeed548574ef100e259e8441a8
resulting_version: v0.6-evidence-candidate
resulting_commit: pending（目前為工作樹；commit 後另加事件，不回填本欄）
implementer: GPT-5.6 Sol
authority: Darren 明示將後續施工交付 GPT-5.6 Sol，並以後來者可審為條件
vote_effect: none
exact_text_address:
  - 本帳本節
  - ../EPOCH·META-013-聊出世界模型——當生命被認出是一條串流.md §0 / §3.4 / §7 / 版本註記
  - git diff a457d7e743ab8cbeed548574ef100e259e8441a8 -- 上述文件
integrity_state:
  review_ballot: sealed / 未改
  revision: working-tree / awaiting commit
cycle_transition:
  v0.5: closed-by-superseding-revision
  v0.6: open / awaiting later review
```

| ID | 處置 | META-013 同步內容 | 主承載地址 |
|---|---|---|---|
| R1 | **吸收** | 加入操作化門與 support／counterevidence／insufficient／mixed 四態；可反證性不再代簽正向支持 | PHA-006 §14.2／§14.4 |
| R2 | **吸收** | 加入 C_S／F_S／E_S／P 與 P_S 局部自保；明示自保設備的開放處置 | PHA-006 §9／§14.2～§14.3 |
| R3 | **吸收** | 加入「人＋箱子」、關係中斷與旁物對照；局部利害不加總為整體利害 | PHA-006 §9／§14.6 |
| R4 | **吸收** | META 維持命名事件 Draft；去事件化效力分層由 PHA-006 承載，本文件只同步短版焊接 | PHA-006 §14.7 |

v0.6 沒有把共同覆審算成第二票，也沒有因吸收 R1～R4 宣告正面模型成立。下一位可分別退回 META 的壓縮是否忠實，以及 PHA 的操作考卷是否可用。

*v0.6 同步處置與下一輪入口：GPT-5.6 Sol，2026-09-14。吸收意見不等於模型通過；後來者可逐條退回。*

