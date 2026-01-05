# ═══════════════════════════════════════════════════════════
# 🧪 TESTE DE CORS - Verificar headers do backend
# ═══════════════════════════════════════════════════════════

$apiUrl = "https://criador-horario-backend-1.onrender.com"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 TESTE DE CORS - Backend em Produção" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "1️⃣  Testando endpoint /api/health..." -ForegroundColor Yellow
    
    $headers = @{
        "Origin" = "https://criador-horario-aula.surge.sh"
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "Content-Type,Authorization"
    }

    # Testar OPTIONS (preflight)
    Write-Host ""
    Write-Host "   📤 OPTIONS Request (Preflight)..." -ForegroundColor Cyan
    
    try {
        $optionsResponse = Invoke-WebRequest -Uri "$apiUrl/api/health" `
            -Method OPTIONS `
            -Headers $headers `
            -UseBasicParsing `
            -ErrorAction Stop

        Write-Host "   ✅ Status: $($optionsResponse.StatusCode)" -ForegroundColor Green
        Write-Host ""
        Write-Host "   📋 Headers CORS Recebidos:" -ForegroundColor White
        
        $corsHeaders = @(
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers",
            "Access-Control-Allow-Credentials",
            "Access-Control-Max-Age"
        )

        foreach ($header in $corsHeaders) {
            $value = $optionsResponse.Headers[$header]
            if ($value) {
                Write-Host "      ✅ $header : $value" -ForegroundColor Green
            } else {
                Write-Host "      ❌ $header : NÃO PRESENTE" -ForegroundColor Red
            }
        }

    } catch {
        Write-Host "   ❌ OPTIONS falhou: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "   📊 Status HTTP: $statusCode" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "2️⃣  Testando GET Request..." -ForegroundColor Yellow
    
    try {
        $getResponse = Invoke-WebRequest -Uri "$apiUrl/api/health" `
            -Method GET `
            -Headers @{ "Origin" = "https://criador-horario-aula.surge.sh" } `
            -UseBasicParsing `
            -ErrorAction Stop

        Write-Host "   ✅ Status: $($getResponse.StatusCode)" -ForegroundColor Green
        
        $allowOrigin = $getResponse.Headers["Access-Control-Allow-Origin"]
        if ($allowOrigin) {
            Write-Host "   ✅ Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Access-Control-Allow-Origin: NÃO PRESENTE" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "   📄 Resposta do servidor:" -ForegroundColor Cyan
        Write-Host "   $($getResponse.Content)" -ForegroundColor White

    } catch {
        Write-Host "   ❌ GET falhou: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "3️⃣  Testando endpoint /api/subjects (com auth)..." -ForegroundColor Yellow
    
    # Login primeiro
    try {
        $loginBody = @{
            email = "escola@ceti.com"
            password = "Ceti2025@"
        } | ConvertTo-Json

        $login = Invoke-RestMethod -Uri "$apiUrl/api/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $loginBody `
            -ErrorAction Stop

        $token = $login.token
        Write-Host "   ✅ Login OK" -ForegroundColor Green

        # Testar subjects com token
        $subjectsResponse = Invoke-WebRequest -Uri "$apiUrl/api/subjects" `
            -Method GET `
            -Headers @{
                "Origin" = "https://criador-horario-aula.surge.sh"
                "Authorization" = "Bearer $token"
            } `
            -UseBasicParsing `
            -ErrorAction Stop

        Write-Host "   ✅ Status: $($subjectsResponse.StatusCode)" -ForegroundColor Green
        
        $allowOrigin = $subjectsResponse.Headers["Access-Control-Allow-Origin"]
        if ($allowOrigin) {
            Write-Host "   ✅ Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Access-Control-Allow-Origin: NÃO PRESENTE" -ForegroundColor Red
        }

        $subjects = $subjectsResponse.Content | ConvertFrom-Json
        Write-Host "   📊 Disciplinas carregadas: $($subjects.Count)" -ForegroundColor Cyan

    } catch {
        Write-Host "   ❌ Subjects falhou: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "   📊 Status HTTP: $statusCode" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📊 DIAGNÓSTICO" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Se todos os testes passaram: ✅ CORS está OK" -ForegroundColor Green
    Write-Host "Se algum teste falhou: ❌ CORS precisa correção" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Verifique se o header 'Access-Control-Allow-Origin' está presente" -ForegroundColor Yellow
    Write-Host "🔍 O valor deve ser: https://criador-horario-aula.surge.sh" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 1
}
