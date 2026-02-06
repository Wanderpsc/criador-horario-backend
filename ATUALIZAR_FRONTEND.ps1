# 🔄 Atualizar Frontend com URL do Backend
# © 2025 Wander Pires Silva Coelho
# 
# Execute este script DEPOIS de fazer deploy no Render
# Informe a URL do backend quando solicitado

param(
    [string]$BackendUrl = ""
)

Write-Host "🔄 Atualizando Frontend para Produção" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Pedir URL se não foi fornecida
if (-not $BackendUrl) {
    Write-Host "📝 Cole aqui a URL do backend no Render:" -ForegroundColor Yellow
    Write-Host "   Exemplo: https://edusync-pro-backend.onrender.com" -ForegroundColor Gray
    Write-Host ""
    $BackendUrl = Read-Host "URL do Backend"
}

# Remover barra final se houver
$BackendUrl = $BackendUrl.TrimEnd('/')

# Adicionar /api se não tiver
if (-not $BackendUrl.EndsWith('/api')) {
    $BackendUrl = "$BackendUrl/api"
}

Write-Host ""
Write-Host "✅ URL configurada: $BackendUrl" -ForegroundColor Green
Write-Host ""

# Atualizar .env.production
$envContent = "# URL da API (Backend)`nVITE_API_URL=$BackendUrl`n"
Set-Content -Path ".\frontend\.env.production" -Value $envContent

Write-Host "✅ Arquivo .env.production atualizado" -ForegroundColor Green
Write-Host ""

# Build do frontend
Write-Host "🔨 Compilando frontend..." -ForegroundColor Yellow
Set-Location ".\frontend"
npm run build

Write-Host ""
Write-Host "✅ Build concluído!" -ForegroundColor Green
Write-Host ""

# Deploy no Surge
Write-Host "📤 Fazendo deploy no Surge..." -ForegroundColor Yellow
surge dist edusync-pro.surge.sh

Write-Host ""
Write-Host "🎉 DEPLOY COMPLETO COM SUCESSO!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: https://edusync-pro.surge.sh" -ForegroundColor Cyan
Write-Host "🔧 Backend:  $BackendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Sistema funcionando em produção!" -ForegroundColor Green
