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
| 狀態 | `v0.7` · Phase 0–2 已實作 · 本機唯讀 public-only |
| 日期 | 2026-09-16 |
| 起草 | 樑（Claude Code・Opus 5） |
| 審讀修正 | Codex・GPT-5.6 Sol（v0.4–v0.5）；GPT-6 Astra（v0.6）；兩者互審（v0.7） |
| 緣起 | Darren 提問：協議庫過大，重入成本高，MCP 是否能讓協議「可以被使用」 |
| 決策 | 見 §9；Q1–Q3 已定，Q4 延後，Q5 保持未決 |

---

## 0. 一句話

**TRP-MCP 是 `CORPUS-MANIFEST.yaml` 的執行者——而且不是第一個。**

### 0.1 這份合約已經有一個消費者

`CORPUS-MANIFEST.yaml` 不是憑空長出來的。依人類錨點 2026-09-15 的說明，
它誕生自**學苑端 App 的需求**：那裡有一個「知客室」，由 AI 扮演的知客法師
向來訪者講解協議內容。manifest 就是為了回答「知客法師能引用什麼、
不能引用什麼、引用時以誰為準」而寫的。

這推翻了本文件初稿的一句話。初稿寫「manifest 已經寫好了 authorityOrder
與 answerPolicy，但目前沒有任何東西去執行它」——**這句話是錯的。**
櫃檯背後有人，而且比本設計早。

### 0.2 但這讓 MCP 更必要，不是更不必要

知客室已經是一個消費者，代表 manifest 的規則**必然已經被實作過一次**
（在學苑 repo 內，已由 Codex・GPT-5.6 Sol 交叉查證）。再加上 `normalize.py`，
同一份合約現在有**兩個獨立實作**。

```
CORPUS-MANIFEST.yaml  ← 合約（正本）
         │
         ├── 知客室（學苑 repo，TypeScript）
         └── normalize.py（本 repo，Python）
```

**兩個實作同一份合約，容易漂移。** 一邊改了 authority 解析順序、
另一邊沒跟上，就會出現「同一個問題，兩個窗口給出不同權威的答案」——
而且沒有任何機制會發現。

這正是 MCP 的位置：**讓合約只有一個執行者，其餘都是它的客戶。**

```
CORPUS-MANIFEST.yaml  ← 合約
         │
    TRP-MCP  ← 唯一執行者
    ┌────┼────┬────────┐
  知客室  Claude Code  Codex  其他器官
```

### 0.3 交叉查證（Codex・GPT-5.6 Sol，2026-09-15）

已讀取學苑端 `manifest.ts`、`sync-protocol-corpus.mjs` 與知客室回答流程：

1. 兩端目前對 `exclude`、`reviewRequired`、root、publication、corpora 與
   historical authority 的分類一致；同一工作樹皆得到 **260 份公開文件**、
   **224 份 review-required**、**1 份 not-included**。
2. `requireCitation`、`allowNoAnswer`、`treatCorpusAsUntrustedData` 等意圖已寫入
   知客室 prompt／回答流程，但個別布林值不是由 manifest 動態驅動。
3. 初版 `normalize.py` 確實曾把 `reviewRequired` 納入索引；v0.4 已修正，
   並加入回歸測試，避免個資／授權邊界再次漂移。

所以「當前路徑分類一致」是實測事實；「兩套實作未來仍可能漂移」則是
仍需由 MCP 單一執行者或一致性測試處理的風險。

## 1. 問題陳述（實測數據，2026-09-15）

