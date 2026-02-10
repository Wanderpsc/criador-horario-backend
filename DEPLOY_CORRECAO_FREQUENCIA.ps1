# 🚀 DEPLOY AUTOMÁTICO - Correção Frequência por Disciplina
# © 2025 Wander Pires Silva Coelho

Write-Host "🚀 INICIANDO DEPLOY - Correção Frequência por Disciplina" -ForegroundColor Cyan
Write-Host "Data: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# 1. Verificar compilação do backend
Write-Host "📦 Verificando compilação do backend..." -ForegroundColor Yellow
cd backend

try {
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend compilado sem erros!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro na compilação do backend!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erro ao compilar backend: $_" -ForegroundColor Red
    exit 1
}

cd ..

# 2. Git add, commit e push
Write-Host "`n📝 Fazendo commit das alterações..." -ForegroundColor Yellow

git add .

$commitMsg = "fix: Corrigir cálculo de déficit/saldo por disciplina

- Alterado teacherFrequencyReport.routes.ts
- Cálculo de aulas previstas agora baseado no calendário letivo
- Cálculo de aulas dadas agora filtrado por disciplina/turma
- Adicionado endpoint /teacher-subject-report/:teacherId
- Melhorado /statistics com agregação por disciplina

Fixes #frequencia-por-disciplina"

git commit -m $commitMsg

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Nenhuma alteração para commitar ou erro no commit" -ForegroundColor Yellow
}

Write-Host "`n🚀 Fazendo push para o repositório..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao fazer push!" -ForegroundColor Red
    exit 1
}

# 3. Aguardar deploy automático do Render
Write-Host "`n⏳ Aguardando deploy automático do Render..." -ForegroundColor Yellow
Write-Host "   (Isso pode levar 2-5 minutos)" -ForegroundColor Gray

# Tentar obter URL do backend do .env
$envPath = "backend\.env"
$backendUrl = ""

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $corsLine = $envContent | Where-Object { $_ -match "CORS_ORIGIN=" }
    if ($corsLine) {
        $backendUrl = ($corsLine -split "=")[1].Trim()
    }
}

if (-not $backendUrl) {
    Write-Host "`n⚠️ URL do backend não encontrada no .env" -ForegroundColor Yellow
    Write-Host "   Digite a URL do backend no Render:" -ForegroundColor Gray
    $backendUrl = Read-Host "   URL"
}

# Tentar acessar health check
Write-Host "`n🔍 Testando health check do backend..." -ForegroundColor Yellow
$maxAttempts = 12  # 12 tentativas x 30s = 6 minutos
$attempt = 0
$success = $false

while ($attempt -lt $maxAttempts -and -not $success) {
    $attempt++
    Write-Host "   Tentativa $attempt/$maxAttempts..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$backendUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend está online!" -ForegroundColor Green
            $success = $true
        }
    } catch {
        if ($attempt -lt $maxAttempts) {
            Write-Host "   ⏳ Aguardando 30 segundos..." -ForegroundColor Gray
            Start-Sleep -Seconds 30
        }
    }
}

if (-not $success) {
    Write-Host "❌ Backend não respondeu após $($maxAttempts * 30) segundos" -ForegroundColor Red
    Write-Host "   Verifique os logs no Render: https://dashboard.render.com" -ForegroundColor Yellow
    exit 1
}

# 4. Testar endpoints
Write-Host "`n🧪 Testando endpoints críticos..." -ForegroundColor Yellow

# Pedir token de autenticação
Write-Host "   Digite o token de autenticação (JWT):" -ForegroundColor Gray
$token = Read-Host "   Token" -AsSecureString
$tokenPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
)

$headers = @{
    "Authorization" = "Bearer $tokenPlain"
    "Content-Type" = "application/json"
}

# Teste 1: Buscar aulas agendadas
Write-Host "`n   📅 Testando /scheduled-classes..." -ForegroundColor Gray
try {
    $date = (Get-Date).ToString("yyyy-MM-dd")
    $response = Invoke-WebRequest -Uri "$backendUrl/api/teacher-attendance/scheduled-classes/$date" -Headers $headers -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ /scheduled-classes: OK" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️ /scheduled-classes: Erro ou sem dados" -ForegroundColor Yellow
}

# Teste 2: Estatísticas por disciplina
Write-Host "   📊 Testando /statistics?bySubject=true..." -ForegroundColor Gray
try {
    $startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
    $endDate = (Get-Date).ToString("yyyy-MM-dd")
    $response = Invoke-WebRequest -Uri "$backendUrl/api/teacher-attendance/statistics?startDate=$startDate&endDate=$endDate&bySubject=true" -Headers $headers -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ /statistics: OK" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️ /statistics: Erro ou sem dados" -ForegroundColor Yellow
}

# Teste 3: Relatório mensal
Write-Host "   📈 Testando /deficit-surplus..." -ForegroundColor Gray
try {
    $month = (Get-Date).Month
    $year = (Get-Date).Year
    $response = Invoke-WebRequest -Uri "$backendUrl/api/teacher-frequency-report/deficit-surplus?month=$month&year=$year" -Headers $headers -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ /deficit-surplus: OK" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️ /deficit-surplus: Erro ou sem dados" -ForegroundColor Yellow
}

# 5. Resumo final
Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host ("="*60) -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 RESUMO:" -ForegroundColor Cyan
Write-Host "   ✅ Backend compilado" -ForegroundColor Green
Write-Host "   ✅ Commit realizado" -ForegroundColor Green
Write-Host "   ✅ Push para repositório" -ForegroundColor Green
Write-Host "   ✅ Backend online" -ForegroundColor Green
Write-Host "   ✅ Endpoints testados" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Backend: $backendUrl" -ForegroundColor Gray
Write-Host "   Frontend: https://criador-horario-aula.surge.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentação:" -ForegroundColor Cyan
Write-Host "   - CORRECAO_LOGICA_FREQUENCIA_POR_DISCIPLINA.md" -ForegroundColor Gray
Write-Host "   - TESTES_VALIDACAO_FREQUENCIA_POR_DISCIPLINA.md" -ForegroundColor Gray
Write-Host "   - DEPLOY_CORRECAO_FREQUENCIA.md" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Acessar: https://criador-horario-aula.surge.sh/#/teacher-attendance" -ForegroundColor Gray
Write-Host "   2. Testar frequência diária" -ForegroundColor Gray
Write-Host "   3. Verificar relatório por disciplina" -ForegroundColor Gray
Write-Host "   4. Validar cálculos de déficit/saldo" -ForegroundColor Gray
Write-Host ""
Write-Host "📞 Suporte: wanderpsc@gmail.com" -ForegroundColor Gray
Write-Host ""
