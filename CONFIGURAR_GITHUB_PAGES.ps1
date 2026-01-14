#!/usr/bin/env pwsh
# Configurar GitHub Pages corretamente
# © 2025 Wander Pires Silva Coelho

Write-Host "`n🔧 CONFIGURAÇÃO DO GITHUB PAGES" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 1. Verificar branch gh-pages
Write-Host "`n🔍 Verificando branch gh-pages..." -ForegroundColor Yellow
$branches = git branch -a | Select-String "gh-pages"
if ($branches) {
    Write-Host "✅ Branch gh-pages existe" -ForegroundColor Green
    Write-Host $branches -ForegroundColor Gray
} else {
    Write-Host "❌ Branch gh-pages NÃO encontrado!" -ForegroundColor Red
}

# 2. Build do frontend
Write-Host "`n📦 Fazendo build do frontend..." -ForegroundColor Yellow
cd "e:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"

# Limpar dist
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
}

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído!" -ForegroundColor Green

# 3. Verificar arquivos críticos
Write-Host "`n🔍 Verificando arquivos críticos..." -ForegroundColor Yellow
if (!(Test-Path "dist/404.html")) {
    Write-Host "⚠️ 404.html não encontrado, copiando..." -ForegroundColor Yellow
    Copy-Item "public/404.html" "dist/404.html"
}

if (!(Test-Path "dist/.nojekyll")) {
    Write-Host "⚠️ .nojekyll não encontrado, criando..." -ForegroundColor Yellow
    New-Item -Path "dist/.nojekyll" -ItemType File -Force
}

# Verificar CNAME (se tiver domínio customizado)
if (Test-Path "public/CNAME") {
    Copy-Item "public/CNAME" "dist/CNAME"
    Write-Host "✅ CNAME copiado" -ForegroundColor Green
}

Write-Host "✅ Todos os arquivos críticos estão prontos" -ForegroundColor Green

# 4. Fazer deploy forçado
Write-Host "`n🚀 Fazendo deploy FORÇADO para gh-pages..." -ForegroundColor Yellow
Write-Host "   (Isso vai substituir completamente o branch gh-pages)" -ForegroundColor Gray

npx gh-pages -d dist -b gh-pages --dotfiles

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no deploy" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green

# 5. Instruções finais
Write-Host "`n" -ForegroundColor White
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

Write-Host "`n1️⃣ CONFIGURAR NO GITHUB:" -ForegroundColor Yellow
Write-Host "   a) Acesse: https://github.com/Wanderpsc/criador-horario-backend/settings/pages" -ForegroundColor White
Write-Host "   b) Em 'Source', selecione: 'Deploy from a branch'" -ForegroundColor White
Write-Host "   c) Em 'Branch', selecione: 'gh-pages' e '/ (root)'" -ForegroundColor White
Write-Host "   d) Clique em 'Save'" -ForegroundColor White

Write-Host "`n2️⃣ AGUARDE:" -ForegroundColor Yellow
Write-Host "   - 2-3 minutos para o GitHub processar" -ForegroundColor White
Write-Host "   - Uma notificação verde aparecerá com a URL" -ForegroundColor White

Write-Host "`n3️⃣ ACESSE:" -ForegroundColor Yellow
Write-Host "   🔗 https://wanderpsc.github.io/criador-horario-backend" -ForegroundColor Cyan

Write-Host "`n4️⃣ SE AINDA DER 404:" -ForegroundColor Yellow
Write-Host "   - Verifique se o repositório é público" -ForegroundColor White
Write-Host "   - Aguarde mais 5 minutos" -ForegroundColor White
Write-Host "   - Limpe cache do navegador (Ctrl+Shift+R)" -ForegroundColor White

Write-Host "`n💡 DICA:" -ForegroundColor Cyan
Write-Host "   Você pode ver o status do deploy em:" -ForegroundColor White
Write-Host "   https://github.com/Wanderpsc/criador-horario-backend/actions" -ForegroundColor Gray

Write-Host "`n"
