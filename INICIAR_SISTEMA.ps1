# Script de Inicialização do Sistema de Horário Escolar
# © 2025 Wander Pires Silva Coelho

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Sistema Criador de Horário Escolar" -ForegroundColor Green
Write-Host "   © 2025 Wander Pires Silva Coelho" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se MongoDB está rodando
Write-Host "1. Verificando MongoDB..." -ForegroundColor Yellow
$mongoRunning = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue
if (-not $mongoRunning.TcpTestSucceeded) {
    Write-Host "   MongoDB não está rodando. Iniciando..." -ForegroundColor Red
    Start-Process "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" -ArgumentList "--dbpath `"C:\data\db`"" -WindowStyle Minimized
    Start-Sleep -Seconds 5
    Write-Host "   ✅ MongoDB iniciado!" -ForegroundColor Green
} else {
    Write-Host "   ✅ MongoDB já está rodando" -ForegroundColor Green
}

# 2. Compilar TypeScript
Write-Host ""
Write-Host "2. Compilando código TypeScript..." -ForegroundColor Yellow
Set-Location -Path "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend"
npx tsc
Write-Host "   ✅ Compilação concluída!" -ForegroundColor Green

# 3. Iniciar Backend
Write-Host ""
Write-Host "3. Iniciando servidor backend..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "dist/server.js"
Start-Sleep -Seconds 3
Write-Host "   ✅ Backend rodando na porta 5000" -ForegroundColor Green

# 4. Iniciar Frontend
Write-Host ""
Write-Host "4. Iniciando servidor frontend..." -ForegroundColor Yellow
Set-Location -Path "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Write-Host "   ✅ Frontend será iniciado em nova janela" -ForegroundColor Green

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   SISTEMA INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "🗄️  MongoDB: localhost:27017" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usuário de teste:" -ForegroundColor Yellow
Write-Host "  Email: wanderpsc@gmail.com" -ForegroundColor White
Write-Host "  Senha: senha123" -ForegroundColor White
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
