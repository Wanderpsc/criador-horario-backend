# Script Simplificado de Inicialização
# © 2025 Wander Pires Silva Coelho

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Sistema Criador de Horário Escolar" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan

# Iniciar Backend
Write-Host "`n1. Iniciando Backend..." -ForegroundColor Yellow
Set-Location -Path "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend'; Write-Host 'BACKEND - Porta 5000' -ForegroundColor Green; npm start"
Start-Sleep -Seconds 5

# Iniciar Frontend  
Write-Host "`n2. Iniciando Frontend..." -ForegroundColor Yellow
Set-Location -Path "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\frontend'; Write-Host 'FRONTEND - Porta 3000' -ForegroundColor Green; npm run dev"

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "   SISTEMA INICIADO!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "`n🌐 Acesse: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📧 Email: wanderpsc@gmail.com" -ForegroundColor Yellow
Write-Host "🔑 Senha: Wpsc2025@" -ForegroundColor Yellow
Write-Host ""
