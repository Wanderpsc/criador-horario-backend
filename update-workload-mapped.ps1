# ═══════════════════════════════════════════════════════════
# 📚 ATUALIZAR CARGA HORÁRIA - PRODUÇÃO COM MAPEAMENTO
# ═══════════════════════════════════════════════════════════

$apiUrl = "https://criador-horario-backend-1.onrender.com/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📚 ATUALIZAÇÃO DE CARGA HORÁRIA - PRODUÇÃO" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# MAPEAMENTO: Nome no Sistema → Disciplinas da Planilha
# ============================================================

$workloadData = @{
    # FUNDAMENTO II - 9º ANO (2 turmas com mesmas disciplinas da planilha EPI-FUND II)
    "EFR-FUND IIANOS FINAIS INT-9º ANO-I-A" = @{
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
    
    "EFR-FUND IIANOS FINAIS INT-9º ANO-I-B" = @{
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
    
    # ENSINO MÉDIO INTEGRAL - 3ª SÉRIE (33 disciplinas = EMI/FAMI NF 1º SERIE da planilha)
    "EMRINTEGRAL-3ª SERIE-I-A" = @{
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
    
    # DESENVOLVIMENTO DE SISTEMAS - 1ª SÉRIE (31 disciplinas = EMI/FES 3º1-1º SERIE)
    "EMTP DES SIST -  1ª SERIE-I-A" = @{
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
    
    # DESENVOLVIMENTO DE SISTEMAS - 2ª SÉRIE INTEGRAL (28 disciplinas = EMI/FES 3º1-2º SERIE)
    "EMTPDES-SIS-2ª SERIE - INTEGRAL-I-A" = @{
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
        "BANCO DE DADOS - BIG DATA" = 1
        "INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA" = 1
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
    
    # ADMINISTRAÇÃO - 1ª SÉRIE (28 disciplinas = EMI/FRANC-1º SERIE)
    "EMTP ADMI - EMPR - 1ª SERIE-I-A" = @{
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
    
    # ADMINISTRAÇÃO - 2ª SÉRIE PROPEDÊUTICO (30 disciplinas = EMI/FRANC-2º SERIE C-A)
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
    
    # MARKETING DIGITAL - 2ª SÉRIE INTEGRAL (31 disciplinas = EMI/FES 3º1-2º SERIE C-A)
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
    
    # DESENVOLVIMENTO DE SISTEMAS - 3ª SÉRIE A (25 disciplinas = UNIVER 1º SERIE 1-A)
    "EMTPDES-SIS-3ª SERIE - INTEGRAL-I-A" = @{
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

Write-Host "📋 TURMAS CONFIGURADAS: $($workloadData.Keys.Count)" -ForegroundColor Yellow
Write-Host ""

try {
    # 1️⃣ Login
    Write-Host "1️⃣  Autenticando..." -ForegroundColor Yellow
    $loginBody = @{
        email = $cetiEmail
        password = $cetiPassword
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "   ✅ Login OK" -ForegroundColor Green
    Write-Host ""
    
    # 2️⃣ Carregar turmas
    Write-Host "2️⃣  Carregando turmas..." -ForegroundColor Yellow
    $classesResponse = Invoke-RestMethod -Uri "$apiUrl/classes" -Headers $headers
    $allClasses = $classesResponse.data
    Write-Host "   📊 Encontradas: $($allClasses.Count) turmas" -ForegroundColor Cyan
    Write-Host ""
    
    # 3️⃣ Carregar disciplinas
    Write-Host "3️⃣  Carregando disciplinas..." -ForegroundColor Yellow
    $subjectsResponse = Invoke-RestMethod -Uri "$apiUrl/subjects" -Headers $headers
    $allSubjects = $subjectsResponse.data
    Write-Host "   📊 Encontradas: $($allSubjects.Count) disciplinas" -ForegroundColor Cyan
    Write-Host ""
    
    # 4️⃣ Criar backup
    Write-Host "4️⃣  Criando backup..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backup-workload-$timestamp.json"
    $backupData = @{
        timestamp = $timestamp
        classes = $allClasses
        subjects = $allSubjects
    }
    $backupData | ConvertTo-Json -Depth 10 | Out-File $backupFile -Encoding UTF8
    Write-Host "   ✅ Backup: $backupFile" -ForegroundColor Green
    Write-Host ""
    
    # 5️⃣ Processar atualizações
    Write-Host "5️⃣  Processando atualizações..." -ForegroundColor Yellow
    Write-Host ""
    
    $updatesProcessed = 0
    $updatesFailed = 0
    
    foreach ($className in $workloadData.Keys) {
        $classData = $workloadData[$className]
        
        # Encontrar turma
        $class = $allClasses | Where-Object { $_.name -eq $className }
        if (-not $class) {
            Write-Host "   ⚠️  Turma não encontrada: $className" -ForegroundColor Yellow
            $updatesFailed++
            continue
        }
        
        Write-Host "   📚 $className" -ForegroundColor Cyan
        
        # Preparar dados
        $subjectIds = @()
        $weeklyHours = @{}
        $matched = 0
        $notFound = 0
        
        foreach ($subjectName in $classData.Keys) {
            $hours = $classData[$subjectName]
            
            # Buscar disciplina
            $subject = $allSubjects | Where-Object { $_.name -eq $subjectName }
            if ($subject) {
                $subjectIds += $subject._id
                $weeklyHours[$subject._id] = $hours
                $matched++
            } else {
                Write-Host "      ⚠️  Disciplina não encontrada: $subjectName" -ForegroundColor Yellow
                $notFound++
            }
        }
        
        if ($matched -eq 0) {
            Write-Host "      ❌ Nenhuma disciplina válida" -ForegroundColor Red
            $updatesFailed++
            continue
        }
        
        # Atualizar turma
        $updateBody = @{
            name = $class.name
            gradeId = $class.gradeId
            shift = $class.shift
            isActive = $class.isActive
            subjectIds = $subjectIds
            weeklyHours = $weeklyHours
        } | ConvertTo-Json -Depth 5
        
        try {
            $updateResponse = Invoke-RestMethod -Uri "$apiUrl/classes/$($class._id)" -Method PUT -ContentType "application/json" -Headers $headers -Body $updateBody
            Write-Host "      ✅ Atualizada: $matched disciplinas, $notFound não encontradas" -ForegroundColor Green
            $updatesProcessed++
        } catch {
            Write-Host "      ❌ Erro ao atualizar: $($_.Exception.Message)" -ForegroundColor Red
            $updatesFailed++
        }
        
        Start-Sleep -Milliseconds 300
        Write-Host ""
    }
    
    # 6️⃣ Resumo final
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ CONCLUÍDO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   📊 Turmas atualizadas: $updatesProcessed" -ForegroundColor Green
    if ($updatesFailed -gt 0) {
        Write-Host "   ⚠️  Com problemas: $updatesFailed" -ForegroundColor Yellow
    }
    Write-Host "   💾 Backup salvo: $backupFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Acesse: https://criador-horario-aula.surge.sh/class-subjects" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
