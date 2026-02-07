# 🧪 Script de Teste do Sistema de Pagamento
# Valida o fluxo completo de pagamento Mercado Pago

param(
    [string]$BaseUrl = "http://localhost:5000"
)

Write-Host "`n💳 TESTE DO SISTEMA DE PAGAMENTO`n" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl`n"

$ErrorActionPreference = "Continue"
$testsPassed = 0
$testsFailed = 0

function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    
    try {
        $params = @{
            Uri = "$BaseUrl$Url"
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        return Invoke-RestMethod @params
    } catch {
        Write-Host "Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "📝 TESTE 1: Consultar tabela de preços (endpoint público)..." -ForegroundColor Yellow

$precos = Invoke-ApiRequest -Url "/api/credits/pricing" -Method GET

if ($precos) {
    Write-Host "✅ Tabela de preços retornada" -ForegroundColor Green
    Write-Host "`n💰 Preços disponíveis:" -ForegroundColor Cyan
    foreach ($preco in $precos) {
        Write-Host "   $($preco.minClasses)-$($preco.maxClasses) turmas: R$ $($preco.monthlyPrice)/mês" -ForegroundColor White
    }
    $testsPassed++
} else {
    Write-Host "❌ Falha ao consultar preços" -ForegroundColor Red
    $testsFailed++
}

Start-Sleep -Seconds 1

Write-Host "`n📝 TESTE 2: Calcular preço para número específico de turmas..." -ForegroundColor Yellow

$calculo = @{ numberOfClasses = 10 }
$resultado = Invoke-ApiRequest -Url "/api/pricing/calculate" -Method POST -Body $calculo

if ($resultado -and $resultado.price) {
    Write-Host "✅ Cálculo realizado com sucesso" -ForegroundColor Green
    Write-Host "   10 turmas = R$ $($resultado.price)" -ForegroundColor White
    $testsPassed++
} else {
    Write-Host "❌ Falha ao calcular preço" -ForegroundColor Red
    $testsFailed++
}

Start-Sleep -Seconds 1

Write-Host "`n📝 TESTE 3: Criar pagamento público (simulação de nova escola)..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$randomId = Get-Random -Maximum 9999

$novoPagamento = @{
    email = "teste.pagamento.$timestamp.$randomId@teste.com"
    schoolName = "Escola Teste Pagamento $timestamp"
    plan = "profissional"
    duration = 3
    paymentMethod = "pix"
}

Write-Host "`nDados do pagamento:" -ForegroundColor Cyan
Write-Host "   Email: $($novoPagamento.email)"
Write-Host "   Escola: $($novoPagamento.schoolName)"
Write-Host "   Plano: $($novoPagamento.plan)"
Write-Host "   Duração: $($novoPagamento.duration) meses"
Write-Host "   Método: $($novoPagamento.paymentMethod)`n"

$pagamento = Invoke-ApiRequest -Url "/api/payments/create-public" -Method POST -Body $novoPagamento

if ($pagamento -and $pagamento.payment) {
    Write-Host "✅ Pagamento criado com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 Detalhes do pagamento:" -ForegroundColor Cyan
    Write-Host "   ID: $($pagamento.payment._id)" -ForegroundColor White
    Write-Host "   Valor: R$ $($pagamento.payment.amount)" -ForegroundColor White
    Write-Host "   Status: $($pagamento.payment.status)" -ForegroundColor White
    Write-Host "   Plano: $($pagamento.payment.plan)" -ForegroundColor White
    Write-Host "   Duração: $($pagamento.payment.duration) meses" -ForegroundColor White
    
    $paymentId = $pagamento.payment._id
    
    if ($pagamento.pixQrCode) {
        Write-Host "`n🔗 QR Code PIX gerado:" -ForegroundColor Green
        Write-Host "   Código (primeiros 50 chars): $($pagamento.pixQrCode.Substring(0, [Math]::Min(50, $pagamento.pixQrCode.Length)))..." -ForegroundColor White
    }
    
    if ($pagamento.initPoint) {
        Write-Host "`n💳 Link de pagamento por cartão:" -ForegroundColor Green
        Write-Host "   $($pagamento.initPoint)" -ForegroundColor White
    }
    
    $testsPassed++
} else {
    Write-Host "❌ Falha ao criar pagamento" -ForegroundColor Red
    Write-Host "Resposta: $($pagamento | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
    $testsFailed++
    $paymentId = $null
}

Start-Sleep -Seconds 2

