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

sc.exe query Cloudflared >nul 2>&1
if errorlevel 1 (
    echo [2/2] Starting manual Cloudflare Tunnel...
    echo      Wiki will be live at: https://wiki.three-quarters.net
    echo      Press Ctrl+C to stop the tunnel and go offline.
    echo.
    cloudflared tunnel --url http://localhost:80 run wiki-trp
    exit /b %errorlevel%
)

echo [2/2] Cloudflare Tunnel Windows service detected.
powershell -NoProfile -Command "try { Start-Service Cloudflared -ErrorAction SilentlyContinue | Out-Null } catch {}"
echo      Public routing is handled automatically by the Cloudflared service.
echo      Wiki URL: https://wiki.three-quarters.net
echo      Auth URL: https://auth.three-quarters.net
echo.
echo      Containers are up. You can close this window.
