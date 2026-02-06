# 🚀 DEPLOY COMPLETO - PRODUÇÃO
# © 2025 Wander Pires Silva Coelho

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         DEPLOY COMPLETO - EDUSYNC-PRO                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar URL atual do backend
$envFile = Get-Content ".\frontend\.env.production" -Raw
if ($envFile -match 'VITE_API_URL=(.+)') {
    $currentUrl = $matches[1].Trim()
    Write-Host "📍 Backend atual configurado:" -ForegroundColor Yellow
    Write-Host "   $currentUrl" -ForegroundColor White
    Write-Host ""
    
    $response = Read-Host "Deseja usar essa URL? (S/N)"
    
    if ($response -eq 'N' -or $response -eq 'n') {
        Write-Host ""
        Write-Host "📝 Cole a nova URL do backend no Render:" -ForegroundColor Yellow
        Write-Host "   Exemplo: https://edusync-pro-backend.onrender.com" -ForegroundColor Gray
        Write-Host ""
        $newUrl = Read-Host "URL do Backend"
        
        # Remover barra final e adicionar /api
        $newUrl = $newUrl.TrimEnd('/')
        if (-not $newUrl.EndsWith('/api')) {
            $newUrl = "$newUrl/api"
        }
        
        # Atualizar .env.production
        $envContent = "# API URL para produção`n# Backend deployado no Render.com`nVITE_API_URL=$newUrl`n"
        Set-Content -Path ".\frontend\.env.production" -Value $envContent
        
        Write-Host ""
        Write-Host "✅ URL atualizada para: $newUrl" -ForegroundColor Green
        $currentUrl = $newUrl
    }
}

Write-Host ""
Write-Host "🔨 Compilando frontend para produção..." -ForegroundColor Yellow
Set-Location ".\frontend"
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📤 Fazendo deploy no Surge..." -ForegroundColor Yellow
    surge dist edusync-pro.surge.sh
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║           🎉 DEPLOY COMPLETO COM SUCESSO! 🎉              ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 URLS DE ACESSO:" -ForegroundColor Cyan
        Write-Host "   Frontend: https://edusync-pro.surge.sh" -ForegroundColor White
        Write-Host "   Backend:  $currentUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "✅ Sistema 100% online e funcionando!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔐 Credenciais de Teste:" -ForegroundColor Yellow
        Write-Host "   Email: escola@ceti.com" -ForegroundColor White
        Write-Host "   Senha: Ceti@2026" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Erro no deploy do Surge" -ForegroundColor Red
        Write-Host "   Execute manualmente: surge dist edusync-pro.surge.sh" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "❌ Erro no build do frontend" -ForegroundColor Red
    Write-Host "   Verifique os erros acima" -ForegroundColor Yellow
}

Set-Location ".."
