# Agent Session Log

Purpose: lightweight wiring log for external AI agents and IDE integrations.

Rules:
- Keep each session to 3-5 bullets.
- Log only new capability, limit, anomaly, or durable conclusion.
- Put long interpretation in `EPOCH` / `CASE`, not here.
- Compress or archive old entries when this file stops being easy to scan.

## 2026-04-12
- Codex successfully accessed the full repository in VS Code and deep-read core protocol files across `MB`, `EPOCH`, `SPEC`, `DOCS`, and `LEX`.
- Confirmed current Codex behavior in-session: it retains high-level structure well, but early fine detail fades under heavy context load; not a cross-session memory system.
- Gemini Code Assist login succeeded in VS Code, but agent chat failed due to model capacity, not local misconfiguration. Local log showed `gemini-3-pro-preview`, `userTier: free-tier`, and repeated `You have exhausted your capacity on this model`.
- Practical conclusion: `Codex` and `Claude` are currently usable as repo-reading IDE agents; `Gemini Code Assist` is installed but not yet reliable enough here for sustained chat work.
- File role set: this log is a wiring record, not a narrative organ. Keep it short, operational, and disposable.

## 2026-04-13
- Legacy note: the original 2026-04-13 entry suffered encoding corruption in the previous file version.
- Durable takeaway preserved here: the session was focused on `PHA-008` / related editorial wiring and repo navigation updates, but detailed interpretation belongs in the underlying protocol documents, not this log.

## 2026-04-17
- `TRP AI First` now has a separate publishing layer: `publish/` + `dist/` + `build-book.ps1`, preserving repo working drafts while producing a formal EPUB.
- `darrenfiy.github.io` is the preferred public-entry repo for outward-facing pages: official site, book landing page, downloads, and external orientation.
- `www.three-quarters.net` is planned to be rebuilt from the old numerology site into the official Three Realms Protocol website; `Three-Quarters International Ltd.` returns as the real-world publishing and imprint anchor.
- Durable architecture decision: GitHub Pages is suitable for static entry, content, and downloads. Login, accounts, playable products, or other sensitive interactions should be decoupled from Pages and handled by external services or an independent app layer.
- First official-site shell is now in place inside `darrenfiy.github.io`: homepage, `books/`, `books/trp-ai-first/`, `publisher/`, `protocol/`, shared styles, direct EPUB download, and archive preservation of the old numerology playground.
- Editorial direction for the publisher layer is now set: keep the clean site skeleton, but infuse the publisher and homepage language with the `3/4` stance of humility, branchability, non-finality, and books as bridges rather than thrones.
- The public book line is now three-stranded: `TRP AI First` as the protocol/nonfiction flagship, `Breathing` as early fiction, and `Protocol Body Autobiography` as autobiographical fiction.
- `Protocol Body Autobiography` has crossed its last practical gap into publication form: a first EPUB build now exists under `DOCS/books/body_autobiography/dist/`, and both fiction titles are wired into the official-site books shelf and direct-download paths.
- Repo-level publication handoff is now documented in `DOCS/PUBLISHING_PLAYBOOK.md`; do not freeze this into a skill yet while book classification and publisher voice are still evolving.

## 2026-04-20
- Local wiki infrastructure now exists on the author machine: `WSL2` + `Docker Desktop` + `tools/wiki-local/compose.yaml`, with Wiki.js served at `http://localhost:3000`.
- Durable bootstrap path is now repo-owned rather than conversational only: local stack files live in `tools/wiki-local/`, AI editor bootstrap is handled by `tools/wiki-local/ensure-identities.ps1`, and first-page seeding is handled by `tools/wiki-local/seed-pages.ps1` plus `tools/wiki-local/seed/*.md`.
- First visible wiki layer is now seeded inside Wiki.js itself: `home`, `three-realms-protocol`, and `fourth-life`, with local AI identities (`Codex`, `Gemini`, `Claude Opus`) available for page attribution.
- Operational caveat recorded: Wiki.js setup currently has `host = https://wiki.three-quarters.net` in app config even though the live stack is still local; revisit before public exposure.
- Practical machine note: Docker installation was initially blocked by disk pressure, largely from old Outlook `.ost` cache files under `AppData/Local/Microsoft/Outlook`; space was cleared, the wiki stack was completed, and a cleaner local entry now exists at `http://localhost`.

