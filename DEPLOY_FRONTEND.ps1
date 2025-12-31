<#
.SYNOPSIS
Script de Deploy Completo - Frontend
Sistema Criador de Horário de Aula
© 2025 Wander Pires Silva Coelho
#>

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 DEPLOY - Sistema Criador de Horário de Aula          ║" -ForegroundColor Cyan
Write-Host "║  © 2025 Wander Pires Silva Coelho                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Diretório do projeto
$projectRoot = "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"
$frontendDir = Join-Path $projectRoot "frontend"

Write-Host "📁 Navegando para o diretório do frontend..." -ForegroundColor Yellow
Set-Location $frontendDir

Write-Host ""
Write-Host "🏗️  Iniciando build de produção..." -ForegroundColor Yellow
Write-Host ""

# Build do frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no build do frontend!" -ForegroundColor Red
    Write-Host "Verifique os erros acima e tente novamente." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Iniciando deploy no Surge..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Domínio: criador-horario-aula.surge.sh" -ForegroundColor Cyan
Write-Host ""

# Deploy no Surge
surge dist --domain criador-horario-aula.surge.sh

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no deploy!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Se for a primeira vez usando o Surge:" -ForegroundColor Yellow
    Write-Host "1. Execute: surge" -ForegroundColor White
    Write-Host "2. Crie uma conta com seu email" -ForegroundColor White
    Write-Host "3. Execute este script novamente" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🌍 URLs do Sistema:" -ForegroundColor Cyan
Write-Host "   Frontend: https://criador-horario-aula.surge.sh" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Faça deploy do backend (veja GUIA_DEPLOY.md)" -ForegroundColor White
Write-Host "2. Atualize .env.production com a URL do backend" -ForegroundColor White
Write-Host "3. Execute este script novamente para atualizar" -ForegroundColor White
Write-Host ""
Write-Host "📚 Consulte GUIA_DEPLOY.md para instruções completas" -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Abrir no navegador
$abrirNavegador = Read-Host "Deseja abrir o site no navegador? (S/N)"
if ($abrirNavegador -eq "S" -or $abrirNavegador -eq "s") {
    Start-Process "https://criador-horario-aula.surge.sh"
}

Write-Host "✅ Concluído!" -ForegroundColor Green
Write-Host ""
