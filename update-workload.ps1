# ═══════════════════════════════════════════════════════════
# 📚 ATUALIZAR CARGA HORÁRIA DAS DISCIPLINAS POR TURMA
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
# Formato: @{ "Nome da Turma" = @{ "Nome da Disciplina" = carga_horária_semanal } }

$workloadData = @{
    "EMIFES 3º1-2ºSERIE C-A" = @{
        "BRANDING - GESTÃO DE MARCAS" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LINGUAGENS" = 1
        "TESTE DE SISTEMAS E SEGURANÇA DA INFORMAÇÃO" = 2
        "ATIVIDADES INTEGRADAS - EDUCAÇÃO FÍSICA - APROFUNDAMENTO" = 1
        "FÍSICA - APROFUNDAMENTO" = 1
        "PRODUTOS INTEGRADORES II" = 1
        "BIOLOGIA - APROFUNDAMENTO" = 1
        "INTRODUÇÃO AO ECOSSISTEMA DE APLICATIVOS MÓVEIS" = 1
        "CAIXAS, OPERADORES FINANCEIROS E GESTÃO DO RELACIONAMENTO" = 1
        "PRINCÍPIOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - FILOSOFIA" = 1
        "INTEGRAÇÃO DE ESTUDOS - PROJETO DE VIDA/MUNDO DO TRABALHO" = 1
        "ATIVIDADES INTEGRADAS - ESPANHOL - APROFUNDAMENTO" = 1
        "EXPORTAÇÃO E IMPORTAÇÃO DE LEITURA DE MUNDO" = 1
        "LÍNGUA PORTUGUESA E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA E LITERATURA" = 1
        "PERCURSOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 1
        "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA" = 1
        "ORIENTAÇÃO PROFISSIONAL E PREPARAÇÃO PARA O MUNDO DO TRABALHO" = 1
        "LÍNGUA INGLESA E SUAS TECNOLOGIAS - LÍNGUA INGLESA" = 1
        "MATEMÁTICA E COMPUTAÇÃO EM LINGUAGENS (PROGRAMAÇÃO)" = 1
        "ANÁLISE E MODELAGEM DE SISTEMAS" = 1
        "LEITURA E PRODUÇÃO TEXTUAL" = 1
        "LOGÍSTICA E ORGANIZAÇÃO II" = 2
        "FÍSICA E SUAS TECNOLOGIAS - FÍSICA" = 1
        "QUÍMICA E SUAS TECNOLOGIAS - QUÍMICA" = 1
        "INTELIGÊNCIA ARTIFICIAL" = 1
        "INGLÊS FOCADO EM TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO" = 1
        "UX/UI EXPERIENCE (UX)" = 1
        "CIÊNCIAS HUMANAS E SOCIAIS - HISTÓRIA" = 1
        "PROJETO DE APROFUNDAGEM INTEGRAÇÃO DE ESTUDOS - HISTÓRIA" = 1
        "ARQUITETURA DE MICROSERVIÇOS" = 1
        "ARTE E SUAS TECNOLOGIAS - ARTE" = 1
        "PRINCÍPIO DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - ARTE" = 1
        "PROGRAMAÇÃO PARA DISPOSITIVOS MÓVEIS I" = 1
        "ATIVIDADES INTEGRADAS - ESPANHOL - APROFUNDAMENTO" = 1
        "LEITURA, INTERPRETAÇÃO E PRODUÇÃO DE TEXTOS" = 1
        "BANCO DE DADOS - BIG DATA" = 1
        "INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - MONITORIA / ROBÓTICA DE ESTUDOS - MONITORIA / ROBÓTICA" = 1
        "MARKETING MOBILE" = 1
        "GEOGRAFIA E SUAS TECNOLOGIAS - GEOGRAFIA" = 1
        "ATIVIDADES INTEGRADAS - QUÍMICA - APROFUNDAMENTO" = 1
        "PROJETO DE VIDA E CARREIRA PROFISSIONAL - PROJETO DE VIDA E CARREIRA / EDUCAÇÃO DE ESTUDOS" = 1
        "ECO - OTIMIZAÇÃO PARA MECANISMOS DE BUSCA" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - EDUCAÇÃO FÍSICA" = 1
        "METODOLOGIA DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - PORTUGUÊS" = 1
        "ATIVIDADES INTEGRADAS - CIÊNCIA DA NATUREZA - APROFUNDAMENTO" = 1
        "TIMBRAR DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS" = 1
        "MATEMÁTICA/COMPONENTES E APROFUNDAMENTO" = 1
        "PEDAGOGIA E APROFUNDAMENTO" = 1
        "EDUCAÇÃO FÍSICA" = 2
        "QUÍMICA - APROFUNDAMENTO" = 1
        "EDUCAÇÃO FÍSICA - APROFUNDAMENTO" = 1
        "GESTÃO E LIDERANÇA - GESTÃO DE EQUIPES" = 2
        "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA" = 2
        "HORÁRIO DE ESTUDO" = 1
        "SOCIOLOGIA E SUAS TECNOLOGIAS - SOCIOLOGIA" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - FILOSOFIA E SOCIOLOGIA" = 1
        "APROFUNDAMENTO - ESPANHOL" = 2
        "LOGÍSTICA E OPERAÇÕES II" = 1
        "BANCO DE DADOS (SGBD)" = 1
        "ESPANHOL/ESTRUTURA/CULTURA DE LINGUAGENS E APLICAÇÃO SOCIAL" = 2
        "INTERAÇÃO DISCURSIVA - LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "ECOLOGIA LÍNGUA INGLESA" = 2
        "PROGRAMAÇÃO ESTRUTURADA" = 2
        "FUNDAMENTOS DE REDE" = 2
        "LINGUAGEM E SUAS TECNOLOGIAS" = 2
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - SOCIOLOGIA" = 2
        "COMPUTAÇÃO" = 2
        "LINGUAGENS E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA" = 2
        "HISTÓRIA E CULTURA AFRO-BRASILEIRA E INDIGENOAMERICANA" = 2
        "ECOLOGIA LÍNGUA PORTUGUESA - RETROSPECTIVA OBRIGATÓRIA" = 2
        "LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "ECOLOGIA LÍNGUA PORTUGUESA" = 2
        "MATEMÁTICA" = 2
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
    }
    
    # Adicionar mais turmas conforme necessário...
}

