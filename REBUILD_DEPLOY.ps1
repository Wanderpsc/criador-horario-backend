#!/usr/bin/env pwsh
# Script para limpar cache e rebuild completo
# © 2025 Wander Pires Silva Coelho

Write-Host "`n🔄 LIMPEZA E REBUILD COMPLETO" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 1. Limpar dist
Write-Host "`n🗑️ Limpando pasta dist..." -ForegroundColor Yellow
cd "e:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"

if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "✅ Pasta dist removida" -ForegroundColor Green
}

# 2. Build em produção
Write-Host "`n📦 Fazendo build em modo produção..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído!" -ForegroundColor Green

# 3. Verificar se 404.html foi copiado
Write-Host "`n🔍 Verificando arquivos críticos..." -ForegroundColor Yellow
if (Test-Path "dist/404.html") {
    Write-Host "✅ 404.html presente" -ForegroundColor Green
} else {
    Write-Host "❌ 404.html NÃO encontrado!" -ForegroundColor Red
    Copy-Item "public/404.html" "dist/404.html"
    Write-Host "✅ 404.html copiado manualmente" -ForegroundColor Green
}

if (Test-Path "dist/.nojekyll") {
    Write-Host "✅ .nojekyll presente" -ForegroundColor Green
} else {
    Write-Host "⚠️ .nojekyll não encontrado, criando..." -ForegroundColor Yellow
    New-Item -Path "dist/.nojekyll" -ItemType File
    Write-Host "✅ .nojekyll criado" -ForegroundColor Green
}

# 4. Verificar conteúdo do index.html
Write-Host "`n🔍 Verificando API URL no build..." -ForegroundColor Yellow
$indexContent = Get-Content "dist/index.html" -Raw
if ($indexContent -match "criador-horario-backend-1.onrender.com") {
    Write-Host "✅ API URL correta no build!" -ForegroundColor Green
} else {
    Write-Host "⚠️ API URL pode estar incorreta" -ForegroundColor Yellow
}

# 5. Listar arquivos gerados
Write-Host "`n📁 Arquivos no dist:" -ForegroundColor Cyan
Get-ChildItem dist -Recurse -File | Select-Object Name, Length | Format-Table -AutoSize

# 6. Deploy
Write-Host "`n🚀 Fazendo deploy para GitHub Pages..." -ForegroundColor Yellow
npx gh-pages -d dist --remove-existing

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no deploy" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "`n📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Aguarde 1-2 minutos para GitHub processar" -ForegroundColor White
Write-Host "2. Limpe o cache do navegador (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "3. Acesse: https://wanderpsc.github.io/criador-horario-backend" -ForegroundColor Cyan
Write-Host "`n💡 Se ainda der erro 404:" -ForegroundColor Yellow
Write-Host "   - Abra o DevTools (F12)" -ForegroundColor White
Write-Host "   - Vá em 'Application' > 'Clear storage'" -ForegroundColor White
Write-Host "   - Clique em 'Clear site data'" -ForegroundColor White
Write-Host "   - Recarregue a página (F5)" -ForegroundColor White
Write-Host "`n"
