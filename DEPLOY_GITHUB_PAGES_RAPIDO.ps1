#!/usr/bin/env pwsh
# Deploy rápido do frontend para GitHub Pages
# © 2025 Wander Pires Silva Coelho

Write-Host "`n🚀 DEPLOY FRONTEND - GitHub Pages" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 1. Build do frontend
Write-Host "`n📦 Fazendo build do frontend..." -ForegroundColor Yellow
cd frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído!" -ForegroundColor Green

# 2. Deploy para GitHub Pages
Write-Host "`n🌐 Fazendo deploy para GitHub Pages..." -ForegroundColor Yellow
npx gh-pages -d dist

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no deploy" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "`n🔗 Acesse: https://wanderpsc.github.io/criador-horario-backend" -ForegroundColor Cyan
Write-Host "`nAguarde 1-2 minutos para o GitHub processar o deploy.`n" -ForegroundColor White
