Write-Host "=== TESTE API ESCOLAS ===" -ForegroundColor Cyan

# Login
$body = @{email='admin@edusync-pro.com'; password='admin123'} | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
Write-Host "✓ Login OK" -ForegroundColor Green

# Buscar escolas
$result = Invoke-RestMethod -Uri 'http://localhost:5000/api/admin/schools' -Headers @{Authorization="Bearer $($login.token)"}

Write-Host "`nTotal: $($result.data.Count)" -ForegroundColor Yellow

if ($result.data.Count -eq 0) {
    Write-Host "PROBLEMA: Nenhuma escola retornada!" -ForegroundColor Red
} else {
    Write-Host "SUCESSO: Escolas encontradas!" -ForegroundColor Green
    $result.data | ForEach-Object {
        Write-Host "  - $($_.schoolName)" -ForegroundColor Cyan
    }
}
