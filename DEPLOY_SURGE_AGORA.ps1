# Deploy Rápido no Surge
# © 2025 Wander Pires Silva Coelho

Write-Host "🚀 Deploy Rápido EduSync-PRO" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Ir para pasta frontend
Set-Location ".\frontend"

# Fazer deploy direto
Write-Host "📤 Fazendo deploy..." -ForegroundColor Yellow
npx surge dist edusync-pro.surge.sh --token $env:SURGE_TOKEN

Write-Host ""
Write-Host "✅ Deploy concluído!" -ForegroundColor Green
Write-Host "🌐 URL: https://edusync-pro.surge.sh" -ForegroundColor Cyan