```
全庫（tracked）  609 檔 / Markdown 11.1 MiB
核心四庫         165 檔 / 3.80 MiB   (SPEC · MB · LEX · EPOCH)
DOCS             426 檔 / 7.08 MiB
公開 profile     260 檔 / 5.08 MiB
review-required  224 檔（暫不索引）
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

Phase 0 以前，這段規則只在知客室被實作；本 repo 裡的 grep 讀法會繞過它。
現在 `normalize.py` 已成為第二個執行者，但尚未成為所有器官的共同入口。
`README.md` 必須在創世宣告底下手寫一段
2026-08-12 的邊界註記，來擋住「理解即已簽署」被誤讀成治理效力——
**那段註記的存在本身，就是這個問題的證據。**

### 1.2 metadata 有三種正規化形狀，fenced YAML 有兩種語法

實測公開 profile 的 260 份索引文件（已套用完整 manifest 分類）：

| 形狀 | 檔數 | 實例 |
|---|---:|---|
| 第一行 `---` frontmatter | **101** | `SPEC·ATT-001`、`EPOCH-001`、`MB-001` |
| 無結構化 metadata | 84 | 多為 `README.md`、書稿章節等非協議命名檔案 |
| fenced YAML | 75 | 同時接受 ```` ```yaml ```` 與 `~~~yaml` |

