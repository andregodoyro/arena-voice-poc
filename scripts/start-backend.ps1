# =============================================================================
# Arena Voice POC - Iniciar Backend Minimal (.NET 10)
# =============================================================================

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$envFile = Join-Path $repoRoot ".env"

# Funcao auxiliar para carregar variaveis do .env local
function Get-EnvValue([string]$key, [string]$defaultValue = "") {
    if (Test-Path $envFile) {
        foreach ($line in Get-Content $envFile) {
            $trimmed = $line.Trim()
            if ($trimmed -and -not $trimmed.StartsWith("#") -and $trimmed.Contains("=")) {
                $parts = $trimmed.Split("=", 2)
                if ($parts[0].Trim() -eq $key) {
                    $val = $parts[1].Trim().Trim('"').Trim("'")
                    if ($val) { return $val }
                }
            }
        }
    }
    return $defaultValue
}

# 1. Tenta resolver executavel configurado no .env
$dotnet = Get-EnvValue "DOTNET_EXE"

# 2. Fallback: comando no PATH do sistema
if (-not $dotnet -or -not (Test-Path $dotnet)) {
    $cmd = Get-Command "dotnet" -ErrorAction SilentlyContinue
    if ($cmd) {
        $dotnet = $cmd.Source
    }
}

# 3. Validacao final
if (-not $dotnet -or (-not (Test-Path $dotnet) -and -not (Get-Command $dotnet -ErrorAction SilentlyContinue))) {
    Write-Host "`n[ERRO] .NET SDK nao encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de que o .NET SDK esteja instalado no PATH ou configure" -ForegroundColor Yellow
    Write-Host "a variavel DOTNET_EXE no arquivo .env na raiz do repositorio:`n" -ForegroundColor Yellow
    Write-Host "  DOTNET_EXE=C:\caminho\para\dotnet.exe`n" -ForegroundColor Gray
    exit 1
}

$project = Join-Path $repoRoot "backend\ArenaVoicePocBackend.csproj"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ARENA VOICE POC - INICIANDO BACKEND (.NET)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Executavel: $dotnet"
Write-Host " Projeto:    $project`n"

& $dotnet run --project $project
