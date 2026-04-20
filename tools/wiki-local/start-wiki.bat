@echo off
title Three Realms Wiki - Online
echo ============================================
echo   Three Realms Protocol Wiki - Starting...
echo ============================================
echo.

echo [1/2] Starting Docker containers...
docker compose -f "%~dp0compose.yaml" up -d
if errorlevel 1 (
    echo.
    echo ERROR: Docker failed to start. Is Docker Desktop running?
    pause
    exit /b 1
)
echo      Containers are up.
echo.

echo [2/2] Starting Cloudflare Tunnel...
echo      Wiki will be live at: https://wiki.three-quarters.net
echo      Press Ctrl+C to stop the tunnel and go offline.
echo.
cloudflared tunnel --url http://localhost:80 run wiki-trp