Write-Host "📊 Dados carregados:" -ForegroundColor Yellow
Write-Host "   Turmas: $($workloadData.Keys.Count)" -ForegroundColor White
$totalAssociations = 0
foreach ($class in $workloadData.Keys) {
    $totalAssociations += $workloadData[$class].Keys.Count
}
Write-Host "   Total de associações: $totalAssociations" -ForegroundColor White
Write-Host ""

# Verificar se backend está rodando
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend local rodando" -ForegroundColor Green
    Write-Host ""
} catch {
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
    }
    
    $backupData | ConvertTo-Json -Depth 10 | Out-File $backupFile -Encoding UTF8
    Write-Host "   ✅ Backup: $backupFile" -ForegroundColor Green
    Write-Host ""

    # 5️⃣ Processar atualizações
    Write-Host "5️⃣  Preparando atualizações..." -ForegroundColor Yellow
    Write-Host ""

    $updates = @()
    $notFoundClasses = @()
    $notFoundSubjects = @()

    foreach ($className in $workloadData.Keys) {
        # Buscar turma pelo nome
        $class = $classes | Where-Object { $_.name -eq $className }
        
        if (-not $class) {
            $notFoundClasses += $className
            continue
        }

        $classSubjects = $workloadData[$className]
        $subjectIds = @()
        $weeklyHoursMap = @{}

        foreach ($subjectName in $classSubjects.Keys) {
            # Buscar disciplina pelo nome
            $subject = $subjects | Where-Object { $_.name -eq $subjectName }
            
            if (-not $subject) {
                $notFoundSubjects += "$subjectName (Turma: $className)"
                continue
            }

            $subjectId = $subject._id
            $weeklyHours = $classSubjects[$subjectName]

            $subjectIds += $subjectId
            $weeklyHoursMap[$subjectId] = $weeklyHours
        }

        if ($subjectIds.Count -gt 0) {
            $updates += @{
                classId = $class._id
                className = $class.name
                subjectIds = $subjectIds
                weeklyHours = $weeklyHoursMap
                count = $subjectIds.Count
            }
        }
    }

    Write-Host "   📊 Turmas a atualizar: $($updates.Count)" -ForegroundColor Cyan
    Write-Host "   📊 Total de associações: $($updates | ForEach-Object { $_.count } | Measure-Object -Sum).Sum" -ForegroundColor Cyan
    
    if ($notFoundClasses.Count -gt 0) {
        Write-Host ""
        Write-Host "   ⚠️  Turmas não encontradas: $($notFoundClasses.Count)" -ForegroundColor Yellow
        $notFoundClasses | ForEach-Object { Write-Host "      - $_" -ForegroundColor DarkYellow }
    }
    
    if ($notFoundSubjects.Count -gt 0) {
        Write-Host ""
        Write-Host "   ⚠️  Disciplinas não encontradas: $($notFoundSubjects.Count)" -ForegroundColor Yellow
        $notFoundSubjects | Select-Object -First 10 | ForEach-Object { Write-Host "      - $_" -ForegroundColor DarkYellow }
        if ($notFoundSubjects.Count -gt 10) {
            Write-Host "      ... e mais $($notFoundSubjects.Count - 10)" -ForegroundColor DarkGray
        }
    }

    Write-Host ""

    # 6️⃣ Confirmação
    Write-Host "⚠️  CONFIRMAÇÃO" -ForegroundColor Yellow
    Write-Host "   Atualizar carga horária de $($updates.Count) turmas?" -ForegroundColor White
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
            $updateBody = @{
                name = $update.className
                subjectIds = $update.subjectIds
                weeklyHours = $update.weeklyHours
            } | ConvertTo-Json -Depth 10

            Invoke-RestMethod -Uri "$apiUrl/classes/$($update.classId)" `
                -Method PUT `
                -Headers $headers `
                -Body $updateBody `
                -ErrorAction Stop | Out-Null

            $successCount++
            $percent = [math]::Round(($successCount / $updates.Count) * 100)
            Write-Host "   ✅ [$percent%] $($update.className) - $($update.count) disciplinas" -ForegroundColor Green

            Start-Sleep -Milliseconds 200

        } catch {
            $errorCount++
            Write-Host "   ❌ Erro: $($update.className)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📊 RESULTADO" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Atualizadas: $successCount turmas" -ForegroundColor Green
    
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
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   HTTP: $statusCode" -ForegroundColor DarkRed
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
