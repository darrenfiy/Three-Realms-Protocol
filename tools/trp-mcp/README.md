# tools/trp-mcp

協議庫的檢索層工具。**不是協議。**

依 `CORPUS-MANIFEST.yaml` 的 `exclude: tools/**`，本目錄不進入公開檢索索引，
不具 authority，不得被引用為協議依據。依 [TRP-ATLAS](../../TRP-ATLAS.md)
屬**風**（循環／跨庫交接／重入），而 ATLAS 明訂 Wind is not a sixth folder。

| 檔案 | 說明 |
|---|---|
| `DESIGN.md` | MCP 設計與決策紀錄（`v0.9`） |
| `normalize.py` | Phase 0 語料正規化器；對協議檔案零寫入 |
| `REPORT.md` | 由正規化器產生的覆蓋率與 finding 報告 |
| `index.json` | Phase 0 派生索引；已 gitignore，可由任一 commit 重建 |
| `backfill_ids.py` | id 補洞器；預設 dry-run，`--apply` 才寫檔，只加不改 |
| `crosscheck.py` | 跨檔一致性檢查；版本轉述是否過期、CASE 是否被導航連到、搬遷是否掉內容。零寫入 |
| `test_trp_mcp.py` | Phase 0 manifest、metadata 與補洞安全性回歸測試 |
| `test_crosscheck.py` | crosscheck 的正規化、分流、離開碼與非 ASCII 輸出回歸測試 |
| `src/launch.js` | `.mcp.json` 的進入點；先確保相依就緒再動態載入 server |
| `src/ensure-deps.js` | 依 lockfile 雜湊判斷相依是否就緒，必要時 `npm ci`；launcher 與 SessionStart hook 共用 |
| `src/server.js` | stdio 與 HTTP 共用的唯讀、public-only MCP server；九個工具 |
| `src/corpus.js` | 啟動時依 manifest 建立記憶體索引；語料改變即拒答 |
| `src/http.js` | 雲端 Streamable HTTP transport（`/mcp`、`/healthz`） |
| `Dockerfile` / `cloudbuild.yaml` | public-only image 與 Cloud Run 部署設定 |
| `test/*.test.js` | MCP 索引邊界與官方 client 端到端測試 |

## 啟動 MCP server

需求：Node.js 20+。本機開發自己管相依：

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
  "args": ["C:/path/to/Three-Realms-Protocol/tools/trp-mcp/src/launch.js"]
}
```

進入點是 `src/launch.js` 而不是 `src/server.js`：全新 clone 沒有 `node_modules/`
（已 gitignore），server.js 會在 **import 期**就 `ERR_MODULE_NOT_FOUND`，client 那端
只看得到 `CONNECTION_CLOSED`。launcher 先比對 lockfile 雜湊，必要時跑一次
`npm ci`（輸出一律走 stderr，不污染 stdout 的 JSON-RPC 通道），再動態載入 server；
相依已就緒時只多一次雜湊比對。要繞過這層仍可直接 `node src/server.js`。

### 公開雲端入口

正式端點是：

```text
https://hub.three-quarters.net/mcp
```

它是公開、匿名、唯讀的 Streamable HTTP MCP，不需要 OAuth 或 API key。Cloud Run origin
採 internal ingress，外部 client 一律使用上面的 Hub 網址。可用官方 MCP client 做 smoke test：

```bash
npm run smoke:http -- https://hub.three-quarters.net/mcp
```

雲端 image 只封裝 manifest 判定為 public 的語料；不含 `.git`、Vault、`.env` 或
`reviewRequired` 路徑。`search`／`fetch` 的來源 URL 固定到 build commit，避免 `main` 漂移。

#### 部署

`cloudbuild.yaml` 依序跑測試 → build → push → deploy，image tag 與 provenance 都用 commit SHA。
**推到 `main` 即自動部署**：Cloud Build trigger `trp-mcp-main`（`three-quarters-dev`，global），
`_IMAGE_TAG`／`_BUILD_COMMIT` 帶 `$COMMIT_SHA`。不設路徑篩選，因為公開語料散在全庫；
測試不過就不部署。手動重跑：

```bash
gcloud builds triggers run trp-mcp-main --project three-quarters-dev --branch main
```

非得從本機送時（例如 trigger 故障），一律從**已推送的** commit 打包，不從工作樹送；
未推送的 commit 會讓來源 URL 在 GitHub 上找不到：

```bash
SHA=$(git rev-parse HEAD)
git -c core.autocrlf=false -c core.eol=lf archive --format=tar.gz -o /tmp/trp.tgz "$SHA" -- . \
  ':(exclude).claude' ':(exclude).codex' ':(exclude).agents' ':(exclude)tools/trp-mcp/index.json'
