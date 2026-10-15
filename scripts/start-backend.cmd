@echo off
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."
set "ENV_FILE=%REPO_ROOT%\.env"

rem 1. Carregar DOTNET_EXE do .env caso exista
if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
        set "KEY=%%A"
        set "VAL=%%B"
        for /f "tokens=* delims= " %%K in ("!KEY!") do set "KEY=%%K"
        if "!KEY!"=="DOTNET_EXE" (
            set "DOTNET_EXE=!VAL!"
        )
    )
)

rem 2. Resolver executavel dotnet
set "DOTNET_CMD="
if defined DOTNET_EXE (
    if exist "!DOTNET_EXE!" (
        set "DOTNET_CMD=!DOTNET_EXE!"
    )
)

if not defined DOTNET_CMD (
    where dotnet >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "DOTNET_CMD=dotnet"
    )
)

if not defined DOTNET_CMD (
    echo.
    echo =========================================================
    echo [ERRO] .NET SDK nao encontrado!
    echo =========================================================
    echo Certifique-se de que o .NET SDK esteja no PATH do sistema
    echo ou configure a variavel DOTNET_EXE no arquivo .env:
    echo.
    echo   DOTNET_EXE=C:\caminho\para\dotnet.exe
    echo.
    pause
    exit /b 1
)

echo =========================================================
echo   ARENA VOICE POC - INICIANDO BACKEND (.NET)
echo =========================================================
echo Executavel: %DOTNET_CMD%
echo.

"%DOTNET_CMD%" run --project "%REPO_ROOT%\backend\ArenaVoicePocBackend.csproj"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] O backend encerrou com codigo %ERRORLEVEL%.
)
pause
