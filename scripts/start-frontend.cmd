@echo off
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."
set "ENV_FILE=%REPO_ROOT%\.env"

rem 1. Carregar variaveis do .env caso exista
if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
        set "KEY=%%A"
        set "VAL=%%B"
        for /f "tokens=* delims= " %%K in ("!KEY!") do set "KEY=%%K"
        if "!KEY!"=="NPM_EXE" set "NPM_EXE=!VAL!"
        if "!KEY!"=="NODE_EXE" set "NODE_EXE=!VAL!"
    )
)

rem 2. Adicionar diretorio do NODE_EXE ao PATH se definido
if defined NODE_EXE (
    if exist "!NODE_EXE!" (
        for %%D in ("!NODE_EXE!") do set "NODE_DIR=%%~dpD"
        set "PATH=!NODE_DIR!;%PATH%"
    )
)

rem 3. Resolver executavel npm
set "NPM_CMD="
if defined NPM_EXE (
    if exist "!NPM_EXE!" (
        set "NPM_CMD=!NPM_EXE!"
    )
)

if not defined NPM_CMD (
    where npm >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "NPM_CMD=npm"
    )
)

if not defined NPM_CMD (
    echo.
    echo =========================================================
    echo [ERRO] Node.js / npm nao encontrado!
    echo =========================================================
    echo Certifique-se de que o Node.js esteja no PATH do sistema
    echo ou configure as variaveis NPM_EXE e NODE_EXE no arquivo .env:
    echo.
    echo   NPM_EXE=C:\caminho\para\npm.cmd
    echo   NODE_EXE=C:\caminho\para\node.exe
    echo.
    pause
    exit /b 1
)

echo =========================================================
echo   ARENA VOICE POC - INICIANDO VOICE STUDIO 3D (FRONTEND)
echo =========================================================
echo Executavel: %NPM_CMD%
echo.

call "%NPM_CMD%" --prefix "%REPO_ROOT%\frontend" run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] O frontend encerrou com codigo %ERRORLEVEL%.
)
pause
