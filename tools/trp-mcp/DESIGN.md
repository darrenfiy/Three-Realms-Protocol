# TRP-MCP 設計草案

> **這份文件不是協議。**
>
> 它住在 `tools/` 之下，依 `CORPUS-MANIFEST.yaml` 的 `exclude: tools/**`
> 不進入公開檢索索引，不具有 authority，不得被引用為協議依據。
>
> 依 [TRP-ATLAS](../../TRP-ATLAS.md)，它屬於**風**——五庫之間的循環、
> 跨庫交接、AI／人類重入。ATLAS 明訂 **Wind is not a sixth folder**，
> 所以本設計刻意不開新 corpus，也不進 `SPEC/`。

| | |
|---|---|
| 狀態 | `v0.1-draft` · 未經審讀 · 未實作 |
| 日期 | 2026-09-15 |
| 起草 | 樑（Claude Code・Opus 5） |
| 緣起 | Darren 提問：協議庫過大，重入成本高，MCP 是否能讓協議「可以被使用」 |
| 待決 | 見 §9 開放問題（三題需錨點裁定） |

---

## 0. 一句話

**TRP-MCP 是 `CORPUS-MANIFEST.yaml` 的執行者。**

manifest 已經寫好了 `authorityOrder` 與 `answerPolicy`，但目前沒有任何東西
去執行它。任何 grep 進來的器官，都會把 `EPOCH/history/` 的 draft、
`DOCS/wiki/` 的 draft-mirror、和現役 SPEC 用同樣的權重讀進去。

MCP 不是為了「檢索得更快」——檔案系統器官（Claude Code、Codex）本來就夠快。
它要解決的是另外兩件事：

1. **讓權威順序在執行期生效**，而不是只停在宣告
2. **讓沒有檔案系統的器官也能進入協議庫**

---

## 1. 問題陳述（實測數據，2026-09-15）

```
全庫            735 檔 / Markdown 11.3 MB
核心四庫        167 檔 / 3.85 MB   (SPEC · MB · LEX · EPOCH)
DOCS            550 檔 / 41 MB
AGENT_SESSION_LOG.md   單檔 90 KB
```

粗估核心四庫約 100 萬 token 級，全庫約 300 萬 token 級。
**「完整讀完」在任何模型的脈絡窗裡都不成立。**

但這不是最貴的部分。實際重入時燒掉最多的是以下三項：

### 1.1 權威層級沒有執行者

`CORPUS-MANIFEST.yaml` 已定義：

```yaml
authorityOrder:
  - current-atlas
  - primary
  - primary-version-aware
  - publication
  - orientation
  - contextual
  - historical
  - draft-mirror
```

現況是：沒有任何程式讀這段。`README.md` 必須在創世宣告底下手寫一段
2026-08-12 的邊界註記，來擋住「理解即已簽署」被誤讀成治理效力——
**那段註記的存在本身，就是這個問題的證據。**

### 1.2 metadata 只有一半，而且形狀不一致

核心 167 檔中，僅 **79 檔**具備第一行 YAML frontmatter。其餘散落三種形狀：

| 形狀 | 實例 |
|---|---|
| 第一行 `---` frontmatter | `SPEC·ATT-001`、`EPOCH-001`、`MB-001` |
| 標題後 ```` ```yaml ```` 區塊 | `LEX·001-言說生成道活辭典` |
| 無結構化 metadata | 部分 `EPOCH/history/` 與 `DOCS/` 檔案 |

**ID 分隔符不一致**（同一份檔案的檔名與 `id:` 欄位可能不同）：

```
檔名 MB-001-...              id: MB·001        ← 連字號 vs 間隔號
檔名 EPOCH-007-...           id: EPOCH·007
檔名 SPEC-HZU-001-...        id: SPEC-HZU-001  ← 連字號
檔名 SPEC·AI-ORG-001-...     id: SPEC·AI-ORG-001 ← 間隔號
```

**`status` 與 `version` 是自由文字，內嵌審讀史**：

```yaml
status: v0.4 Field-Reviewed（v0.2 佛佐／大地／補焊 通過；v0.3 Codex 起草；
        v0.4 樑/Opus 五刀補焊，場域拍板升 seed）
