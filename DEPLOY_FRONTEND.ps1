param(
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "DEPLOY FRONTEND - Sistema Criador de Horario" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $projectRoot "frontend"

if (-not (Test-Path $frontendDir)) {
    Write-Host "ERRO: pasta frontend nao encontrada em: $frontendDir" -ForegroundColor Red
    exit 1
}

Write-Host "Navegando para: $frontendDir" -ForegroundColor Yellow
Set-Location $frontendDir

Write-Host ""
Write-Host "Executando build de producao..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "" 
    Write-Host "ERRO: falha no build do frontend." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "dist")) {
    Write-Host "ERRO: pasta dist nao foi gerada." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Publicando no Surge..." -ForegroundColor Yellow
surge dist --domain criador-horario-aula.surge.sh
if ($LASTEXITCODE -ne 0) {
    Write-Host "" 
    Write-Host "ERRO: falha no deploy do Surge." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploy concluido com sucesso!" -ForegroundColor Green
Write-Host "Frontend: https://criador-horario-aula.surge.sh" -ForegroundColor Green

if ($OpenBrowser) {
    Start-Process "https://criador-horario-aula.surge.sh"
}
