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
