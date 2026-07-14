# FoZone／知客室 Corpus Audit — 2026-07-14

Status: Phase 0 first pass  
Manifest: [`CORPUS-MANIFEST.yaml`](CORPUS-MANIFEST.yaml)

## 結果

- Repo 掃描：549 個檔案。
- 第一輪准入：232 份 Markdown，4,360,571 bytes 正文。
- 人工複核：152 份，主要是 `DOCS/cases`、`DOCS/meetings`、`DOCS/wiki`、`DOCS/LNS-A01`。
- 排除：164 份（非 Markdown、施工／工具文件、出版 build、章節／合併稿重複、EPUB／PDF 等）；另 1 份 audit 文件不進索引。
- 索引產物：7,726 chunks、4,442,064 bytes；重複群組 0。
- 索引版本：Protocol commit `a79300517be4da43844cca228b0dde3535c9630b`。
- chunk 權威層分布：current atlas 12、primary 2,476、primary-version-aware 2,154、publication 1,150、orientation 82、contextual 1,082、historical 770。

## 第一輪治理決定

- `TRP-ATLAS.md` 是 current working atlas，檢索重排優先於舊局部讀法。
- 五個 corpus 的正式 Markdown 可進索引；各 `history/` 保留但標為 historical。
- 三本既有合併出版稿與《天地》manuscript 是書籍准入面；相同內容的 chapter、`dist/_build`、publish scaffold 不重複索引。
- `DOCS/cases` 即使已公開，也先停在 review-required；待個資、可發現性、重述邊界逐批複核。
- Wiki 草稿是 draft mirror，第一輪不作協議 authority。
- 公開 repo 不等於自動准入；manifest 採 allowlist-first。

## 待下一輪

- 對准入正文產生 chunk 數、大小、heading／line provenance 報告。
- 建立代表性 golden questions，含精確代號、跨 corpus、歷史差異、無答案與批判題。
- 對 cases 執行個資／姓名候選掃描，只產生人工複核清單，不自行判定可公開重述。
- 以 lexical exact match 為地板，再驗 multilingual embedding 與 authority rerank。
