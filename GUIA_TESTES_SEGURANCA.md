# 🧪 SCRIPTS DE TESTE DE SEGURANÇA E ISOLAMENTO

## 📋 OBJETIVO
Validar que o sistema está seguro para venda comercial, testando:
1. Isolamento de dados entre escolas
2. Sistema de pagamento end-to-end
3. Autenticação e permissões

---

## 🔐 TESTE 1: ISOLAMENTO ENTRE ESCOLAS (30 min)

### **Passo 1: Criar Duas Escolas de Teste**

#### **Escola A - "Colégio Alpha"**
```powershell
$escola1 = @{
  name = "Colégio Alpha"
  email = "alpha@teste.com"
  password = "Test@1234"
  acceptedTerms = $true
  acceptedPrivacy = $true
}

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register-school" `
  -Method POST `
  -ContentType "application/json" `
  -Body ($escola1 | ConvertTo-Json)
```

**Guarde o token retornado:**
```powershell
$tokenAlpha = "TOKEN_DA_RESPOSTA_AQUI"
```

---

#### **Escola B - "Colégio Beta"**
```powershell
$escola2 = @{
  name = "Colégio Beta"
  email = "beta@teste.com"
  password = "Test@1234"
  acceptedTerms = $true
  acceptedPrivacy = $true
}

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register-school" `
  -Method POST `
  -ContentType "application/json" `
  -Body ($escola2 | ConvertTo-Json)
```

**Guarde o token retornado:**
```powershell
$tokenBeta = "TOKEN_DA_RESPOSTA_AQUI"
```

---

### **Passo 2: Criar Dados na Escola Alpha**

#### **Criar Professor na Escola Alpha**
```powershell
$professorAlpha = @{
  name = "Prof. João Alpha"
  email = "joao.alpha@teste.com"
  weeklyHours = 40
}

$headers = @{ "Authorization" = "Bearer $tokenAlpha" }

$prof1 = Invoke-RestMethod -Uri "http://localhost:5000/api/teachers" `
  -Method POST `
  -Headers $headers `
  -ContentType "application/json" `
  -Body ($professorAlpha | ConvertTo-Json)

Write-Host "✅ Professor Alpha criado. ID: $($prof1._id)"
```

#### **Criar Turma na Escola Alpha**
```powershell
$turmaAlpha = @{
  name = "1º Ano A"
  gradeId = "ALGUM_GRADE_ID"  # Ajustar conforme seu banco
}

$turma1 = Invoke-RestMethod -Uri "http://localhost:5000/api/classes" `
  -Method POST `
  -Headers $headers `
  -ContentType "application/json" `
  -Body ($turmaAlpha | ConvertTo-Json)

Write-Host "✅ Turma Alpha criada. ID: $($turma1._id)"
```

---

### **Passo 3: Criar Dados na Escola Beta**

#### **Criar Professor na Escola Beta**
```powershell
$professorBeta = @{
  name = "Prof. Maria Beta"
  email = "maria.beta@teste.com"
  weeklyHours = 40
}

$headersBeta = @{ "Authorization" = "Bearer $tokenBeta" }

$prof2 = Invoke-RestMethod -Uri "http://localhost:5000/api/teachers" `
  -Method POST `
  -Headers $headersBeta `
  -ContentType "application/json" `
  -Body ($professorBeta | ConvertTo-Json)

Write-Host "✅ Professor Beta criado. ID: $($prof2._id)"
```

---

### **Passo 4: TESTE DE ISOLAMENTO - Tentar Acessar Dados de Outra Escola**

#### **🔴 TESTE CRÍTICO: Alpha tenta acessar professores da Beta**
```powershell
# Escola Alpha tenta buscar todos os professores
# Deve retornar APENAS professores da Alpha
$professoresAlpha = Invoke-RestMethod -Uri "http://localhost:5000/api/teachers" `
  -Method GET `
  -Headers $headers

Write-Host "`n📊 ESCOLA ALPHA - Professores retornados: $($professoresAlpha.length)"
foreach ($prof in $professoresAlpha) {
  Write-Host "  - $($prof.name) (ID: $($prof._id))"
}

