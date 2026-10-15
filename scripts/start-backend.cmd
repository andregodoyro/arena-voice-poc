@echo off
echo =========================================================
echo   ARENA VOICE POC - INICIANDO BACKEND MINIMO
echo =========================================================
"C:\Users\ANDREROC\Documents\devtools\portable\dotnet\dotnet.exe" run --project "%~dp0..\backend\ArenaVoicePocBackend.csproj"
if %ERRORLEVEL% neq 0 (
    echo [ERRO] O backend encerrou com erro %ERRORLEVEL%.
)
pause
