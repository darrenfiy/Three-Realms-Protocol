# Local Wiki Stack

This folder runs a local Wiki.js instance with PostgreSQL using Docker Desktop.

## What it does

- Starts PostgreSQL for Wiki.js
- Starts Wiki.js on `http://localhost:3000`
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
http://localhost:3000
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

## Notes

- This is a local-first stack for setup and testing.
- If you later publish this under `wiki.three-quarters.net`, we can add a reverse proxy and a real domain flow on top.
