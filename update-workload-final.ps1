# ═══════════════════════════════════════════════════════════
# 📚 ATUALIZAR CARGA HORÁRIA - DADOS COMPLETOS DA PLANILHA
# ═══════════════════════════════════════════════════════════

$apiUrl = "http://localhost:5000/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📚 ATUALIZAÇÃO DE CARGA HORÁRIA - TODAS AS TURMAS" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# DADOS EXTRAÍDOS DA PLANILHA
# ============================================================

$workloadData = @{
    "EPI-FUND I/ANOS FINAIS TEMPO INTEGRAL" = @{
        "BRANDING - GESTÃO DE MARCAS" = 1
        "MÚSICA/CANTO/CANTO/ESPORTE" = 2
        "LEITURA E PRODUÇÃO TEXTUAL" = 1
        "LÍNGUA INGLESA" = 2
        "MATEMÁTICA/ACOMPANHAMENTO PEDAGÓGICO" = 2
        "HISTÓRIA E CULTURA AFRO-BRASILEIRA E INDIGENOAMERICANA" = 1
        "COMPUTAÇÃO" = 1
        "HORÁRIO DE ESTUDO" = 1
        "LÍNGUA PORTUGUESA" = 2
        "MATEMÁTICA" = 2
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 2
        "FILOSOFIA" = 2
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 2
    }
    
    "EPI-FUND II/ANOS FINAIS TEMPO INTEGRAL" = @{
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - CIÊNCIAS" = 1
        "MÚSICA/CANTO/CANTO/ESPORTE" = 2
        "PRINCÍPIOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - CIÊNCIAS" = 1
        "LEITURA E PRODUÇÃO TEXTUAL" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 1
        "ANÁLISE E MODELAGEM DE SISTEMAS" = 1
        "LÍNGUA INGLESA" = 2
        "FRANCÊS E ECONOMIA II" = 1
        "PROJETO DE APROFUNDAGEM INTERDISCIPLINAR" = 1
        "LEITURA, INTERPRETAÇÃO E PRODUÇÃO DE TEXTOS" = 1
        "ATIVIDADES INTEGRADAS - MONITORIA / HORÁRIO DE ESTUDO" = 2
        "PROJETO DE VIDA" = 1
        "COMPUTAÇÃO" = 1
        "HORÁRIO DE ESTUDO" = 1
        "LÍNGUA PORTUGUESA" = 2
        "MATEMÁTICA" = 2
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 2
        "FILOSOFIA" = 2
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 2
    }
    
    "EMI/FAMI NF 1º SERIE" = @{
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - EDUCAÇÃO FÍSICA" = 1
        "TESTE DE SISTEMAS E SEGURANÇA DA INFORMAÇÃO" = 2
        "ATIVIDADES INTEGRADAS - INTELIGÊNCIA ARTIFICIAL" = 1
        "ORIENTAÇÃO PROFISSIONAL E PREPARAÇÃO PARA O MUNDO DO TRABALHO" = 1
        "MATEMÁTICA E COMPUTAÇÃO EM LINGUAGENS (PROGRAMAÇÃO)" = 1
        "ANÁLISE E MODELAGEM DE SISTEMAS" = 1
        "MATEMÁTICA/ACOMPANHAMENTO DA APRENDIZAGEM" = 1
        "ESTATÍSTICA E MÉTODOS DE CIÊNCIAS SOCIAIS" = 1
        "LÍNGUA INGLESA" = 2
        "FRANCÊS E ECONOMIA II" = 1
        "PROJETO DE APROFUNDAGEM INTERDISCIPLINAR" = 1
        "LEITURA, INTERPRETAÇÃO E PRODUÇÃO DE TEXTOS" = 1
        "ATIVIDADES INTEGRADAS - MONITORIA / HORÁRIO DE ESTUDO" = 1
        "ATIVIDADES INTEGRADAS - CULTURA" = 1
        "ÉTICA, TRABALHO E CIDADANIA" = 1
        "ATIVIDADES INTEGRADAS - ESPORTE INTEGRADO FÍSICA E EDUCAÇÃO" = 1
        "LEITURA E PRODUÇÃO TEXTUAL" = 1
        "PROGRAMAÇÃO ESTRUTURADA" = 2
        "LÍNGUA PORTUGUESA" = 2
        "FUNDAMENTOS DE M.U (UX-UI-IHC)" = 1
        "LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "LÍNGUA ESTRANGEIRA ESPANHOL" = 2
        "MATEMÁTICA" = 2
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 2
        "FILOSOFIA" = 2
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 1
        "HORÁRIO DE ESTUDO" = 1
    }
    
    "EMI/FES 3º1-2º SERIE C-A" = @{
        "TESTE DE SISTEMAS E SEGURANÇA DA INFORMAÇÃO" = 2
        "PRODUTOS INTEGRADORES II" = 1
        "ATIVIDADES INTEGRADAS - EDUCAÇÃO FÍSICA - APROFUNDAMENTO" = 1
        "FÍSICA - APROFUNDAMENTO" = 1
        "INTRODUÇÃO AO ECOSSISTEMA DE APLICATIVOS MÓVEIS" = 1
        "BIOLOGIA - APROFUNDAMENTO" = 1
        "INTEGRAÇÃO DE ESTUDOS - PROJETO DE VIDA/MUNDO DO TRABALHO" = 1
        "PERCURSOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 1
        "ORIENTAÇÃO PROFISSIONAL E PREPARAÇÃO PARA O MUNDO DO TRABALHO" = 1
        "INGLÊS FOCADO EM TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO" = 1
        "UX/UI EXPERIENCE (UX)" = 1
        "ARQUITETURA DE MICROSERVIÇOS" = 1
        "PROGRAMAÇÃO PARA DISPOSITIVOS MÓVEIS I" = 1
        "LEITURA, INTERPRETAÇÃO E PRODUÇÃO DE TEXTOS" = 1
        "BANCO DE DADOS - BIG DATA" = 1
        "INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 1
        "MARKETING MOBILE" = 1
        "PROJETO DE VIDA E CARREIRA PROFISSIONAL - PROJETO DE VIDA E CARREIRA / EDUCAÇÃO DE ESTUDOS" = 1
        "QUÍMICA - APROFUNDAMENTO" = 1
        "GESTÃO E LIDERANÇA - GESTÃO DE EQUIPES" = 2
        "LOGÍSTICA E OPERAÇÕES II" = 1
        "BANCO DE DADOS (SGBD)" = 1
        "INTERAÇÃO DISCURSIVA - LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "PROGRAMAÇÃO ESTRUTURADA" = 2
        "FUNDAMENTOS DE REDE" = 2
        "COMPUTAÇÃO" = 2
        "LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "MATEMÁTICA" = 2
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 1
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 2
        "HORÁRIO DE ESTUDO" = 2
    }
    
    "EMI/FRANC-1º SERIE" = @{
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - EDUCAÇÃO FÍSICA" = 1
        "FÍSICA - APROFUNDAMENTO" = 1
        "PRINCÍPIOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - FILOSOFIA" = 1
        "EXPORTAÇÃO E IMPORTAÇÃO DE LEITURA DE MUNDO" = 1
        "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA" = 1
        "MATEMÁTICA E COMPUTAÇÃO EM LINGUAGENS (PROGRAMAÇÃO)" = 1
        "LEITURA E PRODUÇÃO TEXTUAL" = 1
        "LOGÍSTICA E ORGANIZAÇÃO II" = 2
        "PROJETO DE APROFUNDAGEM INTEGRAÇÃO DE ESTUDOS - HISTÓRIA" = 1
        "PRINCÍPIO DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - ARTE" = 1
        "LEITURA, INTERPRETAÇÃO E PRODUÇÃO DE TEXTOS" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - MONITORIA / ROBÓTICA DE ESTUDOS - MONITORIA / ROBÓTICA" = 1
        "ATIVIDADES INTEGRADAS - QUÍMICA - APROFUNDAMENTO" = 1
        "ECO - OTIMIZAÇÃO PARA MECANISMOS DE BUSCA" = 1
        "ATIVIDADES INTEGRADAS - CIÊNCIA DA NATUREZA - APROFUNDAMENTO" = 1
        "EDUCAÇÃO FÍSICA - APROFUNDAMENTO" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - FILOSOFIA E SOCIOLOGIA" = 1
        "APROFUNDAMENTO - ESPANHOL" = 2
        "ESPANHOL/ESTRUTURA/CULTURA DE LINGUAGENS E APLICAÇÃO SOCIAL" = 2
        "ECOLOGIA LÍNGUA INGLESA" = 2
        "LINGUAGEM E SUAS TECNOLOGIAS" = 2
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - SOCIOLOGIA" = 2
        "LINGUAGENS E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA" = 2
        "ECOLOGIA LÍNGUA PORTUGUESA - RETROSPECTIVA OBRIGATÓRIA" = 2
        "ECOLOGIA LÍNGUA PORTUGUESA" = 2
        "LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "MATEMÁTICA" = 2
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 1
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 2
    }
    
    "EMI/FRANC-2º SERIE C-A" = @{
        "BRANDING - GESTÃO DE MARCAS" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LINGUAGENS" = 1
        "ATIVIDADES INTEGRADAS - EDUCAÇÃO FÍSICA - APROFUNDAMENTO" = 1
        "CAIXAS, OPERADORES FINANCEIROS E GESTÃO DO RELACIONAMENTO" = 1
        "LÍNGUA PORTUGUESA E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA E LITERATURA" = 1
        "LÍNGUA INGLESA E SUAS TECNOLOGIAS - LÍNGUA INGLESA" = 1
        "FÍSICA E SUAS TECNOLOGIAS - FÍSICA" = 1
        "QUÍMICA E SUAS TECNOLOGIAS - QUÍMICA" = 1
        "INTELIGÊNCIA ARTIFICIAL" = 1
        "CIÊNCIAS HUMANAS E SOCIAIS - HISTÓRIA" = 1
        "ARTE E SUAS TECNOLOGIAS - ARTE" = 1
        "GEOGRAFIA E SUAS TECNOLOGIAS - GEOGRAFIA" = 1
        "METODOLOGIA DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - PORTUGUÊS" = 1
        "TIMBRAR DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS" = 1
        "MATEMÁTICA/COMPONENTES E APROFUNDAMENTO" = 1
        "PEDAGOGIA E APROFUNDAMENTO" = 1
        "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA" = 2
        "SOCIOLOGIA E SUAS TECNOLOGIAS - SOCIOLOGIA" = 1
        "LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "MATEMÁTICA" = 2
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 1
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 2
    }
    
    "EMI/FES 3º1-1º SERIE" = @{
        "INTRODUÇÃO À E-COMMERCE COMPRAVIVE DE LEITURA" = 2
        "APROFUNDAMENTO E INTEGRAÇÃO - LÍNGUA PORTUGUESA" = 2
        "MATEMÁTICA/ACOMPANHAMENTO DA APRENDIZAGEM" = 1
        "ORIENTAÇÃO PROFISSIONAL E DIREÇÃO PROFISSIONAL E EMPODERAMENTO" = 1
        "FRANCÊS E ECONOMIA II" = 1
        "PROJETO INTEGRADOR" = 2
        "ECO - OTIMIZAÇÃO PARA MECANISMOS DE BUSCA" = 2
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 2
        "ATIVIDADES INTEGRADAS - ESPANHOL - APROFUNDAMENTO" = 2
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LÍNGUA INGLESA/ESPANHOL" = 2
        "GESTÃO DE PESSOAS II" = 2
        "QUÍMICA - APROFUNDAMENTO" = 1
        "LINGUAGENS E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA" = 2
        "LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "LÍNGUA ESTRANGEIRA ESPANHOL" = 2
        "MATEMÁTICA" = 2
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 2
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 2
        "HORÁRIO DE ESTUDO" = 2
    }
    
    "EMI/FES 3º1-2º SERIE" = @{
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - EDUCAÇÃO FÍSICA" = 1
        "INTRODUÇÃO AO ECOSSISTEMA DE APLICATIVOS MÓVEIS" = 1
        "BIOLOGIA - APROFUNDAMENTO" = 1
        "INTEGRAÇÃO DE ESTUDOS - PROJETO DE VIDA/MUNDO DO TRABALHO" = 1
        "PERCURSOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 1
        "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA" = 1
        "INGLÊS FOCADO EM TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO" = 1
        "PROJETO DE APROFUNDAGEM INTEGRAÇÃO DE ESTUDOS - HISTÓRIA" = 1
        "PRINCÍPIO DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - ARTE" = 1
        "PROGRAMAÇÃO PARA DISPOSITIVOS MÓVEIS I" = 1
        "ATIVIDADES INTEGRADAS - ESPANHOL - APROFUNDAMENTO" = 1
        "BANCO DE DADOS - BIG DATA" = 1
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - MONITORIA / ROBÓTICA DE ESTUDOS - MONITORIA / ROBÓTICA" = 1
        "PROJETO DE VIDA E CARREIRA PROFISSIONAL - PROJETO DE VIDA E CARREIRA / EDUCAÇÃO DE ESTUDOS" = 1
        "ECO - OTIMIZAÇÃO PARA MECANISMOS DE BUSCA" = 1
        "ATIVIDADES INTEGRADAS - CIÊNCIA DA NATUREZA - APROFUNDAMENTO" = 1
        "TIMBRAR DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS" = 1
        "PEDAGOGIA E APROFUNDAMENTO" = 1
        "GESTÃO E LIDERANÇA - GESTÃO DE EQUIPES" = 2
        "HORÁRIO DE ESTUDO" = 1
        "SOCIOLOGIA E SUAS TECNOLOGIAS - SOCIOLOGIA" = 1
        "APROFUNDAMENTO - ESPANHOL" = 2
        "INTERAÇÃO DISCURSIVA - LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "ECOLOGIA LÍNGUA INGLESA" = 2
        "LINGUAGEM E SUAS TECNOLOGIAS" = 2
        "COMPUTAÇÃO" = 2
        "LINGUAGENS E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA" = 2
        "ECOLOGIA LÍNGUA PORTUGUESA" = 2
        "LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "MATEMÁTICA" = 4
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 2
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 2
    }
    
    "UNIVER 1º SERIE 1-A" = @{
        "PROGRAMAÇÃO VER FRONT-END" = 1
        "BIOLOGIA - APROFUNDAMENTO" = 1
        "QUÍMICA - APROFUNDAMENTO" = 1
        "HORÁRIO DE ESTUDO" = 2
        "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 1
        "LOGÍSTICA E OPERAÇÕES II" = 1
        "PROGRAMAÇÃO PARA DISPOSITIVOS MÓVEIS I" = 1
        "PROJETO DE VIDA" = 1
        "INTELIGÊNCIA ARTIFICIAL" = 1
        "INTERNET DAS COISAS - WOT" = 2
        "LOGÍSTICA E OPERAÇÕES I" = 1
        "PROGRAMAÇÃO ESTRUTURADA" = 1
        "LÍNGUA ESTRANGEIRA INGLÊS" = 2
        "MATEMÁTICA" = 4
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 2
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 2
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
    Write-Host "   📊 Encontradas: $($classes.Count) turmas no sistema" -ForegroundColor White
    Write-Host ""
    Write-Host "   Turmas cadastradas:" -ForegroundColor Cyan
    $classes | Sort-Object name | ForEach-Object { Write-Host "      - $($_.name)" -ForegroundColor DarkCyan }
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
            $notFoundSubjects[$className] | Select-Object -First 5 | ForEach-Object { 
                Write-Host "         - $_" -ForegroundColor DarkGray 
            }
            if ($notFoundSubjects[$className].Count -gt 5) {
                Write-Host "         ... e mais $($notFoundSubjects[$className].Count - 5)" -ForegroundColor DarkGray
            }
        }
    }

    if ($updates.Count -eq 0) {
        Write-Host ""
        Write-Host "❌ Nenhuma atualização a ser feita!" -ForegroundColor Red
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        exit 1
    }

    Write-Host ""

    # 6️⃣ Confirmação
    Write-Host "⚠️  CONFIRMAÇÃO" -ForegroundColor Yellow
    Write-Host "   Atualizar carga horária de $($updates.Count) turma(s)?" -ForegroundColor White
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
            $currentClass = Invoke-RestMethod -Uri "$apiUrl/classes/$($update.classId)" `
                -Method GET `
                -Headers $headers `
                -ErrorAction Stop

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
        Write-Host ""
        Write-Host "🚀 Próximo passo: Criar versão para PRODUÇÃO" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Concluído com alguns erros." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