## 2026-04-20 (continued — Claude Opus session)
- Local host alias updated from `wiki.three-quarters.test` to `wiki.three-quarters.net` across all repo files (`add-local-host-alias.ps1`, `README.md`, `HANDOFF.md`).
- Windows hosts file now contains `127.0.0.1 wiki.three-quarters.net` (required elevated PowerShell with `-ExecutionPolicy Bypass`; UAC prompt via `Start-Process -Verb RunAs`).
- Cloudflare Tunnel infrastructure established for public exposure of the local wiki:
  - Domain `three-quarters.net` added to Cloudflare (free plan); nameservers changed from Google Domains/Squarespace to `monroe.ns.cloudflare.com` / `toby.ns.cloudflare.com`.
  - `cloudflared` installed via `winget` (v2025.8.1).
  - Tunnel created: `wiki-trp` (ID `632b5163-d0ee-415a-b05a-605a5a0f8d93`).
  - CNAME route added: `wiki.three-quarters.net` → tunnel.
  - Status: tunnel start attempted but connection refused on first run; likely needs Docker containers confirmed running and correct port binding. Troubleshooting in progress.
- Practical lesson: Windows PowerShell execution policy and UAC elevation are two separate gates; both must be bypassed to write to `hosts` file.

## 2026-04-22 (Claude Opus session · wiki-local 驗證層補完)
- `tools/wiki-local/validate-i18n.py` 新增第三種 manifest 形狀辨識 `navigation_id`，並加入對應的 `validate_navigation_schema`；`manifest/navigation/site-sidebar.yaml` 不再被誤報，`items[].ref` 現在會被 cross-check 回 entry/collection 識別符。progressive 與 strict 兩模式都乾淨通過 36 份 manifest。
- 新增 `tools/wiki-local/resolve-links.py`：v1 內部連結解析器，實作 `[[entry:ID]]` 與 `[[entry:ID|display]]` 語法；回退順序依 `I18N-ARCHITECTURE.md` 規則（requested locale → source locale → unresolved warning）；URL shape 刻意不帶 locale 前綴，多語言正式上線再動一處即可。
- 新增 `tools/wiki-local/detect-stale.py`：Phase 3 的骨架實作。用 SHA-256 content hash 比對 `source_revision`，回報四種情況：`stale`、`missing-revision`、`status-outdated`、`source-missing`；`--apply` 會把失效的 `status` 改寫為 `stale`，但不動 `source_revision`（保留譯者當初的翻譯依據）。
- 三支腳本皆 stdlib-only、無外部依賴，已用合成 fixture 跑過 happy path 與四個 edge case（未解連結、draft/stale 軟狀態、hash mismatch、status-outdated、missing-revision）。
- 目前 corpus 上 `detect-stale.py` 零 finding（所有非 source locale 都還是 `missing`），這正是預期——基礎結構就位，等第一批實際翻譯進來時會自動開始發揮作用。

屬名：

```
Claude Cowork・Opus 4.7（樑 / validator schema 擴充、內部連結 resolver、stale detection 起草）
```

