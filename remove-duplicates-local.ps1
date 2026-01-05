# ═══════════════════════════════════════════════════════════
# 🗑️ REMOVER DISCIPLINAS DUPLICADAS - CETI (BACKEND LOCAL)
# ═══════════════════════════════════════════════════════════

# Configuração
$apiUrl = "http://localhost:5000/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🗑️  REMOÇÃO DE DISCIPLINAS DUPLICADAS - CETI (LOCAL)" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se backend está rodando
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/subjects" -Method GET -Headers @{Authorization="Bearer test"} -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Backend local está rodando" -ForegroundColor Green
    Write-Host ""
} catch {
    # Tentar /health
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Backend local está rodando" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "❌ Backend local NÃO está rodando!" -ForegroundColor Red
    Write-Host ""
        Write-Host "Por favor, inicie o backend primeiro:" -ForegroundColor Yellow
        Write-Host "   cd backend" -ForegroundColor White
        Write-Host "   npm run dev" -ForegroundColor White
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        exit 1
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
    $showCount = 0
    foreach ($dup in $duplicates) {
        $count = $dup.Count - 1
        $totalToDelete += $count
        
        # Mostrar apenas as primeiras 10
        if ($showCount -lt 10) {
            Write-Host "      • $($dup.Name) - $($dup.Count) cópias (deletar $count)" -ForegroundColor White
            $showCount++
        }
    }
    
    if ($duplicates.Count -gt 10) {
        Write-Host "      ... e mais $($duplicates.Count - 10) disciplinas duplicadas" -ForegroundColor DarkGray
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
    Write-Host "   Cada disciplina terá apenas 1 cópia mantida (a mais antiga)." -ForegroundColor White
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
    $progress = 0

    foreach ($dup in $duplicates) {
        $disciplineName = $dup.Name
        $copies = $dup.Group | Sort-Object -Property _id
        
        # Manter a primeira (mais antiga), deletar as demais
        $toDelete = $copies | Select-Object -Skip 1
        
        foreach ($subject in $toDelete) {
            $progress++
            $percent = [math]::Round(($progress / $totalToDelete) * 100)
            
            try {
                $deleteUrl = "$apiUrl/subjects/$($subject._id)"
                
                Invoke-RestMethod -Uri $deleteUrl `
                    -Method DELETE `
                    -Headers $headers `
                    -ErrorAction Stop | Out-Null
                
                $deletedCount++
                Write-Host "   ✅ [$percent%] Deletada: $($disciplineName.Substring(0, [Math]::Min(50, $disciplineName.Length)))" -ForegroundColor Green
                
                # Delay para não sobrecarregar
                Start-Sleep -Milliseconds 200
                
            } catch {
                $errorCount++
                Write-Host "   ❌ Erro ao deletar: $($disciplineName.Substring(0, [Math]::Min(50, $disciplineName.Length)))" -ForegroundColor Red
            }
        }
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📊 RESUMO DA OPERAÇÃO" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Disciplinas deletadas: $deletedCount" -ForegroundColor Green
    Write-Host "📊 Disciplinas finais: $($subjects.Count - $deletedCount)" -ForegroundColor Cyan
    
    if ($errorCount -gt 0) {
        Write-Host "❌ Erros encontrados: $errorCount" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📁 Backup salvo em: $backupFile" -ForegroundColor Cyan
    Write-Host ""
    
    if ($errorCount -eq 0) {
        Write-Host "✅ Operação concluída com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Próximos passos:" -ForegroundColor Yellow
        Write-Host "   1. Verifique o sistema em http://localhost:3002/subjects" -ForegroundColor White
        Write-Host "   2. Se tudo estiver OK, faça deploy para produção" -ForegroundColor White
    } else {
        Write-Host "⚠️  Operação concluída com alguns erros." -ForegroundColor Yellow
    }
    
    Write-Host ""
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
