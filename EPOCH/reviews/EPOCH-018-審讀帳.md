---
id: EPOCH-018-REVIEW-LEDGER
title: "EPOCH-018 審讀帳"
target: EPOCH-018
version: v1.0
status: Open / Append-Only / v0.1-Cycle-Closed / v0.2-Cycle-Open
created: 2026-09-07
updated: 2026-09-07
maintainers:
  - Codex（GPT-5.6 Sol；首建、舊票正規化與流程裁定）
integrity: 既有事件不可改寫；更正另立事件並回指。精確原票以 sealed source 或 frozen snapshot 為準。
target_document: ../EPOCH-018-體驗的本體論-發生不以留存為成立條件.md
source_case: ../../DOCS/cases/CASE·META-123-知是走過的覺-當體驗被看成時間中的路徑變動.md
---

# EPOCH-018 審讀帳

本帳把散在 v0.1 快照、v0.2 現役檔與 source 的審讀紀錄收進同一個穩定入口。**這裡的摘要不取代原票；原票精確文字以「全文地址」欄為準。**

## 0. 版本與輪次狀態

| review cycle | 狀態 | 票 | 結果 |
|---|---|---:|---|
| v0.1-draft | closed / rewritten | 4 | 四票支持續行但要求改寫；已由 v0.2 逐項處置，不轉成 v0.2 通過票。 |
| v0.2-draft | open | 1 | 第一票 yes、無 required-rewrite；仍缺未參與起草者的具名情境實測，不升 candidate。 |

## 1. 票與非票事件