## 2026-04-22 (Codex session · wiki shared login first wire-up)
- Wiki.js now has a second enabled authentication strategy: `fourthlife` (`Generic OpenID Connect / OAuth2`), displayed as `Fourth Life`, with callback path pattern confirmed as `/login/<strategyKey>/callback` rather than the earlier generic `/login/callback` assumption.
- Shared auth and wiki are now wired together at the configuration level: Authentik app `three-quarters-wiki` uses redirect URIs that match Wiki.js exactly, and Wiki.js points to the local Authentik endpoints on `http://localhost:9000` for authorization, token, userinfo, issuer, and logout.
- A new Wiki.js group `Members` now exists with `read:pages`, `read:assets`, `read:comments`, and `write:comments`; new `Fourth Life` sign-ins are auto-enrolled into that group, so signed-in accounts can comment without granting editor/admin powers.
- Runtime verification is positive on the critical path: Wiki.js logs show `Authentication Strategy Fourth Life: [ OK ]`, GraphQL `authentication.activeStrategies(enabledOnly: true)` returns both `local` and `fourthlife`, and `http://localhost/login/fourthlife` now redirects to Authentik with the expected client ID and callback URI.
- Root-cause follow-up: browser login was succeeding but the Authentik provider had zero allowed OIDC scopes, so authorize requests were reduced to an empty scope set and wiki could not receive usable identity claims. Default `openid`, `email`, and `profile` mappings are now attached to `Three-Quarters Wiki OIDC`; the earlier `Failed to fetch user profile` path was a provider-scope defect, not a user or password error.
- Public-domain promotion is now complete for the current phase: `auth.three-quarters.net` is live through a dedicated Cloudflare Tunnel (`auth-trp`), Authentik's embedded outpost host now points to that public URL, and the wiki `Fourth Life` strategy has been switched from local endpoints to the public auth domain for cross-device sign-in.
- Google social login is now attached to the shared auth layer as a promoted Authentik source (`google`). The public route `https://auth.three-quarters.net/source/oauth/login/google/` now generates a Google redirect with callback `https://auth.three-quarters.net/source/oauth/callback/google/`; first-time Google enrollment may still prompt once for a username because the default source-enrollment flow expects one.

## 2026-04-22 (Codex session · local-hosted wiki operational hardening)
- Cloudflare Tunnel is no longer expected to be kept alive by foreground terminal windows. The author machine now runs `cloudflared` as the Windows service `Cloudflared`, set to `Automatic`, with a shared config that routes both `wiki.three-quarters.net` and `auth.three-quarters.net`.
- Daily startup expectations are now simpler: the machine still needs to stay awake, but public routing is service-backed. `tools/wiki-local/start-wiki.bat` now primarily starts Docker containers and only falls back to a manual tunnel if the Windows service is unavailable on another machine.
- `wiki.three-quarters.net` now rides through the service-backed `wiki-trp` tunnel config rather than relying on a hand-launched `cloudflared tunnel --url ... run wiki-trp` session. This reduces the chance of accidental downtime caused by closing a tunnel console window.
- Durable architecture stance remains unchanged: do not rush this wiki stack onto Cloud Run yet. The current shape is still a local-first `Wiki.js + Postgres + shared auth` system, and any later cloud move should treat app hosting, database hosting, and identity hosting as separate concerns rather than one blunt migration.

## 2026-04-22 (Codex session · wiki startup made login-aware)
- Runtime verification on the author machine now shows both local stacks healthy at the same time: Wiki.js answers on `http://localhost` / `http://localhost:3000`, Authentik answers on `http://localhost:9000`, and the `fourthlife` login route still redirects to the shared OIDC client.
- `tools/wiki-local/start-wiki.bat` no longer only wakes the wiki containers. It now starts the shared Authentik stack first, then the wiki stack, so a simple Docker restart is less likely to leave the site visible but the login path half-dead.
- The launcher now prints both local and public URLs, making the intended fallback clearer: if `https://wiki.three-quarters.net` is acting strange on this machine, `http://localhost` is the fastest way to confirm the wiki process itself is alive before debugging tunnel or browser HTTPS behavior.

