@echo off
setlocal enabledelayedexpansion

set "CHAIR_ID=%~1"
if not defined CHAIR_ID set "CHAIR_ID=1"

set "REPO_ROOT=%~dp0.."
set "ENV_FILE=%REPO_ROOT%\.env"
set "BACKEND_URL="

if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
        set "KEY=%%A"
        set "VAL=%%B"
        for /f "tokens=* delims= " %%K in ("!KEY!") do set "KEY=%%K"
        if "!KEY!"=="VITE_BACKEND_URL" (
            set "BACKEND_URL=!VAL!"
        )
    )
)

if not defined BACKEND_URL set "BACKEND_URL=http://localhost:5000"

echo =========================================================
echo   ARENA VOICE POC - SIMULADOR DISPARO ESP32 (CADEIRA #%CHAIR_ID%)
echo =========================================================
echo Destino: %BACKEND_URL%/api/chair-press
echo Cadeira: #%CHAIR_ID%
echo.

powershell -NoProfile -Command "try { $res = Invoke-RestMethod -Uri '%BACKEND_URL%/api/chair-press' -Method Post -Body '{\"chairId\":%CHAIR_ID%}' -ContentType 'application/json'; Write-Host '>>> SUCESSO: Cadeira #%CHAIR_ID% acionada com sucesso!' -ForegroundColor Green; $res | Format-List } catch { Write-Host '>>> FALHA ao contatar backend:' -ForegroundColor Red; Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
echo.
pause
