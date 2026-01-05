# ═══════════════════════════════════════════════════════════
# 🗑️ REMOVER DISCIPLINAS DUPLICADAS - CETI
# ═══════════════════════════════════════════════════════════

# Configuração
$apiUrl = "https://criador-horario-backend-1.onrender.com/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🗑️  REMOÇÃO DE DISCIPLINAS DUPLICADAS - CETI" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

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
    Write-Host "   ✅ Login OK - Token recebido" -ForegroundColor Green
    Write-Host ""

    # 2️⃣ Buscar todas as disciplinas
    Write-Host "2️⃣  Carregando disciplinas..." -ForegroundColor Yellow
    
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $subjects = Invoke-RestMethod -Uri "$apiUrl/subjects" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "   📊 Total de disciplinas: $($subjects.Count)" -ForegroundColor White
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

    Write-Host "   ⚠️  Encontradas $($duplicates.Count) disciplinas com duplicatas:" -ForegroundColor Yellow
    Write-Host ""

    $totalToDelete = 0
    foreach ($dup in $duplicates) {
        $count = $dup.Count - 1
        $totalToDelete += $count
        Write-Host "      • $($dup.Name) - $($dup.Count) cópias (deletar $count)" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "   📊 Total a deletar: $totalToDelete disciplinas" -ForegroundColor Cyan
    Write-Host "   📊 Permanecerão: $($subjects.Count - $totalToDelete) disciplinas únicas" -ForegroundColor Cyan
    Write-Host ""

    # 4️⃣ Fazer backup antes de deletar
    Write-Host "4️⃣  Criando backup de segurança..." -ForegroundColor Yellow
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backup-before-cleanup-$timestamp.json"
    $subjects | ConvertTo-Json -Depth 10 | Out-File $backupFile -Encoding UTF8
    
    Write-Host "   ✅ Backup salvo: $backupFile" -ForegroundColor Green
    Write-Host ""

    # 5️⃣ Confirmação do usuário
    Write-Host "⚠️  CONFIRMAÇÃO NECESSÁRIA" -ForegroundColor Yellow
    Write-Host "   Serão deletadas $totalToDelete disciplinas duplicadas." -ForegroundColor White
    Write-Host "   Cada disciplina terá apenas 1 cópia mantida." -ForegroundColor White
    Write-Host ""
    
    $confirmation = Read-Host "   Deseja continuar? (S/N)"
    
    if ($confirmation -ne "S" -and $confirmation -ne "s") {
        Write-Host ""
        Write-Host "❌ Operação cancelada pelo usuário." -ForegroundColor Red
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        exit 0
    }

    Write-Host ""

    # 6️⃣ Deletar duplicatas
    Write-Host "6️⃣  Removendo duplicatas..." -ForegroundColor Yellow
    Write-Host ""
    
    $deletedCount = 0
    $errorCount = 0

    foreach ($dup in $duplicates) {
        $disciplineName = $dup.Name
        $copies = $dup.Group | Sort-Object -Property _id
        
        # Manter a primeira, deletar as demais
        $toDelete = $copies | Select-Object -Skip 1
        
        foreach ($subject in $toDelete) {
            try {
                $deleteUrl = "$apiUrl/subjects/$($subject._id)"
                
                Invoke-RestMethod -Uri $deleteUrl `
                    -Method DELETE `
                    -Headers $headers `
                    -ErrorAction Stop | Out-Null
                
                $deletedCount++
                Write-Host "   ✅ Deletada: $disciplineName (ID: $($subject._id))" -ForegroundColor Green
                
                # Delay para não sobrecarregar API
                Start-Sleep -Milliseconds 300
                
            } catch {
                $errorCount++
                Write-Host "   ❌ Erro ao deletar: $disciplineName (ID: $($subject._id))" -ForegroundColor Red
                Write-Host "      Motivo: $($_.Exception.Message)" -ForegroundColor DarkRed
            }
        }
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📊 RESUMO DA OPERAÇÃO" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Disciplinas deletadas: $deletedCount" -ForegroundColor Green
    
    if ($errorCount -gt 0) {
        Write-Host "❌ Erros encontrados: $errorCount" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📁 Backup salvo em: $backupFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔗 Acesse: https://criador-horario-aula.surge.sh/subjects" -ForegroundColor Cyan
    Write-Host ""
    
    if ($errorCount -eq 0) {
        Write-Host "✅ Operação concluída com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Operação concluída com alguns erros." -ForegroundColor Yellow
    }
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ ERRO CRÍTICO:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor DarkRed
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status HTTP: $statusCode" -ForegroundColor DarkRed
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