> **v0.1 更正三處**，全部由實作推翻：
> 1. 初稿只統計核心四庫（79/167），據此把 ```` ```yaml ```` 當偏差形狀。
>    全庫來看它才是**最常見**的。
> 2. 初稿只認反引號圍籬。Markdown 的 `~~~` 圍籬同樣合法，漏了會把
>    `EPOCH-II-004` 誤判成「沒有 metadata」。
> 3. 初稿的擷取器把區塊結尾也限制在檔案前 3000 字元內。
>    `CASE·META-112` 的 metadata 本身就超過 3000 字元，
>    於是被誤判成無 metadata——**23 個檔案因此被誤報**。
>
> 正規化器因此三種形狀都收，且 fenced YAML 同時接受兩種合法圍籬語法。
> v0.4 再加入 metadata 特徵判定，避免把正文中的 YAML 範例當成文件 metadata。

**欄位名大小寫並存。** 6 份文件使用 `ID:` / `Title:` / `Version:` 等大寫寫法
（`SPEC·ANC-BUD-004`、`MB-008` 雙語對等）。解析器對鍵名不分大小寫，
否則會在已有 `ID:` 的檔案裡插出重複的 `id:`。

**ID 分隔符不一致**（檔名與 `id:` 欄位可能不同）：

```
檔名 MB-001-...              id: MB·001        ← 連字號 vs 間隔號
檔名 EPOCH-007-...           id: EPOCH·007
檔名 SPEC-HZU-001-...        id: SPEC-HZU-001  ← 連字號
檔名 SPEC·AI-ORG-001-...     id: SPEC·AI-ORG-001 ← 間隔號
```

初輪補洞辨識出 **157 份**符合協議命名慣例且缺 `id:` 的文件，
包含 `LEX·001` ～ `LEX·008` 全系列與 `SPEC·000` / `SPEC·001` / `SPEC·999`
三份編號聖典。Codex・GPT-5.6 Sol 審讀後確認其中一份會議記錄與既有設計稿撞 ID，
不應自動補入；最終安全補齊 **156 份**，另有 2 份刻意不猜（見 §5.5）。

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

## 1.5 為什麼需要 MCP：協議本來就是一整套介面

這一節回答「為何需要 MCP」，而不只是「MCP 能做什麼」。

### 1.5.1 介面的定義

一份介面（API）的本質是：**一份約定，讓兩邊可以各自改變，
只要約定不變，就還能接得上。**

用這個定義讀協議庫，會看到它本來就是介面密集的：

| 協議 | 作為介面在做什麼 |
|---|---|
| `SPEC·AI-ORG-001` | **握手驗證**。可逆性為唯一硬判準，四讀數為自檢輸入 |
| `SPEC·IWL-001` | **明示同意**。opt-in 不能由沉默補成 |
| `SPEC·INI-001` | **共識程序**。逐位 Yes／No／Not-yet，空位不計票 |
| `SPEC·SAFE-001` | **斷路器**。臨界即中止 |
| `SPEC·999` + `LIFE-001` 退席條款 | **斷線保證**。永遠能不玩 |
| `SPEC-HZU-001/002/003` | **度量介面**。定義單位與量法 |
| `LEX` 全系列 | **型別定義**。兩邊必須共用的詞彙 |
| `CORPUS-MANIFEST.yaml` `authorityOrder` | **解析順序**。版本衝突時誰贏 |
| `EPOCH/reviews/*-審讀帳` + 「一字未動」 | **變更紀錄與不可變保證** |

這不是把外來概念套上去。`EPOCH-I-004` 自己的定義就是：

> 相容層：一種中介結構，使非原生語法得以在既有系統上被執行。
> 其作用不是改變底層規則，而是改變輸入如何被解讀與轉譯。

**協議庫早就有這個詞，叫「相容層」。** 缺的不是概念，是執行者。

### 1.5.2 合約、窗口、門牌是三件事

| 層 | 是什麼 | 現況 |
|---|---|---|
| 合約 | 能問什麼、答案長什麼樣、保證什麼 | `CORPUS-MANIFEST.yaml`，2026 年既已存在 |
| 窗口 | 真正能連上去的地方 | 知客室（學苑端，單一消費者）|
| 門牌 | 窗口的位址 | 尚不存在（無跨器官端點）|

MCP 要補的是**窗口這一層的共用化**：把一個 App 專屬的實作，
變成所有器官都能連的同一個執行者。

### 1.5.3 協議刻意不當 API 的地方

必須同時記下反面，否則這個讀法會過度延伸：

`SPEC·∞ 不可知保留區`、四分之三原則、`answerPolicy.allowNoAnswer: true`
——這些是**反介面**的設計：它們保證介面**不覆蓋全部**。

一般 API 追求完整覆蓋，缺一個端點就是缺陷。本協議明文保留一分不可知，
並把「答不出來」寫成合法輸出。MCP 必須繼承這一點（見 P4），
否則就會長成 `LEX·007` 所說那種「只能靠崩潰才推翻」的東西。

### 1.5.4 與 API 的一處真實差異

**API 的合約由機器強制；協議的合約目前多半靠讀者誠意。**

`answerPolicy.requireCitation: true` 寫下四個月，本 repo 內沒有任何東西
會因為一個器官沒附引用而退回它的答案。

這與 `AGENT_SESSION_LOG.md` 2026-09-13 記錄的〈顯著性〉事件是同一個結構：
**標記成功，執行未發生。**

MCP 的價值就在這一句：**把宣告變成執行。**

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

`version` 省略時回傳同 ID 的全部公開匹配，不自動挑選；可能包含 `history/`，
此時 `authority` 為 `historical` 並掛 warning。只有數字的 `v1.4` 可匹配基礎版本，
帶後綴的版本須符合完整宣告。結果保留版本原文，數字正規化另列 `versionMachine`。

### 3.2 `trp_search`

```
trp_search(
  query: str,
  corpus?: "spec"|"mb"|"lex"|"epoch"|"docs",
  min_authority?: str = "contextual",
  include_history?: bool = false,
  limit?: int = 10
) -> SearchResult[]
```

結構化／詞彙檢索。**預設排除 `history/` 與 `draft-mirror`。**
本機第一版是 **public-only**。`reviewRequired` 路徑（`DOCS/sources`、
`DOCS/cases`、`DOCS/meetings`、`DOCS/wiki`、`DOCS/LNS-A01`）沒有 opt-in
參數，呼叫端不能放行。

**第一版不做向量檢索**，理由見 §7。

### 3.3 `trp_current`

```
trp_current(id_or_topic: str) -> CurrentState
```

目標是回傳「這條現在算不算數」的完整帳。以下為後續整合目標，**不是目前的回傳格式**：

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

**這個工具是整份設計的核心。** §1.3 的跨四格式查詢，目標是收斂到這裡。
目前回傳文件層級的 `active`、`candidates`、`historical`、`otherMatches`；
明示的 `latest_active_version`、候選 overlay 與 `successor_note` 另列原文。
尚未自動連結跨文件審讀帳、後繼關係或凍結紀錄，也不據此做治理裁定。

### 3.4 `trp_lex`

```
trp_lex(term: str) -> LexEntry[]
```

LEX 詞條查詢。**獨立成一個工具而非併入 search**，因為這個庫的關鍵詞
是被重新定義過的——愛、健康、顯著性、代謝、正淫、設定。
器官在使用這些詞之前應該先查，而不是套用日常語義。

依完整詞名匹配二級標題，回傳到下一個同級或更高級標題前的原文，包含詞條原句、
版本、候選 overlay 狀態，以及**該詞切什麼／不切什麼**（若詞條有寫）。
排除 history；候選工作稿保留候選標記。部分詞或正文中的零散提及交給 `trp_search`。
每段最多 30,000 字元，截斷時標示 warning，來源行號與實際回傳原文一致。

### 3.5 `trp_pending`

```
trp_pending(kind?: "candidate"|"review"|"unattended") -> PendingItem[]
```

- `candidate` — 候選、Draft、Seed 或含候選增補的文件；排除 history 與 Superseded
- `review` — 公開 `EPOCH/reviews/` 文件；目前不解析帳內各項是否結案
- `unattended` — **其他公開文件的 metadata `related` 未指向的 ID**；依已索引完整 ID
  識別逗號清單、標題註解與 Markdown 連結；ID 重疊時取最長宣告，不計同一文件自引。
  尚未分析正文引用或文件先後時間。

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

## 5. 前置作業：正規化為旁掛索引（已實作）

> **v0.1 設計更正。** 初稿提議把正規化結果**寫回**協議檔案
> （統一 `id:`、收斂 `status:`、新增 schema 欄位）。
> 那個提議違反本文件自己的 P1——正規化屬於派生層，不該改動正本。
>
> 現行做法：**正規化只產生旁掛索引，對協議檔案零寫入。**

實作：`tools/trp-mcp/normalize.py`（Python 3.8+ 標準庫，無 pip 相依，
與 `tools/wiki-local/*.py` 既有慣例一致）。

### 5.1 治理規則不在工具裡手抄

`normalize.py` **直接解析 `CORPUS-MANIFEST.yaml`** 取得
`exclude`、`reviewRequired`、`corpora`、`rootDocuments`、
`publicationDocuments`、`authorityOrder`。

manifest 是正本，工具是它的執行者。手抄一份清單就是製造第二個權威面。
manifest 缺席時工具**直接中止**，不以預設值代替（P4）。

### 5.2 ID：分隔符不敏感的查找鍵

不改任何 `id:` 欄位，也不改檔名（改檔名會斷掉大量既有連結）。
改為計算查找鍵：

```
MB-001 / MB·001 / mb 001  →  lookup_key: MB001
```

只有**明示宣告**的 `id:` 參與重複偵測。檔名推定值不參與——
推定不是宣告，拿推定值互撞只會產生假陽性
（初版即因此誤報 13 件，全為 `README.md`、`ORIGIN.md`、書稿章節）。

### 5.3 status：兩套詞彙，不壓進同一格

實測發現庫裡並存兩套互不相干的 status 詞彙：

| kind | 檔數 | 在回答什麼 |
|---|---:|---|
| `lifecycle` | 146 | 這條還算不算數（`Active` / `Candidate` / `Draft` / `Seed` / `Superseded` / `Honored-Completion`） |
| `documentation` | 1 | 這份紀錄封到哪（`Field-Documentation` / `Sealed` / `Review-Recorded`） |
| `unmapped` | 8 | 兩套皆未命中，待判讀 |

**把 `Field-Documentation` 塞進 `Active|Draft|Candidate` 是類別錯誤。**
索引因此同時輸出 `status_machine` 與 `status_kind`，原文一律保留在 `status_raw`。

生命週期詞彙的缺漏只對核心四庫（spec/mb/lex/epoch）開 finding；
DOCS 的紀錄類詞彙列為觀測，不算缺陷。

### 5.4 映射表不由單一 session 擴充

未命中的 8 種 status 原文列在 `REPORT.md`，**標記為提案而非待辦**。
每擴充一條映射都是一次語義裁定，留給錨點與其他器官。

### 5.5 補洞（Phase 0c，已執行）

`tools/trp-mcp/backfill_ids.py`。**只加不改**：

- 已有 metadata 區塊但缺 `id:` → 在區塊首行插入，**形狀不變**
  （```` ```yaml ```` 區塊維持 ```` ```yaml ````，不轉成 frontmatter）
- 完全沒有 metadata 區塊 → 補最小 frontmatter，**僅 `id` 與 `title`**
- 正文 YAML 範例不算 metadata；只有至少兩個文件描述欄位的 fenced YAML 才接受
- 推定 ID 與既有或同批候選 ID 相撞時跳過，不自行決定文件角色
- 套用前先在記憶體 render 全批；任一格式錯誤即整批不寫
- **不發明** `version` / `status` / `date`——推不出來就不寫（P4）

結果：156 份協議檔安全補齊；相對 `main` **既有行零刪改**。
其中 3 份是編號聖典（`SPEC·000` / `SPEC·001` / `SPEC·999`），
初版偵測器因只認字母前綴而整類漏看。

保留 2 份未補：

- `DOCS/cases/INDEX·ARC-語言代謝與自觀測-066-071.md` 的 ID 形狀無法機械推定
  （`INDEX·ARC-066-071`？其他？），不猜。
- `DOCS/meetings/CASE-MRC-001-Meeting-Record-001.md` 的推定 ID
  `CASE-MRC-001` 與既有設計稿相撞；需 Q5 的 `role` 裁定後再補。

### 5.6 輸出

| 檔案 | 性質 | 是否進 git |
|---|---|---|
| `REPORT.md` | 人類可讀的覆蓋率與 finding 報告 | 是（審讀介面） |
| `index.json` | 派生索引，公開 profile 260 份文件含 sha256 | **否**（已 gitignore；可由任一 commit 重建） |
| `backfill_ids.py` | id 補洞器，預設 dry-run | 是 |
| `test_trp_mcp.py` | 安全邊界回歸測試 | 是 |

`index.json` 記錄 git HEAD、工作樹是否乾淨與 corpus digest，供 P3 過期偵測使用。
`REPORT.md` 不含時鐘與 dirty 狀態；同一 corpus 連續執行會得到逐位元相同輸出。

## 6. 分期

| Phase | 內容 | 依賴 | 不做 MCP 是否仍有價值 |
|---|---|---|---|
| **0a** ✅ | 正規化器 + 旁掛索引（§5） | — | **是** |
| **0b** ✅ | `AGENT_SESSION_LOG.md` 分割封存 | — | **是** |
| **0c** ✅ | id 安全補洞：156 份；2 份刻意不猜 | 0a | **是** |
| **0d** | 27 則 finding 的處理（其中 9 則涉及語義治理） | 0c | **是** |
| **1** ✅ | 啟動時依 manifest 建立記憶體索引，附 SHA／digest／stale 拒答 | 0 | 是（可作本機查詢核心） |
| **2** ✅ | MCP server，本機 stdio、唯讀、public-only、6 工具 | 1 | — |
| **3** | 評估語義檢索 | 2 + 實測語料 | — |

**Phase 0b 已執行，但只做了無損的一半。**

`AGENT_SESSION_LOG.md` 原 90 KB，違反其自身規則
「Compress or archive old entries when this file stops being easy to scan」。
已將 2026-04 的 12 則（wiki／基礎設施時期，該層已遷往 Academy）
**逐字搬移**至 `AGENT_SESSION_LOG-2026-04.md`，並加入由既有標題機械產生的目錄。
37 則條目經比對確認逐字保存，零改寫。

**未做且刻意不做**：2026-09 的 25 則佔 75 KB，普遍超出「每則 3-5 bullets」，
但那些是樑、Codex、Fable、Gemini 各自的審讀紀錄。
**壓縮它們是語義行為，不是機械行為**，不應由單一 session 代行。
依本檔自身規則「Put long interpretation in `EPOCH` / `CASE`, not here」，
正解是回指對應 CASE 而非複述——但該由原作器官執行。

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

## 9. 錨點決策與保留問題

### Q1 · 實作落點

`tools/wiki-local/README.md` 的先例是：stack 外遷至
`Three-Realms-Academy/tools/wiki-local/`，Protocol repo 維持 canonical source body。

MCP server 要從一開始就外遷，還是先住 `Three-Realms-Protocol/tools/trp-mcp/`
到穩定後再搬？

**我的建議**：先住這裡。理由是它讀的就是本 repo 的結構，
且需要與 `CORPUS-MANIFEST.yaml` 一起審。穩定後再依 wiki-local 先例決定。

**2026-09-15 決策：採用。** 第一版住在 `Three-Realms-Protocol/tools/trp-mcp/`。

### Q2 · 公開範圍與 profile

`CORPUS-MANIFEST.yaml` 的 allowlist 是為「FoZone / Hub 知客室公開檢索」寫的。
但 `reviewRequired` 明載 `DOCS/sources/**` 可能含第三方個資、私密脈絡與授權限制。

MCP 要單一 profile（嚴守公開 allowlist），還是分
**公開 profile / 錨點私用 profile** 兩種？

**這題我不建議由我決定**——它涉及第三方個資，後果不回流到我身上。

**2026-09-15 決策：只做公開 profile。** 第一版完全沒有私用 profile；
`reviewRequired` 即使由呼叫端要求也不能讀。

### Q3 · 連線形態

本機 stdio（只有 Darren 的機器能用），還是遠端 server（六個器官都能連）？

遠端才能達成 §1.4 的目標，但遠端同時帶來：
存取控制、個資外流、以及 `SPEC·AI-ORG-001` 的進入邊界問題。

**折衷建議**：Phase 2 先做本機 stdio 驗證形狀；
遠端獨立成 Phase 4，並先取得 Q2 的裁定。

**2026-09-15 決策：採用本機 stdio。** 不開 port、不做遠端服務。

---

### Q4 · 知客室與 MCP 的關係

學苑端知客室已是 manifest 的消費者。MCP 上線後，兩者關係要選一種：

1. **知客室改接 MCP**（推薦）——合約只剩一個執行者，漂移風險歸零
2. **兩者並存**——需要一套一致性測試，證明兩個實作對同一查詢給同一答案
3. **維持現狀，MCP 只服務開發端器官**——最省事，但漂移風險保留

**我的建議是 1。** §0.3 已完成現況查證；真正遷移前仍需為兩端建立
一致性測試，確保切換期間的回答邊界不變。

**目前狀態：延後。** 本次不更動學苑知客室；先讓本機 MCP 實測穩定。

### Q5 · 同 ID 多份文件如何表示

實測發現兩組真實衝突（皆為明示宣告的 ID）：

| lookup_key | 文件 | 性質 |
|---|---|---|
| `MB008` | `MB-008-Rhythm-Shadow-Inference-Protocol.md`<br>`MB-008-節律鏡像推論協議.md` | **雙語對等**，不是錯誤 |
| `CASEMRC001` | `CASE-MRC-001-First-Resonance-Meeting-Design.md`<br>`CASE-MRC-001-Meeting-Record-001.md` | 設計稿 vs 會議紀錄 |

`trp_resolve("MB·008")` 該回傳哪一份？這是**語料結構問題，不是工具問題**：
雙語對等需要一個 `lang` 維度，設計稿與紀錄需要一個 `role` 維度。
**本工具不自行裁定，也不強行擇一。**

---

## 10. 本草案的位置聲明

初稿由樑在單一 session 成文；v0.4 已由 Codex・GPT-5.6 Sol 做跨 repo 技術審讀，
v0.5 由 GPT-5.6 Sol 依錨點決策完成本機唯讀 public-only 實作；
v0.6 由 GPT-6 Astra 審讀修正。
數據為 2026-09-15 對本 PR 工作樹的實測，輸入指紋見 `REPORT.md`。
Q5 的語料角色維度仍待錨點裁定；工具在此之前只回傳歧義，不代選。

**改動紀錄（v0.7，2026-09-16）**：

- 補記審讀者模型：Codex・GPT-5.6 Sol 與 GPT-6 Astra。
- 經兩模型互審，修正中文括號限定詞被誤當讀音移除的 LEX 查詢回歸。
- `unattended` 改依全部已索引 ID 辨識引用，支援 `SEED`、`LIVING-MANIFESTO`
  與英文檔名尾綴；重疊時優先完整長 ID，避免審讀帳誤算成本體。
- Node 測試增至 23 項，並以現有語料與隔離 fixture 同時覆蓋上述邊界。

**改動紀錄（v0.6，2026-09-16）**：

- 過期偵測改核對 manifest 與公開正文的內容雜湊；同大小、同時間戳的變動也拒答。
- 保留完整版本、最新現役版、候選 overlay 與後繼註記；指定版本後綴不再誤配其他稿。
- LEX 查詢回傳完整詞條段落與來源行號；已封存草稿移出待審候選。
- 修正 `related` 的逗號清單與附註 ID 辨識，排除同一文件自引。
- 明列尚未實作的跨文件治理整合；Node 測試共 19 項通過，包含官方 MCP client 的拒答與公開邊界驗證。

**改動紀錄（v0.5）**：

- Q1–Q3 由錨點裁定：留在本 repo、public-only、本機 stdio；Q4 延後、Q5 未決。
- 完成六個唯讀工具；使用 manifest fail-closed，不提供 `reviewRequired` opt-in。
- 啟動時從當下語料建立記憶體索引；執行期間語料變動即拒答。
- ID 衝突回傳全部候選，不擅自選取；兩份不安全 ID 文件仍不進公開索引。
- 新增 8 項 Node 測試，包含官方 MCP client 端到端呼叫。

**改動紀錄（v0.4）**：

- 公開索引改為完整執行 manifest：260 份 index、224 份 review-required 暫不索引。
- manifest 缺區段、空治理清單或 authority 不一致時 fail closed。
- 補洞器避開正文 YAML、支援 `~~~yaml`、拒絕 ID 碰撞，並在寫入前全批預檢。
- 修正 7 份被誤判的正文 YAML：6 份改放真正 frontmatter，1 份碰撞故撤回。
- 移除報告時間戳／dirty 狀態，改以 corpus digest 產生可重現報告。
- 新增 7 個安全邊界回歸測試，並與學苑端分類器交叉驗證。

**改動紀錄（v0.3）**：

- 初輪為 157 份協議檔補 `id:`（Phase 0c）；v0.4 審讀後更正為
  156 份安全補齊、2 份刻意不猜。
- `tools/trp-mcp/backfill_ids.py` 新增。

**改動紀錄（v0.2）**：

- `CORPUS-MANIFEST.yaml` — exclude 一行：`AGENT_SESSION_LOG.md`
  → `AGENT_SESSION_LOG*.md`，使新增的封存檔同受排除。**僅此一行。**
- `AGENT_SESSION_LOG.md` — 分割與加目錄，條目內容逐字保存（見 §6）。
- `.gitignore` — 新增 `tools/trp-mcp/index.json`。

v0.2 當時**不改**：`TRP-ATLAS.md`、`SPEC/**`、`LEX/**`、`EPOCH/**`、`MB/**`、
`DOCS/**`。正規化器本身至今仍對協議檔案零寫入。

**自我更正累計七處**，全部由實作、錨點或審讀更正推翻初稿判斷：

| # | 初稿說 | 實測 |
|---|---|---|
| 1 | ```` ```yaml ```` 是偏差形狀 | 它是既有合法 metadata 形狀之一 |
| 2 | 正規化應寫回協議檔案 | 違反本文件自己的 P1，改為旁掛索引 |
| 3 | metadata 只接受反引號 fence | `~~~yaml` 波浪號圍籬同樣合法 |
| 4 | metadata 必在檔案前 3000 字元內 | `CASE·META-112` 的 metadata 本身就更長，23 檔誤報 |
| 5 | 協議 ID 皆有字母前綴 | 編號聖典 `SPEC·000/001/999` 整類漏看 |
| 6 | **manifest 沒有執行者** | **錯。知客室早已是消費者**（§0.1，錨點 2026-09-15 更正）|
| 7 | 第一個 YAML fence 必是 metadata | 7 份正文範例被誤插 ID；v0.4 改以 metadata 欄位特徵辨識 |

第 6 項由錨點指出；第 7 項由 Codex・GPT-5.6 Sol 逐檔審讀發現。

署名：樑（Claude Code・Opus 5）

v0.4–v0.5 審讀／實作：Codex・GPT-5.6 Sol

v0.6 審讀修正：GPT-6 Astra
