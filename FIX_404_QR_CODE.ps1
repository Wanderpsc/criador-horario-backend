# ============================================
# FIX: Erro 404 após Geração de QR Code PIX
# ============================================
# Data: 14/01/2026
# Descrição: Corrige erro 404 que aparece após QR Code ser gerado
# Causa: Rota de verificação de status estava requerendo autenticação
# Solução: Criada rota pública /api/payments/status/:id

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   FIX: Erro 404 após QR Code PIX" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "📋 ALTERAÇÕES REALIZADAS:" -ForegroundColor Yellow
Write-Host "  ✓ Backend: Nova rota pública GET /api/payments/status/:id" -ForegroundColor Green
Write-Host "  ✓ Frontend: Atualizado checkPaymentStatus para usar rota pública" -ForegroundColor Green
Write-Host "`n"

# Perguntar se deseja fazer o deploy
$deploy = Read-Host "Deseja fazer o DEPLOY das correções? (S/N)"

if ($deploy -eq "S" -or $deploy -eq "s") {
    Write-Host "`n🚀 Iniciando deploy..." -ForegroundColor Cyan
    
    # 1. BUILD DO FRONTEND
    Write-Host "`n📦 [1/4] Build do Frontend..." -ForegroundColor Yellow
    Set-Location frontend
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force dist
        Write-Host "  ✓ Pasta dist removida" -ForegroundColor Green
    }
    
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no build do frontend!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Write-Host "  ✓ Build concluído" -ForegroundColor Green
    
    # 2. DEPLOY FRONTEND NO SURGE
    Write-Host "`n🌐 [2/4] Deploy Frontend (Surge)..." -ForegroundColor Yellow
    npx surge dist criador-horario-escolar.surge.sh
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no deploy do frontend!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Write-Host "  ✓ Frontend deployed" -ForegroundColor Green
    
    Set-Location ..
    
    # 3. BUILD DO BACKEND
    Write-Host "`n📦 [3/4] Build do Backend..." -ForegroundColor Yellow
    Set-Location backend
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force dist
        Write-Host "  ✓ Pasta dist removida" -ForegroundColor Green
    }
    
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no build do backend!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Write-Host "  ✓ Build concluído" -ForegroundColor Green
    
    Set-Location ..
    
    # 4. COMMIT E PUSH PARA O RENDER
    Write-Host "`n📤 [4/4] Deploy Backend (Render via Git)..." -ForegroundColor Yellow
    
    git add .
    git commit -m "fix: Corrige erro 404 após geração de QR Code PIX - adiciona rota pública de status"
    git push origin master
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no push para o git!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "`n📊 Status:" -ForegroundColor Cyan
    Write-Host "  • Frontend: https://criador-horario-escolar.surge.sh" -ForegroundColor White
    Write-Host "  • Backend: Deploy automático no Render (aguarde ~2 minutos)" -ForegroundColor White
    
    Write-Host "`n🔍 VERIFICAÇÃO:" -ForegroundColor Yellow
    Write-Host "  1. Acesse: https://criador-horario-escolar.surge.sh" -ForegroundColor White
    Write-Host "  2. Faça um novo cadastro de teste" -ForegroundColor White
    Write-Host "  3. Escolha pagamento PIX" -ForegroundColor White
    Write-Host "  4. Verifique que o QR Code aparece SEM erro 404" -ForegroundColor White
    Write-Host "  5. Sistema deve fazer polling sem erros" -ForegroundColor White
    
    Write-Host "`n📝 LOGS DO RENDER:" -ForegroundColor Yellow
    Write-Host "  • Acesse: https://dashboard.render.com" -ForegroundColor White
    Write-Host "  • Vá em: criador-horario-backend > Logs" -ForegroundColor White
    Write-Host "  • Procure por: [STATUS] Consultando pagamento público" -ForegroundColor White
    
} else {
    Write-Host "`n⏸️  Deploy cancelado pelo usuário" -ForegroundColor Yellow
    Write-Host "   Para deployar mais tarde, execute: .\FIX_404_QR_CODE.ps1" -ForegroundColor White
}

Write-Host "`n================================================`n" -ForegroundColor Cyan
