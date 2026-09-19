# Three Realms Protocol — Claude Code

工作規矩見 **[AGENTS.md](AGENTS.md)**，與其他器官共用一份，本檔不重抄。

本檔只放 Claude Code 這一側的接線：

- `trp-public` MCP 由 [`.mcp.json`](.mcp.json) 以專案範圍設定，指令為 `node tools/trp-mcp/src/server.js`。
  server 由自身檔案位置回推 repo 根，因此相對路徑可用，不必改成本機絕對路徑。
- MCP 只涵蓋公開索引。非公開部分（`DOCS/sources`、`meetings`、`wiki`、`LNS-A01`）
  與 git 歷史請用本機 [`tools/trp-mcp/crosscheck.py`](tools/trp-mcp/crosscheck.py)；
  它與 MCP 的分層規則相同、涵蓋範圍不同。**MCP 沒有命中不代表那裡沒有問題。**

## 搬運文字不要經過我

把一段內容從 A 檔移到 B 檔時，用 Bash 跑腳本直接搬，**不要 Read 進來再 Write 出去**。
內容不必進我的 context，token 與算力都省，而且不會在轉述途中被我改寫。

本庫 2026-09-19～20 的幾次大搬遷（136 行逐案細目、346 行分類樹、572 行 META 樹）
都是這樣做的，搬完以 `crosscheck.py --retention` 驗證逐字無損。

> 早期曾有 `tools/line-operations-server.py` 專做這件事，2026-09-20 移除：它只能
> 檔案內搬移（跨檔才是實際需求），相依的 `mcp` 套件未安裝因而無法啟動，設定中的
> 路徑指向已不存在的使用者，且它需要 pip 相依、與本庫其餘 Python 工具「標準庫、
> 無 pip 相依」的慣例不符。工具移除，但它要解決的問題是真的，作法改為上述腳本。

> 這份檔案刻意保持很薄。同一件事寫在兩個地方，遲早會有一份過期，
> 而且沒有人會發現——這是本庫已經付過學費的失敗模式。