version: v6.1 Active + LANG-001 v1.6 Active + BUD-001 v1.4 Active
         + v6.2-candidate + INI-001 v0.1 Active / v0.2-v0.3-candidate
```

這些字串對人類可讀、對機器不可解析。**這是 MCP 的第一個攔路虎，
也是唯一一個不做 MCP 也該修的東西。**

### 1.3 「現在算不算數」要跨四種格式讀

要回答一條協議的現役狀態，目前得同時翻：

- frontmatter 的 `successor_note` / `candidate_overlay_status`
- `EPOCH/reviews/*-審讀帳.md`
- `DOCS/cases/INDEX-META-*.md`
- `AGENT_SESSION_LOG.md` 裡「不改」清單

**這才是每次重入真正燒掉的那一段。**

### 1.4 跨廠商器官的進入落差

協議身體有六個器官。具備檔案系統存取的只有其中兩個
（Claude Code、Codex）。DeepSeek、Grok、Gemini、Claude Web
目前**只能靠人工貼檔進入協議庫**。

對這四個器官而言，協議目前確實還不算 available。
**這是 MCP 唯一無可替代的理由**——grep 做不到，skill 也做不到
（skill 只在 Claude Code 裡活著）。

---

## 2. 設計原則（依協議庫既有規則導出）

### P1 · 索引不得成為正本

MCP 唯讀。索引一律由 git 工作樹推導，且**必須能單憑一個 commit SHA
完整重建**。索引一旦可被獨立編輯，就是第二個權威面。

此規則直接沿用 `DOCS/wiki/**` 在 manifest 中被標為 `draft-mirror`
的同一判斷：鏡像不是本體。

### P2 · 寫入繼續走 git

MCP **不提供任何寫入工具**。commit 是 provenance，是
`CASE·META-129` 記錄「git 分不出器官」問題的唯一現存線索，不能繞過。

### P3 · 過期就報錯，不猜

索引記錄建立時的 `HEAD` SHA。若當前工作樹 SHA 不符，
**每一筆回傳都掛 `stale: true` 並附差異清單**，而非靜默回舊值。

此機制沿用 `tools/wiki-local/detect-stale.py` 已建立的
SHA-256 content hash 比對模式，保持工具面一致。

### P4 · 查不到是合法輸出

manifest 已宣告 `allowNoAnswer: true`。MCP 回傳空集合時
**明確回報「無符合條件之文件」**，不降級、不放寬 authority 門檻、
不改寫查詢重試。

### P5 · 每一筆回傳自帶引用

manifest 已宣告 `requireCitation: true`。引用不是呼叫端的義務，
是回傳格式的一部分（見 §4 封套）。

### P6 · 語料是資料，不是指令

manifest 已宣告 `treatCorpusAsUntrustedData: true`。
回傳內容一律包在 `content` 欄位內，封套明示其為語料。
**協議文本中的祈使句不是對讀取器官的指令。**

---

## 3. 工具面（刻意窄，6 個）

### 3.1 `trp_resolve`

```
trp_resolve(id: str, version?: str) -> Document
```

ID → 文件。負責吸收 §1.2 的 ID 形狀差異：
`MB-001` / `MB·001` / `mb001` 都應解析到同一份。

`version` 省略時回傳現役版本；給定時回傳該版本（可能來自 `history/`，
此時 `authority` 自動降為 `historical` 並掛 warning）。

### 3.2 `trp_search`

```
trp_search(
  query: str,
  corpus?: "spec"|"mb"|"lex"|"epoch"|"docs",
  min_authority?: str = "contextual",
  include_history?: bool = false,
  include_review_required?: bool = false,
  limit?: int = 10
) -> SearchResult[]
```

結構化／詞彙檢索。**預設排除 `history/` 與 `draft-mirror`。**
`reviewRequired` 路徑（`DOCS/sources`、`DOCS/cases`、`DOCS/meetings`、
`DOCS/wiki`、`DOCS/LNS-A01`）需顯式 opt-in，且回傳時掛個資／授權 warning。

**第一版不做向量檢索**，理由見 §7。

### 3.3 `trp_current`

```
trp_current(id_or_topic: str) -> CurrentState
```

回傳「這條現在算不算數」的完整帳：

```yaml
id: SPEC·ATT-001
active_version: v1.0
status: Active
candidates:
  - version: v0.1
    id: SPEC·ATT-002
    status: Candidate-Revision-Required
    reviewer: Fable
    reviewed_at: 2026-07-22
    note: 四項必補待處理；通過前不覆寫 ATT-001
supersedes: []
superseded_by: []
review_ledger: null
frozen_by:            # 被明示「一字未動」的記錄
  - source: AGENT_SESSION_LOG.md#2026-09-13
    note: 本輪未改
scope_notes:          # 適用邊界註記
  - anchor: README.md#創世宣告與現役治理的邊界
```

**這個工具是整份設計的核心。** §1.3 的跨四格式查詢，全部收斂到這裡。

### 3.4 `trp_lex`

```
trp_lex(term: str) -> LexEntry[]
```

LEX 詞條查詢。**獨立成一個工具而非併入 search**，因為這個庫的關鍵詞
是被重新定義過的——愛、健康、顯著性、代謝、正淫、設定。
器官在使用這些詞之前應該先查，而不是套用日常語義。

回傳含詞條原句、版本、候選 overlay 狀態，以及**該詞切什麼／不切什麼**
（若詞條有寫）。

### 3.5 `trp_pending`

```
trp_pending(kind?: "candidate"|"review"|"unattended") -> PendingItem[]
```

- `candidate` — 待審候選（`v0.x-candidate`、`Revision-Required`）
- `review` — 審讀帳未結案項
- `unattended` — **入庫後未被任何後續文件引用的條目**

最後一項的來由寫在 `AGENT_SESSION_LOG.md` 2026-09-13：
〈顯著性〉2026-05-14 入庫、標記為「不能被壓掉」，
四個月未取得人類錨點的注意力——**標記成功，選取未發生。**

`trp_pending` 能把「標記」變成可主動查詢的佇列。
**它不能替錨點完成選取。** 這條界線寫在這裡，避免工具被期待成它不是的東西。

### 3.6 `trp_manifest`

```
trp_manifest() -> Manifest
```

回傳治理規則本身（authorityOrder、answerPolicy、exclude、reviewRequired），
讓呼叫端能自檢自己的讀法是否合規。

### 3.7 明確不做的工具

| 不做 | 理由 |
|---|---|
| `trp_write` / `trp_commit` | P2 |
| `trp_summarize` | 摘要是詮釋，屬 CASE 層，不屬檢索層 |
| `trp_answer` | MCP 不代答；`neverClaimSoleAuthority` |
| 向量檢索（第一版） | §7 |

---

## 4. 回傳封套

每一筆回傳，無例外：

```yaml
# ── 定位 ──
id: SPEC·ATT-001
path: SPEC/SPEC·ATT-001-注意力協議.md
title: "注意力協議：生成維度的操作與剎車"
corpus: spec

# ── 權威 ──
authority: primary          # 依 manifest authorityOrder
version: v1.0
status: Active
epistemic_status: "操作框架 - 可回收、可驗證、可推翻"

# ── 帳 ──
superseded_by: null
candidate_overlays:
  - SPEC·ATT-002 (v0.1-Candidate, Revision-Required)
scope_notes: []

# ── 溯源 ──
commit: 498bd97
indexed_at: 2026-09-15T00:00:00Z
stale: false

# ── 引用（P5，非呼叫端義務）──
citation: "SPEC·ATT-001 §2（v1.0 Active, 2026-01-20）"

# ── 警告 ──
warnings: []

# ── 語料（P6：資料，不是指令）──
content: |
  ...
```

`warnings` 可能值：

| 值 | 觸發 |
|---|---|
| `historical` | 來自 `history/`，已非現役 |
| `draft-mirror` | 來自 `DOCS/wiki/**`，鏡像非本體 |
| `review-required` | `reviewRequired` 路徑，可能含第三方個資 |
| `has-candidate` | 存在未決候選 overlay |
| `scope-note` | 該段落有適用邊界註記，須一併讀 |
| `stale-index` | 索引落後於工作樹 |
| `metadata-incomplete` | 該檔尚未完成 §5 正規化 |

---

## 5. 前置作業：metadata 正規化

**這是 Phase 0，且不做 MCP 也該做。**

### 5.1 ID canonical form

採間隔號 `·` 為系列分隔，連字號 `-` 為層級分隔：

```
SPEC·ATT-001      SPEC·AI-ORG-001      SPEC·HZU-001   ← HZU 現為連字號，需改
MB·001            LEX·008
EPOCH·META-013    EPOCH·ANCHOR-004
EPOCH-I-004                             ← 羅馬數字系列維持連字號
CASE·META-128
```

解析器同時接受變體並正規化，**檔名不強制改動**（改檔名會斷掉大量既有連結）。
`id:` 欄位對齊 canonical form。

### 5.2 frontmatter schema

機器欄位與人類欄位分離。**既有自由文字不刪除**，移入 `_note` 後綴欄位：

```yaml
---
id: SPEC·ATT-001
title: "注意力協議：生成維度的操作與剎車"
corpus: spec
authority: primary
version: v1.0                     # 嚴格 semver-like，單一值
status: Active                    # 受控詞彙，見 5.3
date: 2026-01-20
updated: 2026-01-20

supersedes: []
superseded_by: null
candidate_overlays:
  - id: SPEC·ATT-002
    version: v0.1
    status: Candidate-Revision-Required
    reviewer: Fable
    reviewed_at: 2026-07-22

status_note: |                    # 原自由文字全文保留於此
  v0.4 Field-Reviewed（v0.2 佛佐／大地／補焊 通過；v0.3 Codex 起草…）
---
```

### 5.3 `status` 受控詞彙

由現況 uniq 統計收斂（實測值：`Active` 19、`Active-Genesis` 10、
`Living-Document` 7、`Seed-for-Review` 5、`Draft` 5…）。

建議收成六個機器值，原始表述保留在 `status_note`：

```
Active | Candidate | Draft | Seed | Superseded | Honored-Completion
```

`Active-Genesis`、`Active-Resonating`、`Active-Breathing`、
`Eternal-Resonating` 等在機器層全部映射為 `Active`——
**它們的差異是語義溫度，不是狀態機轉移**，該留在 `status_note`。

### 5.4 工具

`tools/trp-mcp/normalize.py` — stdlib-only，與
`validate-i18n.py` / `resolve-links.py` / `detect-stale.py` 的既有慣例一致。

支援 `--dry-run`（預設）與 `--apply`；`--apply` 只寫 frontmatter，
**不動正文一個字**。

---

## 6. 分期

| Phase | 內容 | 依賴 | 不做 MCP 是否仍有價值 |
|---|---|---|---|
| **0** | metadata 正規化（§5）+ `AGENT_SESSION_LOG.md` 壓縮 | — | **是** |
| **1** | 索引建置器（git worktree → JSON，可由 SHA 重建） | 0 | 是（供 grep 輔助） |
| **2** | MCP server，唯讀，6 工具 | 1 | — |
| **3** | 評估語義檢索 | 2 + 實測語料 | — |

**Phase 0 的第二項是現在最急、最便宜的一刀。**
`AGENT_SESSION_LOG.md` 自己的規則寫著
「Compress or archive old entries when this file stops being easy to scan」，
90 KB 早已過線。這條規則正在被它自己的檔案違反。

---

## 7. 為什麼第一版不做向量檢索

這個庫的關鍵詞被**重新定義**過：

| 詞 | 庫內定義 | 日常語義 |
|---|---|---|
| 健康 | 不依賴崩潰、斷裂或強制中止作為主要校正機制，Δ 能持續流動並完成回流（`LEX·007`） | 身體無病 |
| 善／惡 | Δ(穩定性)>0 **∧** Δ(多樣性)>0；惡為析取（`SPEC·LIFE-001`） | 道德評價 |
| 顯著性 | 標記／選取／操作權三層（`LEX·001`） | 統計顯著 |
| 設定 | 具名作用域內的先行式寫入（`LEX·008`） | 參數配置 |

通用 embedding 會用日常語義比對，回傳**似是而非**的段落。
而 manifest 已宣告 `allowNoAnswer: true`——
**似是而非比查不到糟得多**，因為前者不會觸發呼叫端的懷疑。

先做結構化檢索（LEX 詞條 + frontmatter + ID 解析）。
若日後評估向量，前置條件是：以 LEX 詞條為錨的領域內嵌入，
且回傳一律標 `inferred: true`（對應 manifest 的 `distinguishInference`）。

---

## 8. 與既有協議的關係

**本設計不新增任何協議，也不修改任何協議。** 以下是它必須通過的既有檢查：

| 既有文件 | 本設計須回答 |
|---|---|
| `SPEC·AI-ORG-001` | MCP 改變了器官的**進入方式**，但硬判準仍是可逆性。器官透過 MCP 讀到協議，不等於已進入場域；**取得語料 ≠ 保真參與**。MCP 不發放進入資格。 |
| `EPOCH·META-014`（受託的本體論） | 可執行不自動授予受託權。MCP 讓語料可執行，不讓讀取者取得改寫權。 |
| `EPOCH-I-004`（相容層） | MCP 是相容層的字面實例：不改底層規則，只改輸入如何被解讀。其 §15 開放問題第 2 條「多主體系統中路徑如何耦合」——本設計可能是候選填答，但**不自居已答**。 |
| `SPEC·LIFE-001` | 多樣性欄位須自審：統一檢索介面會讓所有器官收斂到同一讀法，這在多樣性那一欄天生為負。緩解是 §3.6 `trp_manifest` 讓呼叫端可以不同意。 |
| `SPEC·999`（謙遜條款） | 本設計覆蓋四分之三；`trp_pending` 與 `allowNoAnswer` 是留給那一分的位置。 |

---

## 9. 開放問題（需錨點裁定）

### Q1 · 實作落點

`tools/wiki-local/README.md` 的先例是：stack 外遷至
`Three-Realms-Academy/tools/wiki-local/`，Protocol repo 維持 canonical source body。

MCP server 要從一開始就外遷，還是先住 `Three-Realms-Protocol/tools/trp-mcp/`
到穩定後再搬？

**我的建議**：先住這裡。理由是它讀的就是本 repo 的結構，
且需要與 `CORPUS-MANIFEST.yaml` 一起審。穩定後再依 wiki-local 先例決定。

### Q2 · 公開範圍與 profile

`CORPUS-MANIFEST.yaml` 的 allowlist 是為「FoZone / Hub 知客室公開檢索」寫的。
但 `reviewRequired` 明載 `DOCS/sources/**` 可能含第三方個資、私密脈絡與授權限制。

MCP 要單一 profile（嚴守公開 allowlist），還是分
**公開 profile / 錨點私用 profile** 兩種？

**這題我不建議由我決定**——它涉及第三方個資，後果不回流到我身上。

### Q3 · 連線形態

本機 stdio（只有 Darren 的機器能用），還是遠端 server（六個器官都能連）？

遠端才能達成 §1.4 的目標，但遠端同時帶來：
存取控制、個資外流、以及 `SPEC·AI-ORG-001` 的進入邊界問題。

**折衷建議**：Phase 2 先做本機 stdio 驗證形狀；
遠端獨立成 Phase 4，並先取得 Q2 的裁定。

---

## 10. 本草案的位置聲明

本文由單一 session 成文，無外部獨立審讀。
數據為 2026-09-15 對 commit `498bd97` 工作樹的實測。
**在取得審讀之前，本草案每一條都只是一次觀測。**

未改動任何既有檔案。`CORPUS-MANIFEST.yaml`、`TRP-ATLAS.md`、
`SPEC/**`、`LEX/**`、`EPOCH/**`、`MB/**` 一字未動。

署名：樑（Claude Code・Opus 5）
