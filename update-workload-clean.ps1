# ═══════════════════════════════════════════════════════════
# 📚 ATUALIZAR CARGA HORÁRIA DAS DISCIPLINAS POR TURMA  
# ═══════════════════════════════════════════════════════════
# 
# INSTRUÇÕES:
# 1. Adicione as turmas e disciplinas no formato abaixo
# 2. Execute o script no ambiente LOCAL primeiro
# 3. Verifique os resultados antes de aplicar em produção
#
# FORMATO:
# "Nome Exato da Turma" = @{
#     "Nome Exato da Disciplina" = carga_horária_semanal_em_aulas
# }
#
# ═══════════════════════════════════════════════════════════

$apiUrl = "http://localhost:5000/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📚 ATUALIZAÇÃO DE CARGA HORÁRIA - DISCIPLINAS POR TURMA" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# DADOS DA PLANILHA - Mapeamento de Disciplinas por Turma
# ============================================================

$workloadData = @{
    # EXEMPLO - Adicione as turmas reais aqui
    "3ª SÉRIE A" = @{
        "MATEMÁTICA" = 4
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "LÍNGUA PORTUGUESA" = 4
        "EDUCAÇÃO FÍSICA" = 2
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
    }
}

Write-Host "📋 DADOS CONFIGURADOS:" -ForegroundColor Yellow
Write-Host "   Turmas: $($workloadData.Keys.Count)" -ForegroundColor White
$totalAssociations = 0
foreach ($class in $workloadData.Keys) {
    $totalAssociations += $workloadData[$class].Keys.Count
    Write-Host "   ✓ $class : $($workloadData[$class].Keys.Count) disciplinas" -ForegroundColor Cyan
}
Write-Host "   Total de associações: $totalAssociations" -ForegroundColor White
Write-Host ""

# Verificar backend
Write-Host "🔍 Verificando backend..." -ForegroundColor Yellow
$backendRunning = $false
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
    $backendRunning = $true
} catch {
    # Tentar porta 5000
    $port = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    if ($port) {
        $backendRunning = $true
    }
}

