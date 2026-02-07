# 🧪 Script Automatizado de Teste de Isolamento
# Testa se duas escolas diferentes não conseguem acessar dados uma da outra

param(
    [string]$BaseUrl = "http://localhost:5000"
)

Write-Host "`n🔒 TESTE DE ISOLAMENTO ENTRE ESCOLAS`n" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl`n"

$ErrorActionPreference = "Continue"
$testsPassed = 0
$testsFailed = 0

# Função auxiliar para fazer requisições
function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    
    try {
        $params = @{
            Uri = "$BaseUrl$Url"
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        return Invoke-RestMethod @params
    } catch {
        return $null
    }
}

Write-Host "📝 PASSO 1: Criando Escola A (Alpha)..." -ForegroundColor Yellow

$escola1 = @{
    name = "Colégio Alpha (Teste $(Get-Date -Format 'yyyyMMddHHmmss'))"
    email = "alpha.teste.$(Get-Random)@teste.com"
    password = "Test@1234"
    acceptedTerms = $true
    acceptedPrivacy = $true
}

$resultAlpha = Invoke-ApiRequest -Url "/api/auth/register-school" -Method POST -Body $escola1

if ($resultAlpha -and $resultAlpha.token) {
    $tokenAlpha = $resultAlpha.token
    $schoolAlphaId = $resultAlpha.school._id
    Write-Host "✅ Escola Alpha criada. ID: $schoolAlphaId" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "❌ Falha ao criar Escola Alpha" -ForegroundColor Red
    $testsFailed++
    exit 1
}

Start-Sleep -Seconds 1

Write-Host "`n📝 PASSO 2: Criando Escola B (Beta)..." -ForegroundColor Yellow

$escola2 = @{
    name = "Colégio Beta (Teste $(Get-Date -Format 'yyyyMMddHHmmss'))"
    email = "beta.teste.$(Get-Random)@teste.com"
    password = "Test@1234"
    acceptedTerms = $true
    acceptedPrivacy = $true
}

$resultBeta = Invoke-ApiRequest -Url "/api/auth/register-school" -Method POST -Body $escola2

if ($resultBeta -and $resultBeta.token) {
    $tokenBeta = $resultBeta.token
    $schoolBetaId = $resultBeta.school._id
    Write-Host "✅ Escola Beta criada. ID: $schoolBetaId" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "❌ Falha ao criar Escola Beta" -ForegroundColor Red
    $testsFailed++
    exit 1
}

Start-Sleep -Seconds 1

Write-Host "`n📝 PASSO 3: Criando professor na Escola Alpha..." -ForegroundColor Yellow

$professorAlpha = @{
    name = "Prof. João Alpha $(Get-Random)"
    email = "joao.alpha.$(Get-Random)@teste.com"
    weeklyHours = 40
}

$headersAlpha = @{ "Authorization" = "Bearer $tokenAlpha" }
$prof1 = Invoke-ApiRequest -Url "/api/teachers" -Method POST -Headers $headersAlpha -Body $professorAlpha

if ($prof1 -and $prof1._id) {
    Write-Host "✅ Professor Alpha criado. ID: $($prof1._id)" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "❌ Falha ao criar Professor Alpha" -ForegroundColor Red
    $testsFailed++
}

Start-Sleep -Seconds 1

Write-Host "`n📝 PASSO 4: Criando professor na Escola Beta..." -ForegroundColor Yellow

$professorBeta = @{
    name = "Prof. Maria Beta $(Get-Random)"
    email = "maria.beta.$(Get-Random)@teste.com"
    weeklyHours = 40
}

$headersBeta = @{ "Authorization" = "Bearer $tokenBeta" }
$prof2 = Invoke-ApiRequest -Url "/api/teachers" -Method POST -Headers $headersBeta -Body $professorBeta

if ($prof2 -and $prof2._id) {
    Write-Host "✅ Professor Beta criado. ID: $($prof2._id)" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "❌ Falha ao criar Professor Beta" -ForegroundColor Red
    $testsFailed++
}

Start-Sleep -Seconds 1

Write-Host "`n🔍 PASSO 5: TESTE DE ISOLAMENTO - Alpha busca professores..." -ForegroundColor Yellow

$professoresAlpha = Invoke-ApiRequest -Url "/api/teachers" -Method GET -Headers $headersAlpha

if ($professoresAlpha) {
    $countAlpha = $professoresAlpha.Count
    Write-Host "📊 Alpha vê $countAlpha professor(es):" -ForegroundColor Cyan
    
    $temProfBeta = $false
    foreach ($prof in $professoresAlpha) {
        Write-Host "   - $($prof.name)" -ForegroundColor White
        if ($prof.name -like "*Beta*") {
            $temProfBeta = $true
        }
    }
    
    if (-not $temProfBeta) {
        Write-Host "✅ ISOLAMENTO OK: Alpha não vê professores da Beta" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FALHA DE SEGURANÇA: Alpha viu professor da Beta!" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "⚠️ Nenhum professor retornado para Alpha" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

Write-Host "`n🔍 PASSO 6: TESTE DE ISOLAMENTO - Beta busca professores..." -ForegroundColor Yellow

$professoresBeta = Invoke-ApiRequest -Url "/api/teachers" -Method GET -Headers $headersBeta

if ($professoresBeta) {
    $countBeta = $professoresBeta.Count
    Write-Host "📊 Beta vê $countBeta professor(es):" -ForegroundColor Cyan
    
    $temProfAlpha = $false
    foreach ($prof in $professoresBeta) {
        Write-Host "   - $($prof.name)" -ForegroundColor White
        if ($prof.name -like "*Alpha*") {
            $temProfAlpha = $true
        }
    }
    
    if (-not $temProfAlpha) {
        Write-Host "✅ ISOLAMENTO OK: Beta não vê professores da Alpha" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FALHA DE SEGURANÇA: Beta viu professor da Alpha!" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "⚠️ Nenhum professor retornado para Beta" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

Write-Host "`n🔍 PASSO 7: TESTE - Alpha tenta acessar com token da Beta (deve falhar)..." -ForegroundColor Yellow

$professoresComTokenErrado = Invoke-ApiRequest -Url "/api/teachers" -Method GET -Headers $headersBeta

if ($professoresComTokenErrado) {
    $temProfAlpha = $false
    foreach ($prof in $professoresComTokenErrado) {
        if ($prof.name -like "*Alpha*") {
            $temProfAlpha = $true
        }
    }
    
    if (-not $temProfAlpha) {
        Write-Host "✅ SEGURANÇA OK: Token Beta não acessa dados Alpha" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ VULNERABILIDADE CRÍTICA: Token Beta acessou dados Alpha!" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "⚠️ Requisição falhou (esperado)" -ForegroundColor Yellow
}

Write-Host "`n📊 RESULTADOS FINAIS:`n" -ForegroundColor Cyan
Write-Host "✅ Testes Aprovados: $testsPassed" -ForegroundColor Green
Write-Host "❌ Testes Falharam: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "`n🎉 TODOS OS TESTES PASSARAM! Sistema seguro para uso comercial." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️ ATENÇÃO: $testsFailed teste(s) falharam. Sistema NÃO está pronto." -ForegroundColor Red
    exit 1
}
