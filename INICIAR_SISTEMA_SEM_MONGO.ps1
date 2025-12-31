# Script de Inicialização do Sistema (Sem MongoDB)
# © 2025 Wander Pires Silva Coelho

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Sistema Criador de Horário Escolar" -ForegroundColor Green
Write-Host "   © 2025 Wander Pires Silva Coelho" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Compilar TypeScript do Backend
Write-Host "1. Compilando código TypeScript do Backend..." -ForegroundColor Yellow
Set-Location -Path "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend"
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Compilação concluída!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro na compilação!" -ForegroundColor Red
    exit 1
}

# 2. Iniciar Backend em nova janela
Write-Host ""
Write-Host "2. Iniciando servidor backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend'; npm start"
Start-Sleep -Seconds 3
Write-Host "   ✅ Backend será iniciado em nova janela na porta 5000" -ForegroundColor Green

# 3. Iniciar Frontend em nova janela
Write-Host ""
Write-Host "3. Iniciando servidor frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend'; npm run dev"
Start-Sleep -Seconds 2
Write-Host "   ✅ Frontend será iniciado em nova janela na porta 3000" -ForegroundColor Green

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   SISTEMA INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  NOTA: MongoDB não está instalado." -ForegroundColor Yellow
Write-Host "   Algumas funcionalidades podem não funcionar." -ForegroundColor Yellow
Write-Host "   Consulte INSTALL_MONGODB.md para instruções de instalação." -ForegroundColor Yellow
Write-Host ""
