@echo off
echo =========================================================
echo   ARENA VOICE POC - INICIANDO VOICE STUDIO 3D (FRONTEND)
echo =========================================================
set "PATH=C:\Users\ANDREROC\Documents\devtools\portable\node;%PATH%"
call "C:\Users\ANDREROC\Documents\devtools\portable\node\npm.cmd" --prefix "%~dp0..\frontend" run dev
if %ERRORLEVEL% neq 0 (
    echo [ERRO] O frontend encerrou com erro %ERRORLEVEL%.
)
pause
