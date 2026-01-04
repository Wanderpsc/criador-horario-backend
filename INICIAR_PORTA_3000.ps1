Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Sistema Criador de Horário Escolar" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Parar todos os processos node
Write-Host "0. Limpando processos anteriores..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Limpar portas 3000-3003
Write-Host "0.1 Liberando portas..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3002, 3003)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
    if ($proc) {
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
        Write-Host "   Porta $port liberada" -ForegroundColor Green
    }
}
Start-Sleep -Seconds 2

Write-Host "1. Iniciando Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm start"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "2. Iniciando Frontend na porta 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npx vite --port 3000 --host"

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   SISTEMA INICIADO!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Acesse: http://localhost:3000" -ForegroundColor Yellow
Write-Host "📧 Email: wanderpsc@gmail.com" -ForegroundColor Yellow
Write-Host "🔑 Senha: Wpsc2025@" -ForegroundColor Yellow
Write-Host ""