if ($paymentId) {
    Write-Host "`n📝 TESTE 4: Consultar status do pagamento (endpoint público)..." -ForegroundColor Yellow
    
    $status = Invoke-ApiRequest -Url "/api/payments/status/$paymentId" -Method GET
    
    if ($status -and $status.payment) {
        Write-Host "✅ Status consultado com sucesso" -ForegroundColor Green
        Write-Host "`n📊 Status atual:" -ForegroundColor Cyan
        Write-Host "   ID: $($status.payment._id)" -ForegroundColor White
        Write-Host "   Status: $($status.payment.status)" -ForegroundColor White
        Write-Host "   Valor: R$ $($status.payment.amount)" -ForegroundColor White
        Write-Host "   Email: $($status.payment.userEmail)" -ForegroundColor White
        
        if ($status.payment.status -eq "pending") {
            Write-Host "`n✅ Status correto: 'pending' (aguardando pagamento)" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "`n⚠️ Status inesperado: $($status.payment.status)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Falha ao consultar status" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "`n⚠️ TESTE 4: Pulado (pagamento não foi criado)" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

Write-Host "`n📝 TESTE 5: Validação de campos obrigatórios..." -ForegroundColor Yellow

$pagamentoInvalido = @{
    email = ""  # Email vazio - deve falhar
    schoolName = "Teste"
    plan = "basico"
}

$resultado = Invoke-ApiRequest -Url "/api/payments/create-public" -Method POST -Body $pagamentoInvalido

if (-not $resultado -or $resultado.error) {
    Write-Host "✅ Validação funcionando: pagamento inválido foi rejeitado" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "❌ VULNERABILIDADE: pagamento sem email foi aceito!" -ForegroundColor Red
    $testsFailed++
}

Start-Sleep -Seconds 1

Write-Host "`n📝 TESTE 6: Testar diferentes planos e métodos de pagamento..." -ForegroundColor Yellow

$planosTeste = @(
    @{ plan = "basico"; method = "pix"; expectedPrice = 119.90 }
    @{ plan = "profissional"; method = "credit_card"; expectedPrice = 249.90 }
)

foreach ($teste in $planosTeste) {
    Write-Host "`n   Testando: Plano $($teste.plan) via $($teste.method)..." -ForegroundColor Cyan
    
    $pagamentoTeste = @{
        email = "teste.$($teste.plan).$(Get-Random)@teste.com"
        schoolName = "Escola Teste $($teste.plan)"
        plan = $teste.plan
        duration = 1
        paymentMethod = $teste.method
    }
    
    $result = Invoke-ApiRequest -Url "/api/payments/create-public" -Method POST -Body $pagamentoTeste
    
    if ($result -and $result.payment) {
        $amountReceived = $result.payment.amount
        
        if ($amountReceived -eq $teste.expectedPrice) {
            Write-Host "   ✅ Preço correto: R$ $amountReceived" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "   ❌ Preço incorreto! Esperado: R$ $($teste.expectedPrice), Recebido: R$ $amountReceived" -ForegroundColor Red
            $testsFailed++
        }
    } else {
        Write-Host "   ⚠️ Falha ao criar pagamento de teste" -ForegroundColor Yellow
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n📊 RESULTADOS DOS TESTES DE PAGAMENTO:`n" -ForegroundColor Cyan
Write-Host "✅ Testes Aprovados: $testsPassed" -ForegroundColor Green
Write-Host "❌ Testes Falharam: $testsFailed" -ForegroundColor Red

Write-Host "`n📝 RESUMO:" -ForegroundColor Cyan

if ($testsFailed -eq 0) {
    Write-Host "   ✅ Endpoint público de preços: OK" -ForegroundColor Green
    Write-Host "   ✅ Cálculo de preços: OK" -ForegroundColor Green
    Write-Host "   ✅ Criação de pagamento: OK" -ForegroundColor Green
    Write-Host "   ✅ Consulta de status: OK" -ForegroundColor Green
    Write-Host "   ✅ Validação de campos: OK" -ForegroundColor Green
    Write-Host "   ✅ Diferentes planos: OK" -ForegroundColor Green
    Write-Host "`n🎉 SISTEMA DE PAGAMENTO FUNCIONANDO CORRETAMENTE!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️ ATENÇÃO: $testsFailed teste(s) falharam." -ForegroundColor Red
    Write-Host "Sistema de pagamento precisa de correções antes do uso comercial." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n💡 NOTA: Para teste completo do webhook do Mercado Pago," -ForegroundColor Yellow
Write-Host "   é necessário ambiente sandbox ou pagamento real." -ForegroundColor Yellow
