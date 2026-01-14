<#
.SYNOPSIS
Corrige erro 404 ao atualizar a página no Surge
Sistema Criador de Horário de Aula
© 2025 Wander Pires Silva Coelho
#>

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔧 CORREÇÃO ERRO 404 - Surge SPA                         ║" -ForegroundColor Cyan
Write-Host "║  © 2025 Wander Pires Silva Coelho                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Diretório do projeto
$projectRoot = "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"
$frontendDir = Join-Path $projectRoot "frontend"

Write-Host "✅ Arquivos criados:" -ForegroundColor Green
Write-Host "   - public/200.html (suporte SPA do Surge)" -ForegroundColor White
Write-Host "   - public/404.html (atualizado)" -ForegroundColor White
Write-Host ""

Write-Host "📁 Navegando para o diretório do frontend..." -ForegroundColor Yellow
Set-Location $frontendDir

Write-Host ""
Write-Host "🏗️  Iniciando build do projeto..." -ForegroundColor Yellow
Write-Host ""

# Build do projeto
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no build do projeto!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
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
    Write-Host "2. Crie uma conta" -ForegroundColor White
    Write-Host "3. Execute este script novamente" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ DEPLOY CONCLUÍDO COM SUCESSO!                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs do Sistema:" -ForegroundColor Cyan
Write-Host "   Frontend: https://criador-horario-aula.surge.sh" -ForegroundColor White
Write-Host ""
Write-Host "🔧 O QUE FOI CORRIGIDO:" -ForegroundColor Yellow
Write-Host "   • Criado arquivo 200.html para suporte a SPA" -ForegroundColor White
Write-Host "   • Atualizado 404.html para redirecionamento correto" -ForegroundColor White
Write-Host "   • Agora você pode atualizar a página sem erro 404!" -ForegroundColor White
Write-Host ""
Write-Host "🧪 TESTE AGORA:" -ForegroundColor Cyan
Write-Host "   1. Abra: https://criador-horario-aula.surge.sh" -ForegroundColor White
Write-Host "   2. Navegue para qualquer página (ex: /login)" -ForegroundColor White
Write-Host "   3. Pressione F5 para atualizar" -ForegroundColor White
Write-Host "   4. A página deve carregar normalmente!" -ForegroundColor Green
Write-Host ""
Write-Host "© 2025 Wander Pires Silva Coelho" -ForegroundColor DarkGray
