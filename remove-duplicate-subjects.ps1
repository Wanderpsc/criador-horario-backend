# ═══════════════════════════════════════════════════════════
# 🧹 REMOÇÃO DE DISCIPLINAS DUPLICADAS
# ═══════════════════════════════════════════════════════════

$apiUrl = "https://criador-horario-backend-1.onrender.com/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧹 REMOÇÃO DE DISCIPLINAS DUPLICADAS" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

try {
    # Autenticar
    Write-Host "🔐 Autenticando..." -ForegroundColor Yellow
    $loginBody = @{
        email = $cetiEmail
        password = $cetiPassword
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "✅ Login OK" -ForegroundColor Green
    Write-Host ""
    
    # Carregar todas as disciplinas
    Write-Host "📚 Carregando disciplinas..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "$apiUrl/subjects" -Headers $headers -UseBasicParsing
    $allSubjects = $response.Content | ConvertFrom-Json
    Write-Host "📊 Total: $($allSubjects.Count) disciplinas" -ForegroundColor White
    Write-Host ""
    
    # Identificar duplicados (case-insensitive)
    Write-Host "🔍 Identificando duplicados..." -ForegroundColor Yellow
    $grouped = $allSubjects | Group-Object { $_.name.Trim().ToUpper() }
    $duplicates = $grouped | Where-Object { $_.Count -gt 1 }
    
    if ($duplicates.Count -eq 0) {
        Write-Host "✅ Nenhum duplicado encontrado!" -ForegroundColor Green
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        exit 0
    }
    
    Write-Host "⚠️  Encontrados $($duplicates.Count) nomes duplicados" -ForegroundColor Yellow
    Write-Host ""
    
    # Listar duplicados
    Write-Host "📋 DUPLICADOS ENCONTRADOS:" -ForegroundColor Cyan
    $totalToDelete = 0
    foreach ($dup in $duplicates) {
        $count = $dup.Count
        $toDelete = $count - 1
        $totalToDelete += $toDelete
        Write-Host "   • '$($dup.Group[0].name)' - $count vezes (remover $toDelete)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "📊 Total de disciplinas a remover: $totalToDelete" -ForegroundColor Yellow
    Write-Host ""
    
    # Criar backup
    Write-Host "💾 Criando backup..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backup-before-cleanup-$timestamp.json"
    $allSubjects | ConvertTo-Json -Depth 5 | Out-File $backupFile -Encoding UTF8
    Write-Host "✅ Backup: $backupFile" -ForegroundColor Green
    Write-Host ""
    
    # Remover duplicados (manter o mais antigo - menor createdAt)
    Write-Host "🗑️  Removendo duplicados..." -ForegroundColor Yellow
    Write-Host ""
    
    $removed = 0
    $failed = 0
    
    foreach ($dup in $duplicates) {
        $subjects = $dup.Group | Sort-Object createdAt
        $toKeep = $subjects[0]
        $toDelete = $subjects[1..($subjects.Count - 1)]
        
        Write-Host "   📚 '$($toKeep.name)'" -ForegroundColor Cyan
        Write-Host "      ✅ Mantendo: ID $($toKeep._id) (criado em $(Get-Date $toKeep.createdAt -Format 'dd/MM/yyyy HH:mm'))" -ForegroundColor Green
        
        foreach ($subject in $toDelete) {
            try {
                Invoke-RestMethod -Uri "$apiUrl/subjects/$($subject._id)" -Method DELETE -Headers $headers | Out-Null
                Write-Host "      🗑️  Removido: ID $($subject._id) (criado em $(Get-Date $subject.createdAt -Format 'dd/MM/yyyy HH:mm'))" -ForegroundColor DarkGray
                $removed++
                Start-Sleep -Milliseconds 300
            } catch {
                Write-Host "      ❌ Erro ao remover: $($_.Exception.Message)" -ForegroundColor Red
                $failed++
            }
        }
        Write-Host ""
    }
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ LIMPEZA CONCLUÍDA!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 ESTATÍSTICAS:" -ForegroundColor Cyan
    Write-Host "   Total inicial: $($allSubjects.Count) disciplinas" -ForegroundColor White
    Write-Host "   Nomes duplicados: $($duplicates.Count)" -ForegroundColor Yellow
    Write-Host "   Disciplinas removidas: $removed" -ForegroundColor Green
    if ($failed -gt 0) {
        Write-Host "   Falharam: $failed" -ForegroundColor Red
    }
    Write-Host "   Total final: $($allSubjects.Count - $removed) disciplinas" -ForegroundColor Cyan
    Write-Host "   Backup: $backupFile" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "🔄 Próximo passo: Atualizar cargas horárias" -ForegroundColor Cyan
    Write-Host "   Execute: .\update-workload-planilha-2025.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
