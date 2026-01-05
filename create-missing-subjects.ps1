# ═══════════════════════════════════════════════════════════
# 📚 CRIAÇÃO DE DISCIPLINAS FALTANTES - SEM DUPLICADOS
# ═══════════════════════════════════════════════════════════

$apiUrl = "https://criador-horario-backend-1.onrender.com/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📚 CRIAÇÃO DE DISCIPLINAS FALTANTES - PLANILHA 2025" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Lista de disciplinas necessárias (da planilha)
$requiredSubjects = @(
    "ARQUITETURA DE MICROSERVIÇOS"
    "ARTE"
    "ARTE E SUAS TECNOLOGIAS - ARTE"
    "ATIVIDADES INTEGRADAS - EDUCAÇÃO FÍSICA - APROFUNDAMENTO"
    "ATIVIDADES INTEGRADAS - INTELIGÊNCIA ARTIFICIAL"
    "BANCO DE DADOS - BIG DATA"
    "BANCO DE DADOS (SGBD)"
    "BIOLOGIA"
    "BIOLOGIA - APROFUNDAMENTO"
    "BRANDING - GESTÃO DE MARCAS"
    "CAIXAS, OPERADORES FINANCEIROS E GESTÃO DO RELACIONAMENTO"
    "CIÊNCIAS HUMANAS E SOCIAIS - HISTÓRIA"
    "COMPUTAÇÃO"
    "EDUCAÇÃO FÍSICA"
    "FILOSOFIA"
    "FÍSICA"
    "FÍSICA - APROFUNDAMENTO"
    "FÍSICA E SUAS TECNOLOGIAS - FÍSICA"
    "FUNDAMENTOS DE REDE"
    "GEOGRAFIA"
    "GEOGRAFIA E SUAS TECNOLOGIAS - GEOGRAFIA"
    "GESTÃO E LIDERANÇA - GESTÃO DE EQUIPES"
    "HISTÓRIA"
    "HORÁRIO DE ESTUDO"
    "INGLÊS FOCADO EM TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO"
    "INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA"
    "INTEGRAÇÃO DE ESTUDOS - PROJETO DE VIDA/MUNDO DO TRABALHO"
    "INTELIGÊNCIA ARTIFICIAL"
    "INTERAÇÃO DISCURSIVA - LÍNGUA ESTRANGEIRA INGLÊS"
    "INTERNET DAS COISAS - WOT"
    "INTRODUÇÃO AO ECOSSISTEMA DE APLICATIVOS MÓVEIS"
    "LEITURA, INTERPRETAÇÃO E PRODUÇÃO DE TEXTOS"
    "LÍNGUA ESTRANGEIRA INGLÊS"
    "LÍNGUA INGLESA"
    "LÍNGUA INGLESA E SUAS TECNOLOGIAS - LÍNGUA INGLESA"
    "LÍNGUA PORTUGUESA"
    "LÍNGUA PORTUGUESA E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA E LITERATURA"
    "LOGÍSTICA E OPERAÇÕES I"
    "LOGÍSTICA E OPERAÇÕES II"
    "MARKETING MOBILE"
    "MATEMÁTICA"
    "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA"
    "MATEMÁTICA/COMPONENTES E APROFUNDAMENTO"
    "METODOLOGIA DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - PORTUGUÊS"
    "ORIENTAÇÃO PROFISSIONAL E PREPARAÇÃO PARA O MUNDO DO TRABALHO"
    "PEDAGOGIA E APROFUNDAMENTO"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LINGUAGENS"
    "PERCURSOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA"
    "PRODUTOS INTEGRADORES II"
    "PROGRAMAÇÃO ESTRUTURADA"
    "PROGRAMAÇÃO PARA DISPOSITIVOS MÓVEIS I"
    "PROGRAMAÇÃO VER FRONT-END"
    "PROJETO DE VIDA"
    "PROJETO DE VIDA E CARREIRA PROFISSIONAL - PROJETO DE VIDA E CARREIRA / EDUCAÇÃO DE ESTUDOS"
    "QUÍMICA"
    "QUÍMICA - APROFUNDAMENTO"
    "QUÍMICA E SUAS TECNOLOGIAS - QUÍMICA"
    "SOCIOLOGIA"
    "SOCIOLOGIA E SUAS TECNOLOGIAS - SOCIOLOGIA"
    "TESTE DE SISTEMAS E SEGURANÇA DA INFORMAÇÃO"
    "TIMBRAR DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS"
    "UX/UI EXPERIENCE (UX)"
) | Sort-Object

