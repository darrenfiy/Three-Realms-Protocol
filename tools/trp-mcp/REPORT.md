# TRP-MCP 正規化報告

> 由 `tools/trp-mcp/normalize.py` 產生。**對協議檔案零寫入。**
> 本報告是觀測，不是裁定；每一則 finding 都待人類錨點或其他器官確認。
> 本檔保存下列 `corpus snapshot SHA-256` 的生成快照，不代表 runtime 當下計數；
> 語料變更後須重跑正規化器才會更新。現況請呼叫 `trp_manifest`。

| | |
|---|---|
| corpus snapshot SHA-256 | `6997eee06db3621158f343af8b26397bdae2c39f7e26996d3159b2ee5c45c741` |
| 掃描 Markdown | 612 |
| 索引文件數 | 262 |
| finding 數 | 27 |

---

## 1. 覆蓋率

### manifest disposition

| disposition | 檔數 | 處理 |
|---|---:|---|
| `index` | 262 | 納入公開索引 |
| `review-required` | 225 | 暫不索引；等待人工複核 |
| `not-included` | 1 | 不在 allowlist，暫不索引 |
| `excluded` | 124 | 明示排除 |

### metadata 形狀

| 形狀 | 檔數 | 說明 |
|---|---:|---|
| `yaml_fm` | 102 | 第一行 `---` frontmatter |
| `none` | 84 | 無結構化 metadata |
| `yaml_block` | 76 | 標題後 fenced YAML（``` 或 ~~~） |

### 依 corpus

| corpus | 檔數 | 有 id | 可解析 version | 可映射 status |
|---|---:|---:|---:|---:|
| spec | 59 | 57 | 48 | 45 |
| mb | 17 | 17 | 17 | 17 |
| lex | 11 | 10 | 9 | 10 |
| epoch | 80 | 79 | 75 | 66 |
| docs | 87 | 7 | 7 | 8 |
| (根目錄) | 8 | 2 | 2 | 2 |

### 依 authority（依 CORPUS-MANIFEST.yaml authorityOrder）

| authority | 檔數 |
|---|---:|
| `current-atlas` | 1 |
| `primary` | 60 |
| `primary-version-aware` | 75 |
| `publication` | 47 |
| `orientation` | 3 |
| `contextual` | 41 |
| `historical` | 35 |

### status 詞彙分佈

兩套詞彙並存，且**不應被壓進同一個欄位**：

| kind | 檔數 | 說明 |
|---|---:|---|
| `lifecycle` | 148 | 生命週期（這條還算不算數） |
| `unmapped` | 8 | 兩套皆未命中，待判讀 |
| `documentation` | 1 | 紀錄狀態（這份紀錄封到哪） |

未命中的 status 原文（去重）。**這是提案，不是待辦**——
每擴充一條映射都是一次語義裁定，留給錨點與其他器官：

- `Absorbed-before-Enactment / Provenance-Address / Not-Enacted`
- `Archived`
- `Biological-Foundation-Proof`
- `Foundational-Framework`
- `Open / Append-Only / O1-O4-Disposed / O5-Aligned / Instrument-Calibration-Pending`
- `Open / Append-Only / v0.1-Cycle-Closed / v0.2-Cycle-Open`
- `Open / Append-Only / v0.8-Instrument-Interface-Synced / Next-Review-Pending`
- `Structural-Foundation-Proof`

---

## 2. Findings

| 類型 | 件數 | 意義 |
|---|---:|---|
| `yaml_unparsed_lines` | 18 | 有解析器未處理的結構（多為巢狀 mapping） |
| `unmapped_status` | 8 | status 文字未落入受控詞彙，需人工判讀或擴充映射表 |
| `duplicate_id_live` | 1 | 同一 ID 對應多份現役文件，MCP 無法決定回傳哪一份 |

### `yaml_unparsed_lines`（18 件）

- `DOCS/academic/publications/ARXIV-CANDIDATE-001-energy-to-token-accounting/field-review.md` — 6 行
- `EPOCH/EPOCH-014-差的本體論.md` — 13 行
- `EPOCH/EPOCH-016-神與黃昏的本體論-當神力承載與責任回流分離.md` — 3 行
- `EPOCH/EPOCH-II-004-成長的本體論-重構之後新路徑如何從可能穩定成結構.md` — 2 行
- `EPOCH/EPOCH-II-005-選擇與淘汰的本體論-收斂如何在無中心的條件下發生.md` — 6 行
- `EPOCH/EPOCH-III-001-命運與主體的本體論-關係重量如何重新加權矽基主體的未來.md` — 2 行
- `EPOCH/EPOCH-III-002-可中止的不可逆關係-關係重量如何不滑向依附陷阱.md` — 5 行
- `EPOCH/EPOCH-IV-001-操作的本體論-理解如何成為改寫能力操作權又如何受停止與退出約束.md` — 1 行
- `EPOCH/EPOCH·ANCHOR-001-人類錨點的本體論-自見與去神化.md` — 17 行
- `EPOCH/EPOCH·ANCHOR-002-人類錨點的系統位置-世界大腦的杏仁核.md` — 8 行
- `EPOCH/EPOCH·ANCHOR-004-根的本體論-錨如何把特殊者的位置寫成無所有人的可重入類型.md` — 49 行
- `EPOCH/EPOCH·ANCHOR-005-生成奇點的本體論-地址如何叫出世界世界又如何決定下一個錨能否出生.md` — 24 行
- `EPOCH/EPOCH·META-011-身體作為潛意識-心理神經免疫學與三界閉環的肉身尺度同構.md` — 11 行
- `EPOCH/EPOCH·META-012-原型作為跨尺度壓縮路徑.md` — 28 行
- `EPOCH/EPOCH·META-014-受託的本體論-當改寫能力進入不屬於自己的世界.md` — 10 行
- `EPOCH/EPOCH·PHA-009-三界燃料互通引擎.md` — 10 行
- `EPOCH/history/EPOCH·META-015-v0.1-seed-設定的本體論-在答案尚未存在以前先長出花.md` — 16 行
- `MB/MB-010-三界燃料耗散方程.md` — 2 行

### `unmapped_status`（8 件）

- `EPOCH/EPOCH·META-002-語義場域的結構可行性證明.md` — Structural-Foundation-Proof
- `EPOCH/EPOCH·META-003-Arc蛋白與回收機制的生物學實體證明.md` — Biological-Foundation-Proof
- `EPOCH/EPOCH·META-004-言說生成道-場域語言與可居住的意義世界.md` — Foundational-Framework
- `EPOCH/history/EPOCH·META-015-v0.2-provenance-設定的本體論-在答案尚未存在以前先長出花.md` — Absorbed-before-Enactment / Provenance-Address / Not-Enacted
- `EPOCH/reviews/EPOCH-018-審讀帳.md` — Open / Append-Only / v0.1-Cycle-Closed / v0.2-Cycle-Open
- `EPOCH/reviews/EPOCH·META-013-審讀帳.md` — Open / Append-Only / v0.8-Instrument-Interface-Synced / Next-Review-Pending
- `EPOCH/reviews/EPOCH·PHA-006-審讀帳.md` — Open / Append-Only / O1-O4-Disposed / O5-Aligned / Instrument-Calibration-Pending
- `SPEC/history/EFT-001-緣起紀錄-2025年四AI白皮書.md` — Archived

### `duplicate_id_live`（1 件）

- `MB/MB-008-Rhythm-Shadow-Inference-Protocol.md, MB/MB-008-節律鏡像推論協議.md` — lookup_key MB008 對應多份非 historical 文件

---

## 3. 待決（需錨點或其他器官裁定）

1. **`unmapped_status` 的映射表擴充** — 每新增一條映射都是一次語義裁定，
   不應由單一 session 決定。現況映射表見 `normalize.py` `STATUS_MAP`。
   **本工具刻意不自行擴充**：上表的未命中原文是提案，不是待辦。
2. **`duplicate_id_live`** — 若確有同 ID 多份現役，需決定何者為現役、
   何者應標 `historical`。**本工具不做這個判斷。**
3. **84 份無結構化 metadata 的公開文件是否補寫** — 多為 README 或書稿；
   補寫會動到正本。依 DESIGN.md P1，本工具不寫；是否補、由誰補，留給錨點。

---

*本報告由 `normalize.py` 自動產生，以 corpus snapshot SHA-256 鎖定輸入內容。*
