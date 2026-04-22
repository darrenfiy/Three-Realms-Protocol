# Wiki Local Handoff

This note captures the durable parts of the `2026-04-20` wiki setup so a future host move does not have to be rediscovered from chat history.

## What Exists Now

- Wiki.js runs on the author's local machine through Docker Desktop, exposed to the public internet via Cloudflare Tunnel.
- Cloudflare Tunnel now runs as a Windows service instead of a foreground terminal process.
- The local stack lives in [`tools/wiki-local/`](./).
- **Public URL**: `https://wiki.three-quarters.net` (HTTPS via Cloudflare, zero-cost).
- **Local URLs**: `http://localhost` and `http://localhost:3000` (still work for local access).
- First starter pages are seedable from repo-owned Markdown files.
- AI editor identities can be recreated locally: `Codex`, `Gemini`, and `Claude Opus`.
- The author's machine IS the server; when it sleeps or the tunnel process stops, the public URL goes offline.

## Stack Files

- `compose.yaml`: local PostgreSQL + Wiki.js stack
- `.env.example`: safe template for another machine
- `.env`: local machine secrets and runtime values
- `add-local-host-alias.ps1`: optional elevated helper that adds `wiki.three-quarters.net` to the local Windows hosts file
- `ensure-identities.ps1`: creates or repairs the local AI editor identities inside Wiki.js
- `seed-pages.ps1`: generates an admin JWT from the running Wiki.js container, then upserts the starter pages through GraphQL and syncs the custom sidebar navigation
- `sync-navigation.ps1`: converts the repo-owned navigation manifest into Wiki.js static navigation through GraphQL
- `manifest/navigation/site-sidebar.yaml`: curated sidebar order / grouping source of truth
- `seed/*.md`: starter page content
- `start-wiki.bat`: one-click launcher — starts Docker containers. If the Cloudflared Windows service exists, public routing is automatic; otherwise it falls back to a manual tunnel.
- `AUTH-GOVERNANCE-DRAFT.md`: future-facing plan for login, registration, groups, and rollout policy

## First-Run Flow On A New Machine

1. Install `WSL2`.
2. Install `Docker Desktop`.
3. Start Docker Desktop and confirm the engine is running.
4. From `tools/wiki-local/`, run `docker compose up -d`.
5. Open `http://localhost` and complete the Wiki.js browser setup wizard.
6. From `tools/wiki-local/`, run `.\ensure-identities.ps1`.
7. From `tools/wiki-local/`, run `.\seed-pages.ps1`.
8. Optional: run `.\add-local-host-alias.ps1` as administrator for a domain-like local URL.
9. Install `cloudflared`: `winget install Cloudflare.cloudflared`
10. Authenticate: `cloudflared tunnel login` (authorize `three-quarters.net` in browser).
11. Create tunnel: `cloudflared tunnel create wiki-trp`
12. Route DNS: `cloudflared tunnel route dns wiki-trp wiki.three-quarters.net`
13. Start tunnel: either rely on the Windows service, or double-click `start-wiki.bat` / run `cloudflared tunnel --url http://localhost:80 run wiki-trp` as a manual fallback.

## Commands

From `tools/wiki-local/`:

```powershell
docker compose up -d
docker compose down
docker compose logs -f
.\ensure-identities.ps1
.\seed-pages.ps1
.\sync-navigation.ps1
.\add-local-host-alias.ps1
```

## Cloudflare Tunnel (public access)

The wiki is exposed to the public internet via Cloudflare Tunnel, so the author's machine acts as the server without opening any router ports.

- **Domain**: `three-quarters.net` DNS managed by Cloudflare (free plan).
- **Nameservers**: `monroe.ns.cloudflare.com` / `toby.ns.cloudflare.com` (changed from Google Domains/Squarespace on 2026-04-20).
- **Tunnel name**: `wiki-trp`
- **Tunnel ID**: `632b5163-d0ee-415a-b05a-605a5a0f8d93`
- **Credentials**: `C:\Users\Administrator\.cloudflared\632b5163-d0ee-415a-b05a-605a5a0f8d93.json`
- **Certificate**: `C:\Users\Administrator\.cloudflared\cert.pem`
- **Public URL**: `https://wiki.three-quarters.net`
- **Local target**: `http://localhost:80` (Wiki.js via Docker)

### Start the tunnel

```powershell
cloudflared tunnel --url http://localhost:80 run wiki-trp
```

If the Windows service is active, tunnel routing survives terminal closures and starts automatically on boot. Manual `cloudflared tunnel --url ...` runs are now only a fallback mode.

### Running as a service

```powershell
cloudflared service install
```

This is now configured on the author machine.

- Service name: `Cloudflared`
- Start type: `Automatic`
- Config file: `C:\Users\Administrator\.cloudflared\config.yml`
- Current service-backed tunnel: `wiki-trp`
- Ingress also covers: `https://auth.three-quarters.net`

The manual launcher still works as a fallback when the service is unavailable on another machine.

## Maintenance Rhythm

- Shared auth dependency note:
  `Three-Quarters-International/IDENTITY/providers/authentik/.env` pins
  `AUTHENTIK_IMAGE_TAG`.
- In the first week of each month, check whether Authentik has a newer stable
  release before rebuilding, migrating, or deliberately changing that pin.

## Durable Caveats

- Wiki.js app config has `host = https://wiki.three-quarters.net`, which now matches the real public URL.
- The Windows hosts file contains `127.0.0.1 wiki.three-quarters.test` (legacy from early setup). This does NOT interfere with the public URL. Do NOT add `wiki.three-quarters.net` to the hosts file — it will bypass Cloudflare and break HTTPS access from this machine.
- DNS for `three-quarters.net` is now managed by Cloudflare. If the main website `www.three-quarters.net` needs DNS records (A, CNAME, etc.), add them in the Cloudflare dashboard, not at Google Domains/Squarespace.
- If Docker CLI reports pipe permission errors from a normal PowerShell session, sign out of Windows once so the `docker-users` group token refreshes. Elevated shells worked during setup.
- The local wiki is intentionally separate from the repo working tree. The repo remains the source of truth; the wiki is the presentation layer.

## Content Layer Split

Do not collapse all wiki-related text into one folder yet.

- `DOCS/wiki/` is the writing layer:
  article drafts, reference-style text, and longer source-oriented materials.
- `tools/wiki-local/seed/` is the deployment layer:
  Markdown pages that `seed-pages.ps1` is expected to install or refresh inside
  Wiki.js.
- the running Wiki.js site is the presentation layer:
  the live browsable result on `wiki.three-quarters.net`.

Current operating rule:

- keep `DOCS/wiki/` and `tools/wiki-local/seed/` separate
- move or adapt content into `seed/` only when it is ready for live wiki use
- do not assume `seed-pages.ps1` imports everything from `DOCS/wiki/`

This split is intentional. It prevents draft materials from being mistaken for
installable wiki pages and keeps future automation options open.

## Why The Seed Script Exists

The browser UI is enough for ad-hoc editing, but it is not the best home for first-time structured setup. `seed-pages.ps1` keeps the initial visible layer reproducible:

- `home`
- `three-realms-protocol`
- `fourth-life`

It also writes those pages through distinct local identities so page history can visibly attribute edits to different AI editors.

If the wiki is rebuilt or migrated, rerunning the script restores that first visible surface quickly.
