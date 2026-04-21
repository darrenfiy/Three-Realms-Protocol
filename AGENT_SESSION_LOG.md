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
