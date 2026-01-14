#!/usr/bin/env pwsh
# Deploy das correções do erro 500 no pagamento
# © 2025 Wander Pires Silva Coelho

Write-Host "`n🚀 DEPLOY - Correção Erro 500 Payment" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 1. Verificar se há mudanças
Write-Host "`n📋 Verificando mudanças..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "✅ Mudanças detectadas:" -ForegroundColor Green
    git status --short
} else {
    Write-Host "⚠️ Nenhuma mudança detectada" -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/n)"
    if ($continue -ne "s") {
        Write-Host "❌ Deploy cancelado" -ForegroundColor Red
        exit 1
    }
}

# 2. Adicionar todas as mudanças
Write-Host "`n📦 Adicionando arquivos ao Git..." -ForegroundColor Yellow
git add .

# 3. Commit
Write-Host "`n💾 Criando commit..." -ForegroundColor Yellow
$commitMsg = "fix: Corrigir erro 500 em pagamentos e melhorar logs do Mercado Pago

- Adicionar verificação de token no MercadoPagoService
- Melhorar tratamento de erro na rota /create-public  
- Adicionar logs detalhados de diagnóstico no server.ts
- Implementar modo fallback quando Mercado Pago está offline
- Criar guia FIX_PAYMENT_ERROR_500.md com instruções"

git commit -m $commitMsg

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao criar commit" -ForegroundColor Red
    exit 1
}

# 4. Push para o repositório
Write-Host "`n🌐 Enviando para o GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "`n📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "1. Aguarde 2-3 minutos para o Render fazer o deploy automático" -ForegroundColor White
Write-Host "2. Acesse: https://dashboard.render.com" -ForegroundColor White
Write-Host "3. Verifique os logs em 'Logs' para confirmar:" -ForegroundColor White
Write-Host "   ✅ [MP] Mercado Pago inicializado" -ForegroundColor Green
Write-Host "   🔑 [MP] Token presente: APP_USR-..." -ForegroundColor Green
Write-Host "`n4. Se aparecer '❌ NÃO CONFIGURADO':" -ForegroundColor White
Write-Host "   - Vá em 'Environment' no Render" -ForegroundColor Yellow
Write-Host "   - Adicione: MERCADO_PAGO_ACCESS_TOKEN" -ForegroundColor Yellow
Write-Host "   - Valor: APP_USR-8624658040903889-010322-4f9240f477d96f3a7539c751a2cf3d53-58356" -ForegroundColor Yellow
Write-Host "`n5. Leia o guia completo:" -ForegroundColor White
Write-Host "   📄 FIX_PAYMENT_ERROR_500.md" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor White

Write-Host "🔗 Links úteis:" -ForegroundColor Cyan
Write-Host "   Render Dashboard: https://dashboard.render.com" -ForegroundColor White
Write-Host "   Mercado Pago: https://www.mercadopago.com.br/developers/panel/app" -ForegroundColor White
Write-Host "`n"