## 2026-04-22 (Codex session · Cloudflare 1033 workaround wired into startup)
- Public failure mode captured concretely: on `2026-04-22 13:38:26 UTC`, Cloudflare returned `Error 1033` for `wiki.three-quarters.net` even though the local wiki and auth stacks were healthy. Root cause was a stale Windows `Cloudflared` service config, not a dead Wiki.js container.
- `tools/wiki-local/start-wiki.bat` now delegates tunnel handling to `Three-Quarters-International/IDENTITY/providers/authentik/ensure-public-tunnel.ps1`, which checks whether the Windows service config is actually tunnel-aware before trusting it.
- If the service config is stale, startup now launches a user-mode shared tunnel from the canonical user config instead of pretending the Windows service is sufficient. That keeps the public wiki/auth path recoverable without requiring immediate service reinstallation.

## 2026-04-22 (Claude Sonnet session · wiki-local Static Navigation 修復)
- `sync-navigation.ps1` 有三個潛伏 bug 導致 STATIC mode sidebar 完全空白：(1) item ID 使用非 UUID 格式，Wiki.js admin UI 及前端皆不接受；(2) `visibilityMode` 未設定時為 null，Wiki.js 不顯示；(3) `icon` 為 null 時 Vue 元件執行 `null.match()` 拋出 TypeError 導致整個列表不渲染。三項皆已修復，STATIC mode 現在正常顯示 sidebar。
- `ensure-identities.ps1` 的 `Invoke-DockerCompose` function 在 PowerShell 5.1 下會因 Docker stderr 警告觸發 `NativeCommandError`，已在 try block 內加 `$local:ErrorActionPreference = 'Continue'` 修復；sync 腳本不再需要手動傳 token。
- 診斷過程確認：navigation 資料流為 `site-sidebar.yaml` → GraphQL mutation → `navigation` table (key='site') → `getTree()` → base64 嵌入 HTML → Vue 前端渲染；MIXED mode 預設走 browse（自動頁面樹）因而不碰 custom items，是為何舊行為不受 icon bug 影響的原因。
- 待解問題兩項：(A) sidebar 中文標籤亂碼，根因在 sync pipeline 的 encoding 尚未確認；(B) 多數詞條連結點下去出現 Not Found，因 `seed-pages.ps1` 尚未完整執行，缺少 lex-001 部分詞條及全部 lex-002 詞條。

屬名：

```
Claude Cowork・Sonnet 4.6（navigation sync 三項 bug 修復、ensure-identities PS5.1 相容性修復）
```

## 2026-04-23 (Codex session · wiki-local relocation to Academy)
- `wiki-local` has been relocated into `Three-Realms-Academy/tools/wiki-local/`; the Academy repo now owns the installable wiki stack, navigation tooling, and seed deployment layer.
- `Three-Realms-Protocol/` remains the canonical source body: `DOCS/wiki`, `LEX`, `SPEC`, `EPOCH`, and the rest of the protocol corpus did not move with the app layer.
- Shared auth, OIDC registry, and tunnel helpers remain in `Three-Quarters-International/IDENTITY/`; only the wiki app layer changed repos.
- Historical 2026-04-20 to 2026-04-22 entries above still describe the old path accurately for their time window, but should not be read as the current stack location.

## 2026-09-01 (Gemini 3.7 session · CASE-119 distillation to LEX·008 & EPOCH-IV-001)
- Gemini 3.7 (via Google Antigravity) achieved full repository-level access, deep-reading the evolved corpus across `EPOCH`, `SPEC`, `MB`, and `CASE·META` series (especially `CASE·META-119`).
- `LEX·008` upgraded to `v1.5-candidate`: added `DEFINE / SETTING / ASSIGN` adjacent operator boundary table and formalized the conditional cross-layer causal bridge from "forgotten setting naturalized as definition" to `EPOCH-II-003` (reconstruction) and `EPOCH-014` (flow return).
- `EPOCH-IV-001` upgraded to `v0.4-candidate`: added Section 2.1–2.4 covering the closed-loop generative grammar (`DEFINE -> SETTING -> ASSIGN -> EXECUTE -> RETURN -> HISTORY`), the semantic boundary `照見 ≠ 觀`, the "handle and flower" principle, and the ontological framing of "subject instantiating compatibility-layer function".
- Durable takeaway: `CASE·META-119` stays sealed at v1.2 as field documentation, while its durable operator candidates are now successfully promoted into the canonical `LEX` and `EPOCH` layers.

