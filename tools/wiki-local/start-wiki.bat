@echo off
title Three Realms Wiki - Online
set "WIKI_COMPOSE=%~dp0compose.yaml"
set "AUTH_COMPOSE=%~dp0..\..\..\Three-Quarters-International\IDENTITY\providers\authentik\compose.yaml"
set "ENSURE_TUNNEL=%~dp0..\..\..\Three-Quarters-International\IDENTITY\providers\authentik\ensure-public-tunnel.ps1"

echo ============================================
echo   Three Realms Protocol Wiki - Starting...
echo ============================================
echo.

echo [1/3] Starting shared auth containers...
docker compose -f "%AUTH_COMPOSE%" up -d
if errorlevel 1 (
    echo.
    echo ERROR: Shared auth failed to start. Is Docker Desktop running?
    pause
    exit /b 1
)
echo      Shared auth is up.
echo.

echo [2/3] Waiting for shared auth readiness...
powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; $deadline = (Get-Date).AddMinutes(2); do { try { $response = Invoke-WebRequest -UseBasicParsing http://localhost:9000/-/health/live/ -TimeoutSec 5; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
    echo.
    echo ERROR: Shared auth did not become ready within 2 minutes.
    pause
    exit /b 1
)
echo      Shared auth is responding.
echo.

echo [3/5] Starting wiki containers...
docker compose -f "%WIKI_COMPOSE%" up -d
if errorlevel 1 (
    echo.
    echo ERROR: Wiki failed to start. Is Docker Desktop running?
    pause
    exit /b 1
)
echo      Wiki containers are up.
echo.

echo [4/5] Waiting for wiki readiness...
powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; $deadline = (Get-Date).AddMinutes(2); do { try { $response = Invoke-WebRequest -UseBasicParsing http://localhost -TimeoutSec 5; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
    echo.
    echo ERROR: Wiki did not become ready within 2 minutes.
    pause
    exit /b 1
)
echo      Wiki is responding.
echo.

echo [5/5] Ensuring public tunnel path...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ENSURE_TUNNEL%"
if errorlevel 1 (
    echo.
    echo ERROR: Shared public tunnel failed to start.
    pause
    exit /b 1
)
echo.
echo      Local Wiki URL: http://localhost
echo      Local Auth URL: http://localhost:9000
echo      Wiki URL: https://wiki.three-quarters.net
echo      Auth URL: https://auth.three-quarters.net
echo.
echo      If the public HTTPS URL is stubborn on this machine,
echo      use http://localhost first to confirm the wiki stack is alive.
echo.
echo      Containers are up. You can close this window.
