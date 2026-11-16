@echo off
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."
set "ENV_FILE=%REPO_ROOT%\.env"

rem 1. Carregar configuracoes do .env caso exista
if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
        set "KEY=%%A"
        set "VAL=%%B"
        for /f "tokens=* delims= " %%K in ("!KEY!") do set "KEY=%%K"
        if "!KEY!"=="NODE_EXE" (
            set "NODE_EXE=!VAL!"
        )
        if "!KEY!"=="PG_RESTORE_EXE" (
            set "PG_RESTORE_EXE=!VAL!"
        )
        if "!KEY!"=="PGPASSWORD" (
            set "PGPASSWORD=!VAL!"
        )
    )
)

rem 2. Resolver executavel Node.js
set "NODE_CMD="
if defined NODE_EXE (
    if exist "!NODE_EXE!" (
        set "NODE_CMD=!NODE_EXE!"
    )
)

if not defined NODE_CMD (
    if exist "%REPO_ROOT%\devtools\portable\node\node.exe" (
        set "NODE_CMD=%REPO_ROOT%\devtools\portable\node\node.exe"
    ) else if exist "%REPO_ROOT%\..\devtools\portable\node\node.exe" (
        set "NODE_CMD=%REPO_ROOT%\..\devtools\portable\node\node.exe"
    )
)

if not defined NODE_CMD (
    where node >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "NODE_CMD=node"
    )
)

if not defined NODE_CMD (
    echo.
    echo =========================================================
    echo [ERRO] Node.js nao encontrado!
    echo =========================================================
    echo Configure a variavel NODE_EXE no arquivo .env ou
    echo certifique-se de que o Node.js esteja no PATH do sistema.
    echo =========================================================
    echo.
    exit /b 1
)

rem 3. Executar o engine de Disaster Recovery (restore-backup.cjs)
"!NODE_CMD!" "%REPO_ROOT%\scripts\restore-backup.cjs" %*
exit /b %ERRORLEVEL%