gcloud builds submit /tmp/trp.tgz --project three-quarters-dev \
  --config tools/trp-mcp/cloudbuild.yaml --substitutions "_IMAGE_TAG=$SHA,_BUILD_COMMIT=$SHA"
```

排除清單對應 `.gcloudignore`（打包檔上傳時不會再套用它）。`2026-09-24` 兩個坑都踩過：

- **從工作樹直接 `gcloud builds submit`**：未提交的改動會上雲，provenance 卻寫著 HEAD。
  `trp-mcp-00002-4p8` 就早於 `server.js` 的最後一次修改，線上 `openWorldHint` 因此與 commit 相反。
- **省掉兩個 `-c`**：Windows 的 git 預設 `core.autocrlf=true`，`git archive` 也會套用，
  雲端每份文件多出 `\r`，`sha256` 對不回 GitHub 上的正本。

本機 stdio 與雲端互相比對時也是同一件事：Windows 工作樹是 CRLF，`sha256`、`corpusDigest`、
`manifestDigest` 本來就與雲端不同；比正文前先把 CRLF 正規化，摘要值不能直接比。

server 不需要網路、資料庫或預先產生的 `index.json`。它會在啟動時直接讀取
`CORPUS-MANIFEST.yaml` 與當下公開文件。每次查詢都先核對 manifest 的內容雜湊，
再核對公開文件清單及內容雜湊；即使檔案大小與修改時間未變，內容變動仍會被察覺。
公開語料或治理規則改變、刪除或無法驗證時，會以 `STALE_CORPUS` 拒答，
重啟後才重新索引。已偵測的變動即使還原，也必須重啟。

### 九個唯讀工具

| 工具 | 用途 |
|---|---|
| `trp_resolve` | 依 ID／版本取回文件；同 ID 多份時全部回傳，不擅自選一份 |
| `trp_search` | 公開語料的確定性文字檢索；history 預設不含 |
| `trp_current` | 分列 active、candidate、historical 與其他匹配 |
| `trp_lex` | 依完整詞名取回公開 LEX 詞條段落，附定義、區辨與候選標記；排除 history |
| `trp_pending` | 列 candidate、公開 review ledger 或 unattended 機械訊號 |
| `trp_manifest` | 回傳實際執行的 allowlist、authority、拒絕區與 provenance |
| `trp_consistency` | 導航連結寫的版本與目標實際宣告的版本是否相符；分活導航／混合／記錄三層 |
| `search` | MCP 慣例的精簡全文搜尋；結果 id 是唯一 repo-relative path |
| `fetch` | 依 `search` 回傳的 id 取回完整公開文件與固定 commit 的來源 URL |

`trp_consistency` 只掃公開索引。`reviewRequired` 路徑既不會被當成來源，也不會被當成目標——這不是額外防守，是因為它們從未被載入。因此**該範圍內沒有命中，不代表那裡沒有問題**；
非公開部分請用本機的 `crosscheck.py`。兩者的分層規則相同，涵蓋範圍不同。
版本比對與 `trp_resolve` 採同一契約：未帶後綴的 `v1.4` 可指向該基版；
帶後綴的 `v1.4-candidate` 則必須完整相符，不把 draft、seed、candidate 或正式版混為一談。

所有工具都標示 MCP `readOnlyHint`，且固定 corpus 標示 `openWorldHint: false`；沒有寫入工具，也沒有讓呼叫者打開
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
  中文括號內的限定語屬於詞名，例如「脈動」與「脈動（存在視角）」不會混在一起；
  只有末尾的拼音／外語括號會從查找名稱移除。
  詞條正文最多 30,000 字元，超過時在完整行處截斷並標記 `truncated`。
  候選工作稿仍可查到，需一併閱讀版本、狀態與 warnings。
- **待處理只是可觀測訊號。** `candidate` 排除 history 與 Superseded；`unattended`
  僅表示其他公開文件的 metadata `related` 沒有指向該 ID。它以已索引的完整 ID
  辨識逗號清單、標題註解與 Markdown 連結，重疊時取最長宣告；不掃正文引用，
  也不代表人類尚未注意或未曾審讀。
- **出處包含兩個雜湊。** `corpusDigest` 對應公開正文，`manifestDigest` 對應治理規則；
  每次完整核對會重讀公開文件，成本隨語料量增加。

## Phase 0 工具

```bash
python3 tools/trp-mcp/normalize.py                # 產生 index.json + REPORT.md
python3 tools/trp-mcp/normalize.py --report-only  # 只印報告，不寫檔
python3 tools/trp-mcp/backfill_ids.py              # id 補洞 dry-run
python3 tools/trp-mcp/backfill_ids.py --apply      # 通過預檢後才套用
python3 tools/trp-mcp/crosscheck.py                # 跨檔一致性（版本轉述 ＋ 導覽覆蓋）
python3 tools/trp-mcp/crosscheck.py --only coverage # 只跑導覽覆蓋
python3 tools/trp-mcp/crosscheck.py --retention HEAD # 搬遷安全網：被刪的內容行還在不在
python3 tools/trp-mcp/crosscheck.py --verbose      # 連記錄層命中也逐筆列出
python3 tools/trp-mcp/crosscheck.py --strict       # 有 finding 時離開碼 2（pre-commit／CI）
python3 tools/trp-mcp/test_crosscheck.py -v        # crosscheck 回歸測試
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

