<#
.SYNOPSIS
Deploy para GitHub Pages com correção SPA
Sistema Criador de Horário de Aula
© 2025 Wander Pires Silva Coelho
#>

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 DEPLOY - GitHub Pages (SPA Fix)                       ║" -ForegroundColor Cyan
Write-Host "║  © 2025 Wander Pires Silva Coelho                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Diretório do projeto
$projectRoot = "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"
$frontendDir = Join-Path $projectRoot "frontend"

Write-Host "✅ Correção aplicada:" -ForegroundColor Green
Write-Host "   - 404.html configurado para GitHub Pages" -ForegroundColor White
Write-Host "   - index.html com redirecionamento correto" -ForegroundColor White
Write-Host "   - Base path: /criador-horario-backend/" -ForegroundColor White
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

Write-Host "🌐 Iniciando deploy no GitHub Pages..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Repositório: wanderpsc/criador-horario-backend" -ForegroundColor Cyan
Write-Host "Branch: gh-pages" -ForegroundColor Cyan
Write-Host ""

# Deploy no GitHub Pages
npm run deploy:github

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no deploy!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "1. O pacote gh-pages está instalado: npm install -D gh-pages" -ForegroundColor White
    Write-Host "2. Você está autenticado no GitHub" -ForegroundColor White
    Write-Host "3. O repositório existe e você tem permissão" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ DEPLOY CONCLUÍDO COM SUCESSO!                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URL do Sistema:" -ForegroundColor Cyan
Write-Host "   https://wanderpsc.github.io/criador-horario-backend/" -ForegroundColor White
Write-Host ""
Write-Host "🔧 O QUE FOI CORRIGIDO:" -ForegroundColor Yellow
Write-Host "   • Configurado 404.html para GitHub Pages SPA" -ForegroundColor White
Write-Host "   • Atualizado index.html com script de redirecionamento" -ForegroundColor White
Write-Host "   • Removido arquivo 200.html (específico do Surge)" -ForegroundColor White
Write-Host "   • Agora você pode atualizar qualquer página sem erro 404!" -ForegroundColor White
Write-Host ""
Write-Host "🧪 TESTE AGORA:" -ForegroundColor Cyan
Write-Host "   1. Aguarde 1-2 minutos para o GitHub Pages processar" -ForegroundColor Yellow
Write-Host "   2. Abra: https://wanderpsc.github.io/criador-horario-backend/" -ForegroundColor White
Write-Host "   3. Navegue para qualquer página (ex: /criador-horario-backend/login)" -ForegroundColor White
Write-Host "   4. Pressione F5 para atualizar" -ForegroundColor White
Write-Host "   5. A página deve carregar normalmente!" -ForegroundColor Green
Write-Host ""
Write-Host "⚙️  CONFIGURAÇÃO DO GITHUB PAGES:" -ForegroundColor Cyan
Write-Host "   1. Vá em: https://github.com/wanderpsc/criador-horario-backend/settings/pages" -ForegroundColor White
Write-Host "   2. Source: Deploy from a branch" -ForegroundColor White
Write-Host "   3. Branch: gh-pages / (root)" -ForegroundColor White
Write-Host "   4. Save" -ForegroundColor White
Write-Host ""
Write-Host "© 2025 Wander Pires Silva Coelho" -ForegroundColor DarkGray
