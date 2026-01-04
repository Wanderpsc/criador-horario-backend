# Test Schools API
Write-Host "`n=== TESTANDO API DE ESCOLAS ===" -ForegroundColor Cyan

# Login
Write-Host "`n1. Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@edusync-pro.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "   ✓ Login bem-sucedido!" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Erro no login: $_" -ForegroundColor Red
    exit 1
}

# Buscar escolas
Write-Host "`n2. Buscando escolas..." -ForegroundColor Yellow
try {
    $schoolsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/schools" -Headers @{Authorization="Bearer $token"}
    $schools = $schoolsResponse.data
    
    Write-Host "`n=== RESULTADO ===" -ForegroundColor Cyan
    Write-Host "Total de escolas: $($schools.Count)" -ForegroundColor $(if($schools.Count -gt 0){"Green"}else{"Red"})
    
    if ($schools.Count -gt 0) {
        Write-Host "`nEscolas encontradas:" -ForegroundColor Green
        foreach ($school in $schools) {
            Write-Host "  ----------------------------------------"
            Write-Host "  ID: $($school.id)"
            Write-Host "  Nome: $($school.schoolName)" -ForegroundColor Cyan
            Write-Host "  Email: $($school.email)"
            Write-Host "  Status: $(if($school.approvedByAdmin){"Aprovada"}else{"Pendente"})"
            Write-Host "  Ativa: $(if($school.isActive){"Sim"}else{"Não"})"
        }
    } else {
        Write-Host "`n❌ NENHUMA ESCOLA ENCONTRADA!" -ForegroundColor Red
        Write-Host "Mas sabemos que existem 2 escolas no banco:" -ForegroundColor Yellow
        Write-Host "  - CETI Desembargador Amaral"
        Write-Host "  - Escola Teste Municipal"
    }
} catch {
    Write-Host "   ✗ Erro ao buscar escolas: $_" -ForegroundColor Red
    Write-Host "   Detalhes: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n================================`n"
