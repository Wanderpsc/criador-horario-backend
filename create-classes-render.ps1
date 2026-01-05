# ═══════════════════════════════════════════════════════════
# CRIAR SÉRIES E TURMAS NO RENDER - PLANILHA 2025
# ═══════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$apiUrl = "https://criador-horario-backend-1.onrender.com/api"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📚 CRIAÇÃO DE SÉRIES E TURMAS NO RENDER - PLANILHA 2025" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "🔐 Autenticando..." -ForegroundColor Yellow
$loginBody = @{
    email = "escola@ceti.com"
    password = "Ceti2025@"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    Write-Host "✅ Login OK" -ForegroundColor Green
    $token = $loginResponse.token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
} catch {
    Write-Host "❌ Erro no login: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PARTE 1: CRIANDO SÉRIES/ANOS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Séries necessárias para as turmas da planilha
$grades = @(
    @{ name = "9º ANO"; level = "fundamental" },
    @{ name = "2ª SÉRIE"; level = "medio" },
    @{ name = "3ª SÉRIE"; level = "medio" }
)

$gradeIds = @{}

foreach ($grade in $grades) {
    Write-Host "📚 Criando série: $($grade.name)" -ForegroundColor White
    
    $body = @{
        name = $grade.name
        level = $grade.level
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "$apiUrl/grades" `
            -Method POST `
            -Headers $headers `
            -Body $body
        
        $gradeIds[$grade.name] = $result.data._id
        Write-Host "   ✅ Criada: ID = $($result.data._id)" -ForegroundColor Green
        Start-Sleep -Seconds 1
        
    } catch {
        $errorMsg = $_.Exception.Message
        
        if ($errorMsg -like "*já existe*" -or $errorMsg -like "*already exists*") {
            Write-Host "   ⚠️  Já existe - buscando ID..." -ForegroundColor Yellow
            
            # Buscar o ID da série existente
            $existingGrades = Invoke-RestMethod -Uri "$apiUrl/grades" -Headers $headers
            $existing = $existingGrades | Where-Object { $_.name -eq $grade.name } | Select-Object -First 1
            
            if ($existing) {
                $gradeIds[$grade.name] = $existing._id
                Write-Host "   ✅ Encontrada: ID = $($existing._id)" -ForegroundColor Green
            } else {
                Write-Host "   ❌ Não encontrada após erro" -ForegroundColor Red
            }
        } else {
            Write-Host "   ❌ Erro: $errorMsg" -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 1
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PARTE 2: CRIANDO TURMAS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Turmas da planilha 2025 com suas respectivas séries
$classes = @(
    @{ name = "EFR-FUND IIANOS FINAIS INT-9º ANO-I-A"; gradeName = "9º ANO"; shift = "full" },
    @{ name = "EFR-FUND IIANOS FINAIS INT-9º ANO-I-B"; gradeName = "9º ANO"; shift = "full" },
    @{ name = "EMRINTEGRAL-3ª SERIE-I-A"; gradeName = "3ª SÉRIE"; shift = "full" },
    @{ name = "EMTPDES-SIS-2ª SERIE-I-A"; gradeName = "2ª SÉRIE"; shift = "full" },
    @{ name = "EMTPDES-SIS-3ª SERIE-I-A"; gradeName = "3ª SÉRIE"; shift = "full" },
    @{ name = "EMTPADMI-2ª SERIE - PROPEDEUTICO-I-A"; gradeName = "2ª SÉRIE"; shift = "full" },
    @{ name = "EMTPMARK-DIG-2ª SERIE - PROPEDEUTICO-I-A"; gradeName = "2ª SÉRIE"; shift = "full" },
    @{ name = "EMTPDES-SIS-3ª SERIE - PROPEDEUTICO-I-A"; gradeName = "3ª SÉRIE"; shift = "full" }
)

Write-Host "📋 Total de turmas a criar: $($classes.Count)" -ForegroundColor Cyan
Write-Host ""

$created = 0
$skipped = 0
$failed = 0

foreach ($class in $classes) {
    Write-Host "📚 Criando: $($class.name)" -ForegroundColor White
    
    $gradeId = $gradeIds[$class.gradeName]
    
    if (-not $gradeId) {
        Write-Host "   ❌ Erro: Série '$($class.gradeName)' não encontrada" -ForegroundColor Red
        $failed++
        continue
    }
    
    $body = @{
        name = $class.name
        gradeId = $gradeId
        shift = $class.shift
        capacity = 40
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "$apiUrl/classes" `
            -Method POST `
            -Headers $headers `
            -Body $body
        
        Write-Host "   ✅ Criada com sucesso" -ForegroundColor Green
        $created++
        Start-Sleep -Seconds 1
        
    } catch {
        $errorMsg = $_.Exception.Message
        
        if ($errorMsg -like "*já existe*" -or $errorMsg -like "*already exists*") {
            Write-Host "   ⚠️  Já existe (pulado)" -ForegroundColor Yellow
            $skipped++
        } else {
            Write-Host "   ❌ Erro: $errorMsg" -ForegroundColor Red
            $failed++
        }
        
        Start-Sleep -Seconds 1
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ CRIAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 ESTATÍSTICAS:" -ForegroundColor Cyan
Write-Host "   Criadas: $created" -ForegroundColor Green
Write-Host "   Já existiam: $skipped" -ForegroundColor Yellow
Write-Host "   Falhas: $failed" -ForegroundColor Red
Write-Host "   Total: $($classes.Count)" -ForegroundColor White
Write-Host ""

if ($created -gt 0) {
    Write-Host "🔄 Próximo passo: Atualizar cargas horárias" -ForegroundColor Cyan
    Write-Host "   Execute: .\update-workload-planilha-2025.ps1" -ForegroundColor White
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
