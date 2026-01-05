# ═══════════════════════════════════════════════════════════
# 📚 CRIAR DISCIPLINAS DA PLANILHA NO SISTEMA
# ═══════════════════════════════════════════════════════════

$apiUrl = "https://criador-horario-backend-1.onrender.com/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📚 CRIAÇÃO DE DISCIPLINAS DA PLANILHA" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Lista completa de disciplinas únicas da planilha
$planilhaSubjects = @(
    "ANÁLISE E MODELAGEM DE SISTEMAS"
    "APROFUNDAMENTO - ESPANHOL"
    "APROFUNDAMENTO E INTEGRAÇÃO - LÍNGUA PORTUGUESA"
    "ARQUITETURA DE MICROSERVIÇOS"
    "ARTE"
    "ARTE E SUAS TECNOLOGIAS - ARTE"
    "ATIVIDADES INTEGRADAS - CIÊNCIA DA NATUREZA - APROFUNDAMENTO"
    "ATIVIDADES INTEGRADAS - CULTURA"
    "ATIVIDADES INTEGRADAS - EDUCAÇÃO FÍSICA - APROFUNDAMENTO"
    "ATIVIDADES INTEGRADAS - ESPANHOL - APROFUNDAMENTO"
    "ATIVIDADES INTEGRADAS - ESPORTE INTEGRADO FÍSICA E EDUCAÇÃO"
    "ATIVIDADES INTEGRADAS - INTELIGÊNCIA ARTIFICIAL"
    "ATIVIDADES INTEGRADAS - MONITORIA / HORÁRIO DE ESTUDO"
    "ATIVIDADES INTEGRADAS - QUÍMICA - APROFUNDAMENTO"
    "BANCO DE DADOS - BIG DATA"
    "BANCO DE DADOS (SGBD)"
    "BIOLOGIA"
    "BIOLOGIA - APROFUNDAMENTO"
    "BRANDING - GESTÃO DE MARCAS"
    "CAIXAS, OPERADORES FINANCEIROS E GESTÃO DO RELACIONAMENTO"
    "CIÊNCIAS HUMANAS E SOCIAIS - HISTÓRIA"
    "COMPUTAÇÃO"
    "ECO - OTIMIZAÇÃO PARA MECANISMOS DE BUSCA"
    "ECOLOGIA LÍNGUA INGLESA"
    "ECOLOGIA LÍNGUA PORTUGUESA"
    "ECOLOGIA LÍNGUA PORTUGUESA - RETROSPECTIVA OBRIGATÓRIA"
    "EDUCAÇÃO FÍSICA"
    "EDUCAÇÃO FÍSICA - APROFUNDAMENTO"
    "ESPANHOL/ESTRUTURA/CULTURA DE LINGUAGENS E APLICAÇÃO SOCIAL"
    "ESTATÍSTICA E MÉTODOS DE CIÊNCIAS SOCIAIS"
    "ÉTICA, TRABALHO E CIDADANIA"
    "EXPORTAÇÃO E IMPORTAÇÃO DE LEITURA DE MUNDO"
    "FILOSOFIA"
    "FÍSICA"
    "FÍSICA - APROFUNDAMENTO"
    "FÍSICA E SUAS TECNOLOGIAS - FÍSICA"
    "FRANCÊS E ECONOMIA II"
    "FUNDAMENTOS DE M.U (UX-UI-IHC)"
    "FUNDAMENTOS DE REDE"
    "GEOGRAFIA"
    "GEOGRAFIA E SUAS TECNOLOGIAS - GEOGRAFIA"
    "GESTÃO DE PESSOAS II"
    "GESTÃO E LIDERANÇA - GESTÃO DE EQUIPES"
    "HISTÓRIA"
    "HISTÓRIA E CULTURA AFRO-BRASILEIRA E INDIGENOAMERICANA"
    "HORÁRIO DE ESTUDO"
    "INGLÊS FOCADO EM TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO"
    "INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA"
    "INTEGRAÇÃO DE ESTUDOS - PROJETO DE VIDA/MUNDO DO TRABALHO"
    "INTELIGÊNCIA ARTIFICIAL"
    "INTERAÇÃO DISCURSIVA - LÍNGUA ESTRANGEIRA INGLÊS"
    "INTERNET DAS COISAS - WOT"
    "INTRODUÇÃO À E-COMMERCE COMPRAVIVE DE LEITURA"
    "INTRODUÇÃO AO ECOSSISTEMA DE APLICATIVOS MÓVEIS"
    "LEITURA E PRODUÇÃO TEXTUAL"
    "LEITURA, INTERPRETAÇÃO E PRODUÇÃO DE TEXTOS"
    "LINGUAGEM E SUAS TECNOLOGIAS"
    "LINGUAGENS E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA"
    "LÍNGUA ESTRANGEIRA ESPANHOL"
    "LÍNGUA ESTRANGEIRA INGLÊS"
    "LÍNGUA INGLESA"
    "LÍNGUA INGLESA E SUAS TECNOLOGIAS - LÍNGUA INGLESA"
    "LÍNGUA PORTUGUESA"
    "LÍNGUA PORTUGUESA E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA E LITERATURA"
    "LOGÍSTICA E OPERAÇÕES I"
    "LOGÍSTICA E OPERAÇÕES II"
    "LOGÍSTICA E ORGANIZAÇÃO II"
    "MARKETING MOBILE"
    "MATEMÁTICA"
    "MATEMÁTICA E COMPUTAÇÃO EM LINGUAGENS (PROGRAMAÇÃO)"
    "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA"
    "MATEMÁTICA/ACOMPANHAMENTO DA APRENDIZAGEM"
    "MATEMÁTICA/ACOMPANHAMENTO PEDAGÓGICO"
    "MATEMÁTICA/COMPONENTES E APROFUNDAMENTO"
    "METODOLOGIA DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - PORTUGUÊS"
    "MÚSICA/CANTO/CANTO/ESPORTE"
    "ORIENTAÇÃO PROFISSIONAL E DIREÇÃO PROFISSIONAL E EMPODERAMENTO"
    "ORIENTAÇÃO PROFISSIONAL E PREPARAÇÃO PARA O MUNDO DO TRABALHO"
    "PEDAGOGIA E APROFUNDAMENTO"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - CIÊNCIAS"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - EDUCAÇÃO FÍSICA"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - FILOSOFIA E SOCIOLOGIA"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LINGUAGENS"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LÍNGUA INGLESA/ESPANHOL"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - MONITORIA / ROBÓTICA DE ESTUDOS - MONITORIA / ROBÓTICA"
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - SOCIOLOGIA"
    "PERCURSOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA"
    "PRINCÍPIO DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - ARTE"
    "PRINCÍPIOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - CIÊNCIAS"
    "PRINCÍPIOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - FILOSOFIA"
    "PRODUTOS INTEGRADORES II"
    "PROGRAMAÇÃO ESTRUTURADA"
    "PROGRAMAÇÃO PARA DISPOSITIVOS MÓVEIS I"
    "PROGRAMAÇÃO VER FRONT-END"
    "PROJETO DE APROFUNDAGEM INTEGRAÇÃO DE ESTUDOS - HISTÓRIA"
    "PROJETO DE APROFUNDAGEM INTERDISCIPLINAR"
    "PROJETO DE VIDA"
    "PROJETO DE VIDA E CARREIRA PROFISSIONAL - PROJETO DE VIDA E CARREIRA / EDUCAÇÃO DE ESTUDOS"
    "PROJETO INTEGRADOR"
    "QUÍMICA"
    "QUÍMICA - APROFUNDAMENTO"
    "QUÍMICA E SUAS TECNOLOGIAS - QUÍMICA"
    "SOCIOLOGIA"
    "SOCIOLOGIA E SUAS TECNOLOGIAS - SOCIOLOGIA"
    "TESTE DE SISTEMAS E SEGURANÇA DA INFORMAÇÃO"
    "TIMBRAR DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS"
    "UX/UI EXPERIENCE (UX)"
)

