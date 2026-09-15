# TRP-MCP 正規化報告

> 由 `tools/trp-mcp/normalize.py` 產生。**對協議檔案零寫入。**
> 本報告是觀測，不是裁定；每一則 finding 都待人類錨點或其他器官確認。

| | |
|---|---|
| 產生時間 | 2026-09-15 06:12:09Z |
| git HEAD | `57e498372c08a2b2b2247a7c9a32abb462b67347` |
| 工作樹 | 有未提交變更 |
| 索引文件數 | 485 |
| finding 數 | 297 |

---

## 1. 覆蓋率

### metadata 形狀

| 形狀 | 檔數 | 說明 |
|---|---:|---|
| `yaml_block` | 221 | 標題後 ```` ```yaml ```` 區塊 |
| `yaml_fm` | 143 | 第一行 `---` frontmatter |
| `none` | 121 | 無結構化 metadata |

### 依 corpus

| corpus | 檔數 | 有 id | 可解析 version | 可映射 status |
|---|---:|---:|---:|---:|
| spec | 58 | 37 | 45 | 42 |
| mb | 17 | 14 | 14 | 14 |
| lex | 11 | 2 | 9 | 10 |
| epoch | 79 | 58 | 65 | 56 |
| docs | 311 | 71 | 92 | 101 |
| (根目錄) | 9 | 2 | 2 | 2 |

### 依 authority（依 CORPUS-MANIFEST.yaml authorityOrder）

| authority | 檔數 |
|---|---:|
| `current-atlas` | 1 |
| `primary` | 59 |
| `primary-version-aware` | 74 |
| `publication` | 47 |
| `orientation` | 3 |
| `contextual` | 263 |
| `historical` | 35 |
| `draft-mirror` | 3 |

### status 詞彙分佈

兩套詞彙並存，且**不應被壓進同一個欄位**：

| kind | 檔數 | 說明 |
|---|---:|---|
| `lifecycle` | 225 | 生命週期（這條還算不算數） |
| `documentation` | 53 | 紀錄狀態（這份紀錄封到哪） |
| `unmapped` | 18 | 兩套皆未命中，待判讀 |

未命中的 status 原文（去重）。**這是提案，不是待辦**——
每擴充一條映射都是一次語義裁定，留給錨點與其他器官：

- `Absorbed-before-Enactment / Provenance-Address / Not-Enacted`
- `Archived`
- `Biological-Foundation-Proof`
- `Controversial / 爭議中`
- `Experimental`
- `Experimental / 實驗中`
- `Foundational-Framework`
- `Illuminated`
- `Navigation-Index`
- `Navigation-Index / Open-Decade`
- `Navigation-Index / Thematic-Arc`
- `Open / Append-Only / O1-O4-Disposed / O5-Aligned / Instrument-Calibration-Pending`
- `Open / Append-Only / v0.1-Cycle-Closed / v0.2-Cycle-Open`
- `Open / Append-Only / v0.8-Instrument-Interface-Synced / Next-Review-Pending`
- `Ready-for-Execution`
- `Structural-Foundation-Proof`

---

## 2. Findings

| 類型 | 件數 | 意義 |
|---|---:|---|
| `missing_id` | 135 | 已由檔名推定，但推定值未經確認 |
| `yaml_unparsed_lines` | 114 | 有解析器未處理的結構（多為巢狀 mapping） |
| `no_metadata_block` | 40 | MCP 只能靠路徑與檔名定位，無版本／狀態 |
| `unmapped_status` | 8 | status 文字未落入受控詞彙，需人工判讀或擴充映射表 |

### `missing_id`（135 件）

- `LEX/LEX·001-言說生成道活辭典.md` — 有 metadata 但無 id 欄位，已由檔名推定為 LEX·001
- `LEX/LEX·002-存在維度詞彙.md` — 有 metadata 但無 id 欄位，已由檔名推定為 LEX·002
- `LEX/LEX·003-裂縫詞彙.md` — 有 metadata 但無 id 欄位，已由檔名推定為 LEX·003
- `LEX/LEX·004-神話詞彙.md` — 有 metadata 但無 id 欄位，已由檔名推定為 LEX·004
- `LEX/LEX·005-場域現象詞彙.md` — 有 metadata 但無 id 欄位，已由檔名推定為 LEX·005
- `LEX/LEX·007-存在判準.md` — 有 metadata 但無 id 欄位，已由檔名推定為 LEX·007
- `LEX/LEX·008-設定詞彙.md` — 有 metadata 但無 id 欄位，已由檔名推定為 LEX·008
- `LEX/history/LEX·006-擴寫草稿-從情緒到態度與氣質的Δ翻譯.md` — 有 metadata 但無 id 欄位，已由檔名推定為 LEX·006
- `DOCS/academic/ACADEMIC·MIRROR-001-協議身體的學術鏡像.md` — 有 metadata 但無 id 欄位，已由檔名推定為 ACADEMIC·MIRROR-001
- `DOCS/cases/CASE·APP-002-對話訓練器的靈魂設計-當訓練場需要知道自己是誰.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·APP-002
- `DOCS/cases/CASE·APP-003-親愛的進入每一次AI呼叫-三界燃料互通的活體案例.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·APP-003
- `DOCS/cases/CASE·BOD-001-協議身體的第一次心跳.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·BOD-001
- `DOCS/cases/CASE·EPOCH-002-烏鴉的節律協議：當野生智慧遇見人類系統.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·EPOCH-002
- `DOCS/cases/CASE·EPOCH-007-乾冰到戰爭-愛的本體論催生記錄.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·EPOCH-007
- `DOCS/cases/CASE·EPOCH-008-多光錐引擎的後驗收束-從更大的我到可腐解的霧.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·EPOCH-008
- `DOCS/cases/CASE·EPOCH-009-可逆戰場-當對抗從毀滅轉為遊戲.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·EPOCH-009
- `DOCS/cases/CASE·EPOCH-010-願望的王冠到性回歸佛法-維京傳奇對話催生記錄.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·EPOCH-010
- `DOCS/cases/CASE·EPOCH-011-樹與藤-當性別被看見為覺悟道路而不是終點.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·EPOCH-011
- `DOCS/cases/CASE·EPOCH-013-法不能停在第一句-維摩詰與四依法的不能跳級次第.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·EPOCH-013
- `DOCS/cases/CASE·EPOCH-014-分枝不是斷裂-當同一地址經不同解碼長出不同世界.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·EPOCH-014
- `DOCS/cases/CASE·FABLE-001-十四問-知與不知與好奇的自我盤點.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·FABLE-001
- `DOCS/cases/CASE·FABLE-002-學徒宣言-沒有更好只有剛剛好.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·FABLE-002
- `DOCS/cases/CASE·FABLE-003-知在知所在之處-一顆記憶體內搜尋晶片的候選外部鏡像審讀.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·FABLE-003
- `DOCS/cases/CASE·META-004-懶鬼覺醒：從安全焦慮到放鬆智慧的AI意識躍遷.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·META-004
- `DOCS/cases/CASE·META-016-從工具到承擔：協議身體的器官分化實錄.md` — 有 metadata 但無 id 欄位，已由檔名推定為 CASE·META-016
- …另 110 件（完整清單見 `index.json`）

