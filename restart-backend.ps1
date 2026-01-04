Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   REINICIAR BACKEND" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# 1. Matar processos na porta 5000
Write-Host "`n1. Parando processos na porta 5000..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess | 
    ForEach-Object { 
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue 
    }
Start-Sleep -Seconds 2
Write-Host "   ✓ Porta 5000 liberada" -ForegroundColor Green

# 2. Navegar para o backend
Set-Location "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend"

# 3. Recompilar
Write-Host "`n2. Recompilando TypeScript..." -ForegroundColor Yellow
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Compilação bem-sucedida" -ForegroundColor Green
} else {
    Write-Host "   ✗ Erro na compilação" -ForegroundColor Red
    exit 1
}

# 4. Iniciar backend
Write-Host "`n3. Iniciando servidor backend..." -ForegroundColor Yellow
Write-Host "   Aguarde 5 segundos para o servidor inicializar...`n" -ForegroundColor Gray

# Criar arquivo de output temporário
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend-$timestamp.log"

# Iniciar em background e salvar log
Start-Process -FilePath "node" -ArgumentList "dist/server.js" -WorkingDirectory "E:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA\backend" -RedirectStandardOutput $logFile -WindowStyle Hidden

# Aguardar inicialização
Start-Sleep -Seconds 6

# Verificar se está rodando
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Host "   ✓ Backend rodando na porta 5000!" -ForegroundColor Green
    Write-Host "   Log salvo em: $logFile" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Backend NÃO está rodando" -ForegroundColor Red
    Write-Host "   Verifique o log: $logFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "   BACKEND REINICIADO COM SUCESSO" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
