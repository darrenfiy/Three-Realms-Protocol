# tools/trp-mcp

協議庫的檢索層工具。**不是協議。**

依 `CORPUS-MANIFEST.yaml` 的 `exclude: tools/**`，本目錄不進入公開檢索索引，
不具 authority，不得被引用為協議依據。
依 [TRP-ATLAS](../../TRP-ATLAS.md) 屬**風**（循環／跨庫交接／重入），
而 ATLAS 明訂 Wind is not a sixth folder。

| 檔案 | 說明 |
|---|---|
| `DESIGN.md` | MCP 設計草案（`v0.4-draft`，已完成 Codex 技術審讀） |
| `normalize.py` | 語料正規化器。**對協議檔案零寫入。** |
| `REPORT.md` | 由 `normalize.py` 產生的覆蓋率與 finding 報告 |
| `index.json` | 派生索引。已 gitignore，可由任一 commit 重建。 |
| `backfill_ids.py` | id 補洞器。預設 dry-run，`--apply` 才寫檔。只加不改。 |
| `test_trp_mcp.py` | manifest、公開邊界、metadata 與補洞安全性的回歸測試 |

## 用法

```bash
python3 tools/trp-mcp/normalize.py              # 產生 index.json + REPORT.md
python3 tools/trp-mcp/normalize.py --report-only # 只印報告，不寫檔
python3 tools/trp-mcp/backfill_ids.py            # id 補洞 dry-run
python3 tools/trp-mcp/backfill_ids.py --apply    # 通過預檢後才套用
python3 tools/trp-mcp/test_trp_mcp.py -v         # 執行回歸測試
```

Python 3.8+ 標準庫，無 pip 相依（與 `tools/wiki-local/*.py` 慣例一致）。

## 設計約束

- **P1 索引不得成為正本** — 對協議檔案零寫入；索引可單憑 commit 重建
- **P2 寫入走 git** — 本工具不提供任何寫入通道
- **P3 過期就報錯** — Phase 0 記錄 git HEAD、工作樹狀態與 corpus digest；
  MCP 回傳端的 stale 拒答在 Phase 2 實作
- **P4 查不到是合法輸出** — 解析失敗記入報告，不猜測、不填預設值

治理規則一律讀 `CORPUS-MANIFEST.yaml`，不在工具內手抄。
manifest 缺席、必要清單為空或 authority 不一致時，工具直接中止。

## 現況

公開 profile 索引 260 份文件；`reviewRequired` 的 224 份文件暫不索引。
`REPORT.md` 的 27 則 finding 皆為**觀測**，不是裁定；待決項目見報告 §3。
