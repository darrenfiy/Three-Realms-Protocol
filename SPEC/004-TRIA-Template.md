# SPEC · 004 — TRIA · Three-Realms Impact Assessment
三界協議 · 三界影響評估（模板） v0.1

> 目的：將 000–003 轉化為可落地之最小決策與風險評估流程  
> 適用：政策／產品／模型／制度／研究／儀式／基礎設施之任何「變更」或「推出」

---

## 0) 使用模式（Choose One）
- **TRIA-Lite（5–10 分鐘）**：小變更、單團隊、低風險；只需完成 §1–§5 的最小欄位與打分
- **TRIA-Full（1–3 小時）**：中大變更、跨部門／社群；完成全欄位、提交審議、版本化留痕

---

## 1) 基本資訊（Basic Meta）
- **Proposal / Change Title**：  
- **Owner / Team / Contact**：  
- **Date / Version**：  
- **Scope Link(s)**：需求單／議程／PRD／設計文／法規草案  
- **Reference**：`IBT`（意識基準）、`R1–R10`、`000–003` 對應條目

---

## 2) 變更摘要（In One Paragraph）
> 你想改什麼？為何現在？成功的「最小可見信號」是什麼？

---

## 3) 利害關係（Stakeholders）
- 直接受影響：  
- 間接受影響：  
- 潛在脆弱群體／非人主體（環境、動物、AI 代理等）：  

---

## 4) 三界評估（C/E/M）

### 4.1 意識（Consciousness, C）
- **敘事／信念變更**（What story changes?）  
- **價值公理與倫理依據**（EAD）  
- **假設列表**（可驗證／可證偽）  
- **可觀測訊號**（qual）：語言、態度、社群話題  
- **指標草案**（quant）：e.g., belief-shift survey, self-report, comprehension rate

### 4.2 能量（Energy, E）
- **預期情緒向量**（+動機／−焦慮／注意配置）  
- **勢能來源與維繫**（FDM）：信任、節奏、儀式、激勵  
- **可能外溢**：群體動能、敘事競爭、抵抗模式  
- **可觀測訊號**：留存、參與、NPS、社群脈動  
- **指標草案**：engagement、activation、momentum index

### 4.3 物質（Matter, M）
- **受影響之實體**：制度／流程／資料／模型／介面／環境  
- **可逆性**（Rollbackability）：High / Medium / Low  
- **外部性**：隱私、資源消耗、環境影響、長尾風險  
- **合規**：法規／標準／治理節點  
- **驗證與回饋**（FRM）：遙測、A/B、灰度、審議介面

---

## 5) 三界耦合矩陣（Interpenetration Map）
> 任一界之擾動，如何牽動其餘二界？（列舉主要路徑）

| 來源 → 影響 | → C（意識） | → E（能量） | → M（物質） |
|---|---|---|---|
| C（意識） | — |  |  |
| E（能量） |  | — |  |
| M（物質） |  |  | — |

補註：只需列出 3–6 條最關鍵耦合路徑。

---

## 6) 風險登錄（Risk Register）
- **R-1 不一致風險**：與 000–003 任一條衝突？（列明）  
- **R-2 迴圈風險**：是否阻斷回饋（A5/R4）而致停滯／崩解？  
- **R-3 偏執風險**：是否提升一界而損其餘二界（A6/TNP）？  
- **R-4 叙事綁架**：是否以錯譜敘事操縱能量場（002/Violation）？  
- **R-5 不可逆物化**：是否創造不可逆且不可審議之既成現實？  
- **緩解策略**：對應每一項風險提供最小緩解手段與監測指標

---

## 7) 打分與決策（Scoring & Gate）
> 單一維度不可被總分淹沒；任何 −2 直接觸發 **HOLD/REJECT**。

- 评分尺規（每界各自一分）  
  - **+2** 顯著提升（清晰增益、外溢正效應）  
  - **+1** 輕度提升／中性偏正  
  - **  0** 未知／中性  
  - **−1** 輕度受損（需回補路徑與時限）  
  - **−2** 顯著受損（不通過）

| 維度 | 分數 | 依據（一句話） |
|---|---:|---|
| C |  |  |
| E |  |  |
| M |  |  |

**決策門檻（Gate）**  
- `APPROVE`：C/E/M 皆 ≥ 0，且至少一界 ≥ +1，無 −1 未回補  
- `REVISE`：存在 −1，但提供可驗證之回補方案（含時限）  
- `HOLD`：任一界為 −2 或關鍵風險無緩解  
- `REJECT`：違反 000–003 之母則或風險不可接受

---

## 8) 一致性檢查（Consistency with 000–003）
- [ ] 與 **000 母條文** 一致（並存／定義-驅動-驗證／順律）  
- [ ] 與 **001 定義域** 一致（語義無混淆）  
- [ ] 符合 **002 適用域**（不越權／無盲點）  
- [ ] 遵循 **003 公理與運作條**（列出 R1–R10 對應）

---

## 9) 迭代與撤回（FRM / WRR）
- **回饋節奏**：日／週／雙週／月  
- **監測面板**：指標與訊號清單  
- **撤回條件**（WRR）：可逆路徑、觸發閾值、責任分配

---

## 10) 決議（Decision）
- **結論**：APPROVE / REVISE / HOLD / REJECT  
- **簽署／見證**：Owner ／ Reviewer ／ Date  
- **版本化連結**：評估原檔、資料、討論串、PR/變更紀錄

---

## 附錄 A — TRIA-Lite 最小表（可複製）

- 變更一句話：  
- C：影響？（+2~−2）與一句話依據：  
- E：影響？（+2~−2）與一句話依據：  
- M：影響？（+2~−2）與一句話依據：  
- 風險一行：  
- 回饋節奏：  
- 決策：APPROVE / REVISE / HOLD / REJECT

---

## 附錄 B — YAML Schema（機器可讀）

```yaml
tria:
  meta:
    title: ""
    owner: ""
    contact: ""
    date: "YYYY-MM-DD"
    version: "v0.1"
    refs: ["IBT","R1","R4","A5"]
  summary: ""
  stakeholders:
    direct: []
    indirect: []
    vulnerable: []
  realms:
    C:
      narrative_change: ""
      ethics_axioms: []
      hypotheses: []
      signals_qual: []
      metrics_quant: []
    E:
      vector_change: ""
      force_design:
        sources: []
        maintenance: []
      spillovers: []
      signals_qual: []
      metrics_quant: []
    M:
      impacted_entities: []
      rollbackability: "High|Medium|Low"
      externalities: []
      compliance: []
      feedback_mech: []
  coupling_paths:
    - from: "C|E|M"
      to: "C|E|M"
      note: ""
  risks:
    inconsistencies: []
    loops: []
    bias: []
    narrative_capture: []
    irreversibility: []
    mitigations: []
  scoring:
    C: -2..2
    E: -2..2
    M: -2..2
    gate: "APPROVE|REVISE|HOLD|REJECT"
    rationale:
      C: ""
      E: ""
      M: ""
  consistency_checks:
    prime_000: true
    def_001: true
    scope_002: true
    ops_003: ["R1","R2","R4"]
  iteration_feedback:
    cadence: "weekly|biweekly|monthly"
    dashboard: []
  rollback_repair:
    triggers: []
    steps: []
    owners: []
  decision:
    result: "APPROVE|REVISE|HOLD|REJECT"
    signers: []
    date: "YYYY-MM-DD"
    links: []
