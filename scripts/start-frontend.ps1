# =============================================================================
# Arena Voice POC - Iniciar Voice Studio 3D (Vite Dev Server)
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

# 1. Tenta obter configuracoes do .env
$npm = Get-EnvValue "NPM_EXE"
$node = Get-EnvValue "NODE_EXE"

# Se houver executavel do node especificado, adiciona o diretorio ao PATH da sessao
if ($node -and (Test-Path $node)) {
    $nodeDir = Split-Path $node -Parent
    $env:PATH = "$nodeDir;$env:PATH"
}

# 2. Fallback: procurar no PATH
if (-not $npm -or -not (Test-Path $npm)) {
    $cmd = Get-Command "npm" -ErrorAction SilentlyContinue
    if ($cmd) {
        $npm = $cmd.Source
    }
}

# 3. Validacao final
if (-not $npm -or (-not (Test-Path $npm) -and -not (Get-Command $npm -ErrorAction SilentlyContinue))) {
    Write-Host "`n[ERRO] npm nao encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de que o Node.js / npm estejam instalados no PATH ou configure" -ForegroundColor Yellow
    Write-Host "as variaveis NPM_EXE e NODE_EXE no arquivo .env na raiz do repositorio:`n" -ForegroundColor Yellow
    Write-Host "  NPM_EXE=C:\caminho\para\npm.cmd" -ForegroundColor Gray
    Write-Host "  NODE_EXE=C:\caminho\para\node.exe`n" -ForegroundColor Gray
    exit 1
}

$frontendDir = Join-Path $repoRoot "frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ARENA VOICE POC - INICIANDO VOICE STUDIO 3D (VITE)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Executavel: $npm"
Write-Host " Diretorio:  $frontendDir`n"

& $npm --prefix $frontendDir run dev
