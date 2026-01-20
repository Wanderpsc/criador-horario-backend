# Monitor de Deploy - Render
Write-Host "`n🔍 MONITORANDO DEPLOY DO RENDER" -ForegroundColor Cyan
Write-Host "=" * 70

$url = "https://criador-horario-backend.onrender.com/api/verify/verify"
$maxTentativas = 12  # 6 minutos (12 x 30 segundos)
$intervalo = 30

for ($i = 1; $i -le $maxTentativas; $i++) {
    $hora = Get-Date -Format "HH:mm:ss"
    Write-Host "`n[$hora] Tentativa $i de $maxTentativas" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
        
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            
            Write-Host "`n" -NoNewline
            Write-Host "=" * 70 -ForegroundColor Green
            Write-Host "✅✅✅ DEPLOY CONCLUÍDO COM SUCESSO! ✅✅✅" -ForegroundColor Green
            Write-Host "=" * 70 -ForegroundColor Green
            
            Write-Host "`n📊 Dados retornados pela API:" -ForegroundColor Cyan
            Write-Host "   • Status: Sucesso" -ForegroundColor White
            Write-Host "   • Turmas encontradas: $($data.data.Count)" -ForegroundColor White
            
            Write-Host "`n🎯 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
            Write-Host "   1️⃣  Abra o arquivo: verify-workload.html" -ForegroundColor White
            Write-Host "   2️⃣  Veja a comparação completa das cargas horárias" -ForegroundColor White
            Write-Host "   3️⃣  Identifique os erros (linhas vermelhas)" -ForegroundColor White
            
            Write-Host "`n✅ PODE DESLIGAR O SISTEMA AGORA!" -ForegroundColor Green
            Write-Host "=" * 70 -ForegroundColor Green
            
            exit 0
        }
    }
    catch {
        $erro = $_.Exception.Message
        
        if ($erro -like "*404*") {
            Write-Host "   ⏳ Status: Rota não encontrada (404)" -ForegroundColor DarkYellow
            Write-Host "   💡 Deploy ainda processando..." -ForegroundColor DarkGray
        }
        elseif ($erro -like "*timeout*") {
            Write-Host "   ⏳ Status: Timeout" -ForegroundColor DarkYellow
            Write-Host "   💡 Servidor pode estar reiniciando..." -ForegroundColor DarkGray
        }
        else {
            Write-Host "   ⚠️  Erro: $($erro.Substring(0, [Math]::Min(60, $erro.Length)))" -ForegroundColor DarkYellow
        }
        
        if ($i -lt $maxTentativas) {
            Write-Host "   ⏱️  Aguardando $intervalo segundos..." -ForegroundColor Gray
            Start-Sleep -Seconds $intervalo
        }
    }
}

# Se chegou aqui, não conseguiu em nenhuma tentativa
Write-Host "`n" -NoNewline
Write-Host "=" * 70 -ForegroundColor Yellow
Write-Host "⏰ TIMEOUT: Deploy ainda não concluiu em $($maxTentativas * $intervalo / 60) minutos" -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Yellow

Write-Host "`n💡 O QUE FAZER:" -ForegroundColor Cyan
Write-Host "   • O Render pode demorar mais que o esperado" -ForegroundColor White
Write-Host "   • Tente abrir verify-workload.html em 5 minutos" -ForegroundColor White
Write-Host "   • Ou verifique: https://dashboard.render.com/" -ForegroundColor White

Write-Host "`n🔄 Quer continuar monitorando? Execute novamente:" -ForegroundColor Cyan
Write-Host "   .\monitor-deploy.ps1" -ForegroundColor Gray
Write-Host ""
