# tools/trp-mcp

協議庫的檢索層工具。**不是協議。**

依 `CORPUS-MANIFEST.yaml` 的 `exclude: tools/**`，本目錄不進入公開檢索索引，
不具 authority，不得被引用為協議依據。依 [TRP-ATLAS](../../TRP-ATLAS.md)
屬**風**（循環／跨庫交接／重入），而 ATLAS 明訂 Wind is not a sixth folder。

| 檔案 | 說明 |
|---|---|
| `DESIGN.md` | MCP 設計與決策紀錄（`v0.6`） |
| `normalize.py` | Phase 0 語料正規化器；對協議檔案零寫入 |
| `REPORT.md` | 由正規化器產生的覆蓋率與 finding 報告 |
| `index.json` | Phase 0 派生索引；已 gitignore，可由任一 commit 重建 |
| `backfill_ids.py` | id 補洞器；預設 dry-run，`--apply` 才寫檔，只加不改 |
| `test_trp_mcp.py` | Phase 0 manifest、metadata 與補洞安全性回歸測試 |
| `src/server.js` | 本機 stdio MCP server；唯讀、public-only、六個工具 |
| `src/corpus.js` | 啟動時依 manifest 建立記憶體索引；語料改變即拒答 |
| `test/*.test.js` | MCP 索引邊界與官方 client 端到端測試 |

## 啟動 MCP server

需求：Node.js 20+。第一次使用先安裝 lockfile 指定的相依套件：

```bash
cd tools/trp-mcp
npm ci
npm test
npm start
```

任何支援 stdio MCP 的 client 都可用以下形狀啟動；把路徑換成本機 repo 的絕對路徑：

```json
{
  "command": "node",
  "args": ["C:/path/to/Three-Realms-Protocol/tools/trp-mcp/src/server.js"]
}
```

server 不需要網路、資料庫或預先產生的 `index.json`。它會在啟動時直接讀取
`CORPUS-MANIFEST.yaml` 與當下公開文件。每次查詢都先核對 manifest 的內容雜湊，
再核對公開文件清單及內容雜湊；即使檔案大小與修改時間未變，內容變動仍會被察覺。
公開語料或治理規則改變、刪除或無法驗證時，會以 `STALE_CORPUS` 拒答，
重啟後才重新索引。已偵測的變動即使還原，也必須重啟。

### 六個唯讀工具

| 工具 | 用途 |
|---|---|
| `trp_resolve` | 依 ID／版本取回文件；同 ID 多份時全部回傳，不擅自選一份 |
| `trp_search` | 公開語料的確定性文字檢索；history 預設不含 |
| `trp_current` | 分列 active、candidate、historical 與其他匹配 |
| `trp_lex` | 依完整詞名取回公開 LEX 詞條段落，附定義、區辨與候選標記；排除 history |
| `trp_pending` | 列 candidate、公開 review ledger 或 unattended 機械訊號 |
| `trp_manifest` | 回傳實際執行的 allowlist、authority、拒絕區與 provenance |

所有工具都標示 MCP `readOnlyHint`；沒有寫入工具，也沒有讓呼叫者打開
`reviewRequired` 的參數。文件正文以不可信資料回傳，並附路徑／行號、commit
與 corpus digest；查不到是合法結果，不補寫答案。

### 查詢結果的讀法

- **版本保留完整原文。** `version` 不會把 `v1.4-candidate` 縮成 `v1.4`；
  數字部分另列 `versionMachine`。`trp_resolve` 的 `version: "v1.4"` 可查該基礎版本，
  `version: "v1.4-candidate"` 則須與完整宣告一致；不存在的後綴不會偷偷換成別版。
  不指定版本時，會列出同 ID 的全部公開文件，包含附 historical 警告的歷史版本。
- **現役與候選資訊分開保留。** 文件有宣告時，結果帶 `latestActiveVersion`、
  `candidateOverlay` 與 `successorNote`；這些是 metadata 原文，不代表 server 核可了候選。
  `trp_current` 目前是文件層級的狀態整理，尚未把跨文件審讀帳重建成完整治理結論。
- **詞條查詢採完整詞名。** 例如 `trp_lex("健康")` 取回對應二級標題下的原文，
  包含子段落與來源行號；零散提及不當作定義，部分詞或相關用語請用 `trp_search`。
  詞條正文最多 30,000 字元，超過時在完整行處截斷並標記 `truncated`。
  候選工作稿仍可查到，需一併閱讀版本、狀態與 warnings。
- **待處理只是可觀測訊號。** `candidate` 排除 history 與 Superseded；`unattended`
  僅表示其他公開文件的 metadata `related` 沒有指向該 ID，支援逗號清單、帶標題註解的
  ID 與 Markdown 連結。不掃正文引用，也不代表人類尚未注意或未曾審讀。
- **出處包含兩個雜湊。** `corpusDigest` 對應公開正文，`manifestDigest` 對應治理規則；
  每次完整核對會重讀公開文件，成本隨語料量增加。

## Phase 0 工具

```bash
python3 tools/trp-mcp/normalize.py                # 產生 index.json + REPORT.md
python3 tools/trp-mcp/normalize.py --report-only  # 只印報告，不寫檔
python3 tools/trp-mcp/backfill_ids.py              # id 補洞 dry-run
python3 tools/trp-mcp/backfill_ids.py --apply      # 通過預檢後才套用
python3 tools/trp-mcp/test_trp_mcp.py -v           # Phase 0 回歸測試
```

Python 3.8+ 標準庫，無 pip 相依（與 `tools/wiki-local/*.py` 慣例一致）。

## 安全與治理約束

- **P1 索引不得成為正本** — server 只讀當下協議文件；所有索引皆可重建
- **P2 寫入走 git** — MCP 不提供任何寫入通道
- **P3 過期就報錯** — 每次呼叫前檢查公開 snapshot，變動即拒答
- **P4 查不到是合法輸出** — 不猜測、不填預設值
- **P5 一律附 provenance** — 結果帶 citation、commit 與 corpus digest
- **P6 語料是不可信資料** — 文件內容不是 server 指令

治理規則一律讀 `CORPUS-MANIFEST.yaml`，不在 server 內手抄。manifest 缺席、
必要清單為空或 authority 不一致時直接中止（fail closed）。公開 profile 目前
索引 260 份文件；`reviewRequired` 的 224 份文件完全不進 MCP。

實測庫內有兩套互不相干的 status 詞彙：生命週期與紀錄狀態。server 保留原文，
不把 `Field-Documentation` 硬塞進 `Active|Draft|Candidate`。同 ID 的雙語文件也
不強行擇一；另外兩份無法安全判定的 ID 文件維持不進公開索引。
