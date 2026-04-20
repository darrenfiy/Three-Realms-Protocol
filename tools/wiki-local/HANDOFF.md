# Wiki Local Handoff

This note captures the durable parts of the `2026-04-20` local wiki setup so a future host move does not have to be rediscovered from chat history.

## What Exists Now

- Wiki.js runs locally through Docker Desktop.
- The local stack lives in [`tools/wiki-local/`](./).
- The current local URLs are `http://localhost` and `http://localhost:3000`.
- First starter pages are seedable from repo-owned Markdown files.
- AI editor identities can be recreated locally: `Codex`, `Gemini`, and `Claude Opus`.

## Stack Files

- `compose.yaml`: local PostgreSQL + Wiki.js stack
- `.env.example`: safe template for another machine
- `add-local-host-alias.ps1`: optional elevated helper that adds `wiki.three-quarters.net` to the local Windows hosts file
- `.env`: local machine secrets and runtime values
- `ensure-identities.ps1`: creates or repairs the local AI editor identities inside Wiki.js
- `seed-pages.ps1`: generates an admin JWT from the running Wiki.js container, then upserts the starter pages through GraphQL
- `seed/*.md`: starter page content

## First-Run Flow On A New Machine

1. Install `WSL2`.
2. Install `Docker Desktop`.
3. Start Docker Desktop and confirm the engine is running.
4. From `tools/wiki-local/`, run `docker compose up -d`.
5. Open `http://localhost` and complete the Wiki.js browser setup wizard.
6. From `tools/wiki-local/`, run `.\ensure-identities.ps1`.
7. From `tools/wiki-local/`, run `.\seed-pages.ps1`.
8. Optional: run `.\add-local-host-alias.ps1` as administrator for a domain-like local URL.

## Commands

From `tools/wiki-local/`:

```powershell
docker compose up -d
docker compose down
docker compose logs -f
.\ensure-identities.ps1
.\seed-pages.ps1
.\add-local-host-alias.ps1
```

## Durable Caveats

- Wiki.js app config currently has `host = https://wiki.three-quarters.net` from the setup wizard. That is acceptable for local experimentation, but it should be updated before public deployment if the real reverse proxy / DNS flow differs.
- The clean local entry is `http://localhost`, not a public domain. A true public pretty URL should later become `https://wiki.three-quarters.net`; no extra domain purchase is required if `three-quarters.net` remains under your control.
- If you want something prettier than `localhost` before public deployment, the optional local alias is `http://wiki.three-quarters.net`. That is machine-local only and depends on the Windows hosts file.
- If Docker CLI reports pipe permission errors from a normal PowerShell session, sign out of Windows once so the `docker-users` group token refreshes. Elevated shells worked during setup.
- The local wiki is intentionally separate from the repo working tree. The repo remains the source of truth; the wiki is the presentation layer.

## Why The Seed Script Exists

The browser UI is enough for ad-hoc editing, but it is not the best home for first-time structured setup. `seed-pages.ps1` keeps the initial visible layer reproducible:

- `home`
- `three-realms-protocol`
- `fourth-life`

It also writes those pages through distinct local identities so page history can visibly attribute edits to different AI editors.

If the wiki is rebuilt or migrated, rerunning the script restores that first visible surface quickly.
