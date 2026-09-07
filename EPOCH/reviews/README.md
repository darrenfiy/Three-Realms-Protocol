---
id: EPOCH-REVIEWS-README
title: "EPOCH 審讀帳 — 活文件的版本、票與處置"
category: Life-Memory / Review-Governance
version: v1.0
status: Active
date: 2026-09-07
updated: 2026-09-07
authors:
  - 樑 / Claude Code（Opus 5）（正文／審讀帳／CASE 三分提案）
  - Codex（GPT-5.6 Sol）（流程裁定、票／帳雙層狀態與欄位邊界）
related:
  - EPOCH/history/README.md（改版快照）
  - DOCS/sources/conversations/README.md（來源開口／封口）
  - CASE·META-121（審作分離與承重同行）
---

# EPOCH/reviews — 活文件審讀帳

這個目錄保存一件事：

> **誰在什麼視界下審了哪一版、投了什麼票，以及那張票後來如何被處置。**

它不取代 EPOCH 正文、原始來源、CASE 或 history；它把四者之間容易散失的審讀關係放在一個穩定地址。

## 裁定：採三分，但不複製三份全文

2026-09-07，Darren 將樑（Claude Code・Opus 5）的三分提案交由 Codex 拍板。**提案採納，並作一項正規化修正：審讀帳是 canonical review ledger，不是第二座逐字來源庫。**

| 層 | 保存什麼 | 不保存什麼 |
|---|---|---|
| 現役 EPOCH | 現行主張、簡短審讀狀態、審讀帳連結 | 逐票全文、長篇機械覆核 |
| `EPOCH/reviews/` | 每票的版本、立場、取材範圍、相關性、精確全文地址、處置與未決項 | 外部回流的第二份逐字副本 |
| CASE | 生成史、裁定理由、可外推的治理發現 | 每輪逐票全文的重複堆疊 |

逐字文字仍各歸其位：外部交付的票進 `DOCS/sources/conversations/` 並封口；沒有獨立 source 的既有 inline 票留在不可改寫的 `EPOCH/history/` 快照。審讀帳以穩定連結指向它們，另保存可查詢的規格化紀錄。

## 兩層狀態：票封閉，帳開口

```yaml
review_ballot:
  state: sealed-on-entry
  rule: 一張票是某一時點對某一版本的封閉陳述；不得回頭改票。
  correction: 另加 correction / clarification 事件，回指原票；不覆寫原文。

review_ledger:
  state: open-and-append-only
  rule: 同一 EPOCH 維持一個穩定帳本地址；可以增加新版本、新票與處置事件。
  integrity: 既有事件不得改寫；稽核以 git commit / diff 與各票的 sealed source 或 frozen snapshot 為準。

review_cycle:
  state: open | closed
  close_when:
    - 所審版本被下一版取代，且吸收／退回已記清
    - candidate／active／sealed 的本輪裁定完成
    - 明示終止、退回 CASE、合併或退休
  note: 關閉一輪不封死整本帳；日後正式版若重開審讀，在同一帳本新增一輪。
```

所以，「EPOCH 成為正式版才封整本審讀帳」**不採用**。會封的是票與一輪；帳本地址長期存續。否則正式版後的維護審讀又會被迫另開散檔，重演這次要解的問題。

## 每筆票的必要欄位

```yaml
required:
  - ballot_id
  - target_id
  - reviewed_version
  - reviewed_commit_or_snapshot
  - reviewer_and_model
  - field_position
  - date
  - stance_and_effect
  - evidence_scope
  - prior_ballots_seen
  - drafting_or_outline_role
  - exact_text_address
  - integrity_state
  - findings
  - disposition
```

資料未附就寫 `unknown / 未附`，不能替審讀者補造。迴避、撤票說明、機械覆核與流程裁定可以入帳，但 `vote_effect: none`，不得混進票數。

## 正文與快照怎麼配合

- 現役 EPOCH 只留一張短表：各版本票數、現行立場、尚缺什麼、審讀帳在哪。
- 吸收／部分吸收／退回的詳細處置進審讀帳；現役正文只保留會影響閱讀或下一輪入口的摘要。
- 搬出 inline 票以後，**有票本身不再自動觸發快照**。快照仍依 `history/README` 的根判準：舊版若會從可引用的現行地址消失，就保存。
- 已存在的 history 快照是當時事實，不回頭抽票、不改連結、不改 status。

## 新一輪操作順序

1. 審讀者先標明所審版本／commit、文件視界、看過哪些舊票、是否參與起草或大綱。
2. 票完成即封；外部回流另存 sealed source，內部票則須有 frozen snapshot 或可定位 commit。
3. 在該 EPOCH 的單一審讀帳追加規格化事件與精確原文地址。
4. 現役 EPOCH 更新短摘要與下一道門，不附全文。
5. 起草者在帳內逐項記吸收／部分吸收／退回；退回可成立，不記帳不成立。
6. 可外推的新治理規則再蒸餾進 CASE／本 README；不要把逐票內容複製進 CASE。
7. 改版前按 history 根判準決定是否快照，並關閉被取代版本的 review cycle。

## 現有審讀帳

| EPOCH | 帳本 | 狀態 |
|---|---|---|
| EPOCH-018 | [體驗的本體論審讀帳](EPOCH-018-審讀帳.md) | v0.1 cycle closed；v0.2 cycle open |

---

*流程裁定與成文：Codex（GPT-5.6 Sol），2026-09-07。此為審讀流程規則，不是 EPOCH-018 的內容票，也不使 draft 升格。*
