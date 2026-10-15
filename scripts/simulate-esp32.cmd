@echo off
echo =========================================================
echo   ARENA VOICE POC - SIMULADOR DISPARO ESP32 (CADEIRA #1)
echo =========================================================
powershell -NoProfile -Command "try { $res = Invoke-RestMethod -Uri 'http://localhost:5000/api/chair-press' -Method Post -Body '{\"chairId\":1}' -ContentType 'application/json'; Write-Host '>>> SUCESSO: Cadeira #1 enviada!' -ForegroundColor Green; $res | Format-List } catch { Write-Host '>>> FALHA ao contatar backend:' -ForegroundColor Red; Write-Host $_.Exception.Message -ForegroundColor Red }"
echo.
pause