Write-Host "📋 Total de disciplinas a criar: $($planilhaSubjects.Count)" -ForegroundColor Yellow
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
    
    # 2️⃣ Verificar disciplinas existentes
    Write-Host "2️⃣  Carregando disciplinas existentes..." -ForegroundColor Yellow
    $existingResponse = Invoke-RestMethod -Uri "$apiUrl/subjects" -Headers $headers
    $existingSubjects = $existingResponse.data
    $existingNames = $existingSubjects | ForEach-Object { $_.name }
    Write-Host "   📊 Encontradas: $($existingSubjects.Count) disciplinas" -ForegroundColor Cyan
    Write-Host ""
    
    # 3️⃣ Criar disciplinas faltantes
    Write-Host "3️⃣  Criando disciplinas..." -ForegroundColor Yellow
    Write-Host ""
    
    $created = 0
    $skipped = 0
    $failed = 0
    
    foreach ($subjectName in $planilhaSubjects) {
        # Verificar se já existe
        if ($existingNames -contains $subjectName) {
            Write-Host "   ⏭️  Já existe: $subjectName" -ForegroundColor DarkGray
            $skipped++
            continue
        }
        
        # Criar nova disciplina
        $subjectBody = @{
            name = $subjectName
            code = ""
            workloadHours = 40
            description = "Disciplina importada da planilha"
            color = "#4a90e2"
            isActive = $true
        } | ConvertTo-Json
        
        try {
            $createResponse = Invoke-RestMethod -Uri "$apiUrl/subjects" -Method POST -ContentType "application/json" -Headers $headers -Body $subjectBody
            Write-Host "   ✅ Criada: $subjectName" -ForegroundColor Green
            $created++
        } catch {
            Write-Host "   ❌ Erro ao criar: $subjectName - $($_.Exception.Message)" -ForegroundColor Red
            $failed++
        }
        
        Start-Sleep -Milliseconds 200
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ CONCLUÍDO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   ✅ Criadas: $created" -ForegroundColor Green
    Write-Host "   ⏭️  Já existiam: $skipped" -ForegroundColor Yellow
    if ($failed -gt 0) {
        Write-Host "   ❌ Falharam: $failed" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Agora você pode executar o script de atualização de carga horária!" -ForegroundColor White
    Write-Host "   .\update-workload-mapped.ps1" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
