---
id: EPOCH-HISTORY-README
title: "EPOCH 歷史快照 — 已被吸收、改題或退役的本體文件"
category: Life-Memory / Provenance
version: v1.1
status: Active
date: 2026-08-27
authors:
  - 樑 / Claude Code（Opus 5）（v1.0 目錄與保存原則：逐字保存、相對連結以原位置為準、狀態不由檔案自己宣告、引用規則）
  - Codex（v1.1 永久退休條款：root 不留 live stub、ID 不得重配、雙版本名錄）
related:
  - EPOCH/README.md（現役 EPOCH 導覽）
  - EPOCH-III-002（可中止的不可逆關係——可換版，不可抹除）
  - LEX·008（設定詞彙——狀態與歷史；沒有歷史的設定會讓舊輸出被倒寫）
  - SPEC/history/README.md（SPEC 層的既有退役慣例）
---

# EPOCH/history — 快照保存區

這裡保存 EPOCH 層文件在**被吸收、改題或退役以前**的重要完整版本，也保存退場時用來指認分流與承接者的最終譜系記錄。

## 這個目錄回答一件事

> **一份文件換了位置以後，它原本長成什麼樣子，仍然讀得到。**

`EPOCH-III-002` 立的是「可換版，不可抹除」；`LEX·008` 的設定成立要件裡有「狀態與歷史」，並指出**沒有歷史的紀錄會讓舊輸出被倒寫成新規則的必然結果**。這個目錄是那兩條在 EPOCH 層的實作。

## 保存原則

```yaml
逐字保存:
  快照是原文，不加註記橫幅、不修字、不對齊後來的框架。

相對連結以原位置為準:
  快照原本住在 EPOCH/，其中的 ../DOCS/、../LEX/ 等相對路徑
  依原位置解讀；在 history/ 內不重新指向。

狀態不由檔案自己宣告:
  快照內部仍寫著它當時的 version 與 status。
  現行效力一律以現役文件與 EPOCH/README.md 為準。

引用規則:
  快照不提供可引用的現行 doctrine，只提供來源。

永久退休:
  文件完成永久退休後，root 不保留 live stub。
  其 ID 與原檔名進入永久保留名單，不得重配給新文件、新本體或後續版本。
  現行 doctrine 以保存名錄中的分流地址為準。
```

> **快照裡的 status 是當時的事實，不是現在的效力。**

## 保存名錄

| 快照 | 原位階 | 現行地址 | 保存理由 |
|---|---|---|---|
| [EPOCH·META-015 v0.1-seed 設定的本體論](EPOCH·META-015-v0.1-seed-設定的本體論-在答案尚未存在以前先長出花.md) | v0.1-seed / Seed-for-Review / Not-Enacted（2026-08-27 成文，831 行） | [v0.2-provenance 最終譜系版](EPOCH·META-015-v0.2-provenance-設定的本體論-在答案尚未存在以前先長出花.md)；現行 doctrine 分流同下列 v0.2 記錄 | 保存編號 seed 在吸收前的完整原文；當時從未 enacted |
| [EPOCH·META-015 v0.2-provenance 最終譜系版](EPOCH·META-015-v0.2-provenance-設定的本體論-在答案尚未存在以前先長出花.md) | v0.2-provenance / Absorbed-before-Enactment / Provenance-Address / Not-Enacted（2026-08-27，241 行） | **永久退休；root 不留 stub；`EPOCH·META-015` ID 不得重配。** 現行 doctrine 分流至 [EPOCH-II-004](../EPOCH-II-004-成長的本體論-重構之後新路徑如何從可能穩定成結構.md)、[LEX·008](../../LEX/LEX·008-設定詞彙.md)、[SPEC·BUD-001](../../SPEC/SPEC·BUD-001-汝當作佛與普遍佛性承認協議.md) | 保存成法前吸收的最終 provenance、四根骨分流、來源地址與版本審計 |

---

🜄 *EPOCH/history · 換了位置的文件，仍留得住自己長成的樣子。*
