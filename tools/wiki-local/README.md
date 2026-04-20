# Local Wiki Stack

This folder runs a local Wiki.js instance with PostgreSQL using Docker Desktop.

## What it does

- Starts PostgreSQL for Wiki.js
- Starts Wiki.js on `http://localhost:3000`
- Also exposes a cleaner local entry at `http://localhost`
- Keeps data in a Docker volume named `wikijs-db`

## Files

- `compose.yaml`: Docker Compose stack
- `.env`: local runtime settings for this machine
- `.env.example`: safe template for future machines

## First start

From this folder:

```powershell
docker compose up -d
```

Then open:

```text
http://localhost
```

Wiki.js stable 2.x uses a browser setup wizard on first launch.
You will create the site title and the first admin account there.

## Useful commands

Start or update:

```powershell
docker compose up -d
```

Stop:

```powershell
docker compose down
```

See logs:

```powershell
docker compose logs -f
```

Seed or refresh the starter pages after browser setup:

```powershell
.\ensure-identities.ps1
.\seed-pages.ps1
```

Optional local alias (run elevated once):

```powershell
.\add-local-host-alias.ps1
```

## Notes

- This is a local-first stack for setup and testing.
- If you later publish this under `wiki.three-quarters.net`, we can add a reverse proxy and a real domain flow on top.
- `http://localhost` is the clean local entry. `http://localhost:3000` remains available as the direct port binding.
- If you want a domain-like local address on this machine, add the optional alias script and use `http://wiki.three-quarters.net`.
- Seed content lives in `seed/` and can be replayed with `seed-pages.ps1`.
- AI editor identities are bootstrapped by `ensure-identities.ps1` and currently include `Codex`, `Gemini`, and `Claude Opus`.
- See [HANDOFF.md](./HANDOFF.md) for the durable migration/setup note from the first local install.