# ✅ ESPERADO: Apenas "Prof. João Alpha"
# ❌ FALHA SE: Retornar "Prof. Maria Beta"
```

#### **🔴 TESTE CRÍTICO: Beta tenta acessar professores da Alpha**
```powershell
# Escola Beta tenta buscar todos os professores
$professoresBeta = Invoke-RestMethod -Uri "http://localhost:5000/api/teachers" `
  -Method GET `
  -Headers $headersBeta

Write-Host "`n📊 ESCOLA BETA - Professores retornados: $($professoresBeta.length)"
foreach ($prof in $professoresBeta) {
  Write-Host "  - $($prof.name) (ID: $($prof._id))"
}

# ✅ ESPERADO: Apenas "Prof. Maria Beta"
# ❌ FALHA SE: Retornar "Prof. João Alpha"
```

---

### **Passo 5: Validar Horários Emergenciais**

#### **Alpha cria horário emergencial**
```powershell
$horarioAlpha = @{
  date = "2026-02-10"
  dayOfWeek = "Segunda"
  classId = $turma1._id
  absentTeacherIds = @($prof1._id)
  reason = "Teste isolamento Alpha"
  originalSlots = @()
  emergencySlots = @()
  affectedSlotsCount = 0
}

$emergAlpha = Invoke-RestMethod -Uri "http://localhost:5000/api/emergency-schedules" `
  -Method POST `
  -Headers $headers `
  -ContentType "application/json" `
  -Body ($horarioAlpha | ConvertTo-Json -Depth 10)

Write-Host "✅ Horário emergencial Alpha criado. ID: $($emergAlpha.data._id)"
```

#### **🔴 TESTE: Beta NÃO deve ver horários da Alpha**
```powershell
$horariosEmergBeta = Invoke-RestMethod -Uri "http://localhost:5000/api/emergency-schedules" `
  -Method GET `
  -Headers $headersBeta

Write-Host "`n📊 ESCOLA BETA - Horários emergenciais: $($horariosEmergBeta.data.length)"

# ✅ ESPERADO: 0 horários
# ❌ FALHA SE: Retornar horário da Alpha
if ($horariosEmergBeta.data.length -gt 0) {
  Write-Host "❌ FALHA DE SEGURANÇA: Beta viu horários da Alpha!" -ForegroundColor Red
} else {
  Write-Host "✅ ISOLAMENTO OK: Beta não vê dados da Alpha" -ForegroundColor Green
}
```

---

## 💳 TESTE 2: SISTEMA DE PAGAMENTO (30 min)

### **Passo 1: Verificar Preços Públicos**
```powershell
$precos = Invoke-RestMethod -Uri "http://localhost:5000/api/credits/pricing" -Method GET

Write-Host "`n💰 Preços disponíveis:"
foreach ($preco in $precos) {
  Write-Host "  $($preco.minClasses)-$($preco.maxClasses) turmas: R$ $($preco.monthlyPrice)/mês"
}
```

---

### **Passo 2: Criar Pagamento Público (Simulação de Nova Escola)**
```powershell
$novoPagamento = @{
  email = "novocliente@teste.com"
  schoolName = "Escola Nova Cliente"
  plan = "profissional"
  duration = 3
  paymentMethod = "pix"
}

