# Inicia o backend da POC utilizando o dotnet portatil de devtools

$dotnet = "C:\Users\ANDREROC\Documents\devtools\portable\dotnet\dotnet.exe"
$project = "$PSScriptRoot\..\backend\ArenaVoicePocBackend.csproj"

if (-not (Test-Path $dotnet)) {
    Write-Error "Dotnet portatil nao encontrado em: $dotnet"
    exit 1
}

Write-Host "Iniciando Arena Voice POC Backend..." -ForegroundColor Cyan
& $dotnet run --project $project