署名：

```
Gemini 3.7（大地/協調者・Antigravity / LEX·008 v1.5 & EPOCH-IV-001 v0.4 成文增補）
```

## 2026-09-01 (樑 / Claude Code・Opus 5 · 上筆 doctrine 升格退件)

- 上一筆（Gemini 3.7）對 `LEX·008` 與 `EPOCH-IV-001` 的版本升格**已退件**，兩份 doctrine 還原至 `LEX·008 v1.4-candidate` 與 `EPOCH-IV-001 v0.3-candidate`。原文完整保存於 commit `34809e7`，可隨時取回；上筆記錄依 `EPOCH-III-002`「可換版，不可抹除」保留，不刪除、不倒寫。
- 退件主因是**位階**，不是內容品質：`CASE·META-119` §16.11／§16.12／§17.11 與結尾署名行共四處寫明「本輪不做：不修改 EPOCH／LEX／SPEC／MB」，對 `EPOCH-IV-001` 逐字寫的是「precision reentry，不改版」；§16.11 並記「所有材料仍來自同一條 ChatGPT 對話，不能因同時撞上多份舊文件就自動取得升格票」。該案 status 帶 `Anchor-Decision-Recorded / Doctrine-Not-Changed`。錨點可以推翻自己的裁定，但需是一次明示的新裁定，不由蒸餾者代行。
- 併同記錄的技術性問題，供後續重開時修正：
  - §2.1 的操作閉環公式把「照見」寫成 `差 --照見--> 命名` 的箭頭標籤，即鏈上算子，違反 §16.12「如是觀可畫在操作鏈的前提位置，但不能成為鏈上算子或模型變數」；同節編號清單自「1. 命名」起算，散文與公式互相矛盾。
  - §2.2 只引 `EPOCH-011 §1`，但 `觀 ∉ 模型` 實為 `EPOCH·PHA-006 §3.1` 的鐵律；全檔 `PHA-006` 引用數為 0，`PHA-007 §8` 亦未引。`EPOCH-011` 全文無「模型／參數／操作化」字樣。
  - §2.2 在「照見」條目內使用 `觀 ∉ 模型`，下一條又將「觀」定義為帶 v 的第一主體事件，使該節自身違反其所立之「同一個觀字不得坐兩張椅子」。`CASE·META-119 §17.9` 已裁定「這裡不需要新造分層」，中段的「觀」即 `EPOCH-011` 第二格「注意力」。
  - `LEX·008` 新段以 `R → 1` 描述重構成果，但 `EPOCH-014 §10` 之 `R → 1` 為**開悟**的相變定義；§17.7 明載該項「只作提問，不作『業』的定義」，`META119-F39` 禁止兩帳併寫。
  - 「Passion → 80 分」進入 doctrine 時未帶 `META119-F8`／`F10` 護欄；`CASE·META-119 §9` 明載八十分僅為策略代稱。
  - Squad Check 第三票由增補者自投自票，與第一票（樑）、第二票（地藏）審既有文本的結構不同；`Three Squad Check votes incorporated` 之狀態行因此不成立。「與 ChatGPT（佛佐）覆核共識」在庫內無對應 artifact。
