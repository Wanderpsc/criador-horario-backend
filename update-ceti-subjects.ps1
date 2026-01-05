#!/usr/bin/env pwsh
# -*- coding: utf-8 -*-
<#
.SYNOPSIS
    Script para atualizar Componentes Curriculares da CETI Desembargador Amaral

.DESCRIPTION
    Lê lista de disciplinas e atualiza via API de forma segura
    - Faz backup antes de qualquer alteração
    - Valida credenciais
    - Não remove disciplinas existentes
    - Adiciona apenas novas disciplinas

.NOTES
    Autor: Sistema Criador de Horário
    Data: 04/01/2026
#>

# Configurações
$ErrorActionPreference = "Stop"
$backend = "https://criador-horario-backend-1.onrender.com/api"
$cetiEmail = "escola@ceti.com"
$cetiPassword = "Ceti2025@"

# Lista de Componentes Curriculares da CETI (extraída da planilha)
$subjects = @(
    "BRANDING - GESTÃO DE MARCAS",
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - LINGUAGENS",
    "TESTE DE SISTEMAS E SEGURANÇA DA INFORMAÇÃO",
    "ATIVIDADES INTEGRADAS - EDUCAÇÃO FÍSICA - APROFUNDAMENTO",
    "FÍSICA - APROFUNDAMENTO",
    "PRODUTOS INTEGRADORES II",
    "BIOLOGIA - APROFUNDAMENTO",
    "INTRODUÇÃO AO ECOSSISTEMA DE APLICATIVOS MÓVEIS",
    "CAIXAS, OPERADORES FINANCEIROS E GESTÃO DO RELACIONAMENTO",
    "PRINCÍPIOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - FILOSOFIA",
    "INTEGRAÇÃO DE ESTUDOS - PROJETO DE VIDA/MUNDO DO TRABALHO",
    "ATIVIDADES INTEGRADAS - ESPANHOL - APROFUNDAMENTO",
    "EXPORTAÇÃO E IMPORTAÇÃO DE LEITURA DE MUNDO",
    "LÍNGUA PORTUGUESA E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA E LITERATURA",
    "PERCURSOS DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA",
    "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA",
    "ORIENTAÇÃO PROFISSIONAL E PREPARAÇÃO PARA O MUNDO DO TRABALHO",
    "LÍNGUA INGLESA E SUAS TECNOLOGIAS - LÍNGUA INGLESA",
    "MATEMÁTICA E COMPUTAÇÃO EM LINGUAGENS (PROGRAMAÇÃO)",
    "ANÁLISE E MODELAGEM DE SISTEMAS",
    "LEITURA E PRODUÇÃO TEXTUAL",
    "LOGÍSTICA E ORGANIZAÇÃO II",
    "FÍSICA E SUAS TECNOLOGIAS - FÍSICA",
    "QUÍMICA E SUAS TECNOLOGIAS - QUÍMICA",
    "INTELIGÊNCIA ARTIFICIAL",
    "INGLÊS FOCADO EM TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO",
    "UX/UI EXPERIENCE (UX)",
    "CIÊNCIAS HUMANAS E SOCIAIS - HISTÓRIA",
    "PROJETO DE APROFUNDAGEM INTEGRAÇÃO DE ESTUDOS - HISTÓRIA",
    "ARQUITETURA DE MICROSERVIÇOS",
    "ARTE E SUAS TECNOLOGIAS - ARTE",
    "PRINCÍPIO DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - ARTE",
    "PROGRAMAÇÃO PARA DISPOSITIVOS MÓVEIS I",
    "ATIVIDADES INTEGRADAS - ESPANHOL - APROFUNDAMENTO",
    "LEITURA, INTERPRETAÇÃO E PRODUÇÃO DE TEXTOS",
    "BANCO DE DADOS - BIG DATA",
    "INTEGRAÇÃO DE ESTUDOS - LÍNGUA PORTUGUESA",
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - MONITORIA / ROBÓTICA DE ESTUDOS - MONITORIA / ROBÓTICA",
    "MARKETING MOBILE",
    "GEOGRAFIA E SUAS TECNOLOGIAS - GEOGRAFIA",
    "ATIVIDADES INTEGRADAS - QUÍMICA - APROFUNDAMENTO",
    "PROJETO DE VIDA E CARREIRA PROFISSIONAL - PROJETO DE VIDA E CARREIRA / EDUCAÇÃO DE ESTUDOS",
    "ECO - OTIMIZAÇÃO PARA MECANISMOS DE BUSCA",
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - EDUCAÇÃO FÍSICA",
    "METODOLOGIA DE APROFUNDAMENTO INTEGRAÇÃO DE ESTUDOS - PORTUGUÊS",
    "ATIVIDADES INTEGRADAS - CIÊNCIA DA NATUREZA - APROFUNDAMENTO",
    "TIMBRAR DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS",
    "MATEMÁTICA/COMPONENTES E APROFUNDAMENTO",
    "PEDAGOGIA E APROFUNDAMENTO",
    "EDUCAÇÃO FÍSICA",
    "QUÍMICA - APROFUNDAMENTO",
    "EDUCAÇÃO FÍSICA - APROFUNDAMENTO",
    "GESTÃO E LIDERANÇA - GESTÃO DE EQUIPES",
    "MATEMÁTICA E SUAS TECNOLOGIAS - MATEMÁTICA",
    "HORÁRIO DE ESTUDO",
    "SOCIOLOGIA E SUAS TECNOLOGIAS - SOCIOLOGIA",
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - FILOSOFIA E SOCIOLOGIA",
    "APROFUNDAMENTO - ESPANHOL",
    "LOGÍSTICA E OPERAÇÕES II",
    "BANCO DE DADOS (SGBD)",
    "ESPANHOL/ESTRUTURA/CULTURA DE LINGUAGENS E APLICAÇÃO SOCIAL",
    "INTERAÇÃO DISCURSIVA - LÍNGUA ESTRANGEIRA INGLÊS",
    "ECOLOGIA LÍNGUA INGLESA",
    "PROGRAMAÇÃO ESTRUTURADA",
    "FUNDAMENTOS DE REDE",
    "LINGUAGEM E SUAS TECNOLOGIAS",
    "PERCURSOS DE APROFUNDAMENTO E INTEGRAÇÃO DE ESTUDOS - SOCIOLOGIA",
    "COMPUTAÇÃO",
    "LINGUAGENS E SUAS TECNOLOGIAS - LÍNGUA PORTUGUESA",
    "HISTÓRIA E CULTURA AFRO-BRASILEIRA E INDIGENOAMERICANA",
    "ECOLOGIA LÍNGUA PORTUGUESA - RETROSPECTIVA OBRIGATÓRIA",
    "LÍNGUA ESTRANGEIRA INGLÊS",
    "ECOLOGIA LÍNGUA PORTUGUESA",
    "MATEMÁTICA",
    "FÍSICA",
    "QUÍMICA",
    "BIOLOGIA",
    "HISTÓRIA",
    "GEOGRAFIA",
    "FILOSOFIA",
    "SOCIOLOGIA"
)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎓 ATUALIZAÇÃO DE COMPONENTES CURRICULARES - CETI" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ETAPA 1: Login
Write-Host "1️⃣ Autenticando como CETI..." -ForegroundColor White
try {
    $loginBody = @{
        email = $cetiEmail
        password = $cetiPassword
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "$backend/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -TimeoutSec 30

    if (-not $login.token) {
        throw "Token não recebido"
    }

    Write-Host "   ✅ Login OK - Token recebido" -ForegroundColor Green
    $token = $login.token
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }
}
catch {
    Write-Host "   ❌ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   ⚠️ Verifique se as credenciais estão corretas" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ETAPA 2: Backup das disciplinas existentes
Write-Host "2️⃣ Fazendo backup das disciplinas existentes..." -ForegroundColor White
try {
    $existingSubjects = Invoke-RestMethod -Uri "$backend/subjects" `
        -Headers $headers `
        -TimeoutSec 30

    $backupFile = "backup-subjects-ceti-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $existingSubjects | ConvertTo-Json -Depth 10 | Out-File $backupFile -Encoding UTF8

    Write-Host "   ✅ Backup salvo: $backupFile" -ForegroundColor Green
    Write-Host "   📊 Disciplinas atuais: $($existingSubjects.data.Count)" -ForegroundColor Cyan
}
catch {
    Write-Host "   ❌ Erro ao fazer backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ETAPA 3: Verificar quais disciplinas já existem
Write-Host "3️⃣ Analisando disciplinas existentes..." -ForegroundColor White
$existingNames = $existingSubjects.data | ForEach-Object { $_.name }
$newSubjects = $subjects | Where-Object { $_ -notin $existingNames }
$duplicates = $subjects | Where-Object { $_ -in $existingNames }

Write-Host "   📊 Total na planilha: $($subjects.Count)" -ForegroundColor Cyan
Write-Host "   ✅ Já existem: $($duplicates.Count)" -ForegroundColor Green
Write-Host "   ➕ Novas a adicionar: $($newSubjects.Count)" -ForegroundColor Yellow

if ($newSubjects.Count -eq 0) {
    Write-Host ""
    Write-Host "✅ Todas as disciplinas já estão cadastradas!" -ForegroundColor Green
    Write-Host "   Nenhuma alteração necessária." -ForegroundColor White
    exit 0
}

Write-Host ""

# ETAPA 4: Confirmar ação
Write-Host "⚠️ CONFIRMAÇÃO NECESSÁRIA" -ForegroundColor Yellow
Write-Host "   Serão adicionadas $($newSubjects.Count) novas disciplinas." -ForegroundColor White
Write-Host "   Disciplinas existentes NÃO serão alteradas ou removidas." -ForegroundColor White
Write-Host ""
$confirmation = Read-Host "   Deseja continuar? (S/N)"

if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host ""
    Write-Host "❌ Operação cancelada pelo usuário" -ForegroundColor Red
    exit 0
}

Write-Host ""

# ETAPA 5: Adicionar novas disciplinas
Write-Host "4️⃣ Adicionando novas disciplinas..." -ForegroundColor White
$added = 0
$errors = 0

foreach ($subject in $newSubjects) {
    try {
        $subjectBody = @{
            name = $subject
            workload = 1  # Carga horária padrão: 1 aula por semana
        } | ConvertTo-Json

        $result = Invoke-RestMethod -Uri "$backend/subjects" `
            -Method POST `
            -Headers $headers `
            -Body $subjectBody `
            -TimeoutSec 30

        Write-Host "   ✅ Adicionada: $subject" -ForegroundColor Green
        $added++
        Start-Sleep -Milliseconds 500  # Delay para não sobrecarregar API
    }
    catch {
        Write-Host "   ❌ Erro ao adicionar '$subject': $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""

# ETAPA 6: Resumo final
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RESUMO DA OPERAÇÃO" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Disciplinas adicionadas: $added" -ForegroundColor Green
Write-Host "⏭️ Disciplinas já existentes: $($duplicates.Count)" -ForegroundColor Cyan
if ($errors -gt 0) {
    Write-Host "❌ Erros: $errors" -ForegroundColor Red
}
Write-Host ""
Write-Host "📁 Backup salvo em: $backupFile" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Acesse: https://criador-horario-aula.surge.sh/subjects" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Operação concluída com sucesso!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
