# Inicia o frontend Voice Studio da POC utilizando o Node/npm portatil

$nodeDir = "C:\Users\ANDREROC\Documents\devtools\portable\node"
$npm = "$nodeDir\npm.cmd"
$frontendDir = "$PSScriptRoot\..\frontend"

if (-not (Test-Path $npm)) {
    Write-Error "npm portatil nao encontrado em: $npm"
    exit 1
}

# Injeta o node portatil no PATH da sessao
$env:PATH = "$nodeDir;$env:PATH"

Write-Host "Iniciando Voice Studio 3D (Vite Dev Server)..." -ForegroundColor Cyan
& $npm --prefix $frontendDir run dev
