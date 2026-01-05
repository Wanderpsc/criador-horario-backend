# ═══════════════════════════════════════════════════════════
# 📚 ATUALIZAÇÃO DE CARGAS HORÁRIAS - PLANILHA 2025
# Atualiza apenas turmas de 2ª e 3ª séries (não mexe nas 1ªs)
# ═══════════════════════════════════════════════════════════

$apiUrl = "https://criador-horario-backend-1.onrender.com/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📚 ATUALIZAÇÃO DE CARGAS HORÁRIAS - PLANILHA 2025" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# AGUARDAR RATE LIMIT (20 MINUTOS PARA GARANTIR)
# ============================================================

Write-Host "⏳ Aguardando rate limit resetar completamente (20 minutos)..." -ForegroundColor Yellow
Write-Host ""
for ($i = 1200; $i -gt 0; $i--) {
    $mins = [Math]::Floor($i / 60)
    $secs = $i % 60
    Write-Host "`r   Restam: $mins min $secs seg " -NoNewline -ForegroundColor White
    Start-Sleep -Seconds 1
}
Write-Host "`n"

# ============================================================
# DADOS DA PLANILHA 2025 - APENAS 2ª E 3ª SÉRIES
# ============================================================

$workloadData = @{
    # FUNDAMENTOS II - 9º ANO (2 turmas)
    "EFR-FUND IIANOS FINAIS INT-9º ANO-I-A" = @{
        "EDUCAÇÃO FÍSICA" = 1
        "HORÁRIO DE ESTUDO" = 2
        "PROJETO DE VIDA" = 1
        "LÍNGUA PORTUGUESA" = 3
        "MATEMÁTICA" = 3
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 1
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
        "LÍNGUA INGLESA" = 1
    }
    
    "EFR-FUND IIANOS FINAIS INT-9º ANO-I-B" = @{
        "EDUCAÇÃO FÍSICA" = 1
        "HORÁRIO DE ESTUDO" = 2
        "LÍNGUA PORTUGUESA" = 3
        "MATEMÁTICA" = 3
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 1
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
    }
    
    # MÉDIO REGULAR INTEGRAL - 3ª SÉRIE
    "EMRINTEGRAL-3ª SERIE-I-A" = @{
        "BRANDING - GESTÃO DE MARCAS" = 1
        "BIOLOGIA - APROFUNDAMENTO" = 2
        "HORÁRIO DE ESTUDO" = 1
        "PROJETO DE VIDA" = 1
        "LÍNGUA PORTUGUESA" = 3
        "MATEMÁTICA" = 4
        "FÍSICA" = 2
        "QUÍMICA" = 2
        "BIOLOGIA" = 2
        "HISTÓRIA" = 2
        "GEOGRAFIA" = 2
        "ARTE" = 2
        "FILOSOFIA" = 1
        "SOCIOLOGIA" = 1
        "EDUCAÇÃO FÍSICA" = 1
    }
    
    # TÉCNICO DESENVOLVIMENTO SISTEMAS - 2ª SÉRIE INTEGRAL
    "EMTPDES-SIS-2ª SERIE - INTEGRAL-I-A" = @{
        "TESTE DE SISTEMAS E SEGURANÇA DA INFORMAÇÃO" = 2
        "PRODUTOS INTEGRADORES II" = 1
        "BIOLOGIA - APROFUNDAMENTO" = 1
        "FÍSICA - APROFUNDAMENTO" = 1
        "INTRODUÇÃO AO ECOSSISTEMA DE APLICATIVOS MÓVEIS" = 1
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
    
    # TÉCNICO DESENVOLVIMENTO SISTEMAS - 3ª SÉRIE INTEGRAL (2 turmas)
    "EMTPDES-SIS-3ª SERIE - INTEGRAL-I-A" = @{
        "ATIVIDADES INTEGRADAS - INTELIGÊNCIA ARTIFICIAL" = 1
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
    
    "EMTPDES-SIS-3ª SERIE - INTEGRAL-I-B" = @{
        "ATIVIDADES INTEGRADAS - INTELIGÊNCIA ARTIFICIAL" = 1
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
    
    # TÉCNICO ADMINISTRAÇÃO - 2ª SÉRIE PROPEDÊUTICO
    "EMTPADMI-2ª SERIE - PROPEDEUTICO-I-A" = @{
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
    
    # TÉCNICO MARKETING DIGITAL - 2ª SÉRIE INTEGRAL
    "EMTPMARK-DIG-2ª SERIE - INTEGRAL-I-A" = @{
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
}

Write-Host "📋 Turmas a atualizar: $($workloadData.Keys.Count)" -ForegroundColor Cyan
Write-Host "   (Apenas 2ª e 3ª séries - 1ª séries não incluídas)" -ForegroundColor DarkGray
Write-Host ""

# ============================================================
# PROCESSAR ATUALIZAÇÕES
# ============================================================

try {
    Write-Host "🔐 Autenticando..." -ForegroundColor Cyan
    $loginBody = @{
        email = $cetiEmail
        password = $cetiPassword
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "✅ Login OK" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📚 Carregando turmas..." -ForegroundColor Cyan
    $classesResponse = Invoke-RestMethod -Uri "$apiUrl/classes" -Headers $headers
    $allClasses = $classesResponse.data
    Write-Host "📊 Encontradas: $($allClasses.Count) turmas no sistema" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📚 Carregando disciplinas..." -ForegroundColor Cyan
    $allSubjects = Invoke-RestMethod -Uri "$apiUrl/subjects" -Headers $headers
    Write-Host "📊 Encontradas: $($allSubjects.Count) disciplinas no sistema" -ForegroundColor White
    Write-Host ""
    
    Write-Host "💾 Criando backup..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backup-workload-2025-$timestamp.json"
    $backupData = @{
        timestamp = $timestamp
        classes = $allClasses
        subjects = $allSubjects
    }
    $backupData | ConvertTo-Json -Depth 10 | Out-File $backupFile -Encoding UTF8
    Write-Host "✅ Backup: $backupFile" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🔄 Processando atualizações..." -ForegroundColor Cyan
    Write-Host ""
    
    $updatesSuccess = 0
    $updatesFailed = 0
    $totalAssociations = 0
    $notFoundSubjects = @{}
    
    foreach ($className in $workloadData.Keys) {
        $classData = $workloadData[$className]
        
        Write-Host "   🔍 Buscando turma: $className" -ForegroundColor Gray
        $class = $allClasses | Where-Object { $_.name -eq $className }
        if (-not $class) {
            Write-Host "   ⚠️  Turma não encontrada: $className" -ForegroundColor Yellow
            $updatesFailed++
            continue
        }
        
        Write-Host "   ✅ Turma encontrada (ID: $($class.id))" -ForegroundColor Gray
        Write-Host "   📚 $className" -ForegroundColor Cyan
        
        $subjectIds = @()
        $weeklyHours = @{}
        $matched = 0
        $notFound = 0
        
        foreach ($subjectName in $classData.Keys) {
            $hours = $classData[$subjectName]
            
            # Tentar match exato primeiro
            $subject = $allSubjects | Where-Object { $_.name -eq $subjectName }
            
            # Se não encontrou, tentar match case-insensitive
            if (-not $subject) {
                $subject = $allSubjects | Where-Object { 
                    $_.name -and ($_.name.Trim().ToUpper() -eq $subjectName.Trim().ToUpper())
                } | Select-Object -First 1
            }
            
            if ($subject) {
                $subjectIds += $subject._id
                $weeklyHours[$subject._id] = $hours
                $matched++
            } else {
                $notFound++
                if (-not $notFoundSubjects.ContainsKey($subjectName)) {
                    $notFoundSubjects[$subjectName] = 0
                }
                $notFoundSubjects[$subjectName]++
            }
        }
        
        if ($matched -eq 0) {
            Write-Host "      ❌ Nenhuma disciplina válida encontrada" -ForegroundColor Red
            $updatesFailed++
            continue
        }
        
        $updateBody = @{
            name = $class.name
            gradeId = $class.gradeId
            shift = $class.shift
            isActive = $class.isActive
            subjectIds = $subjectIds
            weeklyHours = $weeklyHours
        } | ConvertTo-Json -Depth 5
        
        try {
            Invoke-RestMethod -Uri "$apiUrl/classes/$($class.id)" -Method PUT -ContentType "application/json" -Headers $headers -Body $updateBody | Out-Null
            Write-Host "      ✅ $matched disciplinas com carga horária atualizada" -ForegroundColor Green
            if ($notFound -gt 0) {
                Write-Host "      ⚠️  $notFound disciplinas não encontradas (criar manualmente)" -ForegroundColor Yellow
            }
            $updatesSuccess++
            $totalAssociations += $matched
        } catch {
            Write-Host "      ❌ Erro ao atualizar: $($_.Exception.Message)" -ForegroundColor Red
            $updatesFailed++
        }
        
        Start-Sleep -Milliseconds 800
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ ATUALIZAÇÃO CONCLUÍDA!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 ESTATÍSTICAS:" -ForegroundColor Cyan
    Write-Host "   Turmas atualizadas: $updatesSuccess de $($workloadData.Keys.Count)" -ForegroundColor Green
    Write-Host "   Associações criadas: $totalAssociations" -ForegroundColor Cyan
    if ($updatesFailed -gt 0) {
        Write-Host "   Com problemas: $updatesFailed" -ForegroundColor Yellow
    }
    Write-Host "   Backup: $backupFile" -ForegroundColor White
    Write-Host ""
    
    if ($notFoundSubjects.Count -gt 0) {
        Write-Host "⚠️  DISCIPLINAS NÃO ENCONTRADAS (criar manualmente):" -ForegroundColor Yellow
        foreach ($subject in $notFoundSubjects.Keys | Sort-Object) {
            Write-Host "   - $subject (usada em $($notFoundSubjects[$subject]) turma(s))" -ForegroundColor DarkYellow
        }
        Write-Host ""
    }
    
    Write-Host "🌐 Verificar resultado:" -ForegroundColor Cyan
    Write-Host "   https://criador-horario-aula.surge.sh/class-subjects" -ForegroundColor White
    Write-Host ""
    Write-Host "   Email: escola@ceti.com" -ForegroundColor Yellow
    Write-Host "   Senha: Ceti2025@" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    if ($_.Exception.Message -like "*429*") {
        Write-Host "⚠️  Rate limit ainda ativo. Tente novamente em 15 minutos." -ForegroundColor Yellow
    }
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