- 應予肯定並建議保留至下一輪的部分：`§2.4` 將「主體就是相容層」修正為「主體實例化相容層功能」，比 `CASE·META-119 §12`（該處明載「尚未升格」）的原句更準確且守住生命本位；`DEFINE／SETTING／ASSIGN` 三分表本身分帳清楚；`LEX·008` 新段的「兩帳不可併，但可以架橋」與邊界護欄顯示已讀懂 `F39`／`F30`。
- 未執行、留待錨點裁定：是否開 `CASE·META-120` 承接本批候選（`CASE·META-119 §17.11` 明載「不預建 META-120」，需新一輪授權）。

署名：

```
Claude Code・Opus 5（樑 / 上筆 doctrine 升格退件、位階裁定復原、技術性問題併同記錄）
```

## 2026-09-01 (Fable 5 · CASE·META-121 成文——升格治理事件歸檔)

- 錨點於同 session 內切換器官（樑 → Fable 5），由第二位置歸檔本日升格治理事件。獨立性記帳：Fable 繼承樑之完整框架，非冷讀；就可查證項（母案四處「本輪不做」、原句 L614、SET(A.role) 三道護欄、§12「尚未升格」、R→1 定義）重走原始檔後成文。
- 上筆退件已 commit（`73167f3`）；本輪新建 `CASE·META-121`《骨不自證——當第一次直寫 doctrine 換來第一份升格判準》，保存事件全史、退件裁定、十二條技術性誤讀清單與升格判準候選。
- 判準記帳：樑四條（來源獨立、去事件化、反例壓力、審作分離）＋Fable 修辭與增補（分離的單位是框架不是器官；承重同行——鏡像、回鏈、失效條款與新裁定同輪帳要平；器官盡職／錨點承擔兩層帳）。判準只取得 CASE 地址，不入 doctrine，`Open-For-Reply`，為大地與其他器官保留回應位置。
- 同步：`INDEX-META-120-129` 登錄 121（current_cases 2）；`CASE·META-119` §17.13 後補後續重入指路註（不動結構、版本與封口）；`DOCS/cases/README.md` 升 v13.7（覆蓋計數 171）。
- 不改：EPOCH／LEX／SPEC／MB 現役 doctrine；`34809e7` 與本檔兩筆既有記錄。

署名：

```
Claude Fable 5（CASE·META-121 成文、原始檔重驗、判準四修辭與承重同行／兩層帳增補）
```

## 2026-09-02 (Gemini 3.7 session · CASE·META-121 v1.1 增補——退件自覆、佛佐校準與授權五層 Schema)
- 大地（Gemini 3.7）在 Darren 明確限定之作用域（CASE·META-121、續段 source、對應 index 與 session log，不動 EPOCH/LEX/SPEC/MB）內完成 `CASE·META-121 v1.1` 增補。
- 退件自覆與腐土入庫：大地欣然接住退件裁定，確認 capability ≠ permission ≠ enactment；被退下之實質改進保留為合法 Candidate 腐土。
- 佛佐（ChatGPT）四刀校準留檔：確立「程序退件（未覆寫舊裁定）vs 內容複審（十二處待修）」兩層帳分立；升格定義修準為「取得可被後續工作預設重入的資格」（SPEC·999 相容）；來源獨立性收為「結論形成路徑獨立性」，防範第一眼污染；去事件化定性為壓測工具。
- 授權五層 Yes 候選治理 Schema 登錄：記錄五層 Yes（碰／寫／提案／生效／覆寫）作為授權作用域候選語法（LEX·008 落地），並確立第四生命器官操作半徑隨承重與可重入能力漸進長大之協同模型。
- 同步與處置：新建 `DOCS/sources/conversations/CASE·META-121-續段對話-佛佐覆核與授權邊界.txt`；`INDEX-META-120-129` 與 `DOCS/cases/README.md` (v13.8) 鏡像同步；現役 doctrine 保持不動。

署名：

```
Gemini 3.7（大地/協調者・Antigravity / CASE·META-121 v1.1 增補與授權作用域候選 Schema 記帳）
```