Write-Host "📋 Disciplinas necessárias: $($requiredSubjects.Count)" -ForegroundColor Cyan
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
    
    # Carregar disciplinas existentes
    Write-Host "📚 Carregando disciplinas existentes..." -ForegroundColor Yellow
    $subjectsResponse = Invoke-RestMethod -Uri "$apiUrl/subjects" -Headers $headers
    $existingSubjects = $subjectsResponse.data
    Write-Host "📊 Encontradas: $($existingSubjects.Count) disciplinas no sistema" -ForegroundColor White
    Write-Host ""
    
    # Criar mapa de nomes existentes (case-insensitive)
    $existingNames = @{}
    foreach ($subject in $existingSubjects) {
        if ($subject.name) {
            $normalizedName = $subject.name.Trim().ToUpper()
            if (-not $existingNames.ContainsKey($normalizedName)) {
                $existingNames[$normalizedName] = @($subject)
            } else {
                $existingNames[$normalizedName] += $subject
            }
        }
    }
    
    # Identificar duplicados
    Write-Host "🔍 Verificando duplicados..." -ForegroundColor Yellow
    $duplicates = @()
    foreach ($name in $existingNames.Keys) {
        if ($existingNames[$name].Count -gt 1) {
            $duplicates += [PSCustomObject]@{
                Name = $existingNames[$name][0].name
                Count = $existingNames[$name].Count
                Ids = ($existingNames[$name] | ForEach-Object { $_._id }) -join ", "
            }
        }
    }
    
    if ($duplicates.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  DUPLICADOS ENCONTRADOS:" -ForegroundColor Yellow
        foreach ($dup in $duplicates) {
            Write-Host "   - $($dup.Name) ($($dup.Count) vezes)" -ForegroundColor DarkYellow
        }
        Write-Host ""
        Write-Host "   💡 Mantenha apenas 1 de cada via interface web" -ForegroundColor Cyan
        Write-Host "   (Acesse: https://criador-horario-aula.surge.sh/subjects)" -ForegroundColor DarkGray
        Write-Host ""
    } else {
        Write-Host "✅ Nenhum duplicado encontrado" -ForegroundColor Green
        Write-Host ""
    }
    
    # Identificar disciplinas faltantes
    Write-Host "🔍 Identificando disciplinas faltantes..." -ForegroundColor Yellow
    $toCreate = @()
    foreach ($required in $requiredSubjects) {
        $normalizedRequired = $required.Trim().ToUpper()
        if (-not $existingNames.ContainsKey($normalizedRequired)) {
            $toCreate += $required
        }
    }
    
    Write-Host "📊 Faltam criar: $($toCreate.Count) disciplinas" -ForegroundColor Cyan
    Write-Host ""
    
    if ($toCreate.Count -eq 0) {
        Write-Host "✅ Todas as disciplinas já existem!" -ForegroundColor Green
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        exit 0
    }
    
    # Criar disciplinas faltantes
    Write-Host "📝 Criando disciplinas faltantes..." -ForegroundColor Yellow
    Write-Host ""
    
    $created = 0
    $failed = 0
    $failedList = @()
    
    foreach ($subjectName in $toCreate) {
        $subjectBody = @{
            name = $subjectName
            code = ""
            workloadHours = 40
            description = "Disciplina da planilha 2025"
            color = "#4a90e2"
            isActive = $true
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri "$apiUrl/subjects" -Method POST -ContentType "application/json" -Headers $headers -Body $subjectBody | Out-Null
            Write-Host "   ✅ $subjectName" -ForegroundColor Green
            $created++
            Start-Sleep -Milliseconds 500  # Delay entre criações
        } catch {
            Write-Host "   ❌ $subjectName - $($_.Exception.Message)" -ForegroundColor Red
            $failed++
            $failedList += $subjectName
        }
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ CRIAÇÃO CONCLUÍDA!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 ESTATÍSTICAS:" -ForegroundColor Cyan
    Write-Host "   Total necessárias: $($requiredSubjects.Count)" -ForegroundColor White
    Write-Host "   Já existiam: $($requiredSubjects.Count - $toCreate.Count)" -ForegroundColor Cyan
    Write-Host "   Criadas agora: $created" -ForegroundColor Green
    if ($failed -gt 0) {
        Write-Host "   Falharam: $failed" -ForegroundColor Yellow
    }
    if ($duplicates.Count -gt 0) {
        Write-Host "   Duplicados encontrados: $($duplicates.Count)" -ForegroundColor Yellow
    }
    Write-Host ""
    
    if ($failedList.Count -gt 0) {
        Write-Host "❌ DISCIPLINAS QUE FALHARAM:" -ForegroundColor Red
        foreach ($name in $failedList) {
            Write-Host "   - $name" -ForegroundColor DarkRed
        }
        Write-Host ""
    }
    
    if ($duplicates.Count -gt 0) {
        Write-Host "⚠️  IMPORTANTE: Remova duplicados manualmente" -ForegroundColor Yellow
        Write-Host "   Acesse: https://criador-horario-aula.surge.sh/subjects" -ForegroundColor White
        Write-Host "   Exclua as disciplinas duplicadas (manter apenas 1 de cada)" -ForegroundColor DarkGray
        Write-Host ""
    }
    
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
