# =============================================================================
# Arena Voice POC - Simulador Disparo ESP32
# =============================================================================

param(
    [int]$ChairId = 1,
    [string]$HostUrl = ""
)

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$envFile = Join-Path $repoRoot ".env"

if (-not $HostUrl) {
    if (Test-Path $envFile) {
        foreach ($line in Get-Content $envFile) {
            $trimmed = $line.Trim()
            if ($trimmed -and -not $trimmed.StartsWith("#") -and $trimmed.Contains("=")) {
                $parts = $trimmed.Split("=", 2)
                if ($parts[0].Trim() -eq "VITE_BACKEND_URL") {
                    $val = $parts[1].Trim().Trim('"').Trim("'")
                    if ($val) { $HostUrl = $val }
                }
            }
        }
    }
}

if (-not $HostUrl) {
    $HostUrl = "http://localhost:5000"
}

$HostUrl = $HostUrl.TrimEnd('/')
$endpoint = "$HostUrl/api/chair-press"
$payload = @{
    chairId = $ChairId
} | ConvertTo-Json

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ARENA VOICE POC - SIMULADOR DISPARO ESP32" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Destino:  $endpoint"
Write-Host " Cadeira:  #$ChairId"
Write-Host " Payload:  $payload"
Write-Host " Disparando requisicao HTTP POST..." -ForegroundColor Yellow

try {
    $inicio = Get-Date
    $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json"
    $fim = Get-Date
    $duracao = [math]::Round(($fim - $inicio).TotalMilliseconds, 2)

    Write-Host "`n>>> [SUCESSO] Resposta HTTP 200 recebida em $($duracao)ms!" -ForegroundColor Green
    $response | Format-List
} catch {
    Write-Host "`n>>> [FALHA] Erro ao comunicar com o backend:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
