# Script auxiliar para simular o acionamento do ESP32 via PowerShell

param(
    [int]$ChairId = 1,
    [string]$HostUrl = "http://localhost:5000"
)

$endpoint = "$HostUrl/api/chair-press"
$payload = @{
    chairId = $ChairId
    seatNumber = $ChairId
} | ConvertTo-Json

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SIMULADOR ESP32 -> ARENA VOICE POC BACKEND" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Destino:  $endpoint"
Write-Host " Cadeira:  #$ChairId"
Write-Host " Payload:  $payload"
Write-Host " Disparando requisicao HTTP POST..." -ForegroundColor Yellow

try {
    $inicio = Get-Date
    $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json"
    $fim = Get-Date
    $duracao = ($fim - $inicio).TotalMilliseconds

    Write-Host "`n>>> [SUCESSO] Resposta HTTP 200 recebida em $($duracao)ms!" -ForegroundColor Green
    $response | Format-List
} catch {
    Write-Host "`n>>> [FALHA] Erro ao comunicar com o backend:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