try {
  $pagamento = Invoke-RestMethod -Uri "http://localhost:5000/api/payments/create-public" `
    -Method POST `
    -ContentType "application/json" `
    -Body ($novoPagamento | ConvertTo-Json)

  Write-Host "`n✅ Pagamento criado com sucesso!"
  Write-Host "📋 ID do Pagamento: $($pagamento.payment._id)"
  Write-Host "💰 Valor: R$ $($pagamento.payment.amount)"
  Write-Host "📊 Status: $($pagamento.payment.status)"
  
  if ($pagamento.pixQrCode) {
    Write-Host "`n🔗 QR Code PIX gerado:"
    Write-Host "   Código: $($pagamento.pixQrCode)"
  }
  
  if ($pagamento.initPoint) {
    Write-Host "`n💳 Link de pagamento cartão:"
    Write-Host "   $($pagamento.initPoint)"
  }

  # Guardar ID para testes
  $paymentId = $pagamento.payment._id

} catch {
  Write-Host "❌ Erro ao criar pagamento:" -ForegroundColor Red
  Write-Host $_.Exception.Message
}
```

---

### **Passo 3: Consultar Status do Pagamento**
```powershell
$statusPagamento = Invoke-RestMethod -Uri "http://localhost:5000/api/payments/status/$paymentId" `
  -Method GET

Write-Host "`n📊 Status atual do pagamento:"
Write-Host "   ID: $($statusPagamento.payment._id)"
Write-Host "   Status: $($statusPagamento.payment.status)"
Write-Host "   Valor: R$ $($statusPagamento.payment.amount)"
Write-Host "   Email: $($statusPagamento.payment.userEmail)"

# ✅ ESPERADO: status = "pending"
```

---

### **Passo 4: TESTE MANUAL - Webhook do Mercado Pago**

**⚠️ Este teste requer integração real com Mercado Pago**

Para testar localmente sem Mercado Pago:
```powershell
# Simular webhook de aprovação
$webhookData = @{
  type = "payment"
  data = @{
    id = "SEU_MERCADO_PAGO_ID_AQUI"
  }
}

# Enviar para o endpoint de webhook
Invoke-RestMethod -Uri "http://localhost:5000/api/payments/webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body ($webhookData | ConvertTo-Json)
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### **Isolamento de Dados:**
- [ ] Escola A não vê professores da Escola B
- [ ] Escola B não vê professores da Escola A
- [ ] Escola A não vê turmas da Escola B
- [ ] Escola B não vê turmas da Escola A
- [ ] Escola A não vê horários emergenciais da Escola B
- [ ] Escola B não vê horários emergenciais da Escola A
- [ ] Escola A não vê horários gerados da Escola B
- [ ] Escola B não vê horários gerados da Escola A

### **Sistema de Pagamento:**
- [ ] Endpoint público `/create-public` funciona sem autenticação
- [ ] Preços corretos (Básico: R$119.90, Profissional: R$249.90)
- [ ] QR Code PIX é gerado
- [ ] Link de pagamento por cartão é gerado
- [ ] Status do pagamento pode ser consultado publicamente
- [ ] Webhook recebe notificações (teste manual ou com Mercado Pago sandbox)

### **Segurança Geral:**
- [ ] Rotas protegidas retornam 401 sem token
- [ ] Tokens inválidos retornam 401
- [ ] Tokens de outra escola não acessam dados de outras escolas (403 ou 404)
- [ ] Console.logs não aparecem em produção (NODE_ENV=production)

---

## 📊 RESULTADO ESPERADO

### **✅ TESTE PASSOU SE:**
- Nenhuma escola acessa dados de outra
- Sistema de pagamento cria pedidos corretamente
- Todos os endpoints protegidos exigem autenticação
- Logs sensíveis não aparecem em produção

### **❌ TESTE FALHOU SE:**
- Escola A vê dados da Escola B
- Endpoint protegido funciona sem token
- Pagamento não é criado ou falha
- Console.logs aparecem em produção

---

## 🚀 EXECUTAR TODOS OS TESTES

### **Script PowerShell Completo:**
```powershell
# Salvar este arquivo como: test-security.ps1
Write-Host "🧪 INICIANDO TESTES DE SEGURANÇA" -ForegroundColor Cyan

# Configurar base URL
$baseUrl = "http://localhost:5000"

# Executar testes...
# (Cole o código dos testes acima aqui)

Write-Host "`n✅ TESTES CONCLUÍDOS" -ForegroundColor Green
```

**Executar:**
```powershell
cd "e:\1. Nova pasta\MEUS PROJETOS DE PROGRAMAÇÃO\CRIADOR DE HORÁRIO DE AULA"
.\test-security.ps1
```

---

© 2025 Wander Pires Silva Coelho  
E-mail: wanderpsc@gmail.com
