# ═══════════════════════════════════════════════════════════
# ✅ TESTE COMPLETO DO SISTEMA EM PRODUÇÃO
# ═══════════════════════════════════════════════════════════

$apiUrl = "https://criador-horario-backend-1.onrender.com/api"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ TESTE COMPLETO - PRODUÇÃO" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

try {
    # 1. Login
    Write-Host "1️⃣  Testando Login..." -ForegroundColor Yellow
    
    $loginBody = @{
        email = "escola@ceti.com"
        password = "Ceti2025@"
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

    # 2. Subjects
    Write-Host "2️⃣  Testando Subjects..." -ForegroundColor Yellow
    
    $subjects = Invoke-RestMethod -Uri "$apiUrl/subjects" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "   ✅ Carregados: $($subjects.Count) disciplinas" -ForegroundColor Green
    Write-Host ""

    # 3. Teachers
    Write-Host "3️⃣  Testando Teachers..." -ForegroundColor Yellow
    
    $teachers = Invoke-RestMethod -Uri "$apiUrl/teachers" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "   ✅ Carregados: $($teachers.Count) professores" -ForegroundColor Green
    Write-Host ""

    # 4. Classes
    Write-Host "4️⃣  Testando Classes..." -ForegroundColor Yellow
    
    $classes = Invoke-RestMethod -Uri "$apiUrl/classes" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "   ✅ Carregadas: $($classes.Count) turmas" -ForegroundColor Green
    Write-Host ""

    # 5. Grades
    Write-Host "5️⃣  Testando Grades..." -ForegroundColor Yellow
    
    $grades = Invoke-RestMethod -Uri "$apiUrl/grades" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "   ✅ Carregadas: $($grades.Count) séries" -ForegroundColor Green
    Write-Host ""

    # 6. Notifications
    Write-Host "6️⃣  Testando Notifications..." -ForegroundColor Yellow
    
    $notifications = Invoke-RestMethod -Uri "$apiUrl/notifications" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "   ✅ OK" -ForegroundColor Green
    Write-Host ""

    # Resumo
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📊 RESUMO" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   ✅ Login: OK" -ForegroundColor Green
    Write-Host "   ✅ Subjects: $($subjects.Count)" -ForegroundColor Green
    Write-Host "   ✅ Teachers: $($teachers.Count)" -ForegroundColor Green
    Write-Host "   ✅ Classes: $($classes.Count)" -ForegroundColor Green
    Write-Host "   ✅ Grades: $($grades.Count)" -ForegroundColor Green
    Write-Host "   ✅ Notifications: OK" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 SISTEMA 100% FUNCIONAL EM PRODUÇÃO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Frontend: https://criador-horario-aula.surge.sh" -ForegroundColor Cyan
    Write-Host "🔗 Backend: https://criador-horario-backend-1.onrender.com" -ForegroundColor Cyan
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