治理規則一律讀 `CORPUS-MANIFEST.yaml`，不在 server 或文件內手抄語料數量。manifest 缺席、
必要清單為空或 authority 不一致時直接中止（fail closed）。當下的公開索引與
`reviewRequired` 數量以 `trp_manifest` 回傳為準；後者完全不進 MCP。

版本轉述命中分三層輸出：**活導航**（各 README，過期即需修正）、**混合層**（`DOCS/sources/` 的 README 上半是現役導航、下半是不得倒填的來源表，工具分不出來，交人判讀）、**記錄層**（CASE、已封口分冊、session log、快照與審讀帳，預設不動）。不分層的話，真正要修的少數會被大量歷史紀錄淹沒。

離開碼：`0` 正常、`1` 工具或參數錯誤（含無效 git ref）、`2` 有 finding 且加了 `--strict`。輸出一律 UTF-8，不受主控台編碼影響。

`retention` 是文件搬遷專用的安全網。覆蓋檢查只看「邊還在不在」，看不出「內容有沒有
變薄」——把一段判讀壓成一行摘要，覆蓋數不會變，判讀卻沒了。它只比對逐字內容，
因此改寫、壓縮與翻譯都會被回報；那正是要被人看見並確認的情形，不是誤報。

`normalize.py` 的 finding 全是單檔自檢；跨檔一致性由 `crosscheck.py` 分開承擔，
不併進 REPORT.md。兩者都是觀測，不是裁定。轉述層的命中要分兩種讀：活導航檔
（各 README）過期就是過期；append-only 的來源表、session log 與已封口分冊裡的
版本是歷史紀錄，**不該被更新**，工具無法自動分辨，由人判讀。

實測庫內有兩套互不相干的 status 詞彙：生命週期與紀錄狀態。server 保留原文，
不把 `Field-Documentation` 硬塞進 `Active|Draft|Candidate`。同 ID 的雙語文件也
不強行擇一；另外兩份無法安全判定的 ID 文件維持不進公開索引。