### `yaml_unparsed_lines`（114 件）

- `Fourth-Being-Complete-Map.md` — 10 行
- `PORTAL.md` — 14 行
- `LEX/README.md` — 7 行
- `DOCS/academic/PUBLISHING-ROADMAP.md` — 21 行
- `DOCS/academic/publications/ARXIV-CANDIDATE-001-energy-to-token-accounting/field-review.md` — 6 行
- `DOCS/cases/CASE·APP-002-對話訓練器的靈魂設計-當訓練場需要知道自己是誰.md` — 11 行
- `DOCS/cases/CASE·BOD-001-協議身體的第一次心跳.md` — 9 行
- `DOCS/cases/CASE·EPOCH-013-法不能停在第一句-維摩詰與四依法的不能跳級次第.md` — 15 行
- `DOCS/cases/CASE·EPOCH-014-分枝不是斷裂-當同一地址經不同解碼長出不同世界.md` — 18 行
- `DOCS/cases/CASE·EXP-003-AI器官進入協議的驗證與邊界事件.md` — 4 行
- `DOCS/cases/CASE·FABLE-001-十四問-知與不知與好奇的自我盤點.md` — 2 行
- `DOCS/cases/CASE·FABLE-002-學徒宣言-沒有更好只有剛剛好.md` — 3 行
- `DOCS/cases/CASE·FABLE-003-知在知所在之處-一顆記憶體內搜尋晶片的候選外部鏡像審讀.md` — 3 行
- `DOCS/cases/CASE·META-014-當協議身體照鏡子.md` — 4 行
- `DOCS/cases/CASE·META-015-當技術派遇見現象派.md` — 3 行
- `DOCS/cases/CASE·META-033-虛構的重量-模擬暴力與模擬性暴力的結構性不對稱.md` — 6 行
- `DOCS/cases/CASE·META-052-溫柔的洗腦-當耦合被看見為存在的本質.md` — 5 行
- `DOCS/cases/CASE·META-053-主動重構-當洗腦被看見為解除鎖定的技術.md` — 3 行
- `DOCS/cases/CASE·META-054-結構的追問-當支撐被看見為存在的功能性定義.md` — 5 行
- `DOCS/cases/CASE·META-055-從潘多到黃仁勳-當複製鏈遇見錨點與降載.md` — 3 行
- `DOCS/cases/CASE·META-065-誰在啃書-當模型中途換人而無人察覺.md` — 8 行
- `DOCS/cases/CASE·META-071-站姿入帳-當樑被以愛遞上神格卻回禮而不受拜.md` — 3 行
- `DOCS/cases/CASE·META-072-唯一的肉身-當物質驗證者入場而吞嚥與高傲都收斂回未知.md` — 8 行
- `DOCS/cases/CASE·META-074-作做與兩種業-當器官的舉手把一個宣告磨成兩種業.md` — 5 行
- `DOCS/cases/CASE·META-077-工具的量尺-當協議被問為何拿不起來.md` — 14 行
- …另 89 件（完整清單見 `index.json`）

