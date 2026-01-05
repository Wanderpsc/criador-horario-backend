# ═══════════════════════════════════════════════════════════
# 🔄 REMOVER DUPLICATAS EM PRODUÇÃO (COM RETRY)
# ═══════════════════════════════════════════════════════════

$apiUrl = "https://criador-horario-backend-1.onrender.com/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔄 LIMPEZA DE DUPLICATAS - PRODUÇÃO (COM RETRY)" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Função para testar rate limit
function Test-RateLimit {
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/../health" `
            -Method GET `
            -TimeoutSec 5 `
            -ErrorAction Stop
        return $true
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 429) {
            return $false
        }
        return $true # Outros erros, continuar
    }
}

# Testar rate limit
Write-Host "🧪 Testando conexão com Render..." -ForegroundColor Yellow

$maxAttempts = 5
$attempt = 0
$waitTime = 30

while ($attempt -lt $maxAttempts) {
    $attempt++
    
    if (Test-RateLimit) {
        Write-Host "   ✅ Conexão OK! Prosseguindo..." -ForegroundColor Green
        Write-Host ""
        break
    } else {
        if ($attempt -lt $maxAttempts) {
            Write-Host "   ⚠️  Rate limit ativo (429). Tentativa $attempt/$maxAttempts" -ForegroundColor Yellow
            Write-Host "   ⏳ Aguardando $waitTime segundos..." -ForegroundColor Cyan
            Start-Sleep -Seconds $waitTime
        } else {
            Write-Host "   ❌ Rate limit ainda ativo após $maxAttempts tentativas." -ForegroundColor Red
            Write-Host ""
            Write-Host "⚠️  RECOMENDAÇÃO:" -ForegroundColor Yellow
            Write-Host "   O Render tem rate limit de 15 minutos." -ForegroundColor White
            Write-Host "   Execute este script novamente em alguns minutos." -ForegroundColor White
            Write-Host ""
            Write-Host "   Ou acesse manualmente:" -ForegroundColor White
            Write-Host "   https://criador-horario-aula.surge.sh/subjects" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
            exit 1
        }
    }
}

try {
    # 1️⃣ Autenticação
    Write-Host "1️⃣  Autenticando como CETI..." -ForegroundColor Yellow
    
    $loginBody = @{
        email = $cetiEmail
        password = $cetiPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $loginResponse.token
    Write-Host "   ✅ Login OK" -ForegroundColor Green
    Write-Host ""

    # 2️⃣ Buscar disciplinas
    Write-Host "2️⃣  Carregando disciplinas..." -ForegroundColor Yellow
    
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $subjects = Invoke-RestMethod -Uri "$apiUrl/subjects" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "   📊 Total: $($subjects.Count) disciplinas" -ForegroundColor White
    Write-Host ""

    # 3️⃣ Identificar duplicatas
    Write-Host "3️⃣  Identificando duplicatas..." -ForegroundColor Yellow
    
    $grouped = $subjects | Group-Object -Property name
    $duplicates = $grouped | Where-Object { $_.Count -gt 1 }

    if ($duplicates.Count -eq 0) {
        Write-Host "   ✅ Nenhuma duplicata encontrada!" -ForegroundColor Green
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        exit 0
    }

    Write-Host "   ⚠️  Encontradas $($duplicates.Count) disciplinas duplicadas" -ForegroundColor Yellow
    Write-Host ""

    $totalToDelete = 0
    foreach ($dup in $duplicates) {
        $totalToDelete += ($dup.Count - 1)
    }

    Write-Host "   📊 Deletar: $totalToDelete disciplinas" -ForegroundColor Cyan
    Write-Host "   📊 Manter: $($subjects.Count - $totalToDelete) únicas" -ForegroundColor Cyan
    Write-Host ""

    # 4️⃣ Backup
    Write-Host "4️⃣  Criando backup..." -ForegroundColor Yellow
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backup-prod-$timestamp.json"
    $subjects | ConvertTo-Json -Depth 10 | Out-File $backupFile -Encoding UTF8
    
    Write-Host "   ✅ Backup: $backupFile" -ForegroundColor Green
    Write-Host ""

    # 5️⃣ Confirmação
    Write-Host "⚠️  CONFIRMAÇÃO" -ForegroundColor Yellow
    Write-Host "   Deletar $totalToDelete duplicatas em PRODUÇÃO?" -ForegroundColor White
    Write-Host ""
    
    $confirmation = Read-Host "   Continuar? (S/N)"
    
    if ($confirmation -ne "S" -and $confirmation -ne "s") {
        Write-Host ""
        Write-Host "❌ Cancelado" -ForegroundColor Red
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        exit 0
    }

    Write-Host ""

    # 6️⃣ Deletar
    Write-Host "6️⃣  Removendo duplicatas..." -ForegroundColor Yellow
    Write-Host ""
    
    $deletedCount = 0
    $errorCount = 0

    foreach ($dup in $duplicates) {
        $copies = $dup.Group | Sort-Object -Property _id
        $toDelete = $copies | Select-Object -Skip 1
        
        foreach ($subject in $toDelete) {
            try {
                Invoke-RestMethod -Uri "$apiUrl/subjects/$($subject._id)" `
                    -Method DELETE `
                    -Headers $headers `
                    -ErrorAction Stop | Out-Null
                
                $deletedCount++
                $percent = [math]::Round(($deletedCount / $totalToDelete) * 100)
                Write-Host "   ✅ [$percent%] $($dup.Name.Substring(0, [Math]::Min(60, $dup.Name.Length)))" -ForegroundColor Green
                
                Start-Sleep -Milliseconds 500 # Evitar rate limit
                
            } catch {
                $errorCount++
                Write-Host "   ❌ Erro: $($dup.Name)" -ForegroundColor Red
            }
        }
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📊 RESULTADO" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Deletadas: $deletedCount" -ForegroundColor Green
    Write-Host "📊 Finais: $($subjects.Count - $deletedCount)" -ForegroundColor Cyan
    
    if ($errorCount -gt 0) {
        Write-Host "❌ Erros: $errorCount" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📁 Backup: $backupFile" -ForegroundColor Cyan
    Write-Host "🔗 Verificar: https://criador-horario-aula.surge.sh/subjects" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Concluído!" -ForegroundColor Green
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   HTTP: $statusCode" -ForegroundColor DarkRed
        
        if ($statusCode -eq 429) {
            Write-Host ""
            Write-Host "⚠️  Rate limit ativo. Aguarde 15 minutos e tente novamente." -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