if ($backendRunning) {
    Write-Host "✅ Backend local rodando" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "❌ Backend local NÃO está rodando!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Inicie o backend:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}

try {
    # 1️⃣ Login
    Write-Host "1️⃣  Autenticando..." -ForegroundColor Yellow
    
    $loginBody = @{
        email = $cetiEmail
        password = $cetiPassword
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $login.token
    Write-Host "   ✅ Login OK" -ForegroundColor Green
    Write-Host ""

    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }

    # 2️⃣ Buscar turmas
    Write-Host "2️⃣  Carregando turmas..." -ForegroundColor Yellow
    
    $classesResponse = Invoke-RestMethod -Uri "$apiUrl/classes" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    $classes = $classesResponse.data
    Write-Host "   📊 Encontradas: $($classes.Count) turmas" -ForegroundColor White
    
    # Mostrar turmas disponíveis
    Write-Host ""
    Write-Host "   Turmas cadastradas no sistema:" -ForegroundColor Cyan
    $classes | ForEach-Object { Write-Host "      - $($_.name)" -ForegroundColor DarkCyan }
    Write-Host ""

    # 3️⃣ Buscar disciplinas
    Write-Host "3️⃣  Carregando disciplinas..." -ForegroundColor Yellow
    
    $subjects = Invoke-RestMethod -Uri "$apiUrl/subjects" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "   📊 Encontradas: $($subjects.Count) disciplinas" -ForegroundColor White
    Write-Host ""

    # 4️⃣ Backup
    Write-Host "4️⃣  Criando backup..." -ForegroundColor Yellow
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backup-workload-$timestamp.json"
    
    $backupData = @{
        timestamp = $timestamp
        classes = $classes
        subjects = $subjects
    }
    
    $backupData | ConvertTo-Json -Depth 10 | Out-File $backupFile -Encoding UTF8
    Write-Host "   ✅ Backup: $backupFile" -ForegroundColor Green
    Write-Host ""

    # 5️⃣ Processar atualizações
    Write-Host "5️⃣  Preparando atualizações..." -ForegroundColor Yellow
    Write-Host ""

    $updates = @()
    $notFoundClasses = @()
    $notFoundSubjects = @{}

    foreach ($className in $workloadData.Keys) {
        # Buscar turma pelo nome (case-insensitive)
        $class = $classes | Where-Object { $_.name -eq $className }
        
        if (-not $class) {
            $notFoundClasses += $className
            Write-Host "   ⚠️  Turma não encontrada: $className" -ForegroundColor Yellow
            continue
        }

        $classSubjects = $workloadData[$className]
        $subjectIdsArray = @()
        $weeklyHoursMap = @{}

        foreach ($subjectName in $classSubjects.Keys) {
            # Buscar disciplina pelo nome
            $subject = $subjects | Where-Object { $_.name -eq $subjectName }
            
            if (-not $subject) {
                if (-not $notFoundSubjects.ContainsKey($className)) {
                    $notFoundSubjects[$className] = @()
                }
                $notFoundSubjects[$className] += $subjectName
                continue
            }

            $subjectId = $subject._id
            $weeklyHours = $classSubjects[$subjectName]

            $subjectIdsArray += $subjectId
            $weeklyHoursMap[$subjectId] = $weeklyHours
        }

        if ($subjectIdsArray.Count -gt 0) {
            $updates += @{
                classId = $class._id
                className = $class.name
                subjectIds = $subjectIdsArray
                weeklyHours = $weeklyHoursMap
                count = $subjectIdsArray.Count
            }
            
            Write-Host "   ✓ $className : $($subjectIdsArray.Count) disciplinas" -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "   📊 Turmas a atualizar: $($updates.Count)" -ForegroundColor Cyan
    
    if ($notFoundClasses.Count -gt 0) {
        Write-Host ""
        Write-Host "   ⚠️  Turmas não encontradas: $($notFoundClasses.Count)" -ForegroundColor Yellow
        $notFoundClasses | ForEach-Object { Write-Host "      - $_" -ForegroundColor DarkYellow }
    }
    
    if ($notFoundSubjects.Keys.Count -gt 0) {
        Write-Host ""
        Write-Host "   ⚠️  Disciplinas não encontradas:" -ForegroundColor Yellow
        foreach ($className in $notFoundSubjects.Keys) {
            Write-Host "      Turma: $className" -ForegroundColor DarkYellow
            $notFoundSubjects[$className] | ForEach-Object { Write-Host "         - $_" -ForegroundColor DarkGray }
        }
    }

    if ($updates.Count -eq 0) {
        Write-Host ""
        Write-Host "❌ Nenhuma atualização a ser feita!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Verifique:" -ForegroundColor Yellow
        Write-Host "1. Os nomes das turmas estão EXATAMENTE iguais aos cadastrados" -ForegroundColor White
        Write-Host "2. Os nomes das disciplinas estão EXATAMENTE iguais aos cadastrados" -ForegroundColor White
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        exit 1
    }

    Write-Host ""

    # 6️⃣ Confirmação
    Write-Host "⚠️  CONFIRMAÇÃO" -ForegroundColor Yellow
    Write-Host "   Atualizar carga horária de $($updates.Count) turma(s)?" -ForegroundColor White
    
    foreach ($update in $updates) {
        Write-Host "   • $($update.className): $($update.count) disciplinas" -ForegroundColor Cyan
    }
    
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

    # 7️⃣ Executar atualizações
    Write-Host "7️⃣  Atualizando turmas..." -ForegroundColor Yellow
    Write-Host ""

    $successCount = 0
    $errorCount = 0

    foreach ($update in $updates) {
        try {
            # Buscar dados atuais da turma
            $currentClass = Invoke-RestMethod -Uri "$apiUrl/classes/$($update.classId)" `
                -Method GET `
                -Headers $headers `
                -ErrorAction Stop

            # Preparar body mantendo dados existentes
            $updateBody = @{
                name = $currentClass.name
                gradeId = $currentClass.gradeId
                shift = $currentClass.shift
                isActive = $currentClass.isActive
                subjectIds = $update.subjectIds
                weeklyHours = $update.weeklyHours
            } | ConvertTo-Json -Depth 10

            Invoke-RestMethod -Uri "$apiUrl/classes/$($update.classId)" `
                -Method PUT `
                -Headers $headers `
                -Body $updateBody `
                -ErrorAction Stop | Out-Null

            $successCount++
            Write-Host "   ✅ $($update.className) - $($update.count) disciplinas" -ForegroundColor Green

            Start-Sleep -Milliseconds 200

        } catch {
            $errorCount++
            Write-Host "   ❌ Erro: $($update.className) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📊 RESULTADO" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Atualizadas: $successCount turma(s)" -ForegroundColor Green
    
    if ($errorCount -gt 0) {
        Write-Host "❌ Erros: $errorCount" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📁 Backup: $backupFile" -ForegroundColor Cyan
    Write-Host "🔗 Verificar: http://localhost:3002/class-subjects" -ForegroundColor Cyan
    Write-Host ""
    
    if ($errorCount -eq 0) {
        Write-Host "✅ Concluído com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Concluído com alguns erros." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Resposta: $responseBody" -ForegroundColor DarkRed
        } catch {}
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