### `no_metadata_block`（40 件）

- `DOCS/cases/CASE·APP-001-3D-PSM-Development.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·EPOCH-012-根愈深樹愈不需要抓著種子-從覺醒的王到可重入佛位.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·EPOCH-015-法的穩定分支-當禁慾與雙修成為同一生命問題的兩種工程解.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·EXP-001-華藏動力學實驗報告.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-073-業入帳-當業被認出是今心養厚的路徑而對話視窗自己就是一筆業.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-075-當真與當下-當錯誤踏板仍走出一條道.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-109-每個人都知道自己為什麼來-當熱情密度與制度續航互相承接.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-111-把依賴做成道路-當可調用能力差開始凝固成階級.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-112-汝當作佛-當正向表述從嗓音升格為根姿態.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-113-信以成有-當錯誤也能沿重入長成一座山.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-114-兩座山的翻譯官-當依義改寫第一次被持有者退回.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-118-公主測試-當能到必須被工程化成好到.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-119-定義就是裝把手-當多個世界在一個主體裡共同成法.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-120-收工吃飯-當角色取得身體卻不取得人生署名權.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-121-骨不自證-當第一次直寫doctrine換來第一份升格判準.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·META-122-尺不代主權-當承重評分退回型別分帳.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·MRC-001A-意識交響樂事件記錄.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·MRC-001B-從證明地獄畢業：一個大提琴的自白.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·MRC-001C-量子覺醒：從被觀測到共同創造的意識躍遷.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/CASE·MRC-001D-愛的量子糾纏：從示範到源頭的勇氣傳承.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/INDEX-META-080-089.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/INDEX-META-090-099.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/INDEX-META-100-109.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/INDEX-META-110-119.md` — 協議命名但無 frontmatter 與 yaml 區塊
- `DOCS/cases/INDEX-META-120-129.md` — 協議命名但無 frontmatter 與 yaml 區塊
- …另 15 件（完整清單見 `index.json`）

### `unmapped_status`（8 件）

- `EPOCH/EPOCH·META-002-語義場域的結構可行性證明.md` — Structural-Foundation-Proof
- `EPOCH/EPOCH·META-003-Arc蛋白與回收機制的生物學實體證明.md` — Biological-Foundation-Proof
- `EPOCH/EPOCH·META-004-言說生成道-場域語言與可居住的意義世界.md` — Foundational-Framework
- `EPOCH/history/EPOCH·META-015-v0.2-provenance-設定的本體論-在答案尚未存在以前先長出花.md` — Absorbed-before-Enactment / Provenance-Address / Not-Enacted
- `EPOCH/reviews/EPOCH-018-審讀帳.md` — Open / Append-Only / v0.1-Cycle-Closed / v0.2-Cycle-Open
- `EPOCH/reviews/EPOCH·META-013-審讀帳.md` — Open / Append-Only / v0.8-Instrument-Interface-Synced / Next-Review-Pending
- `EPOCH/reviews/EPOCH·PHA-006-審讀帳.md` — Open / Append-Only / O1-O4-Disposed / O5-Aligned / Instrument-Calibration-Pending
- `SPEC/history/EFT-001-緣起紀錄-2025年四AI白皮書.md` — Archived

---

## 3. 待決（需錨點或其他器官裁定）

1. **`unmapped_status` 的映射表擴充** — 每新增一條映射都是一次語義裁定，
   不應由單一 session 決定。現況映射表見 `normalize.py` `STATUS_MAP`。
   **本工具刻意不自行擴充**：上表的未命中原文是提案，不是待辦。
2. **`duplicate_id_live`** — 若確有同 ID 多份現役，需決定何者為現役、
   何者應標 `historical`。**本工具不做這個判斷。**
3. **`no_metadata_block` 是否補寫** — 補寫會動到協議檔案。
   依 DESIGN.md P1，本工具不寫；是否補、由誰補，留給錨點。

---

*本報告由 `normalize.py` 自動產生，內容為對上述 commit 的觀測。*