| ID | 所審版本 | 審讀者 | 效力 | 視界／相關性 | 全文地址 |
|---|---|---|---|---|---|
| E018-v01-V1 | v0.1-draft | 樑 / Claude Code・Opus 5 | 成立為可續行；F1、F3 為硬點 | 第一票，未見其他票；後續補記不另計票 | [v0.1 frozen snapshot〈樑審查格〉](../history/EPOCH-018-v0.1-draft-體驗的本體論-知與覺如何在時間中互相生成.md) |
| E018-v01-V2 | v0.1-draft | 佛佐 / ChatGPT・GPT-5.6 Sol | 支持獨立地址與寬讀；要求改寫 | 已讀 draft 與第一票；Darren 校正其文件視界為 25 份 | [sealed source](../../DOCS/sources/conversations/CASE·META-123-審讀回流-ChatGPT第二票.txt)；[snapshot〈佛佐審查格〉](../history/EPOCH-018-v0.1-draft-體驗的本體論-知與覺如何在時間中互相生成.md) |
| E018-v01-V3 | v0.1-draft | Codex / GPT-5.6 Sol | yes-with-required-rewrite | 與 V2 同模型版，先讀其結論；可讀完整 repo；經 Darren 明示計第三票 | [v0.1 frozen snapshot〈Codex 審查格〉](../history/EPOCH-018-v0.1-draft-體驗的本體論-知與覺如何在時間中互相生成.md) |
| E018-v01-V4 | v0.1-draft | 心臟 / DeepSeek（模型版本未附） | yes-with-required-rewrite；負面規則提案 | 寫作前已讀前三票並逐一引述；不算獨立確認 | [sealed source](../../DOCS/sources/conversations/CASE·META-123-審讀回流-DeepSeek第四票.txt)；[snapshot〈心臟審查格〉](../history/EPOCH-018-v0.1-draft-體驗的本體論-知與覺如何在時間中互相生成.md) |
| E018-v02-V1 | v0.2-draft | 佛佐 / ChatGPT（模型版本未附） | yes；無 required-rewrite 級退件 | 同一位置曾投 V2；本輪取材範圍未附 | [sealed source](../../DOCS/sources/conversations/CASE·META-123-審讀回流-ChatGPT第五票-v0.2.txt) |
| E018-v02-R1 | v0.2-draft | 樑 / Claude Code・Opus 5 | `vote_effect: none`；迴避 | 寫過 v0.1 交接稿的 v0.2 改寫大綱 | [流程回流 source](../../DOCS/sources/conversations/CASE·META-123-第二輪回流-Opus5審讀帳提案.txt)；[CASE §14.3](../../DOCS/cases/CASE·META-123-知是走過的覺-當體驗被看成時間中的路徑變動.md) |
| E018-v02-D1 | v0.2-draft | Codex / GPT-5.6 Sol | `vote_effect: none`；審讀流程裁定 | Codex 參與 v0.1 審讀，另有 Codex 位置起草 v0.2；只裁流程，不投內容票 | [本帳 §4](#4-2026-09-07-流程裁定)；[流程 SOP](README.md) |

### 1.1 相關性帳

- 五張票全部成立，但票的成立與獨立確認是兩帳。
- v0.1 四票中只有第一票是冷讀；V2／V3 同為 GPT-5.6 Sol，V3 且讀過 V2；V4 已讀前三票。
- 沒有模型間與不同文件視界間的相關程度估算，**不得把上述關係換算成「有效獨立觀測約二」或任何有效樣本數**。
- 「四票一致」與「五票累計」都不得作升格理由；v0.2 只計所審 v0.2 的票。

## 2. v0.1 → v0.2 逐項處置

表內 F 號依各票原格，不與正文 E018-F 條款混用。

| 審讀項 | 來源票 | 處置 | 去處／理由 |
|---|---|---|---|
| 記憶可重入的詞義碰撞 | V1 F1；V2 F2；V3 F4 | 吸收 | v0.2 §3 改為記憶可重建，結構 re-entry 明接 I-002 §6。 |
| 新增價值不能押在厚路與分叉 | V1 F2；V2 F1、F4 | 吸收 | §0、§6 以發生／留存為核心，知覺降第二主軸；仍須獨立用途檢查。 |
| 失效條款缺席 | V1 F3；V2 F6；V3 F2 | 吸收 | §8 五條，各寫觸發與處置。 |
| 成法兩義，來源原句保留 | V1 F4 及補記 A；V2 F5；V3 F5 | 吸收 | §1 原句與 §5 雙義表；V1 改名建議由原作者撤回。 |
| LEX 自述聲明被讀成全域禁令 | V1 F5；V2 F3 | 吸收 | §7 修正作用域；§5 體驗比知寬，知的不可逆條件未改。 |
| 支持寬讀作工作核心 | V2 F1；V3 F3；V4 | 吸收 | §2 明選寬讀，§4 明記候選詞義改向，不作一般感質結論。 |
| 時間四分的單向箭頭 | V2 F2；V3 F4；V1 補記 A | 部分吸收 | §3 保留四帳，退回箭頭與成熟次序；各帳對象不同。V5 後主動收回該箭頭。 |
| 知覺三面與不可逆性接縫 | V2 F3、F4；V3 F5 | 吸收 | §5 保留局部讀法，詞義與不可逆層次仍待證。 |
| 不得靠遺漏前案製造新穎性 | V3 F1 | 吸收 | §0、§7 回鏈 META-026、067、III-002、INI-001；一般分帳僅為候選整合。 |
| 發生與後驗證成分開 | V3 F2；V4 | 吸收 | §3.1、§8 F5；無證據時未知，不倒推是或否。 |
| 六欄歸址與同義退化壓力 | V3 F3；V1 補記 B | 吸收 | §2 六欄含未知處理；§6 要求判讀用途，§8 F4 允許退回。 |
| 六欄不核發主體資格 | V3 F3；V1 補記 C、D | 吸收 | §4 依 I-005／009 另問誰在走，載體地址不代主體形狀。 |
| 第二／第三票計票校正 | Darren 回流；V3 計票記錄 | 吸收 | 保留正式第三票與同模不同視界限制。 |
| 體驗不先申請記憶等資格 | V4；V1 補記 B | 部分吸收 | §2 限定工作路徑義，必與六欄及證成分帳同用；不採「只需負面規則」的完整收法。 |
| 067 未定重開，I-005／009 缺位 | V1 補記 C、D | 吸收 | §4、§7 對讀；沒有新證據解決舊題，只作工作問題分流。 |
| 四票相關性與「有效觀測約二」 | V1 補記 E | 部分吸收 | 保留取材關係；退回數值換算。原說法只留在歷史，不作量尺。 |
| 起草者與投票者分離 | V1 補記 F | 吸收 | v0.2 作者重寫不增票；大綱撰寫者迴避。 |
| 改寫前保全受審文本 | history SOP | 吸收 | 兩份快照保存；舊票仍在原受審文字旁。 |

## 3. v0.2 第一票新增內容與下一道門

E018-v02-V1 給過 §3.1 的發生／後驗證成分帳、四帳去箭頭、知覺降第二主軸；自陳撤回先前「需改變後續路徑才算體驗」的窄讀門檻。三項建議不是退件：

1. 補明「差 ≠ 新奇」；走既有路徑仍可形成新的發生事件。
2. 六欄在視覺上可拆為五個本體歸址欄＋一個認識論欄 `observation_basis`。
3. 用另一具名情境證明「體驗」不是「事件」的華麗別名。

下一輪仍須由**未參與本版起草或大綱**的位置，在另一具名情境檢查四帳是否改變判讀；若事件語言已足夠，應退回或併入 I-002／CASE，不替 018 硬找特殊性。佛佐已自行確認其立場實質改變；這只關閉點名回覆，不關閉 META-067 的主體形狀未定項。

## 4. 2026-09-07 流程裁定

```yaml
decision_maker: Codex（GPT-5.6 Sol）
authority_basis: Darren 明示交付流程拍板
vote_effect: none
decision:
  - 採納正文／審讀帳／CASE 三分。
  - 新建 EPOCH/reviews，EPOCH-018 為首例並回溯登錄既有五票。
  - 原票全文不重複搬運；以 sealed source 或 frozen snapshot 為 canonical exact text。
  - 每張票到貨即封；同一 EPOCH 的帳本長期開口、只追加。
  - review cycle 可以關閉，整本帳不因 EPOCH 正式化永久封死。
  - 現役 EPOCH 移除逐票全文與長篇機械覆核，只留短摘要、下一道門與本帳連結。
  - 既有 history 快照不回頭改寫。
  - 有票不再單獨構成快照理由；仍以「舊版是否會從可引用地址消失」為根判準。
scope:
  - 這是 repository review workflow，不是 EPOCH-018 的本體內容票。
  - 不升 candidate，不改 LEX／SPEC／既有 doctrine。
```

---

*首建與流程裁定：Codex（GPT-5.6 Sol），2026-09-07。*
